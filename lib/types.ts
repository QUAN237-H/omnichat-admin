/** Response shapes of the worker's /admin/* routes (src/db/adminFleet.ts). */

export type SessionStatus = 'pairing' | 'connected' | 'invalid' | null;

export type FleetWhatsApp = {
  status: SessionStatus;
  phoneNumber: string | null;
  hasCreds: boolean;
  lastConnectedAt: string | null;
  invalidReason: string | null;
  /** Missing from older workers. */
  lastSeenAt?: string | null;
  linkedAt?: string | null;
  stateSince?: string | null;
};

export type FleetRow = {
  id: string;
  name: string;
  plan: string;
  logoUrl: string | null;
  createdAt: string;
  ownerEmail: string | null;
  adminNumber: string | null;
  whatsapp: FleetWhatsApp;
  products: number;
  customers: number;
  inbound24h: number;
  outbound24h: number;
  failed24h: number;
  stuck: number;
  lastInboundAt: string | null;
  lastReplyAt: string | null;
  openDeals: number;
  agreedValue: string;
};

/** Micro-dollars; null until migration 0070 is applied. */
export type FleetAi = {
  cost24hMicros: number;
  attempts24h: number;
  failures24h: number;
  periodCostMicros: number;
  allowanceMicros: number;
  bonusMicros: number;
};

export type FleetShop = FleetRow & { ai: FleetAi | null };

export type FleetResponse = { businesses: FleetShop[]; generatedAt: string };

export type ShopMetrics = {
  id: string;
  name: string;
  createdAt: string;
  whatsappStatus: SessionStatus;
  aiReplies7d: number;
  inbound7d: number;
  activeConversations30d: number;
  handoffs30d: number;
  handoffAnswerP50Seconds: number | null;
  takeovers30d: number;
  firstReplyP50Seconds: number | null;
  firstReplyP95Seconds: number | null;
  repliedMessages7d: number;
  products: number;
  productsWithPhoto: number;
  productsWithFloor: number;
  productsWithStock: number;
  activeWeek2: boolean | null;
  activeWeek4: boolean | null;
};

export type FleetMetrics = {
  shops: ShopMetrics[];
  firstReply: { p50Seconds: number | null; p95Seconds: number | null; replied: number };
  adoption: { feature: string; shops7d: number; shops30d: number }[];
  funnel: { status: string; count: number; value: string }[];
  generatedAt: string;
};

export type AdminMe = { userId: string; role: 'operator' | 'owner' };

export type BusinessDetail = {
  business: FleetRow;
  members: { email: string | null; role: string; joinedAt: string; lastSignInAt: string | null }[];
  sessions: (FleetWhatsApp & { label: string; updatedAt: string })[];
  traffic: { day: string; inbound: number; outbound: number; failed: number }[];
  stages: { status: string; count: number; value: string }[];
  recentFailures: {
    id: string;
    conversationId: string;
    direction: string;
    type: string;
    error: string | null;
    createdAt: string;
  }[];
  conversations: { total: number; humanControlling: number; open: number };
  reliability: { kind: string; failed7d: number; stuck: number }[];
  usage: { feature: string; lastAt: string | null; last7d: number; last30d: number }[];
  outcomes: { conversations30d: number; handoffs30d: number; handoffsOpen: number; takeovers30d: number };
  connectionEvents: { id: string; event: string; detail: unknown; occurredAt: string }[];
  generatedAt: string;
};

export type AuditEntry = {
  id: string;
  adminUserId: string;
  adminEmail: string | null;
  businessId: string | null;
  businessName: string | null;
  action: string;
  reason: string;
  before: unknown;
  after: unknown;
  requestId: string | null;
  occurredAt: string;
};

export type IncidentSeverity = 'info' | 'warn' | 'error';

export type Incident = {
  id: string;
  businessId: string | null;
  businessName: string | null;
  kind: string;
  severity: IncidentSeverity;
  detail: unknown;
  occurredAt: string;
};

export type IncidentsResponse = {
  entries: Incident[];
  total: number;
  last24h: { error: number; warn: number };
  page: number;
  pageSize: number;
  generatedAt: string;
};

export type AuditResponse = {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  generatedAt: string;
};

/** Costs are estimated micro-dollars (1 USD = 1,000,000). */
export type UsageTotals = {
  costMicros: number;
  attempts: number;
  failures: number;
  priceMissing: number;
  estimated: number;
  wastedMicros: number;
};

export type UsageByShop = UsageTotals & { businessId: string; businessName: string | null; lastAt: string };
export type UsageByFeature = UsageTotals & { feature: string };
export type UsageByModel = UsageTotals & {
  provider: string;
  model: string;
  timeouts: number;
  fallbacks: number;
  p50Ms: number | null;
  p95Ms: number | null;
};
export type UsageDay = UsageTotals & { day: string };

export type FleetUsageResponse = {
  days: number;
  totals: UsageTotals;
  conversations: number;
  unattributed: UsageTotals;
  byShop: UsageByShop[];
  byFeature: UsageByFeature[];
  byModel: UsageByModel[];
  generatedAt: string;
};

export type ShopUsageResponse = {
  days: number;
  totals: UsageTotals;
  byFeature: UsageByFeature[];
  byModel: UsageByModel[];
  daily: UsageDay[];
  period: { startedAt: string; allowanceMicros: number; bonusMicros: number; costMicros: number } | null;
  generatedAt: string;
};

export type ModelPrice = {
  id: string;
  provider: string;
  model: string;
  unit: string;
  priceMicrosPerUnit: number;
  effectiveFrom: string;
  sourceNote: string | null;
};

export type PricesResponse = { prices: ModelPrice[]; generatedAt: string };

export type WaitlistEntry = {
  id: string;
  name: string;
  whatsapp: string;
  sells: string | null;
  lang: 'en' | 'fr';
  createdAt: string;
};

export type WaitlistResponse = {
  entries: WaitlistEntry[];
  total: number;
  summary: { total: number; last7d: number; last30d: number; fr: number; en: number };
  page: number;
  pageSize: number;
  generatedAt: string;
};
