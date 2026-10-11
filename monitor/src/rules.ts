/**
 * What deserves an email, decided from plain snapshots so it can be tested
 * without a database. main.ts feeds it one snapshot a minute.
 */

export type ShopState = 'ok' | 'offline' | 'logged_out' | 'banned' | 'paused';

export type SessionRow = {
  businessId: string;
  businessName: string;
  label: string;
  phone: string | null;
  status: 'pairing' | 'connected' | 'invalid';
  invalidReason: string | null;
  lastSeenAt: Date | null;
  updatedAt: Date;
};

export type ShopSnapshot = {
  key: string;
  businessId: string;
  name: string;
  phone: string | null;
  state: ShopState;
  /** When the current bad state began, as far as the database knows. */
  since: Date;
  reason: string | null;
};

export type Severity = 'critical' | 'high' | 'info';

export type Alert = { severity: Severity; title: string; body: string };

/** A connected socket refreshes last_seen_at every minute; five missed beats means nobody is answering. */
export const HEARTBEAT_STALE_MS = 5 * 60_000;
/** An offline shop gets an email after this long: short blips from a redeploy are normal. */
export const OFFLINE_ALERT_AFTER_MS = 15 * 60_000;
/** Several shops dropping inside this window points at WhatsApp or our IP, not one phone. */
export const FLEET_WINDOW_MS = 10 * 60_000;
export const FLEET_MIN_SHOPS = 2;
export const FLEET_MIN_SHARE = 0.3;
export const FLEET_REPEAT_MS = 60 * 60_000;
/** Consecutive failed health checks (one a minute) before the worker counts as down. */
export const WORKER_DOWN_AFTER = 3;
export const DEAF_REPEAT_MS = 12 * 60 * 60_000;

const FORBIDDEN = /forbidden/i;

export function classifySession(row: SessionRow, now: number): ShopSnapshot {
  const base = {
    key: `${row.businessId}:${row.label}`,
    businessId: row.businessId,
    name: row.businessName,
    phone: row.phone,
  };
  if (row.status === 'invalid') {
    const banned = FORBIDDEN.test(row.invalidReason ?? '');
    return { ...base, state: banned ? 'banned' : 'logged_out', since: row.updatedAt, reason: row.invalidReason };
  }
  if (row.status === 'pairing') return { ...base, state: 'paused', since: row.updatedAt, reason: null };
  if (row.lastSeenAt && now - row.lastSeenAt.getTime() > HEARTBEAT_STALE_MS) {
    return { ...base, state: 'offline', since: row.lastSeenAt, reason: 'no heartbeat from the worker' };
  }
  return { ...base, state: 'ok', since: row.lastSeenAt ?? row.updatedAt, reason: null };
}

type ShopMemory = { state: ShopState; alerted: ShopState | null; badSince: number | null };

export type MonitorMemory = {
  started: boolean;
  shops: Map<string, ShopMemory>;
  workerFailures: number;
  workerAlerted: boolean;
  lastFleetAlert: number;
  lastDeafAlert: Map<string, number>;
  lastOpsEventId: number | null;
};

export function freshMemory(): MonitorMemory {
  return {
    started: false,
    shops: new Map(),
    workerFailures: 0,
    workerAlerted: false,
    lastFleetAlert: 0,
    lastDeafAlert: new Map(),
    lastOpsEventId: null,
  };
}

const BAD: ReadonlySet<ShopState> = new Set(['offline', 'logged_out', 'banned']);

function shopLine(shop: ShopSnapshot): string {
  return `${shop.name}${shop.phone ? ` (+${shop.phone})` : ''}`;
}

function minutesSince(at: Date | number, now: number): number {
  return Math.max(0, Math.round((now - (typeof at === 'number' ? at : at.getTime())) / 60_000));
}

const PLAYBOOK: Record<'banned' | 'logged_out' | 'offline', string> = {
  banned:
    'WhatsApp refused this number (forbidden). Do not re-link it today. Tell the owner, stop every broadcast and ' +
    'Status for the shop, and check docs/operations/monitoring-and-alerts.md, "Number banned".',
  logged_out:
    'The session ended (logged out from the phone or credentials rejected). The owner has to link again from ' +
    'the dashboard. If several shops show this at once, treat it as a fleet incident.',
  offline:
    'The worker stopped refreshing this session. Check the worker logs and Railway; if only this shop is ' +
    'affected, restart its session from the admin console.',
};

/** Per-shop alerts, fleet-wide drop, and the first-run digest. Mutates `memory`. */
export function evaluateShops(
  memory: MonitorMemory,
  shops: readonly ShopSnapshot[],
  now: number,
  workerUp: boolean,
): Alert[] {
  const alerts: Alert[] = [];

  if (!memory.started) {
    memory.started = true;
    const needing = shops.filter((shop) => BAD.has(shop.state));
    for (const shop of shops) {
      memory.shops.set(shop.key, {
        state: shop.state,
        alerted: BAD.has(shop.state) ? shop.state : null,
        badSince: BAD.has(shop.state) ? shop.since.getTime() : null,
      });
    }
    alerts.push({
      severity: 'info',
      title: 'Monitor started',
      body:
        `Watching ${shops.length} linked WhatsApp numbers.` +
        (needing.length > 0
          ? `\n\nAlready needing attention:\n${needing.map((shop) => `- ${shopLine(shop)}: ${shop.state}${shop.reason ? ` (${shop.reason})` : ''}`).join('\n')}`
          : '\n\nAll healthy.'),
    });
    return alerts;
  }

  const seen = new Set<string>();
  const newlyBad: ShopSnapshot[] = [];
  for (const shop of shops) {
    seen.add(shop.key);
    const before = memory.shops.get(shop.key) ?? { state: 'ok' as ShopState, alerted: null, badSince: null };
    const bad = BAD.has(shop.state);
    const next: ShopMemory = {
      state: shop.state,
      alerted: before.alerted,
      badSince: bad ? (BAD.has(before.state) && before.badSince !== null ? before.badSince : now) : null,
    };
    if (bad && !BAD.has(before.state)) newlyBad.push(shop);

    if (shop.state === 'banned' && before.alerted !== 'banned') {
      alerts.push({
        severity: 'critical',
        title: `${shop.name}: number banned by WhatsApp`,
        body: `${shopLine(shop)}\nReason: ${shop.reason ?? 'forbidden'}\n\n${PLAYBOOK.banned}`,
      });
      next.alerted = 'banned';
    } else if (shop.state === 'logged_out' && before.alerted !== 'logged_out' && before.alerted !== 'banned') {
      alerts.push({
        severity: 'high',
        title: `${shop.name}: WhatsApp disconnected`,
        body: `${shopLine(shop)}\nReason: ${shop.reason ?? 'session ended'}\n\n${PLAYBOOK.logged_out}`,
      });
      next.alerted = 'logged_out';
    } else if (
      shop.state === 'offline' &&
      workerUp &&
      before.alerted === null &&
      next.badSince !== null &&
      now - Math.min(next.badSince, shop.since.getTime()) >= OFFLINE_ALERT_AFTER_MS
    ) {
      alerts.push({
        severity: 'high',
        title: `${shop.name}: offline for ${minutesSince(shop.since, now)} min`,
        body: `${shopLine(shop)}\nLast heartbeat ${minutesSince(shop.since, now)} minutes ago.\n\n${PLAYBOOK.offline}`,
      });
      next.alerted = 'offline';
    } else if (!bad && before.alerted !== null) {
      if (shop.state === 'ok') {
        alerts.push({
          severity: 'info',
          title: `${shop.name}: back online`,
          body: `${shopLine(shop)} is connected again after being ${before.alerted.replace('_', ' ')}.`,
        });
      }
      next.alerted = null;
    }
    memory.shops.set(shop.key, next);
  }
  for (const key of [...memory.shops.keys()]) if (!seen.has(key)) memory.shops.delete(key);

  const recentDrops = [...memory.shops.values()].filter(
    (shop) => shop.badSince !== null && now - shop.badSince <= FLEET_WINDOW_MS,
  ).length;
  const linked = shops.filter((shop) => shop.state !== 'paused').length;
  if (
    newlyBad.length > 0 &&
    recentDrops >= FLEET_MIN_SHOPS &&
    recentDrops >= Math.ceil(linked * FLEET_MIN_SHARE) &&
    now - memory.lastFleetAlert >= FLEET_REPEAT_MS
  ) {
    memory.lastFleetAlert = now;
    alerts.push({
      severity: 'critical',
      title: `${recentDrops} of ${linked} shops dropped in ${FLEET_WINDOW_MS / 60_000} minutes`,
      body:
        'Several numbers went down together. That points at the worker, its IP, or a WhatsApp change, ' +
        'not one phone. Pause all broadcasts and Status, check the worker logs, and do not mass re-link.\n\n' +
        shops
          .filter((shop) => BAD.has(shop.state))
          .map((shop) => `- ${shopLine(shop)}: ${shop.state}`)
          .join('\n'),
    });
  }
  return alerts;
}

/** Worker reachability, with recovery. Mutates `memory`. */
export function evaluateWorker(memory: MonitorMemory, healthy: boolean, detail: string): Alert[] {
  if (healthy) {
    const wasDown = memory.workerAlerted;
    memory.workerFailures = 0;
    memory.workerAlerted = false;
    return wasDown ? [{ severity: 'info', title: 'Worker is back', body: 'The worker health check passes again.' }] : [];
  }
  memory.workerFailures += 1;
  if (memory.workerFailures < WORKER_DOWN_AFTER || memory.workerAlerted) return [];
  memory.workerAlerted = true;
  return [
    {
      severity: 'critical',
      title: 'Worker is down',
      body:
        `The worker health check failed ${memory.workerFailures} times in a row (${detail}). ` +
        'No shop is answering customers right now. Check Railway deployments and logs first.',
    },
  ];
}

export type DeafCandidate = { businessId: string; name: string; weekInbound: number; lastInboundAt: Date | null };

/** Connected, heartbeat fresh, but a usually busy shop has received nothing for hours. */
export const DEAF_MIN_WEEK_INBOUND = 70;
export const DEAF_SILENCE_MS = 6 * 60 * 60_000;

export function evaluateDeaf(memory: MonitorMemory, candidates: readonly DeafCandidate[], now: number): Alert[] {
  const alerts: Alert[] = [];
  for (const shop of candidates) {
    if (shop.weekInbound < DEAF_MIN_WEEK_INBOUND) continue;
    if (shop.lastInboundAt && now - shop.lastInboundAt.getTime() < DEAF_SILENCE_MS) continue;
    if (now - (memory.lastDeafAlert.get(shop.businessId) ?? 0) < DEAF_REPEAT_MS) continue;
    memory.lastDeafAlert.set(shop.businessId, now);
    const hours = shop.lastInboundAt ? Math.round((now - shop.lastInboundAt.getTime()) / 3_600_000) : null;
    alerts.push({
      severity: 'high',
      title: `${shop.name}: connected but no messages for ${hours ?? 'many'} hours`,
      body:
        `This shop usually gets about ${Math.round(shop.weekInbound / 7)} messages a day, yet nothing has arrived ` +
        `for ${hours ?? 'many'} hours while the session looks connected. The session may be deaf (a silent ` +
        'restriction or a broken socket). Send a test message to the shop number; if it does not arrive, restart ' +
        'the session from the admin console.',
    });
  }
  return alerts;
}

export type OpsEventRow = { id: number; businessName: string | null; kind: string; severity: string; occurredAt: Date };

/** Error-level ops_events since the last look, as one digest. First look only sets the bookmark. */
export function evaluateOpsEvents(memory: MonitorMemory, rows: readonly OpsEventRow[], maxId: number | null): Alert[] {
  if (memory.lastOpsEventId === null) {
    memory.lastOpsEventId = maxId ?? 0;
    return [];
  }
  if (rows.length === 0) return [];
  memory.lastOpsEventId = Math.max(memory.lastOpsEventId, ...rows.map((row) => row.id));
  const errors = rows.filter((row) => row.severity === 'error' || row.kind === 'whatsapp_ban_risk');
  if (errors.length === 0) return [];
  return [
    {
      severity: errors.some((row) => row.kind === 'whatsapp_ban_risk') ? 'critical' : 'high',
      title: `${errors.length} new problem${errors.length === 1 ? '' : 's'} logged by the worker`,
      body: errors
        .slice(0, 30)
        .map((row) => `- ${row.occurredAt.toISOString()} ${row.kind}${row.businessName ? ` — ${row.businessName}` : ''}`)
        .join('\n'),
    },
  ];
}

const ORDER: Record<Severity, number> = { critical: 0, high: 1, info: 2 };

/** One email per minute at most: the worst alert names it, every alert is in it. */
export function composeEmail(alerts: readonly Alert[]): { subject: string; text: string } | null {
  if (alerts.length === 0) return null;
  const sorted = [...alerts].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const top = sorted[0]!;
  const more = sorted.length > 1 ? ` (+${sorted.length - 1} more)` : '';
  return {
    subject: `[Omni ${top.severity.toUpperCase()}] ${top.title}${more}`,
    text: sorted.map((alert) => `[${alert.severity.toUpperCase()}] ${alert.title}\n${alert.body}`).join('\n\n---\n\n'),
  };
}
