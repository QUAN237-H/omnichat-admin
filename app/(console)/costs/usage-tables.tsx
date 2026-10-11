import Link from 'next/link';
import { aiFeatureLabel, formatMs, formatPercent, formatUsd, timeAgo } from '../../../lib/format';
import type { UsageByFeature, UsageByModel, UsageByShop, UsageTotals } from '../../../lib/types';
import { Art3D, type Art3DName } from '../../brand';

export function UsageStats({
  totals,
  label,
  conversations,
}: {
  totals: UsageTotals;
  label: string;
  conversations?: number;
}) {
  const failRate = totals.attempts > 0 ? totals.failures / totals.attempts : 0;
  return (
    <section className="ops-strip" aria-label={label}>
      <Stat
        label="Estimated cost"
        value={formatUsd(totals.costMicros)}
        sub={totals.wastedMicros > 0 ? `${formatUsd(totals.wastedMicros)} on failed calls` : 'Nothing lost to failed calls'}
      />
      {conversations !== undefined ? (
        <Stat
          label="Per conversation"
          value={conversations > 0 ? formatUsd(totals.costMicros / conversations) : '—'}
          sub={conversations === 1 ? '1 conversation' : `${conversations.toLocaleString('en-US')} conversations`}
        />
      ) : null}
      <Stat
        label="AI calls"
        value={totals.attempts.toLocaleString('en-US')}
        sub={totals.estimated > 0 ? `${totals.estimated.toLocaleString('en-US')} estimated size` : 'Sizes from provider'}
      />
      <Stat
        label="Failed calls"
        value={formatPercent(totals.failures, totals.attempts)}
        sub={`${totals.failures.toLocaleString('en-US')} of ${totals.attempts.toLocaleString('en-US')}`}
        tone={failRate > 0.1 ? 'danger' : undefined}
      />
      <Stat
        label="Unpriced calls"
        value={totals.priceMissing.toLocaleString('en-US')}
        sub={totals.priceMissing > 0 ? 'Missing from the total' : 'Every model priced'}
        tone={totals.priceMissing > 0 ? 'danger' : undefined}
      />
    </section>
  );
}

export function Stat({
  label,
  value,
  of,
  sub,
  tone,
  href,
}: {
  /** Kept optional for call-site compatibility; ignored — strip is icon-free. */
  art?: Art3DName;
  label: string;
  value: string | number;
  of?: string;
  sub?: string;
  tone?: 'danger' | 'warning';
  href?: string;
}) {
  const body = (
    <>
      <span className="ops-strip-label">{label}</span>
      <strong className="ops-strip-value num">
        {value}
        {of ? <span className="ops-strip-unit"> {of}</span> : null}
      </strong>
      {sub ? <span className="ops-strip-meta">{sub}</span> : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="ops-strip-item ops-strip-link" data-tone={tone}>
        {body}
      </Link>
    );
  }
  return (
    <div className="ops-strip-item" data-tone={tone}>
      {body}
    </div>
  );
}

function CostCell({ row }: { row: UsageTotals }) {
  return (
    <td className={row.costMicros > 0 ? 'ops-right num ops-strong' : 'ops-right num ops-faint'}>
      {formatUsd(row.costMicros)}
      {row.priceMissing > 0 ? <div className="ops-sub">+ {row.priceMissing} unpriced</div> : null}
    </td>
  );
}

function CallsCells({ row }: { row: UsageTotals }) {
  return (
    <>
      <td className="ops-right num">
        {row.attempts.toLocaleString('en-US')}
        {row.estimated > 0 ? <div className="ops-sub">{row.estimated} estimated</div> : null}
      </td>
      <td className={row.failures > 0 ? 'ops-right num' : 'ops-right num ops-faint'}>
        {row.failures}
        {row.failures > 0 ? <div className="ops-sub">{formatPercent(row.failures, row.attempts)}</div> : null}
      </td>
    </>
  );
}

export function ShopCostTable({ rows, now, days }: { rows: UsageByShop[]; now: number; days: number }) {
  return (
    <div className="import-table-wrap ops-table-wrap">
      <table className="import-table ops-table">
        <thead>
          <tr>
            <th>Shop</th>
            <th className="ops-right">Estimated cost</th>
            <th className="ops-right">AI calls</th>
            <th className="ops-right">Failed</th>
            <th>Last call</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.businessId}>
              <td>
                <Link href={`/businesses/${row.businessId}?tab=usage&days=${days}`} className="ops-shop-name">
                  {row.businessName ?? 'Deleted shop'}
                </Link>
              </td>
              <CostCell row={row} />
              <CallsCells row={row} />
              <td className="ops-muted">{timeAgo(row.lastAt, now)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FeatureCostTable({ rows }: { rows: UsageByFeature[] }) {
  return (
    <div className="import-table-wrap ops-table-wrap">
      <table className="import-table ops-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th className="ops-right">Estimated cost</th>
            <th className="ops-right">AI calls</th>
            <th className="ops-right">Failed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature}>
              <td>{aiFeatureLabel(row.feature)}</td>
              <CostCell row={row} />
              <CallsCells row={row} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ModelCostTable({ rows }: { rows: UsageByModel[] }) {
  return (
    <div className="import-table-wrap ops-table-wrap">
      <table className="import-table ops-table">
        <thead>
          <tr>
            <th>Model</th>
            <th className="ops-right">Estimated cost</th>
            <th className="ops-right">AI calls</th>
            <th className="ops-right">Failed</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.provider}/${row.model}`}>
              <td>
                <span className="ops-shop-name">{row.model}</span>
                <div className="ops-sub">{row.provider}</div>
              </td>
              <CostCell row={row} />
              <CallsCells row={row} />
              <td>
                {row.priceMissing > 0 ? (
                  <Link
                    className="badge warning"
                    href={`/costs/prices?provider=${encodeURIComponent(row.provider)}&model=${encodeURIComponent(row.model)}`}
                  >
                    Add price
                  </Link>
                ) : (
                  <span className="badge ok">Priced</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Spec §31.2: provider errors, timeouts and latency per model. */
export function ModelReliabilityTable({ rows }: { rows: UsageByModel[] }) {
  return (
    <div className="import-table-wrap ops-table-wrap">
      <table className="import-table ops-table">
        <thead>
          <tr>
            <th>Model</th>
            <th className="ops-right">AI calls</th>
            <th className="ops-right">Failed</th>
            <th className="ops-right">Timed out</th>
            <th className="ops-right">Fallback calls</th>
            <th className="ops-right">Typical time</th>
            <th className="ops-right">Slowest 5%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.provider}/${row.model}`}>
              <td>
                <span className="ops-shop-name">{row.model}</span>
                <div className="ops-sub">{row.provider}</div>
              </td>
              <td className="ops-right num">{row.attempts.toLocaleString('en-US')}</td>
              <td className={row.failures > 0 ? 'ops-right num ops-strong ops-bad' : 'ops-right num ops-faint'}>
                {row.failures}
                {row.failures > 0 ? <div className="ops-sub">{formatPercent(row.failures, row.attempts)}</div> : null}
              </td>
              <td className={row.timeouts > 0 ? 'ops-right num ops-bad' : 'ops-right num ops-faint'}>{row.timeouts}</td>
              <td className={row.fallbacks > 0 ? 'ops-right num' : 'ops-right num ops-faint'}>{row.fallbacks}</td>
              <td className="ops-right num">{formatMs(row.p50Ms)}</td>
              <td className="ops-right num">{formatMs(row.p95Ms)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NoUsage({ children }: { children: string }) {
  return (
    <div className="desk-list">
      <div className="empty-state">
        <Art3D name="analytics" size={72} />
        <p className="empty-title">No AI calls yet</p>
        <p>{children}</p>
      </div>
    </div>
  );
}
