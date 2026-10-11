'use client';

import { type FormEvent, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pause, Play } from '../../../../lib/icons';
import { runWhatsAppControl } from './actions';

/**
 * Pause or resume one WhatsApp session, with a required reason. The request id
 * is made when the dialog opens and kept across retries, so a retry after a
 * timeout cannot pause or resume twice.
 */
export default function WhatsAppControl({
  businessId,
  businessName,
  sessionLabel,
  status,
  hasCreds,
}: {
  businessId: string;
  businessName: string;
  sessionLabel: string;
  status: 'pairing' | 'connected' | 'invalid' | null;
  hasCreds: boolean;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [requestId, setRequestId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const control: 'pause' | 'resume' | null =
    status === 'connected' ? 'pause' : status === 'pairing' && hasCreds ? 'resume' : null;

  if (!control) {
    return <span className="ops-group-note">{hasCreds ? 'Needs the owner to re-pair' : 'Owner must link again'}</span>;
  }

  const isPause = control === 'pause';
  const trimmed = reason.trim();

  function open() {
    setRequestId(crypto.randomUUID());
    setReason('');
    setError(null);
    dialogRef.current?.showModal();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!control || trimmed.length < 3) return;
    setBusy(true);
    setError(null);
    const result = await runWhatsAppControl({ businessId, sessionLabel, control, reason: trimmed, requestId });
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
        {isPause ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
        {isPause ? 'Pause' : 'Resume'}
      </button>

      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby={titleId}>
        {isPause ? <Pause size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
        <h2 id={titleId}>
          {isPause ? 'Pause' : 'Resume'} WhatsApp for {businessName}?
        </h2>
        <p>
          {isPause
            ? 'The socket closes and the employee stops answering. Credentials are kept, so resuming needs no QR code. The owner sees the shop as disconnected.'
            : 'The worker reconnects with the saved credentials and the employee starts answering again.'}
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
              placeholder={isPause ? 'e.g. Owner asked us to stop replies during stocktake' : 'e.g. Owner confirmed they are ready'}
            />
          </label>
          <p className="ops-dialog-hint">Saved to the audit log with your name and the before/after state.</p>
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
              {isPause ? 'Pause WhatsApp' : 'Resume WhatsApp'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
