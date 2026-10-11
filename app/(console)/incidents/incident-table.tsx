import Link from 'next/link';
import { formatDate, incidentDetail, incidentKindLabel, timeAgo } from '../../../lib/format';
import type { Incident, IncidentSeverity } from '../../../lib/types';

const SEVERITY: Record<IncidentSeverity, { label: string; className: string }> = {
  error: { label: 'Error', className: 'badge danger' },
  warn: { label: 'Warning', className: 'badge warning' },
  info: { label: 'Info', className: 'badge' },
};

export default function IncidentTable({
  incidents,
  now,
  showShop,
}: {
  incidents: Incident[];
  now: number;
  showShop: boolean;
}) {
  return (
    <div className="import-table-wrap ops-table-wrap">
      <table className="import-table ops-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Severity</th>
            {showShop ? <th>Shop</th> : null}
            <th>What happened</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => {
            const severity = SEVERITY[incident.severity];
            return (
              <tr key={incident.id}>
                <td className="ops-muted" title={formatDate(incident.occurredAt)}>
                  {timeAgo(incident.occurredAt, now)}
                </td>
                <td>
                  <span className={severity.className}>{severity.label}</span>
                </td>
                {showShop ? (
                  <td>
                    {incident.businessId ? (
                      <Link href={`/businesses/${incident.businessId}?tab=reliability`}>
                        {incident.businessName ?? 'Deleted shop'}
                      </Link>
                    ) : (
                      <span className="ops-muted">All shops</span>
                    )}
                  </td>
                ) : null}
                <td>{incidentKindLabel(incident.kind)}</td>
                <td className="ops-wrap ops-muted">{incidentDetail(incident.detail) ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
