'use server';

import { revalidatePath } from 'next/cache';
import { workerPost } from '../../lib/worker';

export type FxRefreshResult =
  | { ok: true; rate: number; fetchedAt: string; source: string | null }
  | { ok: false; error: string };

export async function refreshFxRates(): Promise<FxRefreshResult> {
  const result = await workerPost<{ rate: number; fetchedAt: string; source: string | null }>(
    '/admin/fx/refresh',
    {},
  );
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath('/', 'layout');
  return {
    ok: true,
    rate: result.data.rate,
    fetchedAt: result.data.fetchedAt,
    source: result.data.source ?? null,
  };
}
