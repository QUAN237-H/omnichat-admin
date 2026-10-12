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

export async function setAiOverride(input: {
  businessId: string;
  override: 'none' | 'force_off' | 'force_on';
  reason: string;
  requestId: string;
  until?: string | null;
}): Promise<ControlResult> {
  if (!UUID.test(input.businessId) || !UUID.test(input.requestId)) {
    return { ok: false, error: 'Invalid request.' };
  }
  const result = await workerPost(`/admin/businesses/${input.businessId}/ai`, {
    override: input.override,
    reason: input.reason,
    requestId: input.requestId,
    until: input.until ?? null,
  });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/businesses/${input.businessId}`);
  revalidatePath('/');
  revalidatePath('/audit');
  return { ok: true };
}

export async function patchSubscription(input: {
  businessId: string;
  reason: string;
  requestId: string;
  extendPeriodDays?: number;
  graceHours?: number;
  status?: 'pilot' | 'active' | 'grace' | 'lapsed' | 'cancelled';
}): Promise<ControlResult> {
  if (!UUID.test(input.businessId) || !UUID.test(input.requestId)) {
    return { ok: false, error: 'Invalid request.' };
  }
  const result = await workerPost(`/admin/businesses/${input.businessId}/subscription`, {
    reason: input.reason,
    requestId: input.requestId,
    ...(input.extendPeriodDays !== undefined ? { extendPeriodDays: input.extendPeriodDays } : {}),
    ...(input.graceHours !== undefined ? { graceHours: input.graceHours } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
  });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/businesses/${input.businessId}`);
  revalidatePath('/');
  revalidatePath('/audit');
  return { ok: true };
}

export async function setShopFlag(input: {
  businessId: string;
  feature: string;
  enabled: boolean;
  reason: string;
  requestId: string;
}): Promise<ControlResult> {
  if (!UUID.test(input.businessId) || !UUID.test(input.requestId)) {
    return { ok: false, error: 'Invalid request.' };
  }
  const result = await workerPost(`/admin/businesses/${input.businessId}/flags`, {
    feature: input.feature,
    enabled: input.enabled,
    reason: input.reason,
    requestId: input.requestId,
  });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/businesses/${input.businessId}`);
  revalidatePath('/audit');
  return { ok: true };
}

export type ImpersonationSession = {
  id: string;
  adminUserId: string;
  businessId: string;
  businessName: string;
  targetUserId: string;
  targetEmail: string | null;
  reason: string;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
};

export type ImpersonationStartResult =
  | { ok: true; deskUrl: string; session: ImpersonationSession | null }
  | { ok: false; error: string };

export async function startImpersonation(input: {
  businessId: string;
  reason: string;
  requestId: string;
}): Promise<ImpersonationStartResult> {
  if (!UUID.test(input.businessId) || !UUID.test(input.requestId)) {
    return { ok: false, error: 'Invalid request.' };
  }
  const result = await workerPost<{
    ok: true;
    deskUrl?: string;
    session?: ImpersonationSession;
  }>(`/admin/businesses/${input.businessId}/impersonate`, {
    reason: input.reason,
    requestId: input.requestId,
  });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/businesses/${input.businessId}`);
  revalidatePath('/audit');
  return {
    ok: true,
    deskUrl: typeof result.data.deskUrl === 'string' ? result.data.deskUrl : '/',
    session: result.data.session ?? null,
  };
}

export async function endImpersonation(input: {
  sessionId?: string;
  reason: string;
  requestId: string;
}): Promise<ControlResult> {
  if (!UUID.test(input.requestId) || (input.sessionId && !UUID.test(input.sessionId))) {
    return { ok: false, error: 'Invalid request.' };
  }
  const result = await workerPost('/admin/impersonation/end', {
    reason: input.reason,
    requestId: input.requestId,
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
  });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath('/');
  revalidatePath('/audit');
  return { ok: true };
}
