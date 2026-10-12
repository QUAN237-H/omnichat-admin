'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { aiFeatureLabel } from '../../../../lib/format';
import { useCanMutate } from '../../../../lib/ops-role';
import { Loader2 } from '../../../../lib/icons';
import { setShopFlag } from './actions';

const QUICK_FLAGS = [
  'customer_ai_replies',
  'customer_negotiation',
  'broadcasts',
  'status_posting',
  'photo_enhancement',
] as const;

type Override = { feature: string; enabled: boolean };

export default function ShopFlags({
  businessId,
  overrides,
}: {
  businessId: string;
  overrides: Override[];
}) {
  const router = useRouter();
  const canMutate = useCanMutate();
  const byFeature = new Map(overrides.map((row) => [row.feature, row.enabled]));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(feature: string, enabled: boolean) {
    if (!canMutate) return;
    setBusy(feature);
    setError(null);
    const result = await setShopFlag({
      businessId,
      feature,
      enabled,
      reason: enabled ? `Re-enabled ${feature} from ops console` : `Disabled ${feature} from ops console`,
      requestId: crypto.randomUUID(),
    });
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="ops-panel-body pad" style={{ display: 'grid', gap: 10 }}>
      <p className="ops-group-note mt-0">
        Shop overrides win over the global flag table. Runtime still observes most flags; customer AI pause uses the AI
        control above.
      </p>
      {error ? (
        <p className="error mt-0" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="ops-list">
        {QUICK_FLAGS.map((feature) => {
          const overridden = byFeature.has(feature);
          const enabled = byFeature.get(feature) ?? true;
          return (
            <li key={feature}>
              <div className="ops-list-main">
                <div className="ops-list-top">
                  <span className="ops-list-who">{aiFeatureLabel(feature)}</span>
                  <span className={enabled ? 'badge' : 'badge danger'}>
                    {overridden ? (enabled ? 'Forced on' : 'Forced off') : 'Default'}
                  </span>
                </div>
              </div>
              <span className="ops-lead-action">
                <button
                  type="button"
                  className="sm"
                  disabled={!canMutate || busy === feature}
                  title={canMutate ? undefined : 'Owner only'}
                  onClick={() => void toggle(feature, !enabled)}
                >
                  {busy === feature ? <Loader2 size={14} className="spin" aria-hidden="true" /> : null}
                  {enabled ? 'Disable' : 'Enable'}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
