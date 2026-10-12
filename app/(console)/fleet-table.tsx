'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { attentionReasons, whatsappHealth } from '../../lib/attention';
import { formatPercent, formatPhone, formatUsd, formatXaf, timeAgo } from '../../lib/format';
import { LayoutGrid, LayoutList, Search, X } from '../../lib/icons';
import type { FleetAi, FleetShop } from '../../lib/types';
import { Art3D } from '../brand';
import Pagination, { pageCountFor, paginate } from '../pagination';
import WhatsAppBadge from '../whatsapp-badge';

const PAGE_SIZE = 20;
const LAYOUT_KEY = 'omni-ops-fleet-layout';

type LayoutMode = 'table' | 'grid';

type SortKey =
  | 'name'
  | 'whatsapp'
  | 'inbound24h'
  | 'problems'
  | 'aiCost'
  | 'lastInboundAt'
  | 'openDeals'
  | 'agreedValue'
  | 'createdAt';

const WHATSAPP_RANK: Record<string, number> = { invalid: 0, pairing: 1, none: 2, connected: 3 };

function sortValue(shop: FleetShop, key: SortKey): number | string {
  switch (key) {
    case 'name':
      return shop.name.toLowerCase();
    case 'whatsapp':
      return WHATSAPP_RANK[shop.whatsapp.status ?? 'none'] ?? 2;
    case 'problems':
      return shop.failed24h + shop.stuck;
    case 'aiCost':
      return shop.ai?.cost24hMicros ?? -1;
    case 'lastInboundAt':
      return shop.lastInboundAt ? Date.parse(shop.lastInboundAt) : 0;
    case 'createdAt':
      return Date.parse(shop.createdAt);
    case 'agreedValue':
      return Number(shop.agreedValue);
    default:
      return shop[key];
  }
}

const COLUMNS: { key: SortKey; label: string; right?: boolean }[] = [
  { key: 'name', label: 'Shop' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'inbound24h', label: 'Messages, 24 h', right: true },
  { key: 'problems', label: 'Failed / stuck', right: true },
  { key: 'aiCost', label: 'AI cost, 24 h', right: true },
  { key: 'lastInboundAt', label: 'Last customer' },
  { key: 'openDeals', label: 'Open deals', right: true },
  { key: 'agreedValue', label: 'Agreed', right: true },
  { key: 'createdAt', label: 'Joined' },
];

function initials(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '·';
}

function readLayout(): LayoutMode {
  if (typeof window === 'undefined') return 'table';
  return window.localStorage.getItem(LAYOUT_KEY) === 'grid' ? 'grid' : 'table';
}

function AiCell({ ai }: { ai: FleetAi | null }) {
  if (!ai) return <td className="ops-right ops-faint">—</td>;
  const allowance = ai.allowanceMicros + ai.bonusMicros;
  const share = allowance > 0 ? ai.periodCostMicros / allowance : null;
  return (
    <td className="ops-right">
      <span className={ai.cost24hMicros > 0 ? 'num ops-strong' : 'num ops-faint'}>{formatUsd(ai.cost24hMicros)}</span>
      <div className={share !== null && share >= 0.8 ? 'ops-sub ops-bad' : 'ops-sub'}>
        {share === null ? 'No allowance set' : `${formatPercent(ai.periodCostMicros, allowance)} of allowance`}
      </div>
    </td>
  );
}

function ShopAvatar({ shop, size = 36 }: { shop: FleetShop; size?: number }) {
  if (shop.logoUrl) {
    return <img className="ops-logo" src={shop.logoUrl} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  }
  return (
    <span className="ops-logo ops-logo-fallback" aria-hidden="true" style={{ width: size, height: size }}>
      {initials(shop.name)}
    </span>
  );
}

function shopCockpitHref(shop: FleetShop): string {
  const health = whatsappHealth(shop.whatsapp);
  if (health === 'banned' || health === 'logged_out' || health === 'offline' || health === 'pairing') {
    return `/businesses/${shop.id}?tab=whatsapp`;
  }
  if (shop.stuck > 0 || shop.failed24h > 0) return `/businesses/${shop.id}?tab=reliability`;
  const allowance = (shop.ai?.allowanceMicros ?? 0) + (shop.ai?.bonusMicros ?? 0);
  if (shop.ai && allowance > 0 && shop.ai.periodCostMicros / allowance >= 0.8) {
    return `/businesses/${shop.id}?tab=money`;
  }
  return `/businesses/${shop.id}`;
}

function ShopCard({ shop, now }: { shop: FleetShop; now: number }) {
  const reasons = attentionReasons(shop);
  const problems = shop.failed24h + shop.stuck;
  const trouble = problems > 0 || reasons.length > 0;
  return (
    <Link href={shopCockpitHref(shop)} className="ops-card" data-trouble={trouble || undefined}>
      <div className="ops-card-head">
        <ShopAvatar shop={shop} size={44} />
        <div className="ops-shop-text">
          <span className="ops-shop-name">{shop.name}</span>
          <span className="ops-shop-sub">
            {reasons.length > 0 ? (
              <span className="ops-reason">{reasons[0]}</span>
            ) : (
              (shop.ownerEmail ?? 'No owner email')
            )}
          </span>
        </div>
      </div>
      <div className="ops-card-wa">
        <WhatsAppBadge whatsapp={shop.whatsapp} />
        <span className="ops-sub phone">{formatPhone(shop.whatsapp.phoneNumber) || '—'}</span>
      </div>
      <dl className="ops-card-stats">
        <div>
          <dt>Msgs 24h</dt>
          <dd className="num">
            {shop.inbound24h}
            <span className="ops-faint">/{shop.outbound24h}</span>
          </dd>
        </div>
        <div>
          <dt>Failed/stuck</dt>
          <dd className={problems > 0 ? 'num ops-bad' : 'num ops-faint'}>
            {shop.failed24h}/{shop.stuck}
          </dd>
        </div>
        <div>
          <dt>Agreed</dt>
          <dd className="num">{formatXaf(shop.agreedValue)}</dd>
        </div>
        <div>
          <dt>AI 24h</dt>
          <dd className="num">{shop.ai ? formatUsd(shop.ai.cost24hMicros) : '—'}</dd>
        </div>
      </dl>
      <div className="ops-card-foot">
        <span>Last customer {timeAgo(shop.lastInboundAt, now)}</span>
        <span>{shop.openDeals} open</span>
      </div>
    </Link>
  );
}

export default function FleetTable({
  shops,
  totalCount,
  attentionCount,
  view,
  generatedAt,
}: {
  shops: FleetShop[];
  totalCount: number;
  attentionCount: number;
  view: 'all' | 'attention';
  generatedAt: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<LayoutMode>('table');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>(() =>
    view === 'attention' ? { key: 'problems', desc: true } : { key: 'createdAt', desc: true },
  );
  const [page, setPage] = useState(0);
  const now = Date.parse(generatedAt);

  useEffect(() => {
    setLayout(readLayout());
  }, []);

  function chooseLayout(next: LayoutMode) {
    setLayout(next);
    window.localStorage.setItem(LAYOUT_KEY, next);
  }

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? shops.filter((shop) =>
          [shop.name, shop.ownerEmail ?? '', shop.whatsapp.phoneNumber ?? '', shop.adminNumber ?? '']
            .join(' ')
            .toLowerCase()
            .includes(needle),
        )
      : shops;
    return [...filtered].sort((a, b) => {
      const left = sortValue(a, sort.key);
      const right = sortValue(b, sort.key);
      const order = left < right ? -1 : left > right ? 1 : 0;
      return sort.desc ? -order : order;
    });
  }, [shops, query, sort]);

  const currentPage = Math.min(page, pageCountFor(rows.length, PAGE_SIZE) - 1);
  const pageRows = paginate(rows, currentPage, PAGE_SIZE);

  function toggle(key: SortKey) {
    setSort((current) => (current.key === key ? { key, desc: !current.desc } : { key, desc: key !== 'name' }));
    setPage(0);
  }

  return (
    <section className="ops-panel">
      <div className="ops-toolbar">
        <div className="ops-seg" role="group" aria-label="Filter shops">
          <Link
            href="/"
            className={view === 'attention' ? 'ops-seg-btn is-active' : 'ops-seg-btn'}
            aria-current={view === 'attention' ? 'page' : undefined}
            data-warn={attentionCount > 0 || undefined}
          >
            Attention <span className="ops-seg-count">{attentionCount}</span>
          </Link>
          <Link
            href="/shops"
            className={view === 'all' ? 'ops-seg-btn is-active' : 'ops-seg-btn'}
            aria-current={view === 'all' ? 'page' : undefined}
          >
            All shops <span className="ops-seg-count">{totalCount}</span>
          </Link>
        </div>
        <div className="ops-toolbar-end">
          <div className="ops-search">
            <Search size={16} className="ops-search-icon" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search name, email or number"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              aria-label="Search shops"
            />
            {query ? (
              <button
                type="button"
                className="ops-search-clear"
                onClick={() => {
                  setQuery('');
                  setPage(0);
                }}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            ) : null}
          </div>
          <div className="ops-layout" role="group" aria-label="Layout">
            <button
              type="button"
              className={layout === 'table' ? 'ops-layout-btn is-active' : 'ops-layout-btn'}
              aria-pressed={layout === 'table'}
              aria-label="Table view"
              onClick={() => chooseLayout('table')}
            >
              <LayoutList size={16} />
            </button>
            <button
              type="button"
              className={layout === 'grid' ? 'ops-layout-btn is-active' : 'ops-layout-btn'}
              aria-pressed={layout === 'grid'}
              aria-label="Grid view"
              onClick={() => chooseLayout('grid')}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="ops-empty">
          <Art3D name={view === 'attention' ? 'check' : 'store'} size={56} />
          <p className="ops-empty-title">
            {query ? 'No shop matches that search' : view === 'attention' ? 'Every shop is healthy' : 'No shops yet'}
          </p>
          <p>
            {query
              ? 'Try a shop name, the owner’s email or a WhatsApp number.'
              : view === 'attention'
                ? 'WhatsApp is live everywhere and nothing failed or got stuck today.'
                : 'Shops appear here as soon as an owner finishes onboarding.'}
          </p>
        </div>
      ) : layout === 'grid' ? (
        <div className="ops-grid">
          {pageRows.map((shop) => (
            <ShopCard key={shop.id} shop={shop} now={now} />
          ))}
        </div>
      ) : (
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
              </tr>
            </thead>
            <tbody>
              {pageRows.map((shop) => {
                const reasons = attentionReasons(shop);
                const problems = shop.failed24h + shop.stuck;
                return (
                  <tr
                    key={shop.id}
                    className="ops-row"
                    data-trouble={problems > 0 || reasons.length > 0 || undefined}
                    onClick={() => router.push(shopCockpitHref(shop))}
                  >
                    <td className="ops-col-shop">
                      <Link
                        href={shopCockpitHref(shop)}
                        className="ops-shop"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ShopAvatar shop={shop} />
                        <span className="ops-shop-text">
                          <span className="ops-shop-name">{shop.name}</span>
                          <span className="ops-shop-sub">
                            {reasons.length > 0 ? (
                              <span className="ops-reason">{reasons[0]}</span>
                            ) : (
                              (shop.ownerEmail ?? 'No owner email')
                            )}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <WhatsAppBadge whatsapp={shop.whatsapp} />
                      <div className="ops-sub phone">{formatPhone(shop.whatsapp.phoneNumber)}</div>
                    </td>
                    <td className="ops-right">
                      <span className="num ops-strong">{shop.inbound24h}</span>
                      <div className="ops-sub">{shop.outbound24h} replies</div>
                    </td>
                    <td className="ops-right">
                      <span className={problems > 0 ? 'num ops-strong ops-bad' : 'num ops-faint'}>
                        {shop.failed24h} / {shop.stuck}
                      </span>
                    </td>
                    <AiCell ai={shop.ai} />
                    <td className="ops-muted">{timeAgo(shop.lastInboundAt, now)}</td>
                    <td className="ops-right num">{shop.openDeals}</td>
                    <td className="ops-right price">{formatXaf(shop.agreedValue)}</td>
                    <td className="ops-muted">{timeAgo(shop.createdAt, now)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 ? (
        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={rows.length} noun="shops" onChange={setPage} />
      ) : null}
    </section>
  );
}
