'use server';

import { revalidatePath } from 'next/cache';
import { workerPost } from '../../../lib/worker';

export type ControlResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setGlobalFlag(input: {
  feature: string;
  enabled: boolean;
  reason: string;
  requestId: string;
}): Promise<ControlResult> {
  if (!UUID.test(input.requestId) || !input.feature.trim()) {
    return { ok: false, error: 'Invalid request.' };
  }
  const result = await workerPost('/admin/flags', {
    feature: input.feature,
    enabled: input.enabled,
    reason: input.reason,
    requestId: input.requestId,
  });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath('/flags');
  revalidatePath('/audit');
  return { ok: true };
}
