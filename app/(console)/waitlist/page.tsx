import type { Metadata } from 'next';
import { Suspense } from 'react';
import type { WaitlistResponse } from '../../../lib/types';
import { workerGet } from '../../../lib/worker';
import { StatePanel } from '../../state-screen';
import { Stat } from '../costs/usage-tables';
import WaitlistTable from './waitlist-table';

export const metadata: Metadata = { title: 'Waitlist' };

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(0, Number.parseInt(params.page ?? '0', 10) || 0);
  const q = (params.q ?? '').trim().slice(0, 120);
  const status = ['pending', 'approved', 'rejected', 'converted'].includes(params.status ?? '')
    ? (params.status as string)
    : '';

  const query = new URLSearchParams({ page: String(page) });
  if (q) query.set('q', q);
  if (status) query.set('status', status);

  const result = await workerGet<WaitlistResponse>(`/admin/waitlist?${query.toString()}`);
  if (!result.ok) {
    return <StatePanel status={result.status} error={result.error} code={result.code} />;
  }

  const { entries, total, summary, generatedAt } = result.data;

  return (
    <main className="ops-page">
      <header className="ops-page-head">
        <h1>Waitlist</h1>
        <p>Triage landing signups: note, approve, reject, or mark converted.</p>
      </header>

      <section className="ops-strip" aria-label="Waitlist summary">
        <Stat label="Total" value={summary.total} />
        <Stat label="Pending" value={summary.pending ?? summary.total} tone={(summary.pending ?? 0) > 0 ? 'warning' : undefined} />
        <Stat label="Approved" value={summary.approved ?? 0} />
        <Stat label="Converted" value={summary.converted ?? 0} />
        <Stat label="Joined, 7d" value={summary.last7d} />
      </section>

      <Suspense fallback={null}>
        <WaitlistTable
          entries={entries}
          total={total}
          page={page}
          q={q}
          status={status}
          generatedAt={generatedAt}
        />
      </Suspense>
    </main>
  );
}
