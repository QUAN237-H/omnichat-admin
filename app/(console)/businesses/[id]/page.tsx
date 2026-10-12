import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { attentionReasons, whatsappHealth } from '../../../../lib/attention';
import {
  STAGE_LABEL,
  STAGE_ORDER,
  connectionEventLabel,
  featureLabel,
  formatDate,
  formatPhone,
  formatUsd,
  formatXaf,
  messageKindLabel,
  timeAgo,
} from '../../../../lib/format';
import { ArrowLeft } from '../../../../lib/icons';
import type { BusinessDetail, IncidentsResponse, ShopUsageResponse } from '../../../../lib/types';
import { workerGet } from '../../../../lib/worker';
import { Art3D, type Art3DName } from '../../../brand';
import { StatePanel } from '../../../state-screen';
import WhatsAppBadge from '../../../whatsapp-badge';
import {
  FeatureCostTable,
  ModelCostTable,
  ModelReliabilityTable,
  NoUsage,
  Stat,
  UsageStats,
} from '../../costs/usage-tables';
import AllowanceControl from './allowance-control';
import AiControl from './ai-control';
import { WINDOWS, windowDays } from '../../costs/windows';
import IncidentTable from '../../incidents/incident-table';
import type { ImpersonationSession } from './actions';
import FailuresTable from './failures-table';
import ImpersonateControl from './impersonate-control';
import ShopFlags from './shop-flags';
import SubscriptionControl from './subscription-control';
import TrafficChart from './traffic-chart';
import WhatsAppControl from './whatsapp-control';

export const metadata: Metadata = { title: 'Shop' };

const CLOSED_STAGES = new Set(['PURCHASED', 'LOST', 'NO_SHOW']);

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'money', label: 'AI & money' },
  { id: 'reliability', label: 'Reliability' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** Map retired tab ids so old bookmarks still land somewhere useful. */
function resolveTab(value: string | undefined): TabId {
  if (value === 'usage' || value === 'outcomes') return value === 'usage' ? 'money' : 'overview';
  return TABS.some((tab) => tab.id === value) ? (value as TabId) : 'overview';
}

function initials(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '·';
}

function Empty({ art, title, children }: { art: Art3DName; title: string; children: string }) {
  return (
    <div className="ops-empty">
      <Art3D name={art} size={56} />
      <p className="ops-empty-title">{title}</p>
      <p>{children}</p>
    </div>
  );
}

function Panel({
  title,
  count,
  note,
  link,
  children,
  bodyClassName,
}: {
  title: string;
  count?: number | string;
  note?: string;
  link?: { href: string; label: string };
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="ops-panel">
      <div className="ops-panel-head">
        <h2>{title}</h2>
        {count !== undefined ? <span className="ops-panel-count">{count}</span> : null}
        {note ? <span className="ops-group-note">{note}</span> : null}
        {link ? (
          <Link href={link.href} className="ops-group-link" scroll={false}>
            {link.label}
          </Link>
        ) : null}
      </div>
      <div className={bodyClassName ?? 'ops-panel-body'}>{children}</div>
    </section>
  );
}

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; days?: string }>;
}) {
  const { id } = await params;
  const { tab: requestedTab, days: requestedDays } = await searchParams;
  const tab = resolveTab(requestedTab);
  const days = windowDays(requestedDays);

  const [result, impersonation] = await Promise.all([
    workerGet<BusinessDetail>(`/admin/businesses/${encodeURIComponent(id)}`),
    workerGet<{ session: ImpersonationSession | null; deskUrl: string }>('/admin/impersonation/active'),
  ]);
  if (!result.ok) {
    if (result.status === 404 || result.status === 400) notFound();
    return <StatePanel status={result.status} error={result.error} code={result.code} />;
  }

  const detail = result.data;
  const { business } = detail;
  const activeSession = impersonation.ok ? impersonation.data.session : null;
  const deskUrl = impersonation.ok ? impersonation.data.deskUrl : '';
  const now = Date.parse(detail.generatedAt);
  const reasons = attentionReasons(business);
  const health = whatsappHealth(business.whatsapp);
  const fromTriage =
    health === 'banned' ||
    health === 'logged_out' ||
    health === 'offline' ||
    health === 'pairing' ||
    business.stuck > 0 ||
    business.failed24h > 0;
  const failedCount = detail.reliability.reduce((sum, row) => sum + row.failed7d, 0);
  const stuckCount = detail.reliability.reduce((sum, row) => sum + row.stuck, 0);
  const tabCount: Partial<Record<TabId, number>> = {
    whatsapp: detail.sessions.length,
    reliability: failedCount + stuckCount,
  };

  return (
    <main className="ops-page">
      <Link href={fromTriage ? '/' : '/shops'} className="ops-back">
        <ArrowLeft size={16} aria-hidden="true" />
        {fromTriage ? 'Needs attention' : 'All shops'}
      </Link>

      <header className="ops-shop-hero">
        <div className="ops-shop-hero-main">
          {business.logoUrl ? (
            <img className="ops-shop-hero-logo" src={business.logoUrl} alt="" width={52} height={52} />
          ) : (
            <span className="ops-shop-hero-logo ops-shop-hero-fallback" aria-hidden="true">
              {initials(business.name)}
            </span>
          )}
          <div>
            <h1>{business.name}</h1>
            <p className="ops-shop-hero-meta">
              Joined {formatDate(business.createdAt)} · {business.ownerEmail ?? 'No owner email'}
            </p>
          </div>
        </div>
        <WhatsAppBadge whatsapp={business.whatsapp} />
      </header>

      {reasons.length > 0 ? (
        <div className="ops-alert" role="status">
          <span className="ops-alert-mark" aria-hidden="true">
            !
          </span>
          <p>
            <strong>Needs attention:</strong> {reasons.join(' · ')}
          </p>
        </div>
      ) : null}

      <nav className="ops-tabs" aria-label="Shop sections">
        {TABS.map((item) => (
          <Link
            key={item.id}
            href={item.id === 'overview' ? `/businesses/${business.id}` : `/businesses/${business.id}?tab=${item.id}`}
            className={item.id === tab ? 'ops-tab is-active' : 'ops-tab'}
            aria-current={item.id === tab ? 'page' : undefined}
            scroll={false}
          >
            {item.label}
            {tabCount[item.id] ? <span className="ops-tab-count">{tabCount[item.id]}</span> : null}
          </Link>
        ))}
      </nav>

      <div className="ops-section">
        {tab === 'overview' ? (
          <OverviewTab
            detail={detail}
            now={now}
            activeSession={activeSession}
            deskUrl={deskUrl}
          />
        ) : null}
        {tab === 'whatsapp' ? <WhatsAppTab detail={detail} now={now} /> : null}
        {tab === 'money' ? <MoneyTab detail={detail} now={now} days={days} /> : null}
        {tab === 'reliability' ? <ReliabilityTab detail={detail} now={now} /> : null}
      </div>
    </main>
  );
}

type TabProps = { detail: BusinessDetail; now: number };

function OverviewTab({
  detail,
  now,
  activeSession,
  deskUrl,
}: TabProps & { activeSession: ImpersonationSession | null; deskUrl: string }) {
  const { business, members, conversations, traffic } = detail;
  const ownerLastSignIn = members
    .map((member) => member.lastSignInAt)
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1);

  return (
    <>
      <section className="ops-strip" aria-label="Shop summary">
        <Stat label="Messages, 24h" value={business.inbound24h} of={`· ${business.outbound24h} out`} />
        <Stat
          label="Failed / stuck"
          value={business.failed24h}
          of={`/ ${business.stuck}`}
          tone={business.failed24h + business.stuck > 0 ? 'danger' : undefined}
        />
        <Stat label="Customers" value={business.customers} />
        <Stat label="Products" value={business.products} />
        <Stat label="Agreed sales" value={formatXaf(business.agreedValue)} />
      </section>

      <div className="ops-columns">
        <div className="ops-section">
          <Panel title="Business">
            <dl className="ops-facts">
              <div>
                <dt>Plan</dt>
                <dd>{business.plan === 'paid' ? 'Paid' : 'Free'}</dd>
              </div>
              <div>
                <dt>Admin number</dt>
                <dd className="phone">{formatPhone(business.adminNumber)}</dd>
              </div>
              <div>
                <dt>Owner last signed in</dt>
                <dd>{timeAgo(ownerLastSignIn ?? null, now)}</dd>
              </div>
              <div>
                <dt>Last customer message</dt>
                <dd>{timeAgo(business.lastInboundAt, now)}</dd>
              </div>
              <div>
                <dt>Last reply sent</dt>
                <dd>{timeAgo(business.lastReplyAt, now)}</dd>
              </div>
              <div>
                <dt>Conversations</dt>
                <dd className="num">
                  {conversations.total} · {conversations.open} open · {conversations.humanControlling} taken over
                </dd>
              </div>
              <div>
                <dt>Open deals</dt>
                <dd className="num">{business.openDeals}</dd>
              </div>
              <div>
                <dt>Business ID</dt>
                <dd className="mono ops-faint ops-id">{business.id}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Team" count={members.length}>
            <ul className="ops-list">
              {members.map((member, index) => (
                <li key={`${member.email ?? 'unknown'}-${index}`}>
                  <span className="ops-avatar" aria-hidden="true">
                    {(member.email ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="ops-list-main">
                    <div className="ops-list-top">
                      <span className="ops-list-who">{member.email ?? 'Unknown account'}</span>
                      <span className={member.role === 'owner' ? 'badge accent' : 'badge'}>{member.role}</span>
                    </div>
                    <div className="ops-list-status">
                      Joined {formatDate(member.joinedAt)} · signed in {timeAgo(member.lastSignInAt, now).toLowerCase()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Support view" note="20 min · keep your own sign-in" bodyClassName="ops-panel-body pad">
            <div style={{ display: 'grid', gap: 10 }}>
              <p className="ops-muted" style={{ margin: 0 }}>
                Open the owner Desk for this shop to see what they see. Reason required; banner stays until you end the
                session.
              </p>
              <ImpersonateControl
                businessId={business.id}
                businessName={business.name}
                active={activeSession}
                deskUrl={deskUrl}
              />
            </div>
          </Panel>
        </div>

        <div className="ops-section">
          <Panel title="Messages, last 14 days" bodyClassName="ops-panel-body pad">
            <div className="analytics-card">
              <TrafficChart traffic={traffic} />
              <ul className="analytics-legend">
                <li>
                  <span className="analytics-dot ops-dot-in" /> From customers
                </li>
                <li>
                  <span className="analytics-dot ops-dot-out" /> Replies
                </li>
                <li>
                  <span className="analytics-dot ops-dot-fail" /> Failed
                </li>
              </ul>
            </div>
          </Panel>

          <AiEmployeeSummary businessId={business.id} />
        </div>
      </div>

      <OutcomesTab detail={detail} />
    </>
  );
}

/** Read-only meter on Overview — mutations live on AI & money. */
async function AiEmployeeSummary({ businessId }: { businessId: string }) {
  const result = await workerGet<ShopUsageResponse>(`/admin/businesses/${businessId}/usage?days=1`);
  return (
    <Panel title="AI employee" link={{ href: `/businesses/${businessId}?tab=money`, label: 'AI & money' }}>
      {!result.ok ? (
        <Empty art="analytics" title="AI usage unavailable">
          {result.error}
        </Empty>
      ) : !result.data.period ? (
        <Empty art="analytics" title="No usage period">
          This shop has no open usage period. Every shop should get one from migration 0070.
        </Empty>
      ) : (
        <div className="ops-panel-body pad">
          <AllowanceMeter period={result.data.period} spentToday={result.data.totals.costMicros} />
        </div>
      )}
    </Panel>
  );
}

function AllowanceMeter({
  period,
  spentToday,
  control,
}: {
  period: NonNullable<ShopUsageResponse['period']>;
  spentToday: number;
  control?: ReactNode;
}) {
  const allowance = period.allowanceMicros + period.bonusMicros;
  const share = allowance > 0 ? period.costMicros / allowance : null;
  const tone = share === null ? undefined : share >= 0.95 ? 'danger' : share >= 0.8 ? 'warning' : undefined;
  return (
    <div className="ops-meter-card">
      <div className="ops-meter-top">
        <span className="ops-meter-value num">{formatUsd(period.costMicros)}</span>
        <span className="ops-muted">
          {share === null ? 'No allowance set' : `of ${formatUsd(allowance)} · ${Math.round(share * 100)}% used`}
        </span>
      </div>
      <div className="ops-meter-bar" data-tone={tone} aria-hidden="true">
        <span style={{ width: `${Math.min(100, (share ?? 0) * 100)}%` }} />
      </div>
      <div className="ops-meter-foot">
        <span>
          Since {formatDate(period.startedAt)} · {formatUsd(spentToday)} in the last 24 h
          {period.bonusMicros > 0 ? ` · includes a ${formatUsd(period.bonusMicros)} bonus` : ''}
        </span>
        {control}
      </div>
      <p className="ops-group-note mt-0">Estimated cost from built-in (or overridden) model prices.</p>
    </div>
  );
}

const ACTOR_LABEL: Record<string, string> = { admin: 'By an operator', owner: 'By the owner' };

function eventDetail(detail: unknown): string | null {
  if (!detail || typeof detail !== 'object') return null;
  const record = detail as Record<string, unknown>;
  const parts = [
    typeof record.by === 'string' ? (ACTOR_LABEL[record.by] ?? null) : null,
    typeof record.reason === 'string' ? record.reason : null,
    typeof record.phoneNumber === 'string' ? formatPhone(record.phoneNumber) : null,
    typeof record.afterAttempts === 'number' ? `after ${record.afterAttempts} failed retries` : null,
    typeof record.attempt === 'number' ? `${record.attempt} failed retries so far` : null,
    typeof record.statusCode === 'number' ? `code ${record.statusCode}` : null,
  ];
  const text = parts.filter((part): part is string => part !== null).join(' · ');
  return text || null;
}

function WhatsAppTab({ detail, now }: TabProps) {
  const { sessions, connectionEvents, business } = detail;
  return (
    <>
      <Panel title="Sessions" count={sessions.length}>
        {sessions.length === 0 ? (
          <Empty art="phone-link" title="Never linked">
            This shop has not connected a WhatsApp number yet.
          </Empty>
        ) : (
          <ul className="ops-list">
            {sessions.map((session) => (
              <li key={session.label} className="ops-session">
                <span className="ops-avatar" aria-hidden="true">
                  WA
                </span>
                <div className="ops-list-main">
                  <div className="ops-list-top">
                    <span className="phone ops-list-who">{formatPhone(session.phoneNumber)}</span>
                    <WhatsAppBadge whatsapp={session} />
                    <span className="ops-lead-action">
                      <WhatsAppControl
                        businessId={business.id}
                        businessName={business.name}
                        sessionLabel={session.label}
                        status={session.status}
                        hasCreds={session.hasCreds}
                      />
                    </span>
                  </div>
                  <div className="ops-list-status">
                    <span>Last connected {timeAgo(session.lastConnectedAt, now).toLowerCase()}</span>
                    <span>{session.hasCreds ? 'Credentials kept' : 'No credentials'}</span>
                    <span>Updated {timeAgo(session.updatedAt, now).toLowerCase()}</span>
                    {session.invalidReason ? <span className="ops-bad">{session.invalidReason}</span> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Connection timeline" link={{ href: `/audit?businessId=${business.id}`, label: 'Audit log' }}>
        {connectionEvents.length === 0 ? (
          <Empty art="clock" title="No events yet">
            Connects, drops, re-pair prompts and pauses show up here from now on. History before today was not recorded.
          </Empty>
        ) : (
          <ul className="ops-list">
            {connectionEvents.map((event) => {
              const note = eventDetail(event.detail);
              return (
                <li key={event.id}>
                  <span className="ops-avatar" aria-hidden="true">
                    ·
                  </span>
                  <div className="ops-list-main">
                    <div className="ops-list-top">
                      <span className="ops-list-who">{connectionEventLabel(event.event)}</span>
                      <span className="ops-muted">{timeAgo(event.occurredAt, now)}</span>
                    </div>
                    {note ? <div className="ops-list-status">{note}</div> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}

async function ShopIncidents({ businessId, now }: { businessId: string; now: number }) {
  const result = await workerGet<IncidentsResponse>(`/admin/incidents?businessId=${businessId}`);
  return (
    <Panel
      title="Recent incidents"
      link={
        result.ok && result.data.total > result.data.entries.length
          ? { href: `/incidents?businessId=${businessId}`, label: `All ${result.data.total}` }
          : undefined
      }
    >
      {!result.ok ? (
        <Empty art="bell" title="Could not load incidents">
          {result.error}
        </Empty>
      ) : result.data.entries.length === 0 ? (
        <Empty art="check" title="No incidents">
          Nothing has gone wrong for this shop since incident recording started.
        </Empty>
      ) : (
        <IncidentTable incidents={result.data.entries.slice(0, 10)} now={now} showShop={false} />
      )}
    </Panel>
  );
}

function ReliabilityTab({ detail, now }: TabProps) {
  const { reliability, recentFailures } = detail;
  return (
    <>
      <ShopIncidents businessId={detail.business.id} now={now} />
      <Panel title="Problems by message type" note="Failed in the last 7 days, and stuck right now">
        {reliability.length === 0 ? (
          <Empty art="check" title="Nothing failed or stuck">
            No message failed in the last 7 days and nothing is waiting longer than 10 minutes.
          </Empty>
        ) : (
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Message type</th>
                  <th className="ops-right">Failed, 7 days</th>
                  <th className="ops-right">Stuck over 10 min</th>
                </tr>
              </thead>
              <tbody>
                {reliability.map((row) => (
                  <tr key={row.kind}>
                    <td>{messageKindLabel(row.kind)}</td>
                    <td className={row.failed7d > 0 ? 'ops-right num ops-strong ops-bad' : 'ops-right num ops-faint'}>
                      {row.failed7d}
                    </td>
                    <td className={row.stuck > 0 ? 'ops-right num ops-strong ops-bad' : 'ops-right num ops-faint'}>
                      {row.stuck}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Recent failed messages" count={recentFailures.length}>
        {recentFailures.length === 0 ? (
          <Empty art="check" title="No failed messages">
            Every message to and from this shop went through.
          </Empty>
        ) : (
          <FailuresTable failures={recentFailures} generatedAt={now} />
        )}
      </Panel>

      <ShopAiReliability businessId={detail.business.id} />
    </>
  );
}

async function ShopAiReliability({ businessId }: { businessId: string }) {
  const result = await workerGet<ShopUsageResponse>(`/admin/businesses/${businessId}/usage?days=7`);
  return (
    <Panel title="AI providers, last 7 days" note="Errors, timeouts, fallbacks and response time per model">
      {!result.ok ? (
        <p className="error mt-0 pad" role="alert">
          {result.error}
        </p>
      ) : result.data.byModel.length === 0 ? (
        <Empty art="check" title="No AI calls this week">
          Provider errors and response times show up once the employee makes calls for this shop.
        </Empty>
      ) : (
        <ModelReliabilityTable rows={result.data.byModel} />
      )}
    </Panel>
  );
}

async function MoneyTab({ detail, now, days }: TabProps & { days: number }) {
  const { usage, business, subscription, featureOverrides = [] } = detail;
  const periodResult = await workerGet<ShopUsageResponse>(`/admin/businesses/${business.id}/usage?days=1`);
  return (
    <>
      <Panel title="AI replies">
        <div className="ops-panel-body pad" style={{ display: 'grid', gap: 12 }}>
          <p className="ops-group-note mt-0">
            {subscription
              ? `Override: ${subscription.aiOverride}${subscription.aiOverrideReason ? ` — ${subscription.aiOverrideReason}` : ''}`
              : 'No subscription row (migration 0071).'}
          </p>
          {subscription ? (
            <AiControl
              businessId={business.id}
              businessName={business.name}
              aiOverride={subscription.aiOverride}
            />
          ) : null}
        </div>
      </Panel>

      <Panel title="Subscription">
        {!subscription ? (
          <Empty art="key" title="No subscription">
            Apply migration 0071 so ops can extend periods and grace.
          </Empty>
        ) : (
          <div className="ops-panel-body pad" style={{ display: 'grid', gap: 12 }}>
            <dl className="ops-facts">
              <div>
                <dt>Status</dt>
                <dd>{subscription.status}</dd>
              </div>
              <div>
                <dt>Plan</dt>
                <dd>{subscription.planCode}</dd>
              </div>
              <div>
                <dt>Period ends</dt>
                <dd>{subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'No end (open pilot)'}</dd>
              </div>
              <div>
                <dt>Grace ends</dt>
                <dd>{subscription.graceEndsAt ? formatDate(subscription.graceEndsAt) : '—'}</dd>
              </div>
            </dl>
            <SubscriptionControl businessId={business.id} businessName={business.name} />
          </div>
        )}
      </Panel>

      <Panel title="Allowance">
        {!periodResult.ok ? (
          <Empty art="analytics" title="AI usage unavailable">
            {periodResult.error}
          </Empty>
        ) : !periodResult.data.period ? (
          <Empty art="analytics" title="No usage period">
            This shop has no open usage period. Every shop should get one from migration 0070.
          </Empty>
        ) : (
          <div className="ops-panel-body pad">
            <AllowanceMeter
              period={periodResult.data.period}
              spentToday={periodResult.data.totals.costMicros}
              control={
                <AllowanceControl
                  businessId={business.id}
                  businessName={business.name}
                  allowanceMicros={periodResult.data.period.allowanceMicros}
                  bonusMicros={periodResult.data.period.bonusMicros}
                />
              }
            />
          </div>
        )}
      </Panel>

      <Panel title="Feature overrides">
        <ShopFlags businessId={business.id} overrides={featureOverrides} />
      </Panel>

      <Panel title="Features used" count={usage.length}>
        {usage.length === 0 ? (
          <Empty art="assistant" title="Nothing used yet">
            Voice notes, photos, imports, Status posts and the rest show up here once the shop uses them.
          </Empty>
        ) : (
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="ops-right">7 days</th>
                  <th className="ops-right">30 days</th>
                  <th>Last used</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((row) => (
                  <tr key={row.feature}>
                    <td>{featureLabel(row.feature)}</td>
                    <td className={row.last7d > 0 ? 'ops-right num ops-strong' : 'ops-right num ops-faint'}>{row.last7d}</td>
                    <td className={row.last30d > 0 ? 'ops-right num' : 'ops-right num ops-faint'}>{row.last30d}</td>
                    <td className="ops-muted">{timeAgo(row.lastAt, now)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ShopAiCost businessId={business.id} days={days} />
    </>
  );
}

async function ShopAiCost({ businessId, days }: { businessId: string; days: number }) {
  const result = await workerGet<ShopUsageResponse>(`/admin/businesses/${businessId}/usage?days=${days}`);
  return (
    <Panel title="AI calls and cost" link={{ href: `/costs?days=${days}`, label: 'All shops' }}>
      <div className="ops-panel-body pad" style={{ display: 'grid', gap: 14 }}>
        <nav className="ops-seg" aria-label="Time window">
          {WINDOWS.map((window) => (
            <Link
              key={window.days}
              href={`/businesses/${businessId}?tab=money&days=${window.days}`}
              className={window.days === days ? 'ops-seg-btn is-active' : 'ops-seg-btn'}
              aria-current={window.days === days ? 'page' : undefined}
              scroll={false}
            >
              {window.label}
            </Link>
          ))}
        </nav>
        {!result.ok ? (
          <p className="error mt-0" role="alert">
            {result.error}
          </p>
        ) : result.data.totals.attempts === 0 ? (
          <NoUsage>No AI calls billed to this shop in this window. Recording started with this release.</NoUsage>
        ) : (
          <>
            <UsageStats totals={result.data.totals} label={`AI usage, last ${days} days`} />
            {result.data.period ? (
              <p className="ops-group-note mt-0">
                This billing period (since {formatDate(result.data.period.startedAt)}):{' '}
                {formatUsd(result.data.period.costMicros)} estimated
                {result.data.period.allowanceMicros > 0
                  ? ` of a ${formatUsd(result.data.period.allowanceMicros + result.data.period.bonusMicros)} allowance`
                  : ', no allowance set yet'}
                .
              </p>
            ) : null}
            <FeatureCostTable rows={result.data.byFeature} />
            <ModelCostTable rows={result.data.byModel} />
          </>
        )}
      </div>
    </Panel>
  );
}

function OutcomesTab({ detail }: { detail: BusinessDetail }) {
  const { stages, outcomes, conversations } = detail;
  const stageRows = [...stages].sort((a, b) => STAGE_ORDER.indexOf(a.status) - STAGE_ORDER.indexOf(b.status));
  const peakStage = Math.max(1, ...stageRows.map((stage) => stage.count));
  const byStatus = new Map(stages.map((stage) => [stage.status, stage]));
  const purchased = byStatus.get('PURCHASED');
  const lostCount = (byStatus.get('LOST')?.count ?? 0) + (byStatus.get('NO_SHOW')?.count ?? 0);

  return (
    <>
      <section className="ops-strip" aria-label="Outcomes summary">
        <Stat label="Conversations, 30d" value={outcomes.conversations30d} />
        <Stat label="Purchased" value={formatXaf(purchased?.value ?? 0)} of={`· ${purchased?.count ?? 0}`} />
        <Stat label="Lost or no-show" value={lostCount} />
        <Stat
          label="Handoffs, 30d"
          value={outcomes.handoffs30d}
          of={outcomes.handoffsOpen > 0 ? `· ${outcomes.handoffsOpen} open` : undefined}
          tone={outcomes.handoffsOpen > 0 ? 'danger' : undefined}
        />
        <Stat label="Takeovers, 30d" value={outcomes.takeovers30d} of={`· ${conversations.humanControlling} active`} />
      </section>

      <Panel title="Deals by stage" count={stageRows.reduce((sum, stage) => sum + stage.count, 0)}>
        {stageRows.length === 0 ? (
          <Empty art="sale" title="No deals yet">
            Deals show up once the employee starts qualifying customers for this shop.
          </Empty>
        ) : (
          <div className="ops-panel-body pad">
            <div className="analytics-card">
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
          </div>
        )}
      </Panel>
    </>
  );
}
