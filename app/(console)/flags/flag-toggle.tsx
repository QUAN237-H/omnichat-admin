'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCanMutate } from '../../../lib/ops-role';
import { Loader2 } from '../../../lib/icons';
import { setGlobalFlag } from './flag-actions';

export default function GlobalFlagToggle({ feature, enabled }: { feature: string; enabled: boolean }) {
  const router = useRouter();
  const canMutate = useCanMutate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (!canMutate) return;
    setBusy(true);
    setError(null);
    const result = await setGlobalFlag({
      feature,
      enabled: !enabled,
      reason: !enabled ? `Enabled ${feature} fleet-wide` : `Disabled ${feature} fleet-wide`,
      requestId: crypto.randomUUID(),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <span className="ops-lead-action">
      {error ? <span className="error">{error}</span> : null}
      <button type="button" className="sm" disabled={!canMutate || busy} title={canMutate ? undefined : 'Owner only'} onClick={() => void toggle()}>
        {busy ? <Loader2 size={14} className="spin" aria-hidden="true" /> : null}
        {enabled ? 'Disable' : 'Enable'}
      </button>
    </span>
  );
}
