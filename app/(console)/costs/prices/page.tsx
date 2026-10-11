import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDate, formatUnitPrice, priceUnitInfo } from '../../../../lib/format';
import { ArrowLeft } from '../../../../lib/icons';
import type { FleetUsageResponse, PricesResponse } from '../../../../lib/types';
import { workerGet } from '../../../../lib/worker';
import { Art3D } from '../../../brand';
import { StatePanel } from '../../../state-screen';
import PriceForm from './price-form';

export const metadata: Metadata = { title: 'Model prices' };

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string; model?: string }>;
}) {
  const params = await searchParams;
  const [prices, usage] = await Promise.all([
    workerGet<PricesResponse>('/admin/prices'),
    workerGet<FleetUsageResponse>('/admin/usage?days=30'),
  ]);
  if (!prices.ok) {
    return <StatePanel status={prices.status} error={prices.error} code={prices.code} />;
  }

  const missing = usage.ok ? usage.data.byModel.filter((row) => row.priceMissing > 0) : [];
  const rows = prices.data.prices;

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
            The only source of cost estimates: the worker never has prices in its code. Enter list prices from each
            provider&apos;s pricing page, one row per thing they charge for. A new row with a later date replaces the old
            price from that date.
          </p>
        </div>
      </header>

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
        {rows.length === 0 ? (
          <div className="desk-list">
            <div className="empty-state">
              <Art3D name="sale" size={72} />
              <p className="empty-title">No prices yet</p>
              <p>Until a model has a price, its calls are counted but cost nothing in the estimates.</p>
            </div>
          </div>
        ) : (
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
                      <div className="ops-sub">{row.provider}</div>
                    </td>
                    <td>{priceUnitInfo(row.unit).label}</td>
                    <td className="ops-right num">{formatUnitPrice(row.unit, row.priceMicrosPerUnit)}</td>
                    <td className="ops-muted">{formatDate(row.effectiveFrom)}</td>
                    <td className="ops-muted">{row.sourceNote ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
