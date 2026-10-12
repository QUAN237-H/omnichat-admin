'use client';

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  );
}

function vapidKey(): Uint8Array<ArrayBuffer> {
  const base64 = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function ensureOpsServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export async function currentOpsPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registration = await ensureOpsServiceWorker();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export type EnableOpsPushResult = 'enabled' | 'denied' | 'unsupported' | 'failed';

export async function enableOpsPush(subscribe: (input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
}) => Promise<{ ok: true } | { ok: false; error: string }>): Promise<EnableOpsPushResult> {
  if (!pushSupported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  try {
    const registration = await ensureOpsServiceWorker();
    if (!registration) return 'failed';
    await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey(),
      }));
    const json = subscription.toJSON();
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!json.endpoint || !p256dh || !auth) return 'failed';

    const result = await subscribe({
      endpoint: json.endpoint,
      p256dh,
      auth,
      userAgent: navigator.userAgent,
    });
    if (!result.ok) {
      console.warn('ops push subscribe failed', result.error);
      return 'failed';
    }
    return 'enabled';
  } catch (error) {
    console.warn('ops push enable failed', error);
    return 'failed';
  }
}

export async function disableOpsPush(
  unsubscribe: (endpoint: string) => Promise<{ ok: true } | { ok: false; error: string }>,
): Promise<void> {
  const subscription = await currentOpsPushSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => false);
  await unsubscribe(endpoint);
}
