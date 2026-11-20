/**
 * tests/cronAuth.test.ts
 *
 * The cron guard controls privileged write endpoints. These tests pin the
 * fail-closed contract:
 *
 *   CRON_SECRET missing + production  -> 503 (never callable)
 *   CRON_SECRET missing + development -> allowed, loudly
 *   CRON_SECRET set                   -> only the exact secret passes,
 *                                        via Authorization: Bearer or ?key=
 *
 * NODE_ENV / CRON_SECRET are mutated per test and restored afterwards; this
 * file runs in its own process under `node --test`.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { authorizeCronRequest } from '../lib/cron/auth.ts';

const ORIGINAL_ENV = { ...process.env };
const mutableEnv = process.env as Record<string, string | undefined>;

function makeRequest(url: string, headers: Record<string, string> = {}) {
  return {
    headers: new Headers(headers),
    nextUrl: new URL(url),
  } as never;
}

beforeEach(() => {
  delete process.env.CRON_SECRET;
  mutableEnv.NODE_ENV = 'development';
});

afterEach(() => {
  if (ORIGINAL_ENV.CRON_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL_ENV.CRON_SECRET;
  if (ORIGINAL_ENV.NODE_ENV === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = ORIGINAL_ENV.NODE_ENV;
});

describe('authorizeCronRequest', () => {
  it('refuses to run in production without CRON_SECRET (503)', () => {
    mutableEnv.NODE_ENV = 'production';
    const result = authorizeCronRequest(makeRequest('https://x.test/api/cron/ingest'), 'test-route');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 503);
  });

  it('allows local development without CRON_SECRET, with a loud warning', () => {
    mutableEnv.NODE_ENV = 'development';
    const result = authorizeCronRequest(makeRequest('https://x.test/api/cron/ingest'), 'test-route');
    assert.deepEqual(result, { ok: true });
  });

  it('rejects a wrong bearer secret with 401', () => {
    process.env.CRON_SECRET = 'correct-secret-value';
    const result = authorizeCronRequest(
      makeRequest('https://x.test/api/cron/ingest', { authorization: 'Bearer wrong-secret' }),
      'test-route'
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 401);
  });

  it('accepts the exact bearer secret', () => {
    process.env.CRON_SECRET = 'correct-secret-value';
    const result = authorizeCronRequest(
      makeRequest('https://x.test/api/cron/ingest', { authorization: 'Bearer correct-secret-value' }),
      'test-route'
    );
    assert.deepEqual(result, { ok: true });
  });

  it('accepts the secret via ?key= query param', () => {
    process.env.CRON_SECRET = 'correct-secret-value';
    const result = authorizeCronRequest(
      makeRequest('https://x.test/api/cron/ingest?key=correct-secret-value'),
      'test-route'
    );
    assert.deepEqual(result, { ok: true });
  });

  it('rejects near-miss secrets (prefix, suffix, different length)', () => {
    process.env.CRON_SECRET = 'correct-secret-value';
    for (const guess of ['correct-secret', 'correct-secret-value-x', 'Correct-secret-value', 'correct_secret_value']) {
      const viaHeader = authorizeCronRequest(
        makeRequest('https://x.test/api/cron/ingest', { authorization: `Bearer ${guess}` }),
        'test-route'
      );
      assert.equal(viaHeader.ok, false, `bearer: ${guess}`);
      const viaQuery = authorizeCronRequest(
        makeRequest(`https://x.test/api/cron/ingest?key=${encodeURIComponent(guess)}`),
        'test-route'
      );
      assert.equal(viaQuery.ok, false, `query: ${guess}`);
    }
  });

  it('accepts mixed-case Bearer scheme', () => {
    process.env.CRON_SECRET = 'correct-secret-value';
    const result = authorizeCronRequest(
      makeRequest('https://x.test/api/cron/ingest', { authorization: 'BEARER correct-secret-value' }),
      'test-route'
    );
    assert.deepEqual(result, { ok: true });
  });
});
