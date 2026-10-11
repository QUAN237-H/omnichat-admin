import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { auditActionLabel, formatDate, timeAgo } from '../../../lib/format';
import type { AuditResponse } from '../../../lib/types';
import { workerGet } from '../../../lib/worker';
import { Art3D } from '../../brand';
import { StatePanel } from '../../state-screen';
import UrlPager from '../../url-pager';

export const metadata: Metadata = { title: 'Audit log' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function statusOf(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const status = (snapshot as Record<string, unknown>).status;
  return typeof status === 'string' ? status : null;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string; page?: string }>;
}) {
  const params = await searchParams;
  const businessId = params.businessId && UUID.test(params.businessId) ? params.businessId : undefined;
  const page = Math.max(0, Number.parseInt(params.page ?? '0', 10) || 0);

  const query = new URLSearchParams({ page: String(page) });
  if (businessId) query.set('businessId', businessId);
  const result = await workerGet<AuditResponse>(`/admin/audit?${query.toString()}`);
  if (!result.ok) {
    return <StatePanel status={result.status} error={result.error} code={result.code} />;
  }

  const { entries, total, pageSize, generatedAt } = result.data;
  const now = new Date(generatedAt).getTime();
  const shopName = businessId ? (entries[0]?.businessName ?? 'this shop') : null;

  return (
    <main className="ops-page">
      <header className="page-header">
        <div>
          <h1>Audit log</h1>
          <p>
            Every operator action, who did it, why, and the state before and after. Entries cannot be edited or deleted.
          </p>
        </div>
      </header>

      {businessId ? (
        <p className="ops-group-note">
          Showing {shopName} only. <Link href="/audit">Show every shop</Link>
        </p>
      ) : null}

      {entries.length === 0 ? (
        <div className="desk-list">
          <div className="empty-state">
            <Art3D name="key" size={72} />
            <p className="empty-title">Nothing logged yet</p>
            <p>Pausing or resuming a shop&apos;s WhatsApp shows up here, with the reason you gave.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="import-table-wrap ops-table-wrap">
            <table className="import-table ops-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Operator</th>
                  <th>Shop</th>
                  <th>Action</th>
                  <th>Reason</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const before = statusOf(entry.before);
                  const after = statusOf(entry.after);
                  return (
                    <tr key={entry.id}>
                      <td className="ops-muted" title={formatDate(entry.occurredAt)}>
                        {timeAgo(entry.occurredAt, now)}
                      </td>
                      <td>{entry.adminEmail ?? 'Unknown'}</td>
                      <td>
                        {entry.businessId ? (
                          <Link href={`/businesses/${entry.businessId}?tab=whatsapp`}>
                            {entry.businessName ?? 'Deleted shop'}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{auditActionLabel(entry.action)}</td>
                      <td className="ops-wrap">{entry.reason}</td>
                      <td className="ops-muted ops-audit-change">
                        {before || after ? `${before ?? '—'} → ${after ?? '—'}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Suspense>
            <UrlPager page={page} pageSize={pageSize} total={total} noun="entries" />
          </Suspense>
        </>
      )}
    </main>
  );
}
