import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { incidentKindLabel, formatUsd } from '../../../lib/format';
import { incidentShopHref } from '../../../lib/incidentHref';
import type { PlatformHealth } from '../../../lib/types';
import { workerGet } from '../../../lib/worker';
import { Art3D } from '../../brand';
import { StatePanel } from '../../state-screen';
import { Stat } from '../costs/usage-tables';

export const metadata: Metadata = { title: 'Platform' };

function Panel({
  title,
  note,
  link,
  children,
  bodyClassName,
}: {
  title: string;
  note?: string;
  link?: { href: string; label: string };
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="ops-panel">
      <div className="ops-panel-head">
        <h2>{title}</h2>
        {note ? <span className="ops-group-note">{note}</span> : null}
        {link ? (
          <Link href={link.href} className="ops-group-link" scroll={false}>
            {link.label}
          </Link>
        ) : null}
      </div>
      <div className={bodyClassName ?? 'ops-panel-body'}>{children}</div>
    </section>
  );
}

function formatUptime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

function verdictTone(verdict: PlatformHealth['verdict']): 'ok' | 'warning' | 'danger' {
  if (verdict === 'sick') return 'danger';
  if (verdict === 'watch') return 'warning';
  return 'ok';
}

function verdictLabel(verdict: PlatformHealth['verdict']): string {
  if (verdict === 'sick') return 'Sick';
  if (verdict === 'watch') return 'Watch';
  return 'Healthy';
}

function ShopList({
  shops,
  hrefFor,
  detail,
}: {
  shops: { id: string; name: string }[];
  hrefFor: (id: string) => string;
  detail?: (shop: { id: string; name: string }, index: number) => string;
}) {
  if (shops.length === 0) {
    return <p className="ops-storm-empty">None right now.</p>;
  }
  return (
    <ul className="ops-list">
      {shops.map((shop, index) => (
        <li key={shop.id}>
          <div className="ops-list-main">
            <div className="ops-list-top">
              <Link href={hrefFor(shop.id)} className="ops-list-who">
                {shop.name}
              </Link>
              {detail ? <span className="ops-muted num">{detail(shop, index)}</span> : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function PlatformPage() {
  const result = await workerGet<PlatformHealth>('/admin/platform');
  if (!result.ok) {
    return <StatePanel status={result.status} error={result.error} code={result.code} />;
  }

  const { verdict, reasons, worker, snapshot, generatedAt } = result.data;
  const { whatsapp, messages, costs, jobs } = snapshot;
  const tone = verdictTone(verdict);
  const commit = worker.railway.commitSha ? worker.railway.commitSha.slice(0, 7) : null;

  return (
    <main className="ops-page">
      <header className="ops-page-head">
        <div>
          <h1>Platform</h1>
          <p>Is Omni sick? Worker, WhatsApp storms, AI burn, job failures — not one shop at a time.</p>
        </div>
      </header>

      <div className="ops-alert" role="status" data-tone={tone}>
        <span className="ops-alert-mark" aria-hidden="true">
          {verdict === 'ok' ? '✓' : '!'}
        </span>
        <p>
          <strong>{verdictLabel(verdict)}.</strong> {reasons[0]}
          {reasons.length > 1 ? (
            <>
              {' '}
              Also: {reasons.slice(1).join(' · ')}
            </>
          ) : null}
        </p>
      </div>

      <section className="ops-strip" aria-label="Quick links">
        <div className="ops-strip-item">
          <span className="ops-strip-label">Verdict</span>
          <strong className="ops-strip-value">{verdictLabel(verdict)}</strong>
        </div>
        <div className="ops-strip-item" data-tone={whatsapp.down + whatsapp.banned > 0 ? 'warning' : undefined}>
          <span className="ops-strip-label">WA live / linked</span>
          <strong className="ops-strip-value num">
            {whatsapp.live} / {whatsapp.linked}
          </strong>
        </div>
        <div className="ops-strip-item" data-tone={messages.stuck > 0 ? 'warning' : undefined}>
          <span className="ops-strip-label">Stuck msgs</span>
          <strong className="ops-strip-value num">{messages.stuck}</strong>
        </div>
        <div className="ops-strip-item">
          <span className="ops-strip-label">AI today</span>
          <strong className="ops-strip-value num">{formatUsd(costs.todayMicros)}</strong>
        </div>
      </section>

      <p className="ops-muted" style={{ marginTop: 0 }}>
        <Link href="/">Needs attention</Link>
        {' · '}
        <Link href="/incidents">Incidents</Link>
        {' · '}
        <Link href="/costs">Costs</Link>
        {' · '}
        <Link href="/shops">All shops</Link>
        <span className="ops-faint"> · refreshed {new Date(generatedAt).toLocaleString()}</span>
      </p>

      <div className="ops-columns">
        <div className="ops-section">
          <Panel title="This worker" note="Railway process answering /admin">
            <dl className="ops-facts">
              <div>
                <dt>Database</dt>
                <dd>{worker.database === 'ok' ? 'Reachable' : 'Unreachable'}</dd>
              </div>
              <div>
                <dt>Uptime</dt>
                <dd className="num">{formatUptime(worker.uptimeSec)}</dd>
              </div>
              <div>
                <dt>Node</dt>
                <dd className="mono">{worker.node}</dd>
              </div>
              <div>
                <dt>Live sockets</dt>
                <dd className="num">
                  {worker.liveSessions.connected} connected · {worker.liveSessions.pairing} pairing ·{' '}
                  {worker.liveSessions.other} other ({worker.liveSessions.total} total)
                </dd>
              </div>
              <div>
                <dt>Railway</dt>
                <dd>
                  {worker.railway.serviceName ?? '—'}
                  {worker.railway.environment ? ` · ${worker.railway.environment}` : ''}
                  {commit ? ` · ${commit}` : ''}
                  {!worker.railway.deploymentId && !commit ? (
                    <span className="ops-muted"> · no deploy env exposed</span>
                  ) : null}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Messages" link={{ href: '/', label: 'Triage' }}>
            <section className="ops-strip" aria-label="Message health">
              <Stat label="Stuck" value={messages.stuck} tone={messages.stuck > 0 ? 'danger' : undefined} />
              <Stat label="Failed 24h" value={messages.failed24h} tone={messages.failed24h > 0 ? 'warning' : undefined} />
              <Stat label="Pending now" value={messages.pending} />
            </section>
          </Panel>
        </div>

        <div className="ops-section">
          <Panel title="WhatsApp fleet" link={{ href: '/incidents?severity=warn', label: 'Incidents' }}>
            <section className="ops-strip" aria-label="WhatsApp counts">
              <Stat label="Live" value={whatsapp.live} />
              <Stat label="Down" value={whatsapp.down} tone={whatsapp.down > 0 ? 'warning' : undefined} />
              <Stat label="Banned" value={whatsapp.banned} tone={whatsapp.banned > 0 ? 'danger' : undefined} />
              <Stat label="Pairing" value={whatsapp.pairing} />
              <Stat label="Never linked" value={whatsapp.notLinked} />
            </section>
          </Panel>

          <Panel title="Storms" note="Last 24h unless noted" bodyClassName="ops-panel-body pad">
            <div className="ops-storm-stack">
              <div className="ops-storm-row">
                <p className="ops-group-note">
                  Ban risk · {whatsapp.storms.banRisk24h.shops} shops · {whatsapp.storms.banRisk24h.events} events
                </p>
                <ShopList
                  shops={whatsapp.storms.banRisk24h.samples}
                  hrefFor={(id) => incidentShopHref(id, 'whatsapp_ban_risk')}
                />
              </div>
              <div className="ops-storm-row">
                <p className="ops-group-note">
                  Still reconnecting · {whatsapp.storms.reconnecting24h.shops} shops
                </p>
                <ShopList
                  shops={whatsapp.storms.reconnecting24h.samples}
                  hrefFor={(id) => incidentShopHref(id, 'whatsapp_still_reconnecting')}
                />
              </div>
              <div className="ops-storm-row">
                <p className="ops-group-note">
                  Reconnect attempts · last hour · {whatsapp.storms.reconnectAttempts1h.shops} shops
                </p>
                <ShopList
                  shops={whatsapp.storms.reconnectAttempts1h.samples}
                  hrefFor={(id) => `/businesses/${id}?tab=whatsapp`}
                />
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="ops-columns">
        <div className="ops-section">
          <Panel title="AI cost" link={{ href: '/costs', label: 'Costs' }} bodyClassName="ops-panel-body pad">
            <dl className="ops-facts">
              <div>
                <dt>Today</dt>
                <dd className="num">{formatUsd(costs.todayMicros)}</dd>
              </div>
              <div>
                <dt>7-day daily avg</dt>
                <dd className="num">{formatUsd(costs.avgDay7Micros)}</dd>
              </div>
              <div>
                <dt>Today vs baseline</dt>
                <dd className="num">
                  {costs.ratio === null ? '—' : `${costs.ratio.toFixed(1)}×`}
                </dd>
              </div>
            </dl>
            <p className="ops-group-note" style={{ margin: '14px 0 6px' }}>
              Hot shops (today much higher than their own baseline)
            </p>
            <ShopList
              shops={costs.hotShops}
              hrefFor={(id) => `/businesses/${id}?tab=money`}
              detail={(shop) => {
                const hot = costs.hotShops.find((row) => row.id === shop.id);
                if (!hot) return '';
                const ratio = hot.ratio === null ? 'new' : `${hot.ratio.toFixed(1)}×`;
                return `${formatUsd(hot.todayMicros)} · ${ratio}`;
              }}
            />
            <p className="ops-group-note" style={{ margin: '14px 0 6px' }}>
              Near allowance (≥80%)
            </p>
            <ShopList
              shops={costs.allowanceNear}
              hrefFor={(id) => `/businesses/${id}?tab=money`}
              detail={(shop) => {
                const row = costs.allowanceNear.find((item) => item.id === shop.id);
                return row ? `${Math.round(row.share * 100)}%` : '';
              }}
            />
          </Panel>
        </div>

        <div className="ops-section">
          <Panel title="Job & AI failures" note="ops_events · 24h" link={{ href: '/incidents', label: 'Feed' }}>
            {jobs.byKind24h.length === 0 ? (
              <div className="ops-empty">
                <Art3D name="check" size={56} />
                <p className="ops-empty-title">No failure kinds in 24h</p>
                <p>Catalog imports, Status posts, agent turns, and ledger writes stay quiet.</p>
              </div>
            ) : (
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Kind</th>
                      <th className="ops-right">Events</th>
                      <th className="ops-right">Shops</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.byKind24h.map((row) => (
                      <tr key={row.kind}>
                        <td>
                          <Link href="/incidents">{incidentKindLabel(row.kind)}</Link>
                        </td>
                        <td className="ops-right num">{row.count}</td>
                        <td className="ops-right num">{row.shops}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}
