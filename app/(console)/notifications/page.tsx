import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { isIncidentKind } from '../../../lib/incidentKinds';
import { incidentKindLabel } from '../../../lib/format';
import type { IncidentSeverity, IncidentsResponse } from '../../../lib/types';
import { workerGet } from '../../../lib/worker';
import { Art3D } from '../../brand';
import { StatePanel } from '../../state-screen';
import UrlPager from '../../url-pager';
import IncidentTable from '../incidents/incident-table';
import OpsAlertsControl from '../ops-alerts-control';
import KindFilter from './kind-filter';

export const metadata: Metadata = { title: 'Notifications' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SEVERITY_FILTERS: { id: 'problems' | IncidentSeverity; label: string }[] = [
  { id: 'problems', label: 'All problems' },
  { id: 'error', label: 'Errors' },
  { id: 'warn', label: 'Warnings' },
  { id: 'info', label: 'Info' },
];

const RANGE_FILTERS: { id: 'all' | '24' | '168' | '720'; label: string; hours?: number }[] = [
  { id: 'all', label: 'All time' },
  { id: '24', label: 'Last 24 h', hours: 24 },
  { id: '168', label: '7 days', hours: 168 },
  { id: '720', label: '30 days', hours: 720 },
];

function isSeverity(value: string | undefined): value is IncidentSeverity {
  return value === 'error' || value === 'warn' || value === 'info';
}

function parseHours(value: string | undefined): number | undefined {
  if (value === undefined || value === '' || value === 'all') return undefined;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return n;
}

function rangeId(hours: number | undefined): (typeof RANGE_FILTERS)[number]['id'] {
  if (hours === undefined) return 'all';
  if (hours === 24) return '24';
  if (hours === 168) return '168';
  if (hours === 720) return '720';
  return 'all';
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    businessId?: string;
    severity?: string;
    kind?: string;
    hours?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const businessId = params.businessId && UUID.test(params.businessId) ? params.businessId : undefined;
  const severity = isSeverity(params.severity) ? params.severity : undefined;
  const kind = isIncidentKind(params.kind) ? params.kind : undefined;
  const hours = parseHours(params.hours);
  const page = Math.max(0, Number.parseInt(params.page ?? '0', 10) || 0);

  const query = new URLSearchParams({ page: String(page) });
  if (businessId) query.set('businessId', businessId);
  if (severity) query.set('severity', severity);
  if (kind) query.set('kind', kind);
  if (hours !== undefined) query.set('hours', String(hours));
  const result = await workerGet<IncidentsResponse>(`/admin/notifications?${query.toString()}`);
  if (!result.ok) {
    return <StatePanel status={result.status} error={result.error} code={result.code} />;
  }

  const { entries, total, pageSize, last24h, generatedAt } = result.data;
  const now = new Date(generatedAt).getTime();
  const activeSeverity = severity ?? 'problems';
  const activeRange = rangeId(hours);

  function href(next: {
    severity?: 'problems' | IncidentSeverity;
    kind?: string | null;
    hours?: number | 'all';
    clearShop?: boolean;
  }): string {
    const q = new URLSearchParams();
    if (businessId && !next.clearShop) q.set('businessId', businessId);
    const sev = next.severity ?? activeSeverity;
    if (sev !== 'problems') q.set('severity', sev);
    const nextKind = next.kind === null ? undefined : (next.kind ?? kind);
    if (nextKind) q.set('kind', nextKind);
    const nextHours = next.hours === 'all' ? undefined : (next.hours ?? hours);
    if (nextHours !== undefined) q.set('hours', String(nextHours));
    const text = q.toString();
    return text ? `/notifications?${text}` : '/notifications';
  }

  return (
    <main className="ops-page">
      <header className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>
            Every ops alert in one place: WhatsApp session problems, ban risk, assistant failures, unread messages,
            and failed jobs. Warn and error also push to devices that turned alerts on. Repeats within five minutes
            fold into one line.
          </p>
        </div>
        <div className="ops-page-actions">
          <OpsAlertsControl />
        </div>
      </header>

      <section className="desk-stats ops-stats" aria-label="Last 24 hours">
        <div className="desk-stat" data-tone={last24h.error > 0 ? 'danger' : undefined}>
          <Art3D name="bell" size={40} />
          <span className="desk-stat-label">Errors, 24 h</span>
          <strong className="desk-stat-value num">{last24h.error}</strong>
        </div>
        <div className="desk-stat">
          <Art3D name="clock" size={40} />
          <span className="desk-stat-label">Warnings, 24 h</span>
          <strong className="desk-stat-value num">{last24h.warn}</strong>
        </div>
      </section>

      <nav className="chip-group ops-tabs" aria-label="Severity">
        {SEVERITY_FILTERS.map((filter) => (
          <Link
            key={filter.id}
            href={href({ severity: filter.id })}
            className={filter.id === activeSeverity ? 'chip active' : 'chip'}
            aria-current={filter.id === activeSeverity ? 'page' : undefined}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      <nav className="chip-group ops-tabs" aria-label="Time range">
        {RANGE_FILTERS.map((filter) => (
          <Link
            key={filter.id}
            href={href({ hours: filter.id === 'all' ? 'all' : filter.hours })}
            className={filter.id === activeRange ? 'chip active' : 'chip'}
            aria-current={filter.id === activeRange ? 'page' : undefined}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      <div className="ops-filter-row">
        <Suspense>
          <KindFilter value={kind} />
        </Suspense>
      </div>

      {businessId ? (
        <p className="ops-group-note">
          Showing {entries[0]?.businessName ?? 'one shop'} only.{' '}
          <Link href={href({ clearShop: true })}>Show every shop</Link>
        </p>
      ) : null}

      {kind ? (
        <p className="ops-group-note">
          Kind: {incidentKindLabel(kind)}. <Link href={href({ kind: null })}>Clear kind</Link>
        </p>
      ) : null}

      {entries.length === 0 ? (
        <div className="desk-list">
          <div className="empty-state">
            <Art3D name="check" size={72} />
            <p className="empty-title">Nothing to look at</p>
            <p>No notifications match this filter. Recording started with ops events; older problems are not here.</p>
          </div>
        </div>
      ) : (
        <>
          <IncidentTable incidents={entries} now={now} showShop={!businessId} />
          <Suspense>
            <UrlPager page={page} pageSize={pageSize} total={total} noun="notifications" />
          </Suspense>
        </>
      )}
    </main>
  );
}
