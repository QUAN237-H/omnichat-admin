'use client';

import { type FormEvent, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCanMutate } from '../../../../lib/ops-role';
import { Loader2 } from '../../../../lib/icons';
import { patchSubscription } from './actions';

export default function SubscriptionControl({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const router = useRouter();
  const canMutate = useCanMutate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [requestId, setRequestId] = useState('');
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('14');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<'extend' | 'grace' | 'active'>('extend');

  const trimmed = reason.trim();
  const dayCount = Number(days);

  if (!canMutate) {
    return (
      <button type="button" className="sm" disabled title="Owner only">
        Extend / grace
        <span className="ops-group-note">Owner only</span>
      </button>
    );
  }

  function open(next: 'extend' | 'grace' | 'active') {
    setAction(next);
    setRequestId(crypto.randomUUID());
    setReason('');
    setError(null);
    dialogRef.current?.showModal();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmed.length < 3) return;
    if (action === 'extend' && (!Number.isFinite(dayCount) || dayCount < 1)) return;
    setBusy(true);
    setError(null);
    const result = await patchSubscription({
      businessId,
      reason: trimmed,
      requestId,
      ...(action === 'extend' ? { extendPeriodDays: dayCount } : {}),
      ...(action === 'grace' ? { graceHours: 48 } : {}),
      ...(action === 'active' ? { status: 'active' as const } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    dialogRef.current?.close();
    router.refresh();
  }

  return (
    <>
      <span className="ops-lead-action" style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="sm" onClick={() => open('extend')}>
          Extend period
        </button>
        <button type="button" className="sm" onClick={() => open('grace')}>
          Start 48h grace
        </button>
        <button type="button" className="sm" onClick={() => open('active')}>
          Mark active
        </button>
      </span>

      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby={titleId}>
        <h2 id={titleId}>
          {action === 'extend' && `Extend period for ${businessName}`}
          {action === 'grace' && `Start grace for ${businessName}`}
          {action === 'active' && `Mark ${businessName} active`}
        </h2>
        <p>
          {action === 'extend' && 'Pushes current_period_end forward from today or the current end, whichever is later.'}
          {action === 'grace' && 'Sets status to grace with a 48-hour window (subscription constraint).'}
          {action === 'active' && 'Sets status to active and clears grace. Use after payment or a pilot conversion.'}
        </p>
        <form onSubmit={(event) => void submit(event)}>
          {action === 'extend' ? (
            <label>
              Days to add
              <input
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={(event) => setDays(event.target.value)}
                required
              />
            </label>
          ) : null}
          <label>
            Reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={500}
              required
              placeholder="e.g. Pilot extension while payment clears"
            />
          </label>
          {error ? (
            <p className="error mt-0" role="alert">
              {error}
            </p>
          ) : null}
          <div className="actions">
            <button type="button" onClick={() => dialogRef.current?.close()} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={busy || trimmed.length < 3}>
              {busy ? <Loader2 size={16} className="spin" aria-hidden="true" /> : null}
              Save
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
