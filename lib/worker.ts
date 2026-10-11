import 'server-only';
import { cache } from 'react';
import { createServerSupabase } from './supabase/server';

export type WorkerResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; code?: string };

/** One call per path per request, so the layout and the page share the fleet read. */
const workerGetCached = cache((path: string) => workerRequest(path, { method: 'GET' }, true));

/** Reads a worker /admin/* route as the signed-in user. The worker decides access. */
export function workerGet<T>(path: string): Promise<WorkerResult<T>> {
  return workerGetCached(path) as Promise<WorkerResult<T>>;
}

/**
 * Runs a worker /admin/* control. Sent once: a retry after a timeout is the
 * caller's decision, and the request id in the body makes it safe.
 */
export function workerPost<T>(path: string, body: Record<string, unknown>): Promise<WorkerResult<T>> {
  return workerRequest(path, { method: 'POST', body: JSON.stringify(body) }, false) as Promise<WorkerResult<T>>;
}

async function workerRequest(
  path: string,
  init: { method: 'GET' | 'POST'; body?: string },
  retryOnNetworkError: boolean,
): Promise<WorkerResult<unknown>> {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return { ok: false, status: 401, error: 'Signed out.' };
  }

  const base = (process.env.WORKER_INTERNAL_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '');
  const send = () =>
    fetch(`${base}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(init.body ? { body: init.body } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(init.method === 'GET' ? 15_000 : 30_000),
    });

  const response = await (retryOnNetworkError ? send().catch(() => send()) : send()).catch(() => null);
  if (!response) {
    return { ok: false, status: 503, error: 'The worker is unreachable. It may be restarting.' };
  }

  const text = await response.text().catch(() => '');
  let payload: Record<string, unknown> = {};
  if (text) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        payload = parsed as Record<string, unknown>;
      } else {
        return {
          ok: false,
          status: 502,
          error: 'Worker returned JSON that was not an object.',
        };
      }
    } catch {
      return {
        ok: false,
        status: 502,
        error: `Worker returned non-JSON (${response.status}).`,
      };
    }
  }
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: typeof payload.error === 'string' ? payload.error : `Worker returned ${response.status}.`,
      ...(typeof payload.code === 'string' ? { code: payload.code } : {}),
    };
  }
  if (!text) {
    return { ok: false, status: 502, error: 'Worker returned an empty body.' };
  }
  return { ok: true, data: payload };
}
