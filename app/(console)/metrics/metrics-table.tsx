'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDuration, formatPercent } from '../../../lib/format';
import type { ShopMetrics } from '../../../lib/types';
import Pagination, { pageCountFor, paginate } from '../../pagination';

const PAGE_SIZE = 20;

type SortKey =
  | 'name'
  | 'aiReplies7d'
  | 'inbound7d'
  | 'firstReplyP50Seconds'
  | 'handoffs30d'
  | 'takeovers30d'
  | 'catalog';

const COLUMNS: { key: SortKey; label: string; right?: boolean }[] = [
  { key: 'name', label: 'Shop' },
  { key: 'aiReplies7d', label: 'AI replies, 7 d', right: true },
  { key: 'inbound7d', label: 'Messages / day', right: true },
  { key: 'firstReplyP50Seconds', label: 'First reply p50 · p95', right: true },
  { key: 'handoffs30d', label: 'Handoffs, 30 d', right: true },
  { key: 'takeovers30d', label: 'Takeovers, 30 d', right: true },
  { key: 'catalog', label: 'Catalog photo · floor · stock', right: true },
];

function catalogScore(shop: ShopMetrics): number {
  if (shop.products === 0) return -1;
  return (shop.productsWithPhoto + shop.productsWithFloor + shop.productsWithStock) / (3 * shop.products);
}

function sortValue(shop: ShopMetrics, key: SortKey): number | string {
  if (key === 'name') return shop.name.toLowerCase();
  if (key === 'catalog') return catalogScore(shop);
  if (key === 'firstReplyP50Seconds') return shop.firstReplyP50Seconds ?? Number.POSITIVE_INFINITY;
  return shop[key];
}

function retention(value: boolean | null): string {
  if (value === null) return 'Too new';
  return value ? 'Active' : 'Inactive';
}

export default function MetricsTable({ shops }: { shops: ShopMetrics[] }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'aiReplies7d', desc: true });
  const [page, setPage] = useState(0);

  const rows = useMemo(
    () =>
      [...shops].sort((a, b) => {
        const left = sortValue(a, sort.key);
        const right = sortValue(b, sort.key);
        const order = left < right ? -1 : left > right ? 1 : 0;
        return sort.desc ? -order : order;
      }),
    [shops, sort],
  );

  const currentPage = Math.min(page, pageCountFor(rows.length, PAGE_SIZE) - 1);

  function toggle(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, desc: !current.desc }
        : { key, desc: key !== 'name' && key !== 'firstReplyP50Seconds' },
    );
    setPage(0);
  }

  return (
    <>
      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={column.right ? 'ops-right' : undefined}
                  aria-sort={sort.key === column.key ? (sort.desc ? 'descending' : 'ascending') : undefined}
                >
                  <button
                    type="button"
                    className="ops-sort"
                    data-active={sort.key === column.key || undefined}
                    onClick={() => toggle(column.key)}
                  >
                    {column.label}
                    {sort.key === column.key ? <span aria-hidden="true">{sort.desc ? '↓' : '↑'}</span> : null}
                  </button>
                </th>
              ))}
              <th>Week 2 · week 4</th>
            </tr>
          </thead>
          <tbody>
            {paginate(rows, currentPage, PAGE_SIZE).map((shop) => (
              <tr key={shop.id}>
                <td>
                  <Link href={`/businesses/${shop.id}`} className="ops-shop-name">
                    {shop.name}
                  </Link>
                  <div className="ops-sub">
                    {shop.activeConversations30d} conversations in 30 days
                  </div>
                </td>
                <td className={shop.aiReplies7d > 0 ? 'ops-right num ops-strong' : 'ops-right num ops-faint'}>
                  {shop.aiReplies7d}
                </td>
                <td className="ops-right num">{(shop.inbound7d / 7).toFixed(1)}</td>
                <td className="ops-right num">
                  {shop.firstReplyP50Seconds === null ? (
                    <span className="ops-faint">—</span>
                  ) : (
                    <>
                      {formatDuration(shop.firstReplyP50Seconds)}
                      <span className="ops-faint"> · {formatDuration(shop.firstReplyP95Seconds)}</span>
                    </>
                  )}
                </td>
                <td className="ops-right num">
                  {shop.handoffs30d}
                  {shop.handoffAnswerP50Seconds !== null ? (
                    <div className="ops-sub">answered in {formatDuration(shop.handoffAnswerP50Seconds)}</div>
                  ) : null}
                </td>
                <td className="ops-right num">
                  {shop.takeovers30d}
                  <div className="ops-sub">{formatPercent(shop.takeovers30d, shop.activeConversations30d)} of chats</div>
                </td>
                <td className="ops-right num">
                  {shop.products === 0 ? (
                    <span className="ops-faint">No products</span>
                  ) : (
                    <>
                      {formatPercent(shop.productsWithPhoto, shop.products)} · {formatPercent(shop.productsWithFloor, shop.products)} ·{' '}
                      {formatPercent(shop.productsWithStock, shop.products)}
                      <div className="ops-sub">{shop.products} products</div>
                    </>
                  )}
                </td>
                <td className="ops-muted">
                  {retention(shop.activeWeek2)} · {retention(shop.activeWeek4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={currentPage} pageSize={PAGE_SIZE} total={rows.length} noun="shops" onChange={setPage} />
    </>
  );
}
