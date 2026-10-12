'use server';

import { workerGet, workerPost } from '../../lib/worker';

export type PushActionResult = { ok: true } | { ok: false; error: string };

export async function getOpsPushConfig(): Promise<
  | { ok: true; configured: boolean; vapidPublicKey: string | null }
  | { ok: false; error: string }
> {
  const result = await workerGet<{ configured: boolean; vapidPublicKey: string | null }>('/admin/push');
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    configured: Boolean(result.data.configured),
    vapidPublicKey: typeof result.data.vapidPublicKey === 'string' ? result.data.vapidPublicKey : null,
  };
}

export async function subscribeOpsPush(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
}): Promise<PushActionResult> {
  if (!input.endpoint.startsWith('https://') || input.endpoint.length > 2048) {
    return { ok: false, error: 'Invalid endpoint.' };
  }
  if (!input.p256dh || !input.auth) {
    return { ok: false, error: 'Missing subscription keys.' };
  }
  const result = await workerPost<{ id: string }>('/admin/push/subscribe', {
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    userAgent: input.userAgent.slice(0, 512),
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

export async function unsubscribeOpsPush(endpoint: string): Promise<PushActionResult> {
  if (!endpoint.startsWith('https://')) {
    return { ok: false, error: 'Invalid endpoint.' };
  }
  const result = await workerPost<{ ok: boolean }>('/admin/push/unsubscribe', { endpoint });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
