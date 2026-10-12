'use server';

import { revalidatePath } from 'next/cache';
import type { WaitlistStatus } from '../../../lib/types';
import { workerPost } from '../../../lib/worker';

export type ControlResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function patchWaitlist(input: {
  id: string;
  reason: string;
  requestId: string;
  status?: WaitlistStatus;
  opsNote?: string | null;
  convertedBusinessId?: string | null;
}): Promise<ControlResult> {
  if (!UUID.test(input.id) || !UUID.test(input.requestId)) {
    return { ok: false, error: 'Invalid request.' };
  }
  const result = await workerPost(`/admin/waitlist/${input.id}`, {
    reason: input.reason,
    requestId: input.requestId,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.opsNote !== undefined ? { opsNote: input.opsNote } : {}),
    ...(input.convertedBusinessId !== undefined ? { convertedBusinessId: input.convertedBusinessId } : {}),
  });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath('/waitlist');
  revalidatePath('/audit');
  return { ok: true };
}
