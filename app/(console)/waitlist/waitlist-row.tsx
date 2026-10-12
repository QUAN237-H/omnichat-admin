'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPhone, timeAgo } from '../../../lib/format';
import { useCanMutate } from '../../../lib/ops-role';
import { Loader2 } from '../../../lib/icons';
import type { WaitlistEntry, WaitlistStatus } from '../../../lib/types';
import { patchWaitlist } from './waitlist-actions';

const STATUS_BADGE: Record<WaitlistStatus, string> = {
  pending: 'badge warning',
  approved: 'badge accent',
  rejected: 'badge danger',
  converted: 'badge',
};

export default function WaitlistRow({ entry, now }: { entry: WaitlistEntry; now: number }) {
  const router = useRouter();
  const canMutate = useCanMutate();
  const status = entry.status ?? 'pending';
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(entry.opsNote ?? '');

  async function act(next: WaitlistStatus, reason: string) {
    if (!canMutate) return;
    setBusy(next);
    setError(null);
    const result = await patchWaitlist({
      id: entry.id,
      status: next,
      reason,
      requestId: crypto.randomUUID(),
      ...(note.trim() ? { opsNote: note.trim() } : {}),
    });
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function saveNote() {
    if (!canMutate) return;
    setBusy('note');
    setError(null);
    const result = await patchWaitlist({
      id: entry.id,
      opsNote: note.trim() || null,
      reason: 'Updated waitlist note',
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
    <tr>
      <td>
        <span className="ops-shop-name">{entry.name}</span>
        {entry.opsNote ? <div className="ops-sub">{entry.opsNote}</div> : null}
        {error ? (
          <div className="error" role="alert">
            {error}
          </div>
        ) : null}
      </td>
      <td className="phone num">{formatPhone(entry.whatsapp)}</td>
      <td className={entry.sells ? undefined : 'ops-faint'}>{entry.sells ?? '—'}</td>
      <td>
        <span className="badge">{entry.lang === 'fr' ? 'FR' : 'EN'}</span>
      </td>
      <td>
        <span className={STATUS_BADGE[status]}>{status}</span>
      </td>
      <td className="ops-muted" title={new Date(entry.createdAt).toLocaleString()}>
        {timeAgo(entry.createdAt, now)}
      </td>
      <td>
        <div style={{ display: 'grid', gap: 6, minWidth: 180 }}>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ops note"
            maxLength={1000}
            disabled={!canMutate}
          />
          <span className="ops-lead-action" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button type="button" className="sm" disabled={!canMutate || busy !== null} onClick={() => void saveNote()}>
              {busy === 'note' ? <Loader2 size={12} className="spin" /> : null}
              Note
            </button>
            <button
              type="button"
              className="sm"
              disabled={!canMutate || busy !== null || status === 'approved'}
              onClick={() => void act('approved', 'Approved from waitlist')}
            >
              Approve
            </button>
            <button
              type="button"
              className="sm"
              disabled={!canMutate || busy !== null || status === 'rejected'}
              onClick={() => void act('rejected', 'Rejected from waitlist')}
            >
              Reject
            </button>
            <button
              type="button"
              className="sm primary"
              disabled={!canMutate || busy !== null || status === 'converted'}
              onClick={() => void act('converted', 'Marked converted — shop created outside waitlist')}
            >
              Converted
            </button>
          </span>
        </div>
      </td>
    </tr>
  );
}
