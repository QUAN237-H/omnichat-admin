import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDate, formatUnitPrice, priceUnitInfo } from '../../../../lib/format';
import { loadFxSnapshot } from '../../../../lib/fx-server';
import { ArrowLeft } from '../../../../lib/icons';
import type { FleetUsageResponse, PricesResponse } from '../../../../lib/types';
import { workerGet } from '../../../../lib/worker';
import { StatePanel } from '../../../state-screen';
import FxRateBar from '../../fx-rate-bar';
import PriceForm from './price-form';

export const metadata: Metadata = { title: 'Model prices' };

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string; model?: string }>;
}) {
  const params = await searchParams;
  const [prices, usage, fx] = await Promise.all([
    workerGet<PricesResponse>('/admin/prices'),
    workerGet<FleetUsageResponse>('/admin/usage?days=30'),
    loadFxSnapshot(),
  ]);
  if (!prices.ok) {
    return <StatePanel status={prices.status} error={prices.error} code={prices.code} />;
  }

  const missing = usage.ok ? usage.data.byModel.filter((row) => row.priceMissing > 0) : [];
  const rows = prices.data.prices;
  const xaf = fx.rate;

  return (
    <main className="ops-page">
      <div className="back-link">
        <Link href="/costs">
          <ArrowLeft size={16} aria-hidden="true" />
          AI costs
        </Link>
      </div>

      <header className="page-header">
        <div>
          <h1>Model prices</h1>
          <p>
            Built-in list prices cover every model Omni uses, so Costs works with an empty table. Add a row only to
            override a rate (same provider, model, and unit). Overrides apply from their start date forward.
          </p>
        </div>
      </header>

      <FxRateBar />

      {missing.length > 0 ? (
        <section className="desk-group">
          <div className="desk-group-head">
            <h2>Used in the last 30 days with no price</h2>
            <span className="desk-group-count">{missing.length}</span>
          </div>
          <div className="desk-list">
            {missing.map((row) => (
              <div key={`${row.provider}/${row.model}`} className="desk-lead">
                <span>
                  <strong>{row.model}</strong>
                  <span className="ops-sub">
                    {' '}
                    · {row.provider} · {row.priceMissing === 1 ? 'one unpriced call' : `${row.priceMissing} unpriced calls`}
                  </span>
                </span>
                <span className="ops-lead-action">
                  <Link
                    className="btn"
                    href={`/costs/prices?provider=${encodeURIComponent(row.provider)}&model=${encodeURIComponent(row.model)}`}
                    scroll={false}
                  >
                    Fill in below
                  </Link>
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="desk-group">
        <div className="desk-group-head">
          <h2>Add a price</h2>
        </div>
        <PriceForm
          key={`${params.provider ?? ''}/${params.model ?? ''}`}
          provider={params.provider ?? ''}
          model={params.model ?? ''}
        />
      </section>

      <section className="desk-group">
        <div className="desk-group-head">
          <h2>Prices</h2>
          <span className="desk-group-count">{rows.length}</span>
        </div>
        <div className="import-table-wrap ops-table-wrap">
          <table className="import-table ops-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Charged for</th>
                <th className="ops-right">Price</th>
                <th>From</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="ops-shop-name">{row.model}</span>
                    <div className="ops-sub">
                      {row.provider}
                      {row.builtIn ? ' · built-in' : ' · override'}
                    </div>
                  </td>
                  <td>{priceUnitInfo(row.unit).label}</td>
                  <td className="ops-right num">{formatUnitPrice(row.unit, row.priceMicrosPerUnit, xaf)}</td>
                  <td className="ops-muted">{formatDate(row.effectiveFrom)}</td>
                  <td className="ops-muted">{row.sourceNote ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
