'use server';

import { revalidatePath } from 'next/cache';
import { workerPost } from '../../../../lib/worker';

export type ControlResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The worker re-checks admin membership, the reason and the request id; this only forwards. */
export async function runWhatsAppControl(input: {
  businessId: string;
  sessionLabel: string;
  control: 'pause' | 'resume';
  reason: string;
  requestId: string;
}): Promise<ControlResult> {
  if (!UUID.test(input.businessId) || !UUID.test(input.requestId)) {
    return { ok: false, error: 'Invalid request.' };
  }
  if (input.control !== 'pause' && input.control !== 'resume') {
    return { ok: false, error: 'Unknown control.' };
  }

  const result = await workerPost(`/admin/businesses/${input.businessId}/whatsapp/${input.control}`, {
    reason: input.reason,
    requestId: input.requestId,
    sessionLabel: input.sessionLabel,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/businesses/${input.businessId}`);
  revalidatePath('/audit');
  return { ok: true };
}

export async function setAllowance(input: {
  businessId: string;
  allowanceMicros: number;
  bonusMicros: number;
  reason: string;
  requestId: string;
}): Promise<ControlResult> {
  if (!UUID.test(input.businessId) || !UUID.test(input.requestId)) {
    return { ok: false, error: 'Invalid request.' };
  }
  const result = await workerPost(`/admin/businesses/${input.businessId}/allowance`, {
    allowanceMicros: input.allowanceMicros,
    bonusMicros: input.bonusMicros,
    reason: input.reason,
    requestId: input.requestId,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/businesses/${input.businessId}`);
  revalidatePath('/');
  revalidatePath('/audit');
  return { ok: true };
}
