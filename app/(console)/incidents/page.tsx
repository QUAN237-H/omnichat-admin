import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import type { IncidentSeverity, IncidentsResponse } from '../../../lib/types';
import { workerGet } from '../../../lib/worker';
import { Art3D } from '../../brand';
import { StatePanel } from '../../state-screen';
import UrlPager from '../../url-pager';
import IncidentTable from './incident-table';

export const metadata: Metadata = { title: 'Incidents' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FILTERS: { id: 'problems' | IncidentSeverity; label: string }[] = [
  { id: 'problems', label: 'All problems' },
  { id: 'error', label: 'Errors' },
  { id: 'warn', label: 'Warnings' },
  { id: 'info', label: 'Info' },
];

function isSeverity(value: string | undefined): value is IncidentSeverity {
  return value === 'error' || value === 'warn' || value === 'info';
}

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string; severity?: string; page?: string }>;
}) {
  const params = await searchParams;
  const businessId = params.businessId && UUID.test(params.businessId) ? params.businessId : undefined;
  const severity = isSeverity(params.severity) ? params.severity : undefined;
  const page = Math.max(0, Number.parseInt(params.page ?? '0', 10) || 0);

  const query = new URLSearchParams({ page: String(page) });
  if (businessId) query.set('businessId', businessId);
  if (severity) query.set('severity', severity);
  const result = await workerGet<IncidentsResponse>(`/admin/incidents?${query.toString()}`);
  if (!result.ok) {
    return <StatePanel status={result.status} error={result.error} code={result.code} />;
  }

  const { entries, total, pageSize, last24h, generatedAt } = result.data;
  const now = new Date(generatedAt).getTime();
  const active = severity ?? 'problems';

  function filterHref(id: (typeof FILTERS)[number]['id']): string {
    const next = new URLSearchParams();
    if (businessId) next.set('businessId', businessId);
    if (id !== 'problems') next.set('severity', id);
    const text = next.toString();
    return text ? `/incidents?${text}` : '/incidents';
  }

  return (
    <main className="ops-page">
      <header className="page-header">
        <div>
          <h1>Incidents</h1>
          <p>
            Problems the worker ran into: WhatsApp sessions ending, ban warnings, the assistant failing to answer,
            unreadable messages and failed background jobs. Repeats within five minutes are folded into one line.
          </p>
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
        {FILTERS.map((filter) => (
          <Link
            key={filter.id}
            href={filterHref(filter.id)}
            className={filter.id === active ? 'chip active' : 'chip'}
            aria-current={filter.id === active ? 'page' : undefined}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {businessId ? (
        <p className="ops-group-note">
          Showing {entries[0]?.businessName ?? 'one shop'} only. <Link href="/incidents">Show every shop</Link>
        </p>
      ) : null}

      {entries.length === 0 ? (
        <div className="desk-list">
          <div className="empty-state">
            <Art3D name="check" size={72} />
            <p className="empty-title">Nothing to look at</p>
            <p>No incidents match this filter. Recording started with this release, so older problems are not here.</p>
          </div>
        </div>
      ) : (
        <>
          <IncidentTable incidents={entries} now={now} showShop={!businessId} />
          <Suspense>
            <UrlPager page={page} pageSize={pageSize} total={total} noun="incidents" />
          </Suspense>
        </>
      )}
    </main>
  );
}
