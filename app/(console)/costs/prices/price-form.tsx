'use client';

import { type FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PRICE_UNITS, formatUnitPrice, priceUnitInfo } from '../../../../lib/format';
import { useXafPerUsd } from '../../../../lib/fx';
import { useCanMutate } from '../../../../lib/ops-role';
import { Loader2 } from '../../../../lib/icons';
import { addModelPrice } from './actions';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * One price row per unit. The request id is made on the first submit and kept
 * until it succeeds, so a retry after a timeout cannot add the row twice.
 */
export default function PriceForm({ provider: initialProvider, model: initialModel }: { provider: string; model: string }) {
  const router = useRouter();
  const canMutate = useCanMutate();
  const xafPerUsd = useXafPerUsd();
  const requestId = useRef<string | null>(null);
  const [provider, setProvider] = useState(initialProvider);
  const [model, setModel] = useState(initialModel);
  const [unit, setUnit] = useState('input_token');
  const [usd, setUsd] = useState('');
  const [from, setFrom] = useState(today);
  const [sourceNote, setSourceNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const info = priceUnitInfo(unit);
  const amount = Number(usd);
  const microsPerUnit = usd.trim() !== '' && Number.isFinite(amount) && amount >= 0 ? (amount * 1_000_000) / info.per : null;
  const ready = provider.trim() && model.trim() && microsPerUnit !== null && from && reason.trim().length >= 3;

  if (!canMutate) {
    return (
      <p className="ops-group-note" role="status">
        Model prices are owner-only. Operators can view the table above.
      </p>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || microsPerUnit === null) return;
    requestId.current ??= crypto.randomUUID();
    setBusy(true);
    setError(null);
    setSaved(null);
    const result = await addModelPrice({
      provider: provider.trim(),
      model: model.trim(),
      unit,
      priceMicrosPerUnit: microsPerUnit,
      effectiveFrom: `${from}T00:00:00Z`,
      sourceNote: sourceNote.trim(),
      reason: reason.trim(),
      requestId: requestId.current,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    requestId.current = null;
    setSaved(`${info.label} for ${model.trim()}: ${formatUnitPrice(unit, microsPerUnit, xafPerUsd)}`);
    setUsd('');
    router.refresh();
  }

  return (
    <form className="ops-price-form" onSubmit={(event) => void submit(event)}>
      <div className="ops-price-grid">
        <label>
          Provider
          <input value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="vertex" required />
        </label>
        <label>
          Model
          <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="gemini-3.5-flash" required />
        </label>
        <label>
          What is charged
          <select value={unit} onChange={(event) => setUnit(event.target.value)}>
            {PRICE_UNITS.map((row) => (
              <option key={row.unit} value={row.unit}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Price in USD, {info.perLabel}
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={usd}
            onChange={(event) => setUsd(event.target.value)}
            placeholder="0.30"
            required
          />
        </label>
        <label>
          Applies to calls from
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} required />
        </label>
        <label>
          Source
          <input
            value={sourceNote}
            onChange={(event) => setSourceNote(event.target.value)}
            maxLength={500}
            placeholder="Pricing page URL, date checked"
          />
        </label>
      </div>
      <label>
        Reason
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={2}
          maxLength={500}
          required
          placeholder="e.g. Vertex list price checked today"
        />
      </label>
      <p className="ops-dialog-hint">
        Saved to the audit log. It applies to calls made from that date on; calls already recorded keep the cost they
        were given.
      </p>
      {error ? (
        <p className="error mt-0" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="ops-group-note" role="status">
          Saved: {saved}
        </p>
      ) : null}
      <div className="actions">
        <button type="submit" className="primary" disabled={busy || !ready}>
          {busy ? <Loader2 size={16} className="spin" aria-hidden="true" /> : null}
          Add price
        </button>
      </div>
    </form>
  );
}
