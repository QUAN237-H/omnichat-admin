const XAF = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatXaf(value: string | number): string {
  const amount = typeof value === 'number' ? value : Number(value);
  return `${XAF.format(Number.isFinite(amount) ? amount : 0)} XAF`;
}

export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

/** "4 min ago", "3 h ago", "2 d ago"; null reads as "Never". */
export function timeAgo(iso: string | null, now: number = Date.now()): string {
  if (!iso) return 'Never';
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/** "42 s", "3 min", "2.5 h"; null reads as "—". */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—';
  if (seconds < 90) return `${Math.round(seconds)} s`;
  const minutes = seconds / 60;
  if (minutes < 90) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} h`;
  return `${Math.round(hours / 24)} d`;
}

/** Whole-number percentage of part over whole; "—" when whole is 0. */
export function formatPercent(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—';
}

export function formatPhone(digits: string | null): string {
  return digits ? `+${digits}` : '—';
}

export const STAGE_LABEL: Record<string, string> = {
  INTERESTED: 'Interested',
  QUALIFIED: 'Qualified',
  NEGOTIATING: 'Negotiating',
  PRICE_AGREED: 'Price agreed',
  PURCHASE_COMMITMENT: 'Committed',
  RESERVED: 'Reserved',
  ARRIVED: 'Arrived',
  PURCHASED: 'Purchased',
  NO_SHOW: 'No-show',
  LOST: 'Lost',
  RE_ENGAGEMENT: 'Re-engagement',
};

export const STAGE_ORDER = Object.keys(STAGE_LABEL);

/** Outbound idempotency-key prefixes, plus 'inbound', as an operator reads them. */
const MESSAGE_KIND_LABEL: Record<string, string> = {
  inbound: 'Customer messages',
  reply: 'Replies to customers',
  photo: 'Product photos to customers',
  'owner-handoff': 'Handoffs to the owner',
  'owner-nudge': 'Reminders to the owner',
  'owner-welcome': 'Welcome to the owner',
  'takeover-release-nudge': 'Takeover reminders',
  'status-post': 'Status posts',
  broadcast: 'Broadcasts',
  'catalog-import': 'Import notices',
};

export function messageKindLabel(kind: string): string {
  return MESSAGE_KIND_LABEL[kind] ?? kind;
}

const FEATURE_LABEL: Record<string, string> = {
  customer_voice: 'Customer voice notes',
  customer_photo: 'Customer photos',
  negotiation: 'Deals past qualifying',
  handoff: 'Handoffs to the owner',
  takeover: 'Owner takeovers',
  photo_enhancement: 'Photo enhancements',
  status_post: 'Status posts sent',
  broadcast: 'Broadcast messages sent',
  knowledge_document: 'Documents uploaded',
  catalog_import: 'Catalog imports',
  'catalog_import:whatsapp': 'Catalog import · WhatsApp',
  'catalog_import:spreadsheet': 'Catalog import · spreadsheet',
  'catalog_import:paste': 'Catalog import · pasted list',
  'catalog_import:pdf': 'Catalog import · PDF',
  'catalog_import:photo': 'Catalog import · photo',
};

const AUDIT_ACTION_LABEL: Record<string, string> = {
  'whatsapp.pause': 'Paused WhatsApp',
  'whatsapp.resume': 'Resumed WhatsApp',
  'ai.pause': 'Paused AI replies',
  'ai.resume': 'Resumed AI replies',
  'ai.force_on': 'Forced AI on',
  'subscription.patch': 'Changed subscription',
  'usage.allowance': 'Set AI allowance',
  'flag.global': 'Changed global flag',
  'flag.shop': 'Changed shop flag',
  'waitlist.pending': 'Waitlist → pending',
  'waitlist.approved': 'Waitlist approved',
  'waitlist.rejected': 'Waitlist rejected',
  'waitlist.converted': 'Waitlist converted',
  'waitlist.note': 'Waitlist note',
  'pricing.add': 'Added model price',
  'impersonation.start': 'Started Desk support view',
  'impersonation.end': 'Ended Desk support view',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action;
}

const CONNECTION_EVENT_LABEL: Record<string, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  terminal: 'Session ended, needs re-pairing',
  reconnect_attempt: 'Still reconnecting',
  paused: 'Paused',
  resumed: 'Resumed',
  unlinked: 'Switched number',
  removed: 'Number removed',
  number_in_use: 'Refused, number used by another shop',
};

export function connectionEventLabel(event: string): string {
  return CONNECTION_EVENT_LABEL[event] ?? event;
}

const INCIDENT_KIND_LABEL: Record<string, string> = {
  whatsapp_ban_risk: 'WhatsApp ban warning, broadcasts held',
  whatsapp_session_ended: 'WhatsApp session ended, needs re-pairing',
  whatsapp_still_reconnecting: 'WhatsApp still reconnecting',
  whatsapp_ownership_contested: 'Two workers may hold WhatsApp',
  llm_down: 'AI model down',
  agent_turn_failed: 'Assistant failed to answer',
  inbound_undecryptable: 'Customer message could not be read',
  below_floor_refused: 'Deal under the floor price refused',
  catalog_import_failed: 'Catalog import failed',
  status_post_failed: 'Status post failed',
  document_ingest_failed: 'Document upload failed',
  usage_ledger_write_failed: 'Usage ledger write failed',
  shop_created: 'New shop signed up',
  proxy_pool_low: 'Sticky proxy IPs almost gone',
  proxy_pool_exhausted: 'Sticky proxy IPs exhausted',
};

export function incidentKindLabel(kind: string): string {
  return INCIDENT_KIND_LABEL[kind] ?? kind;
}

/** One readable line from an incident's detail; keys the worker writes in src/db/opsEvents.ts call sites. */
export function incidentDetail(detail: unknown): string | null {
  if (!detail || typeof detail !== 'object') return null;
  const record = detail as Record<string, unknown>;
  const text = (key: string) => (typeof record[key] === 'string' ? (record[key] as string) : null);
  const parts = [
    text('reason'),
    text('error'),
    text('productName'),
    text('name'),
    text('location'),
    typeof record.preferredFree === 'number' ? `${record.preferredFree} preferred IPs free` : null,
    typeof record.attempt === 'number' ? `${record.attempt} failed retries` : null,
    typeof record.waitedMs === 'number' ? `waited ${Math.round(record.waitedMs / 1000)} s for the lock` : null,
    typeof record.repeatsSincePrevious === 'number' ? `+${record.repeatsSincePrevious} more since the last entry` : null,
  ];
  const line = parts.filter((part): part is string => part !== null).join(' · ');
  return line || null;
}

/** Ledger costs are micro-dollars. Small amounts keep enough digits to be told apart. */
export function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
}

/** Dollar string only (no XAF). Prefer `formatUsd` when a rate may be available. */
export function formatUsdOnly(micros: number): string {
  const usd = micros / 1_000_000;
  if (usd === 0) return '$0';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 100) return `$${usd.toFixed(2)}`;
  return `$${Math.round(usd).toLocaleString('en-US')}`;
}

function formatUsdXafBracket(usd: number, xafPerUsd: number): string {
  const xaf = Math.round(usd * xafPerUsd);
  return ` (≈ ${XAF.format(xaf)} XAF)`;
}

/**
 * Ledger costs are micro-dollars. When `xafPerUsd` is set, appends
 * ` (≈ N XAF)` using whole francs.
 */
export function formatUsd(micros: number, xafPerUsd?: number | null): string {
  const dollars = formatUsdOnly(micros);
  if (xafPerUsd == null || !Number.isFinite(xafPerUsd) || xafPerUsd <= 0) return dollars;
  return `${dollars}${formatUsdXafBracket(micros / 1_000_000, xafPerUsd)}`;
}

const AI_FEATURE_LABEL: Record<string, string> = {
  customer_ai_replies: 'Customer replies',
  customer_negotiation: 'Price negotiation',
  customer_voice_understanding: 'Customer voice notes',
  customer_image_understanding: 'Customer photos',
  knowledge_retrieval: 'Shop knowledge lookups',
  customer_memory: 'Customer memory',
  owner_ai_assistant: 'Owner assistant',
  owner_voice_notes: 'Owner voice notes',
  dashboard_voice: 'Desk voice (interview, catalog talk)',
  ai_catalog_import: 'Catalog import',
  knowledge_ingestion: 'Document reading',
  photo_enhancement: 'Photo enhancement',
  catalog_image_embedding: 'Catalog photo indexing',
  status_posting: 'Status posts',
  broadcasts: 'Broadcasts',
  holding_messages: 'Holding messages',
  reengagement: 'Re-engagement',
  ai_customer_followups: 'Customer follow-ups',
  ai_status_content: 'Status captions',
  unattributed: 'Not attributed to a shop',
};

export function aiFeatureLabel(feature: string): string {
  return AI_FEATURE_LABEL[feature] ?? feature;
}

/**
 * Prices are stored per single unit in micro-dollars; operators think in
 * "dollars per million tokens" or "per hour of audio". `per` is how many
 * units the entered dollar amount covers.
 */
export const PRICE_UNITS: { unit: string; label: string; per: number; perLabel: string }[] = [
  { unit: 'input_token', label: 'Input tokens', per: 1_000_000, perLabel: 'per 1M tokens' },
  { unit: 'cached_input_token', label: 'Cached input tokens', per: 1_000_000, perLabel: 'per 1M tokens' },
  { unit: 'output_token', label: 'Output tokens', per: 1_000_000, perLabel: 'per 1M tokens' },
  { unit: 'reasoning_token', label: 'Thinking tokens', per: 1_000_000, perLabel: 'per 1M tokens' },
  { unit: 'input_image', label: 'Input images', per: 1, perLabel: 'per image' },
  { unit: 'image_generated', label: 'Generated images', per: 1, perLabel: 'per image' },
  { unit: 'image_embedding', label: 'Image embeddings', per: 1, perLabel: 'per image' },
  { unit: 'text_embedding_char', label: 'Text embedding characters', per: 1_000_000, perLabel: 'per 1M characters' },
  { unit: 'audio_second', label: 'Audio', per: 3_600, perLabel: 'per hour' },
  { unit: 'tts_character', label: 'Speech characters', per: 1_000_000, perLabel: 'per 1M characters' },
  { unit: 'request', label: 'Requests', per: 1, perLabel: 'per request' },
  { unit: 'cache_token_hour', label: 'Cache storage', per: 1_000_000, perLabel: 'per 1M tokens per hour' },
];

export function priceUnitInfo(unit: string): { label: string; per: number; perLabel: string } {
  return PRICE_UNITS.find((row) => row.unit === unit) ?? { label: unit, per: 1, perLabel: 'per unit' };
}

/** "$0.30 per 1M tokens" (≈ XAF) from a per-unit micro-dollar price. */
export function formatUnitPrice(unit: string, microsPerUnit: number, xafPerUsd?: number | null): string {
  const info = priceUnitInfo(unit);
  const usd = (microsPerUnit * info.per) / 1_000_000;
  const digits = usd !== 0 && usd < 0.01 ? 6 : usd < 1 ? 4 : 2;
  const dollars = `$${Number(usd.toFixed(digits)).toString()}`;
  const xaf =
    xafPerUsd != null && Number.isFinite(xafPerUsd) && xafPerUsd > 0
      ? formatUsdXafBracket(usd, xafPerUsd)
      : '';
  return `${dollars}${xaf} ${info.perLabel}`;
}

export function featureLabel(feature: string): string {
  if (FEATURE_LABEL[feature]) return FEATURE_LABEL[feature];
  if (feature.startsWith('catalog_import:')) return `Catalog import · ${feature.slice('catalog_import:'.length)}`;
  return feature;
}
