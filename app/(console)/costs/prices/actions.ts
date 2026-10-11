'use server';

import { revalidatePath } from 'next/cache';
import { workerPost } from '../../../../lib/worker';

export type AddPriceResult = { ok: true } | { ok: false; error: string };

/** The worker validates every field, checks admin membership and writes the audit row; this only forwards. */
export async function addModelPrice(input: {
  provider: string;
  model: string;
  unit: string;
  priceMicrosPerUnit: number;
  effectiveFrom: string;
  sourceNote: string;
  reason: string;
  requestId: string;
}): Promise<AddPriceResult> {
  if (!Number.isFinite(input.priceMicrosPerUnit) || input.priceMicrosPerUnit < 0) {
    return { ok: false, error: 'Enter a price of zero or more.' };
  }
  const result = await workerPost('/admin/prices', {
    provider: input.provider,
    model: input.model,
    unit: input.unit,
    priceMicrosPerUnit: input.priceMicrosPerUnit,
    effectiveFrom: input.effectiveFrom,
    ...(input.sourceNote ? { sourceNote: input.sourceNote } : {}),
    reason: input.reason,
    requestId: input.requestId,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath('/costs/prices');
  revalidatePath('/costs');
  revalidatePath('/audit');
  return { ok: true };
}
