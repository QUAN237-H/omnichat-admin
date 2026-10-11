import type { FleetRow, FleetWhatsApp } from './types';

/** Same thresholds as the monitor service (admin/monitor/src/rules.ts). */
const HEARTBEAT_STALE_MS = 5 * 60_000;

export type WhatsAppHealth = 'live' | 'offline' | 'banned' | 'logged_out' | 'paused' | 'pairing' | 'not_linked';

export function whatsappHealth(whatsapp: FleetWhatsApp, now = Date.now()): WhatsAppHealth {
  if (whatsapp.status === 'invalid') return /forbidden/i.test(whatsapp.invalidReason ?? '') ? 'banned' : 'logged_out';
  if (whatsapp.status === null) return 'not_linked';
  if (whatsapp.status === 'pairing') return whatsapp.phoneNumber ? 'paused' : 'pairing';
  if (whatsapp.lastSeenAt && now - Date.parse(whatsapp.lastSeenAt) > HEARTBEAT_STALE_MS) return 'offline';
  return 'live';
}

/** When the current problem started, for "down 2 h" timers. */
export function downSince(whatsapp: FleetWhatsApp): string | null {
  const health = whatsappHealth(whatsapp);
  if (health === 'offline') return whatsapp.lastSeenAt ?? null;
  if (health === 'banned' || health === 'logged_out') return whatsapp.stateSince ?? null;
  return null;
}

export function formatDuration(fromIso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(fromIso)) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} days`;
}

/** Why a shop needs an operator now; empty means it is healthy. */
export function attentionReasons(shop: FleetRow): string[] {
  const reasons: string[] = [];
  const health = whatsappHealth(shop.whatsapp);
  const since = downSince(shop.whatsapp);
  const forHow = since ? ` for ${formatDuration(since)}` : '';
  if (health === 'banned') reasons.push(`Number banned by WhatsApp${forHow}`);
  else if (health === 'logged_out') reasons.push(`WhatsApp logged out${forHow}`);
  else if (health === 'offline') reasons.push(`WhatsApp offline${forHow}`);
  else if (health === 'not_linked') reasons.push('WhatsApp never linked');
  else if (health === 'pairing') reasons.push('WhatsApp not connected');
  if (shop.stuck > 0) reasons.push(`${shop.stuck} stuck ${shop.stuck === 1 ? 'message' : 'messages'}`);
  if (shop.failed24h > 0) reasons.push(`${shop.failed24h} failed today`);
  return reasons;
}

export function needsAttention(shop: FleetRow): boolean {
  return attentionReasons(shop).length > 0;
}

/** Several numbers down at once points at the worker, its IP or WhatsApp, not one phone. */
export function fleetAlarm(shops: readonly FleetRow[]): { down: number; linked: number; banned: number } | null {
  const health = shops.map((shop) => whatsappHealth(shop.whatsapp));
  const linked = health.filter((state) => state !== 'not_linked' && state !== 'pairing' && state !== 'paused').length;
  const down = health.filter((state) => state === 'offline' || state === 'banned' || state === 'logged_out').length;
  const banned = health.filter((state) => state === 'banned').length;
  if (banned > 0 || (down >= 2 && down >= Math.ceil(linked * 0.3))) return { down, linked, banned };
  return null;
}
