import { createServer } from 'node:http';
import { lookup } from 'node:dns/promises';
import nodemailer from 'nodemailer';
import pg from 'pg';
import {
  classifySession,
  composeEmail,
  evaluateDeaf,
  evaluateOpsEvents,
  evaluateShops,
  evaluateWorker,
  freshMemory,
  type Alert,
  type DeafCandidate,
  type OpsEventRow,
  type SessionRow,
} from './rules.ts';

/**
 * Watches the worker from outside it: a separate Railway project, so a crashed
 * worker, a bad deploy or a dead region cannot also take down the thing that
 * should notice. Reads the database (read-only) and emails the operator.
 */

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Railway blocks outbound SMTP below the Pro plan; an HTTPS email API gets through. */
const resendApiKey = process.env.RESEND_API_KEY?.trim() || null;

const config = {
  databaseUrl: required('DATABASE_URL'),
  workerHealthUrl: required('WORKER_HEALTH_URL'),
  smtpServer: resendApiKey ? '' : required('SMTP_SERVER'),
  smtpPort: resendApiKey ? 0 : Number(required('SMTP_PORT')),
  smtpUsername: resendApiKey ? '' : required('SMTP_USERNAME'),
  smtpPassword: resendApiKey ? '' : required('SMTP_PASSWORD'),
  fromEmail: required('FROM_EMAIL'),
  alertEmail: required('OPS_ALERT_EMAIL'),
  port: Number(process.env.PORT ?? 8080),
};

const TICK_MS = 60_000;
const DEAF_EVERY_TICKS = 15;
const SHOP_TIME_ZONE = 'Africa/Douala';
/** Deaf checks only in shop daytime: silence at 3 a.m. is normal. */
const DEAF_HOURS = { from: 9, to: 21 };

const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 2,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 8_000,
  keepAlive: true,
  application_name: 'omni-chat-monitor',
  options: '-c default_transaction_read_only=on',
});
pool.on('error', (error: Error) => log('error', 'idle database client errored', { err: error.message }));

function log(level: 'info' | 'warn' | 'error', msg: string, extra: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level, time: new Date().toISOString(), msg, ...extra }));
}

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;

/** Railway has no IPv6 egress; connect to an IPv4 address and keep the hostname for TLS (as the worker does). */
async function sendEmail(subject: string, text: string): Promise<boolean> {
  try {
    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${resendApiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: config.fromEmail, to: [config.alertEmail], subject, text }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`Resend HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
      log('info', 'alert emailed', { subject, via: 'resend' });
      return true;
    }
    if (!transporter) {
      const { address } = await lookup(config.smtpServer, { family: 4 });
      transporter = nodemailer.createTransport({
        host: address,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: { user: config.smtpUsername, pass: config.smtpPassword },
        tls: { servername: config.smtpServer },
      });
    }
    await transporter.sendMail({ from: config.fromEmail, to: config.alertEmail, subject, text });
    log('info', 'alert emailed', { subject });
    return true;
  } catch (error) {
    transporter = undefined;
    log('error', 'alert email failed', { subject, err: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

async function checkWorker(): Promise<{ healthy: boolean; detail: string }> {
  try {
    const response = await fetch(config.workerHealthUrl, { signal: AbortSignal.timeout(10_000) });
    if (response.ok) return { healthy: true, detail: 'ok' };
    return { healthy: false, detail: `HTTP ${response.status}` };
  } catch (error) {
    return { healthy: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

function isMissing(error: unknown): boolean {
  const code = (error as { code?: unknown }).code;
  return code === '42P01' || code === '42703';
}

let hasLastSeen = true;

async function loadSessions(): Promise<SessionRow[]> {
  const lastSeen = hasLastSeen ? 's.last_seen_at' : 'null::timestamptz';
  try {
    const { rows } = await pool.query<{
      business_id: string;
      name: string;
      session_label: string;
      phone_number: string | null;
      status: SessionRow['status'];
      invalid_reason: string | null;
      last_seen_at: Date | null;
      updated_at: Date;
    }>(
      `select s.business_id, b.name, s.session_label, s.phone_number, s.status, s.invalid_reason,
              ${lastSeen} as last_seen_at, s.updated_at
         from channel_sessions s
         join businesses b on b.id = s.business_id
        where s.channel = 'whatsapp_baileys'
          and (s.phone_number is not null or s.status = 'invalid')`,
    );
    return rows.map((row) => ({
      businessId: row.business_id,
      businessName: row.name,
      label: row.session_label,
      phone: row.phone_number,
      status: row.status,
      invalidReason: row.invalid_reason,
      lastSeenAt: row.last_seen_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    if (hasLastSeen && isMissing(error)) {
      hasLastSeen = false;
      log('warn', 'channel_sessions.last_seen_at missing (migration 0068); offline detection is off');
      return loadSessions();
    }
    throw error;
  }
}

async function loadDeafCandidates(businessIds: readonly string[]): Promise<DeafCandidate[]> {
  if (businessIds.length === 0) return [];
  const { rows } = await pool.query<{ business_id: string; name: string; week_inbound: string; last_inbound: Date | null }>(
    `select b.id as business_id, b.name, count(m.id) as week_inbound, max(m.created_at) as last_inbound
       from businesses b
       left join messages m
         on m.business_id = b.id
        and m.direction = 'inbound'
        and m.created_at > now() - interval '7 days'
      where b.id = any($1::uuid[])
      group by b.id, b.name`,
    [businessIds],
  );
  return rows.map((row) => ({
    businessId: row.business_id,
    name: row.name,
    weekInbound: Number(row.week_inbound),
    lastInboundAt: row.last_inbound,
  }));
}

let hasOpsEvents = true;

async function loadOpsEvents(afterId: number | null): Promise<{ rows: OpsEventRow[]; maxId: number | null }> {
  if (!hasOpsEvents) return { rows: [], maxId: null };
  try {
    if (afterId === null) {
      const { rows } = await pool.query<{ max_id: string | null }>('select max(id) as max_id from ops_events');
      return { rows: [], maxId: rows[0]?.max_id ? Number(rows[0].max_id) : 0 };
    }
    const { rows } = await pool.query<{ id: string; name: string | null; kind: string; severity: string; occurred_at: Date }>(
      `select e.id, b.name, e.kind, e.severity, e.occurred_at
         from ops_events e
         left join businesses b on b.id = e.business_id
        where e.id > $1
        order by e.id
        limit 200`,
      [afterId],
    );
    return {
      rows: rows.map((row) => ({
        id: Number(row.id),
        businessName: row.name,
        kind: row.kind,
        severity: row.severity,
        occurredAt: row.occurred_at,
      })),
      maxId: null,
    };
  } catch (error) {
    if (isMissing(error)) {
      hasOpsEvents = false;
      log('warn', 'ops_events missing (migration 0067); worker problem digests are off');
      return { rows: [], maxId: null };
    }
    throw error;
  }
}

function shopHour(now: Date): number {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: SHOP_TIME_ZONE }).format(now));
}

const memory = freshMemory();
let tickCount = 0;
let lastGoodTick = 0;
let lastError: string | null = null;

async function tick(): Promise<void> {
  const now = Date.now();
  tickCount += 1;
  const alerts: Alert[] = [];

  const worker = await checkWorker();
  alerts.push(...evaluateWorker(memory, worker.healthy, worker.detail));

  try {
    const shops = (await loadSessions()).map((row) => classifySession(row, now));
    alerts.push(...evaluateShops(memory, shops, now, worker.healthy));

    const hour = shopHour(new Date(now));
    if (tickCount % DEAF_EVERY_TICKS === 1 && hour >= DEAF_HOURS.from && hour < DEAF_HOURS.to) {
      const live = shops.filter((shop) => shop.state === 'ok').map((shop) => shop.businessId);
      alerts.push(...evaluateDeaf(memory, await loadDeafCandidates(live), now));
    }

    const ops = await loadOpsEvents(memory.lastOpsEventId);
    alerts.push(...evaluateOpsEvents(memory, ops.rows, ops.maxId));
    lastGoodTick = now;
    lastError = null;
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    log('error', 'monitor check failed', { err: lastError });
  }

  const toSend = [...unsent, ...alerts];
  const mail = composeEmail(toSend);
  if (!mail) return;
  unsent = (await sendEmail(mail.subject, mail.text)) ? [] : toSend.slice(-MAX_UNSENT);
}

/** Alerts whose email failed: retried with the next minute's, so an outage of the mail path loses nothing. */
const MAX_UNSENT = 50;
let unsent: Alert[] = [];

createServer((request, response) => {
  if (request.url !== '/health') {
    response.writeHead(404).end();
    return;
  }
  const fresh = Date.now() - lastGoodTick < 3 * TICK_MS;
  response.writeHead(fresh ? 200 : 503, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ status: fresh ? 'ok' : 'stale', workerFailures: memory.workerFailures, lastError }));
}).listen(config.port, () => log('info', 'monitor listening', { port: config.port }));

let running = false;
async function loop(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await tick();
  } finally {
    running = false;
  }
}

void loop();
setInterval(() => void loop(), TICK_MS);

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    log('info', 'monitor stopping', { signal });
    void pool.end().finally(() => process.exit(0));
  });
}
