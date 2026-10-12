'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { INCIDENT_KINDS } from '../../../lib/incidentKinds';
import { incidentKindLabel } from '../../../lib/format';

export default function KindFilter({ value }: { value: string | undefined }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <label className="ops-filter-field">
      <span className="ops-muted">Kind</span>
      <select
        className="ops-select"
        aria-label="Filter by kind"
        value={value ?? ''}
        onChange={(event) => {
          const next = new URLSearchParams(params?.toString() ?? '');
          next.delete('page');
          const kind = event.target.value;
          if (kind) next.set('kind', kind);
          else next.delete('kind');
          const text = next.toString();
          router.push(text ? `/notifications?${text}` : '/notifications');
        }}
      >
        <option value="">All kinds</option>
        {INCIDENT_KINDS.map((id) => (
          <option key={id} value={id}>
            {incidentKindLabel(id)}
          </option>
        ))}
      </select>
    </label>
  );
}
