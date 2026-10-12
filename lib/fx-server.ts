import 'server-only';
import { cache } from 'react';
import { workerGet } from './worker';
import type { FxSnapshot } from './fx';

export type FxResponse = {
  rate: number | null;
  fetchedAt: string | null;
  source: string | null;
};

/** One /admin/fx read per request; shared by layout and pages. */
export const loadFxSnapshot = cache(async (): Promise<FxSnapshot> => {
  const result = await workerGet<FxResponse>('/admin/fx');
  if (!result.ok) return { rate: null, fetchedAt: null, source: null };
  const rate = typeof result.data.rate === 'number' && result.data.rate > 0 ? result.data.rate : null;
  return {
    rate,
    fetchedAt: typeof result.data.fetchedAt === 'string' ? result.data.fetchedAt : null,
    source: typeof result.data.source === 'string' ? result.data.source : null,
  };
});
