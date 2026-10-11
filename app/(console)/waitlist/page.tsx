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
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(0, Number.parseInt(params.page ?? '0', 10) || 0);
  const q = (params.q ?? '').trim().slice(0, 120);

  const query = new URLSearchParams({ page: String(page) });
  if (q) query.set('q', q);

  const result = await workerGet<WaitlistResponse>(`/admin/waitlist?${query.toString()}`);
  if (!result.ok) {
    return <StatePanel status={result.status} error={result.error} code={result.code} />;
  }

  const { entries, total, summary, generatedAt } = result.data;

  return (
    <main className="ops-page">
      <header className="ops-page-head">
        <h1>Waitlist</h1>
        <p>People who asked to be told when OmniChat opens, from the landing page.</p>
      </header>

      <section className="ops-strip" aria-label="Waitlist summary">
        <Stat label="Total" value={summary.total} />
        <Stat label="Joined, 7d" value={summary.last7d} />
        <Stat label="Joined, 30d" value={summary.last30d} />
        <Stat label="French" value={summary.fr} of={`· ${summary.en} EN`} />
      </section>

      <Suspense fallback={null}>
        <WaitlistTable entries={entries} total={total} page={page} q={q} generatedAt={generatedAt} />
      </Suspense>
    </main>
  );
}
