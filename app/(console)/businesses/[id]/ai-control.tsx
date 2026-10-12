'use client';

import { type FormEvent, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCanMutate } from '../../../../lib/ops-role';
import { Loader2, Pause, Play } from '../../../../lib/icons';
import { setAiOverride } from './actions';

export default function AiControl({
  businessId,
  businessName,
  aiOverride,
}: {
  businessId: string;
  businessName: string;
  aiOverride: string;
}) {
  const router = useRouter();
  const canMutate = useCanMutate();
  const paused = aiOverride === 'force_off';
  const forcedOn = aiOverride === 'force_on';
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [requestId, setRequestId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'pause' | 'resume'>('pause');

  const trimmed = reason.trim();

  if (!canMutate) {
    return (
      <button type="button" className="sm" disabled title="Owner only">
        {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
        {paused ? 'Resume AI' : 'Pause AI'}
        <span className="ops-group-note">Owner only</span>
      </button>
    );
  }

  function open(next: 'pause' | 'resume') {
    setMode(next);
    setRequestId(crypto.randomUUID());
    setReason('');
    setError(null);
    dialogRef.current?.showModal();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmed.length < 3) return;
    setBusy(true);
    setError(null);
    const result = await setAiOverride({
      businessId,
      override: mode === 'pause' ? 'force_off' : 'none',
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
      <span className="ops-lead-action" style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
        {paused ? (
          <button type="button" className="sm primary" onClick={() => open('resume')}>
            <Play size={14} aria-hidden="true" />
            Resume AI
          </button>
        ) : (
          <button type="button" className="sm" onClick={() => open('pause')}>
            <Pause size={14} aria-hidden="true" />
            Pause AI
          </button>
        )}
        {forcedOn ? <span className="badge accent">Forced on</span> : null}
        {paused ? <span className="badge danger">AI paused</span> : null}
      </span>

      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby={titleId}>
        {mode === 'pause' ? <Pause size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
        <h2 id={titleId}>
          {mode === 'pause' ? 'Pause' : 'Resume'} AI for {businessName}?
        </h2>
        <p>
          {mode === 'pause'
            ? 'Customer WhatsApp stays linked, but the employee stops answering. Use this instead of wiping the session.'
            : 'Clears the ops override so the shop follows its normal subscription rules again.'}
        </p>
        <form onSubmit={(event) => void submit(event)}>
          <label>
            Reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={500}
              required
              placeholder={mode === 'pause' ? 'e.g. Burn rate spike — pausing until owner tops up' : 'e.g. Owner paid; resume replies'}
            />
          </label>
          <p className="ops-dialog-hint">Saved to the audit log with before/after subscription state.</p>
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
              {mode === 'pause' ? 'Pause AI' : 'Resume AI'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
