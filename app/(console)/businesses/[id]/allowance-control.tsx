'use client';

import { type FormEvent, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCanMutate } from '../../../../lib/ops-role';
import { Loader2 } from '../../../../lib/icons';
import { setAllowance } from './actions';

function toMicros(usd: string): number | null {
  const value = Number(usd.replace(',', '.'));
  if (!Number.isFinite(value) || value < 0 || value > 10_000) return null;
  return Math.round(value * 1_000_000);
}

function toUsd(micros: number): string {
  return micros > 0 ? String(micros / 1_000_000) : '';
}

/**
 * Sets this period's AI allowance and bonus, in dollars of estimated cost.
 * The request id is made when the dialog opens, so a retry cannot apply twice.
 */
export default function AllowanceControl({
  businessId,
  businessName,
  allowanceMicros,
  bonusMicros,
}: {
  businessId: string;
  businessName: string;
  allowanceMicros: number;
  bonusMicros: number;
}) {
  const router = useRouter();
  const canMutate = useCanMutate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [requestId, setRequestId] = useState('');
  const [allowance, setAllowanceInput] = useState('');
  const [bonus, setBonus] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const allowanceValue = toMicros(allowance || '0');
  const bonusValue = toMicros(bonus || '0');
  const trimmed = reason.trim();
  const unchanged = allowanceValue === allowanceMicros && bonusValue === bonusMicros;
  const valid = allowanceValue !== null && bonusValue !== null && trimmed.length >= 3 && !unchanged;

  if (!canMutate) {
    return (
      <button type="button" className="sm" disabled title="Owner only">
        {allowanceMicros > 0 ? 'Change allowance' : 'Set allowance'}
        <span className="ops-group-note">Owner only</span>
      </button>
    );
  }

  function open() {
    setRequestId(crypto.randomUUID());
    setAllowanceInput(toUsd(allowanceMicros));
    setBonus(toUsd(bonusMicros));
    setReason('');
    setError(null);
    dialogRef.current?.showModal();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || allowanceValue === null || bonusValue === null) return;
    setBusy(true);
    setError(null);
    const result = await setAllowance({
      businessId,
      allowanceMicros: allowanceValue,
      bonusMicros: bonusValue,
      reason: trimmed,
      requestId,
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
      <button type="button" className="sm" onClick={open}>
        {allowanceMicros > 0 ? 'Change allowance' : 'Set allowance'}
      </button>

      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby={titleId}>
        <h2 id={titleId}>AI allowance for {businessName}</h2>
        <p>
          The estimated AI spend this shop may use in the current period. Nothing is blocked yet: limits start working
          with the Phase 2 gates. Until then this drives the meter and the fleet warnings.
        </p>
        <form onSubmit={(event) => void submit(event)}>
          <div className="ops-dialog-grid">
            <label>
              Allowance (USD)
              <input
                inputMode="decimal"
                value={allowance}
                onChange={(event) => setAllowanceInput(event.target.value)}
                placeholder="e.g. 15"
                aria-invalid={allowanceValue === null || undefined}
              />
            </label>
            <label>
              Bonus (USD)
              <input
                inputMode="decimal"
                value={bonus}
                onChange={(event) => setBonus(event.target.value)}
                placeholder="0"
                aria-invalid={bonusValue === null || undefined}
              />
            </label>
          </div>
          <label>
            Reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={500}
              required
              placeholder="e.g. Pilot start: about 2× the observed daily cost × 30"
            />
          </label>
          <p className="ops-dialog-hint">Saved to the audit log with your name and the before/after amounts.</p>
          {error ? (
            <p className="error mt-0" role="alert">
              {error}
            </p>
          ) : null}
          <div className="actions">
            <button type="button" onClick={() => dialogRef.current?.close()} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={busy || !valid}>
              {busy ? <Loader2 size={16} className="spin" aria-hidden="true" /> : null}
              Save allowance
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
