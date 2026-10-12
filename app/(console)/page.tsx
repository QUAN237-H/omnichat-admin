import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import FleetPage from './fleet-page';

export const metadata: Metadata = { title: 'Needs attention' };

/** Cold open = triage. Legacy `?view=` redirects keep old bookmarks working. */
export default async function AttentionHome({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  if (view === 'all') redirect('/shops');
  if (view === 'attention') redirect('/');
  return <FleetPage view="attention" />;
}
