import { redirect } from 'next/navigation';

/** Incidents moved to Notifications — keep old links working. */
export default async function IncidentsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value) q.set(key, value);
  }
  const text = q.toString();
  redirect(text ? `/notifications?${text}` : '/notifications');
}
