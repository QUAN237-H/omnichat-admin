'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  currentOpsPushSubscription,
  disableOpsPush,
  enableOpsPush,
  ensureOpsServiceWorker,
  pushSupported,
} from '../../lib/ops-pwa';
import { subscribeOpsPush, unsubscribeOpsPush } from './push-actions';

type Status = 'loading' | 'unsupported' | 'off' | 'on' | 'busy' | 'denied' | 'error';

export default function OpsAlertsControl() {
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!pushSupported()) {
        if (!cancelled) setStatus('unsupported');
        return;
      }
      await ensureOpsServiceWorker().catch(() => null);
      const sub = await currentOpsPushSubscription().catch(() => null);
      if (cancelled) return;
      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }
      setStatus(sub ? 'on' : 'off');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const busy = pending || status === 'busy';

  function onEnable() {
    setMessage(null);
    setStatus('busy');
    startTransition(async () => {
      const result = await enableOpsPush(subscribeOpsPush);
      if (result === 'enabled') {
        setStatus('on');
        setMessage('Alerts on for this device.');
        return;
      }
      if (result === 'denied') {
        setStatus('denied');
        setMessage('Notification permission denied.');
        return;
      }
      if (result === 'unsupported') {
        setStatus('unsupported');
        return;
      }
      setStatus('off');
      setMessage('Could not enable alerts. Check VAPID and migration 0078.');
    });
  }

  function onDisable() {
    setMessage(null);
    setStatus('busy');
    startTransition(async () => {
      await disableOpsPush(unsubscribeOpsPush);
      setStatus('off');
      setMessage('Alerts off on this device.');
    });
  }

  if (status === 'loading') {
    return (
      <div className="ops-alerts">
        <p className="ops-alerts-label">Alerts on this device</p>
        <p className="ops-alerts-hint">Checking…</p>
      </div>
    );
  }

  if (status === 'unsupported') {
    return (
      <div className="ops-alerts">
        <p className="ops-alerts-label">Alerts on this device</p>
        <p className="ops-alerts-hint">
          Needs a modern browser, HTTPS, and NEXT_PUBLIC_VAPID_PUBLIC_KEY.
        </p>
      </div>
    );
  }

  return (
    <div className="ops-alerts">
      <p className="ops-alerts-label">Alerts on this device</p>
      <p className="ops-alerts-hint">
        {status === 'on'
          ? 'Warn and error ops events push here.'
          : status === 'denied'
            ? 'Enable notifications in the browser, then try again.'
            : 'Get a push when something needs attention.'}
      </p>
      {status === 'on' ? (
        <button type="button" className="ops-alerts-btn" disabled={busy} onClick={onDisable}>
          Turn off
        </button>
      ) : (
        <button
          type="button"
          className="ops-alerts-btn ops-alerts-btn-primary"
          disabled={busy || status === 'denied'}
          onClick={onEnable}
        >
          Enable alerts
        </button>
      )}
      {message ? <p className="ops-alerts-msg">{message}</p> : null}
    </div>
  );
}
