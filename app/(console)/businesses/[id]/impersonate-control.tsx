'use client';

import { type FormEvent, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Loader2, LogOut } from '../../../../lib/icons';
import { useCanMutate } from '../../../../lib/ops-role';
import { endImpersonation, startImpersonation, type ImpersonationSession } from './actions';

function minutesLeft(expiresAt: string): string {
  const ms = Date.parse(expiresAt) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'expired';
  const mins = Math.ceil(ms / 60_000);
  return mins <= 1 ? 'under 1 min left' : `${mins} min left`;
}

export default function ImpersonateControl({
  businessId,
  businessName,
  active,
  deskUrl,
}: {
  businessId: string;
  businessName: string;
  active: ImpersonationSession | null;
  deskUrl: string;
}) {
  const router = useRouter();
  const canMutate = useCanMutate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [requestId, setRequestId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trimmed = reason.trim();
  const forThisShop = active?.businessId === businessId ? active : null;

  if (!canMutate) {
    return (
      <button type="button" className="sm" disabled title="Owner only">
        <Eye size={14} aria-hidden="true" />
        Open Desk as owner
        <span className="ops-group-note">Owner only</span>
      </button>
    );
  }

  function openStart() {
    setRequestId(crypto.randomUUID());
    setReason('');
    setError(null);
    dialogRef.current?.showModal();
  }

  async function submitStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmed.length < 3) return;
    setBusy(true);
    setError(null);
    const result = await startImpersonation({ businessId, reason: trimmed, requestId });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    dialogRef.current?.close();
    window.open(result.deskUrl || deskUrl, '_blank', 'noopener,noreferrer');
    router.refresh();
  }

  async function submitEnd() {
    if (!forThisShop) return;
    setBusy(true);
    setError(null);
    const result = await endImpersonation({
      sessionId: forThisShop.id,
      requestId: crypto.randomUUID(),
      reason: 'Ended from ops console',
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <span className="ops-lead-action" style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {forThisShop ? (
          <>
            <span className="badge accent">Support view · {minutesLeft(forThisShop.expiresAt)}</span>
            <a className="sm primary" href={deskUrl} target="_blank" rel="noopener noreferrer">
              <Eye size={14} aria-hidden="true" />
              Open Desk
            </a>
            <button type="button" className="sm" disabled={busy} onClick={() => void submitEnd()}>
              {busy ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <LogOut size={14} aria-hidden="true" />}
              End session
            </button>
          </>
        ) : (
          <button type="button" className="sm primary" onClick={openStart}>
            <Eye size={14} aria-hidden="true" />
            Open Desk as owner
          </button>
        )}
      </span>
      {error && forThisShop ? (
        <p className="error mt-0" role="alert">
          {error}
        </p>
      ) : null}

      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby={titleId}>
        <Eye size={22} aria-hidden="true" />
        <h2 id={titleId}>Open Desk for {businessName}?</h2>
        <p>
          You keep your own sign-in. RLS treats you as a member of this shop for 20 minutes. A banner stays on Desk until
          you end the session. Financial writes still go through the tool-executor.
        </p>
        <form onSubmit={(event) => void submitStart(event)}>
          <label>
            Reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={500}
              required
              placeholder="e.g. Owner reports catalog stuck after import — checking Desk"
            />
          </label>
          <p className="ops-dialog-hint">Saved to the audit log. Desk opens in a new tab.</p>
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
              Start · 20 min
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
