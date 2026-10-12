'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { formatDate } from '../../lib/format';
import { useCanMutate } from '../../lib/ops-role';
import { useFx } from '../../lib/fx';
import { refreshFxRates } from './fx-actions';

/** USD→XAF rate line + owner Refresh. Shown on Costs / Prices. */
export default function FxRateBar() {
  const fx = useFx();
  const canMutate = useCanMutate();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onRefresh() {
    setError(null);
    startTransition(async () => {
      const result = await refreshFxRates();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const rateLabel =
    fx.rate != null
      ? `USD → XAF: ${Math.round(fx.rate).toLocaleString('en-US')}`
      : 'USD → XAF: not set yet';
  const when = fx.fetchedAt ? ` · updated ${formatDate(fx.fetchedAt)}` : '';

  return (
    <div className="ops-fx-bar" role="status">
      <span className="ops-fx-meta">
        {rateLabel}
        {when}
        {fx.rate == null ? ' · refresh to show XAF next to dollar amounts' : ''}
      </span>
      {canMutate ? (
        <button type="button" className="ops-alerts-btn" disabled={pending} onClick={onRefresh}>
          {pending ? 'Refreshing…' : 'Refresh rates'}
        </button>
      ) : (
        <span className="ops-faint">Owner can refresh</span>
      )}
      {error ? <span className="ops-fx-error">{error}</span> : null}
    </div>
  );
}
