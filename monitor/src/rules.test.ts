import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifySession,
  composeEmail,
  evaluateDeaf,
  evaluateOpsEvents,
  evaluateShops,
  evaluateWorker,
  freshMemory,
  OFFLINE_ALERT_AFTER_MS,
  WORKER_DOWN_AFTER,
  type SessionRow,
  type ShopSnapshot,
} from './rules.ts';

const NOW = Date.parse('2026-10-09T12:00:00Z');
const MIN = 60_000;

function row(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    businessId: 'b1',
    businessName: 'Shop One',
    label: 'pilot',
    phone: '237600000001',
    status: 'connected',
    invalidReason: null,
    lastSeenAt: new Date(NOW - MIN),
    updatedAt: new Date(NOW - 60 * MIN),
    ...overrides,
  };
}

function shop(id: string, state: ShopSnapshot['state'], since = new Date(NOW)): ShopSnapshot {
  return { key: `${id}:pilot`, businessId: id, name: `Shop ${id}`, phone: null, state, since, reason: null };
}

describe('classifySession', () => {
  it('tells a ban from a logout', () => {
    assert.equal(classifySession(row({ status: 'invalid', invalidReason: 'number is forbidden by WhatsApp' }), NOW).state, 'banned');
    assert.equal(classifySession(row({ status: 'invalid', invalidReason: 'logged out from the phone' }), NOW).state, 'logged_out');
  });

  it('marks a connected session with a stale heartbeat offline', () => {
    assert.equal(classifySession(row({ lastSeenAt: new Date(NOW - 10 * MIN) }), NOW).state, 'offline');
    assert.equal(classifySession(row(), NOW).state, 'ok');
    assert.equal(classifySession(row({ lastSeenAt: null }), NOW).state, 'ok');
  });

  it('treats an owner pause as paused, not down', () => {
    assert.equal(classifySession(row({ status: 'pairing' }), NOW).state, 'paused');
  });
});

describe('evaluateShops', () => {
  it('sends a digest on the first run and does not re-alert known problems', () => {
    const memory = freshMemory();
    const first = evaluateShops(memory, [shop('a', 'banned'), shop('b', 'ok')], NOW, true);
    assert.equal(first.length, 1);
    assert.equal(first[0]?.severity, 'info');
    assert.match(first[0]?.body ?? '', /Shop a: banned/);
    assert.deepEqual(evaluateShops(memory, [shop('a', 'banned'), shop('b', 'ok')], NOW + MIN, true), []);
  });

  it('alerts a ban at once and a recovery when it comes back', () => {
    const memory = freshMemory();
    evaluateShops(memory, [shop('a', 'ok'), shop('b', 'ok'), shop('c', 'ok'), shop('d', 'ok')], NOW, true);
    const banned = evaluateShops(memory, [shop('a', 'banned'), shop('b', 'ok'), shop('c', 'ok'), shop('d', 'ok')], NOW + MIN, true);
    assert.equal(banned.length, 1);
    assert.equal(banned[0]?.severity, 'critical');
    const back = evaluateShops(memory, [shop('a', 'ok'), shop('b', 'ok'), shop('c', 'ok'), shop('d', 'ok')], NOW + 2 * MIN, true);
    assert.match(back[0]?.title ?? '', /back online/);
  });

  it('waits before calling a shop offline, and stays quiet while the worker is down', () => {
    const memory = freshMemory();
    const others = [shop('b', 'ok'), shop('c', 'ok'), shop('d', 'ok'), shop('e', 'ok')];
    evaluateShops(memory, [shop('a', 'ok'), ...others], NOW, true);
    const since = new Date(NOW);
    assert.deepEqual(evaluateShops(memory, [shop('a', 'offline', since), ...others], NOW + 5 * MIN, true), []);
    assert.deepEqual(
      evaluateShops(memory, [shop('a', 'offline', since), ...others], NOW + OFFLINE_ALERT_AFTER_MS, false),
      [],
    );
    const late = evaluateShops(memory, [shop('a', 'offline', since), ...others], NOW + OFFLINE_ALERT_AFTER_MS + MIN, true);
    assert.equal(late.length, 1);
    assert.match(late[0]?.title ?? '', /offline/);
  });

  it('raises one fleet alarm when several shops drop together', () => {
    const memory = freshMemory();
    evaluateShops(memory, [shop('a', 'ok'), shop('b', 'ok'), shop('c', 'ok')], NOW, true);
    const alerts = evaluateShops(memory, [shop('a', 'logged_out'), shop('b', 'logged_out'), shop('c', 'ok')], NOW + MIN, true);
    assert.ok(alerts.some((alert) => alert.severity === 'critical' && /2 of 3 shops/.test(alert.title)));
  });
});

describe('evaluateWorker', () => {
  it('alerts once after repeated failures and once on recovery', () => {
    const memory = freshMemory();
    for (let i = 1; i < WORKER_DOWN_AFTER; i += 1) assert.deepEqual(evaluateWorker(memory, false, 'timeout'), []);
    assert.equal(evaluateWorker(memory, false, 'timeout').length, 1);
    assert.deepEqual(evaluateWorker(memory, false, 'timeout'), []);
    assert.match(evaluateWorker(memory, true, 'ok')[0]?.title ?? '', /back/);
  });
});

describe('evaluateDeaf', () => {
  it('flags a busy shop gone silent, once', () => {
    const memory = freshMemory();
    const quiet = { businessId: 'a', name: 'Shop a', weekInbound: 140, lastInboundAt: new Date(NOW - 8 * 60 * MIN) };
    assert.equal(evaluateDeaf(memory, [quiet], NOW).length, 1);
    assert.deepEqual(evaluateDeaf(memory, [quiet], NOW + MIN), []);
    assert.deepEqual(evaluateDeaf(freshMemory(), [{ ...quiet, weekInbound: 10 }], NOW), []);
  });
});

describe('evaluateOpsEvents', () => {
  it('bookmarks first, then digests new errors', () => {
    const memory = freshMemory();
    assert.deepEqual(evaluateOpsEvents(memory, [], 10), []);
    const alerts = evaluateOpsEvents(
      memory,
      [
        { id: 11, businessName: 'Shop a', kind: 'agent_turn_failed', severity: 'warn', occurredAt: new Date(NOW) },
        { id: 12, businessName: 'Shop a', kind: 'whatsapp_ban_risk', severity: 'warn', occurredAt: new Date(NOW) },
      ],
      null,
    );
    assert.equal(alerts[0]?.severity, 'critical');
    assert.equal(memory.lastOpsEventId, 12);
  });
});

describe('composeEmail', () => {
  it('names the worst alert in the subject', () => {
    const mail = composeEmail([
      { severity: 'info', title: 'Shop a: back online', body: '' },
      { severity: 'critical', title: 'Worker is down', body: '' },
    ]);
    assert.equal(mail?.subject, '[Omni CRITICAL] Worker is down (+1 more)');
  });
});
