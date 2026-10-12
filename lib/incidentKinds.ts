/** Ops event kinds shown in the Notifications filter (matches src/db/opsEvents.ts). */

export const INCIDENT_KINDS = [
  'whatsapp_ban_risk',
  'whatsapp_session_ended',
  'whatsapp_still_reconnecting',
  'whatsapp_ownership_contested',
  'llm_down',
  'agent_turn_failed',
  'inbound_undecryptable',
  'below_floor_refused',
  'catalog_import_failed',
  'status_post_failed',
  'document_ingest_failed',
  'usage_ledger_write_failed',
] as const;

export type IncidentKind = (typeof INCIDENT_KINDS)[number];

export function isIncidentKind(value: string | undefined): value is IncidentKind {
  return INCIDENT_KINDS.includes(value as IncidentKind);
}
