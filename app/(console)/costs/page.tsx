import type { Metadata } from 'next';
import Link from 'next/link';
import { formatUsd } from '../../../lib/format';
import { loadFxSnapshot } from '../../../lib/fx-server';
import type { FleetUsageResponse } from '../../../lib/types';
import { workerGet } from '../../../lib/worker';
import { StatePanel } from '../../state-screen';
import FxRateBar from '../fx-rate-bar';
import {
  FeatureCostTable,
  ModelCostTable,
  ModelReliabilityTable,
  NoUsage,
  ShopCostTable,
  UsageStats,
} from './usage-tables';
import { WINDOWS, windowDays } from './windows';

export const metadata: Metadata = { title: 'AI costs' };

export default async function CostsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = windowDays((await searchParams).days);
  const [result, fx] = await Promise.all([
    workerGet<FleetUsageResponse>(`/admin/usage?days=${days}`),
    loadFxSnapshot(),
  ]);
  if (!result.ok) {
    return <StatePanel status={result.status} error={result.error} code={result.code} />;
  }

  const usage = result.data;
  const now = Date.parse(usage.generatedAt);
  const missingModels = usage.byModel.filter((row) => row.priceMissing > 0).length;
  const xaf = fx.rate;

  return (
    <main className="ops-page">
      <header className="page-header">
        <div>
          <h1>AI costs</h1>
          <p>
            Every AI provider call, including retries, timeouts and fallbacks, with its estimated cost. Estimates use
            the prices entered on the <Link href="/costs/prices">prices page</Link>; compare with provider invoices
            before billing anyone.
          </p>
        </div>
        <Link href="/costs/prices" className="btn">
          Model prices
        </Link>
      </header>

      <FxRateBar />

      <nav className="chip-group ops-tabs" aria-label="Time window">
        {WINDOWS.map((window) => (
          <Link
            key={window.days}
            href={window.days === 30 ? '/costs' : `/costs?days=${window.days}`}
            className={window.days === days ? 'chip active' : 'chip'}
            aria-current={window.days === days ? 'page' : undefined}
            scroll={false}
          >
            {window.label}
          </Link>
        ))}
      </nav>

      <UsageStats
        totals={usage.totals}
        label={`Last ${days} days`}
        conversations={usage.conversations}
        xafPerUsd={xaf}
      />

      {missingModels > 0 ? (
        <p className="ops-group-note">
          {missingModels === 1 ? 'One model has' : `${missingModels} models have`} no price, so{' '}
          {usage.totals.priceMissing === 1 ? 'one call is' : `${usage.totals.priceMissing} calls are`} missing from the
          estimate. Use <strong>Add price</strong> in the models table below.
        </p>
      ) : null}

      {usage.totals.attempts === 0 ? (
        <NoUsage>Recording started with this release. Calls show up here as soon as the worker makes them.</NoUsage>
      ) : (
        <>
          <section className="desk-group">
            <div className="desk-group-head">
              <h2>By shop</h2>
              <span className="desk-group-count">{usage.byShop.length}</span>
            </div>
            {usage.byShop.length > 0 ? (
              <ShopCostTable rows={usage.byShop} now={now} days={days} xafPerUsd={xaf} />
            ) : null}
            {usage.unattributed.attempts > 0 ? (
              <p className="ops-group-note">
                {usage.unattributed.attempts} calls ({formatUsd(usage.unattributed.costMicros, xaf)}) were not tied to
                a shop. They come from code paths with no usage scope yet.
              </p>
            ) : null}
          </section>

          <section className="desk-group">
            <div className="desk-group-head">
              <h2>By feature</h2>
              <span className="desk-group-count">{usage.byFeature.length}</span>
            </div>
            <FeatureCostTable rows={usage.byFeature} xafPerUsd={xaf} />
          </section>

          <section className="desk-group">
            <div className="desk-group-head">
              <h2>By model</h2>
              <span className="desk-group-count">{usage.byModel.length}</span>
            </div>
            <ModelCostTable rows={usage.byModel} xafPerUsd={xaf} />
          </section>

          <section className="desk-group">
            <div className="desk-group-head">
              <h2>Provider reliability</h2>
              <span className="ops-group-note">Fallback calls are the OpenRouter chain stepping in after Vertex and Gemini gave up</span>
            </div>
            <ModelReliabilityTable rows={usage.byModel} />
          </section>
        </>
      )}
    </main>
  );
}
