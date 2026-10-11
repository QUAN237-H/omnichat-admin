import { downSince, formatDuration, whatsappHealth } from '../lib/attention';
import type { FleetWhatsApp } from '../lib/types';

/** The desk's status badge, with the WhatsApp states an operator cares about. */
export default function WhatsAppBadge({ whatsapp }: { whatsapp: FleetWhatsApp }) {
  const health = whatsappHealth(whatsapp);
  const since = downSince(whatsapp);
  const forHow = since ? ` · ${formatDuration(since)}` : '';
  if (health === 'live') return <span className="badge ok">Live on WhatsApp</span>;
  if (health === 'banned') return <span className="badge danger" title={whatsapp.invalidReason ?? undefined}>Banned{forHow}</span>;
  if (health === 'logged_out') return <span className="badge danger" title={whatsapp.invalidReason ?? undefined}>Logged out{forHow}</span>;
  if (health === 'offline') return <span className="badge danger" title="No heartbeat from the worker">Offline{forHow}</span>;
  if (health === 'paused') return <span className="badge warning">Paused by owner</span>;
  if (health === 'pairing') return <span className="badge warning">{whatsapp.hasCreds ? 'Reconnecting' : 'Pairing'}</span>;
  return <span className="badge">Not linked</span>;
}
