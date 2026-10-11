'use client';

import { useState } from 'react';
import { timeAgo } from '../../../../lib/format';
import type { BusinessDetail } from '../../../../lib/types';
import Pagination, { paginate } from '../../../pagination';

const PAGE_SIZE = 10;

export default function FailuresTable({
  failures,
  generatedAt,
}: {
  failures: BusinessDetail['recentFailures'];
  generatedAt: number;
}) {
  const [page, setPage] = useState(0);

  return (
    <>
      <div className="import-table-wrap ops-table-wrap">
        <table className="import-table ops-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Direction</th>
              <th>Type</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {paginate(failures, page, PAGE_SIZE).map((failure) => (
              <tr key={failure.id}>
                <td className="ops-muted">{timeAgo(failure.createdAt, generatedAt)}</td>
                <td>{failure.direction === 'inbound' ? 'From customer' : 'Reply'}</td>
                <td className="ops-muted">{failure.type}</td>
                <td className="ops-wrap">{failure.error ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={failures.length} noun="failures" onChange={setPage} />
    </>
  );
}
