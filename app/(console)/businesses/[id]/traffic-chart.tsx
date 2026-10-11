import type { BusinessDetail } from '../../../../lib/types';

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** The desk's analytics bars, stacked: customers, replies, failures. */
export default function TrafficChart({ traffic }: { traffic: BusinessDetail['traffic'] }) {
  const peak = Math.max(1, ...traffic.map((day) => day.inbound + day.outbound + day.failed));
  const pct = (value: number) => `${(value / peak) * 100}%`;

  return (
    <ul className="analytics-bars" aria-label="Messages per day over the last 14 days">
      {traffic.map((day, index) => {
        const total = day.inbound + day.outbound + day.failed;
        return (
          <li key={day.day} title={`${day.day}: ${day.inbound} from customers, ${day.outbound} replies, ${day.failed} failed`}>
            <span className="ops-stack" data-empty={total === 0 || undefined}>
              {total === 0 ? null : (
                <>
                  <span className="ops-stack-fail" style={{ height: pct(day.failed) }} />
                  <span className="ops-stack-out" style={{ height: pct(day.outbound) }} />
                  <span className="ops-stack-in" style={{ height: pct(day.inbound) }} />
                </>
              )}
            </span>
            <span className="analytics-bar-label">
              {index % 3 === 0 || index === traffic.length - 1 ? DAY.format(new Date(`${day.day}T00:00:00Z`)) : ''}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
