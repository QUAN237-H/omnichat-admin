import type { FleetAi, FleetRow, FleetShop, FleetWhatsApp } from './types';

/** Same thresholds as the monitor service (admin/monitor/src/rules.ts). */
const HEARTBEAT_STALE_MS = 5 * 60_000;
/** Period spend at or above this share of allowance → triage. */
const ALLOWANCE_BURN_SHARE = 0.8;

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

function allowanceBurnReason(ai: FleetAi | null | undefined): string | null {
  if (!ai) return null;
  const allowance = ai.allowanceMicros + ai.bonusMicros;
  if (allowance <= 0) return null;
  const share = ai.periodCostMicros / allowance;
  if (share < ALLOWANCE_BURN_SHARE) return null;
  return share >= 0.95 ? 'AI allowance exhausted' : 'AI allowance nearly used';
}

/**
 * Soft status lines for a shop (includes “never linked”).
 * Prefer {@link triageReasons} for the Needs attention home.
 */
export function attentionReasons(shop: FleetRow & { ai?: FleetAi | null }): string[] {
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
  const burn = allowanceBurnReason(shop.ai);
  if (burn) reasons.push(burn);
  return reasons;
}

/**
 * Actionable triage only — excludes “never linked” so new signups do not flood the home queue.
 */
export function triageReasons(shop: FleetShop): string[] {
  return attentionReasons(shop).filter((reason) => reason !== 'WhatsApp never linked');
}

export function needsAttention(shop: FleetShop): boolean {
  return triageReasons(shop).length > 0;
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
