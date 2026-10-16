/** Map an ops event kind to the shop cockpit tab that can act on it. */
export function incidentShopHref(businessId: string, kind: string): string {
  const tab = incidentTab(kind);
  return tab === 'overview' ? `/businesses/${businessId}` : `/businesses/${businessId}?tab=${tab}`;
}

export function incidentTab(kind: string): 'overview' | 'whatsapp' | 'money' | 'reliability' {
  if (kind === 'shop_created') return 'overview';
  if (kind.startsWith('whatsapp_') || kind.startsWith('proxy_pool_')) return 'whatsapp';
  if (kind === 'llm_down' || kind === 'agent_turn_failed' || kind === 'usage_ledger_write_failed') return 'money';
  if (
    kind === 'catalog_import_failed' ||
    kind === 'status_post_failed' ||
    kind === 'document_ingest_failed' ||
    kind === 'below_floor_refused'
  ) {
    return 'reliability';
  }
  return 'reliability';
}
