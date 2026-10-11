import type { Metadata } from 'next';
import Link from 'next/link';
import { fleetAlarm, needsAttention, whatsappHealth } from '../../lib/attention';
import { formatUsd, formatXaf } from '../../lib/format';
import type { FleetResponse } from '../../lib/types';
import { workerGet } from '../../lib/worker';
import { StatePanel } from '../state-screen';
import FleetTable from './fleet-table';

export const metadata: Metadata = { title: 'Shops' };

export default async function FleetPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const fleet = await workerGet<FleetResponse>('/admin/businesses');
  if (!fleet.ok) {
    return <StatePanel status={fleet.status} error={fleet.error} code={fleet.code} />;
  }
  if (!Array.isArray(fleet.data.businesses)) {
    return (
      <StatePanel
        status={502}
        error="Fleet response was missing businesses[]. Deploy the worker that serves /admin/businesses."
      />
    );
  }

  const shops = fleet.data.businesses;
  const live = shops.filter((shop) => whatsappHealth(shop.whatsapp) === 'live').length;
  const alarm = fleetAlarm(shops);
  const inbound = shops.reduce((sum, shop) => sum + shop.inbound24h, 0);
  const replies = shops.reduce((sum, shop) => sum + shop.outbound24h, 0);
  const problems = shops.reduce((sum, shop) => sum + shop.failed24h + shop.stuck, 0);
  const agreed = shops.reduce((sum, shop) => sum + Number(shop.agreedValue), 0);
  const aiCost24h = shops.reduce((sum, shop) => sum + (shop.ai?.cost24hMicros ?? 0), 0);
  const aiCalls24h = shops.reduce((sum, shop) => sum + (shop.ai?.attempts24h ?? 0), 0);
  const ledgerReady = shops.some((shop) => shop.ai !== null);
  const attention = shops.filter(needsAttention);
  const onlyAttention = view === 'attention';

  return (
    <main className="ops-page">
      <header className="ops-page-head">
        <h1>{onlyAttention ? 'Needs attention' : 'Shops'}</h1>
        <p>
          {onlyAttention
            ? 'WhatsApp down, stuck messages, or failures today.'
            : 'Live fleet from the worker.'}
        </p>
      </header>

      {alarm ? (
        <div className="ops-alert" role="alert">
          <span className="ops-alert-mark" aria-hidden="true">
            !
          </span>
          <p>
            {alarm.banned > 0 ? (
              <>
                <strong>
                  {alarm.banned === 1 ? '1 number banned by WhatsApp.' : `${alarm.banned} numbers banned by WhatsApp.`}
                </strong>{' '}
                Pause broadcasts and Status for {alarm.banned === 1 ? 'that shop' : 'those shops'} and tell the owner.
              </>
            ) : (
              <>
                <strong>
                  {alarm.down} of {alarm.linked} numbers are down at once.
                </strong>{' '}
                Check the worker, its IP, or WhatsApp before re-linking anyone.
              </>
            )}{' '}
            <Link href="/?view=attention">See which</Link>
          </p>
        </div>
      ) : null}

      <section className="ops-strip" aria-label="Fleet summary">
        <div className="ops-strip-item">
          <span className="ops-strip-label">Shops</span>
          <strong className="ops-strip-value num">{shops.length}</strong>
        </div>
        <div className="ops-strip-item" data-tone={live < shops.length ? 'warning' : undefined}>
          <span className="ops-strip-label">Live on WhatsApp</span>
          <strong className="ops-strip-value num">
            {live}
            <span className="ops-strip-unit">/{shops.length}</span>
          </strong>
        </div>
        <div className="ops-strip-item">
          <span className="ops-strip-label">Messages, 24h</span>
          <strong className="ops-strip-value num">
            {inbound}
            <span className="ops-strip-unit"> · {replies} out</span>
          </strong>
        </div>
        <div className="ops-strip-item" data-tone={problems > 0 ? 'danger' : undefined}>
          <span className="ops-strip-label">Failed or stuck</span>
          <strong className="ops-strip-value num">{problems}</strong>
        </div>
        <div className="ops-strip-item">
          <span className="ops-strip-label">Agreed sales</span>
          <strong className="ops-strip-value num">{formatXaf(agreed)}</strong>
        </div>
        {ledgerReady ? (
          <Link href="/costs?days=1" className="ops-strip-item ops-strip-link">
            <span className="ops-strip-label">AI cost, 24h</span>
            <strong className="ops-strip-value num">{formatUsd(aiCost24h)}</strong>
            <span className="ops-strip-meta">
              {aiCalls24h === 1 ? '1 call' : `${aiCalls24h.toLocaleString('en-US')} calls`}
            </span>
          </Link>
        ) : null}
      </section>

      <FleetTable
        shops={onlyAttention ? attention : shops}
        totalCount={shops.length}
        attentionCount={attention.length}
        view={onlyAttention ? 'attention' : 'all'}
        generatedAt={fleet.data.generatedAt}
      />
    </main>
  );
}
