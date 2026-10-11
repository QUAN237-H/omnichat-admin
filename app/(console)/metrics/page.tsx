import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
  STAGE_LABEL,
  STAGE_ORDER,
  featureLabel,
  formatDuration,
  formatPercent,
  formatXaf,
} from '../../../lib/format';
import type { FleetMetrics } from '../../../lib/types';
import { workerGet } from '../../../lib/worker';
import { Art3D } from '../../brand';
import { StatePanel } from '../../state-screen';
import { Stat } from '../costs/usage-tables';
import MetricsTable from './metrics-table';

export const metadata: Metadata = { title: 'Metrics' };

const CLOSED_STAGES = new Set(['PURCHASED', 'LOST', 'NO_SHOW']);

function Panel({
  title,
  count,
  note,
  children,
  bodyClassName,
}: {
  title: string;
  count?: number | string;
  note?: string;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="ops-panel">
      <div className="ops-panel-head">
        <h2>{title}</h2>
        {count !== undefined ? <span className="ops-panel-count">{count}</span> : null}
        {note ? <span className="ops-group-note">{note}</span> : null}
      </div>
      <div className={bodyClassName ?? 'ops-panel-body'}>{children}</div>
    </section>
  );
}

function Empty({ title, children }: { title: string; children: string }) {
  return (
    <div className="ops-empty">
      <Art3D name="analytics" size={56} />
      <p className="ops-empty-title">{title}</p>
      <p>{children}</p>
    </div>
  );
}

export default async function MetricsPage() {
  const result = await workerGet<FleetMetrics>('/admin/metrics');
  if (!result.ok) {
    return <StatePanel status={result.status} error={result.error} code={result.code} />;
  }

  const { shops, firstReply, adoption, funnel } = result.data;
  const total = shops.length;
  const weeklyActive = shops.filter((shop) => shop.whatsappStatus === 'connected' && shop.aiReplies7d > 0).length;
  const inbound7d = shops.reduce((sum, shop) => sum + shop.inbound7d, 0);
  const conversations30d = shops.reduce((sum, shop) => sum + shop.activeConversations30d, 0);
  const handoffs30d = shops.reduce((sum, shop) => sum + shop.handoffs30d, 0);
  const takeovers30d = shops.reduce((sum, shop) => sum + shop.takeovers30d, 0);
  const week2 = shops.filter((shop) => shop.activeWeek2 !== null);
  const week4 = shops.filter((shop) => shop.activeWeek4 !== null);
  const products = shops.reduce((sum, shop) => sum + shop.products, 0);
  const withPhoto = shops.reduce((sum, shop) => sum + shop.productsWithPhoto, 0);
  const withFloor = shops.reduce((sum, shop) => sum + shop.productsWithFloor, 0);
  const withStock = shops.reduce((sum, shop) => sum + shop.productsWithStock, 0);
  const stageRows = [...funnel].sort((a, b) => STAGE_ORDER.indexOf(a.status) - STAGE_ORDER.indexOf(b.status));
  const peakStage = Math.max(1, ...stageRows.map((stage) => stage.count));
  const catalog = [
    { label: 'With a photo', count: withPhoto },
    { label: 'With a floor price', count: withFloor },
    { label: 'With stock set', count: withStock },
  ];

  return (
    <main className="ops-page">
      <header className="ops-page-head">
        <h1>Metrics</h1>
        <p>Adoption, reply speed, owner load and sales across every shop.</p>
      </header>

      <section className="ops-strip" aria-label="Fleet metrics">
        <Stat label="Weekly active" value={weeklyActive} of={`/${total}`} />
        <Stat
          label="First reply, 7d"
          value={formatDuration(firstReply.p50Seconds)}
          of={`· p95 ${formatDuration(firstReply.p95Seconds)}`}
        />
        <Stat
          label="Msgs / shop / day"
          value={total > 0 ? (inbound7d / 7 / total).toFixed(1) : '—'}
        />
        <Stat label="Handoff rate, 30d" value={formatPercent(handoffs30d, conversations30d)} of={`· ${handoffs30d}`} />
        <Stat
          label="Takeover rate, 30d"
          value={formatPercent(takeovers30d, conversations30d)}
          of={`· ${takeovers30d}`}
        />
        <Stat
          label="Retention w2 · w4"
          value={formatPercent(week2.filter((shop) => shop.activeWeek2).length, week2.length)}
          of={`· ${formatPercent(week4.filter((shop) => shop.activeWeek4).length, week4.length)}`}
        />
      </section>

      <Panel
        title="By shop"
        note="Active means at least one AI reply that week. First reply uses the customer’s WhatsApp timestamp."
      >
        <MetricsTable shops={shops} />
      </Panel>

      <div className="ops-columns">
        <Panel title="Feature adoption, 30 days" note="Shops that used each feature · last 7 days">
          {adoption.length === 0 ? (
            <Empty title="No feature used yet">
              Voice notes, photos, imports and the rest show up here once shops use them.
            </Empty>
          ) : (
            <div className="ops-panel-body pad">
              <ul className="analytics-rank">
                {adoption.map((row) => (
                  <li key={row.feature}>
                    <div className="analytics-rank-line">
                      <span className="analytics-rank-name">{featureLabel(row.feature)}</span>
                      <span className="num">
                        {row.shops30d}/{total}
                        <span className="ops-faint"> · {row.shops7d}</span>
                      </span>
                    </div>
                    <span className="analytics-meter">
                      <span style={{ width: `${total > 0 ? (row.shops30d / total) * 100 : 0}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <div className="ops-section">
          <Panel title="Deals by stage" count={stageRows.reduce((sum, stage) => sum + stage.count, 0)}>
            {stageRows.length === 0 ? (
              <Empty title="No deals yet">Deals appear once the employee starts qualifying customers.</Empty>
            ) : (
              <div className="ops-panel-body pad">
                <ul className="analytics-rank">
                  {stageRows.map((stage) => (
                    <li key={stage.status}>
                      <div className="analytics-rank-line">
                        <span className="analytics-rank-name">{STAGE_LABEL[stage.status] ?? stage.status}</span>
                        <span className="num">
                          {stage.count}
                          {Number(stage.value) > 0 ? <span className="ops-faint"> · {formatXaf(stage.value)}</span> : null}
                        </span>
                      </div>
                      <span className="analytics-meter">
                        <span
                          data-closed={CLOSED_STAGES.has(stage.status) || undefined}
                          style={{ width: `${(stage.count / peakStage) * 100}%` }}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel title="Catalog completeness" count={products}>
            <div className="ops-panel-body pad">
              <ul className="analytics-rank">
                {catalog.map((row) => (
                  <li key={row.label}>
                    <div className="analytics-rank-line">
                      <span className="analytics-rank-name">{row.label}</span>
                      <span className="num">{formatPercent(row.count, products)}</span>
                    </div>
                    <span className="analytics-meter">
                      <span style={{ width: `${products > 0 ? (row.count / products) * 100 : 0}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Not tracked yet">
        <Empty title="Cost, AI-handled share and owner engagement">
          Cost per shop and per sale, the share of chats the AI handled without help, and owner active days need the
          usage ledger and activity tracking from the spec.
        </Empty>
      </Panel>
    </main>
  );
}
