/**
 * tests/ingestAuth.test.ts
 *
 * The discipline ingest endpoints are the only write path into the curated
 * content tables. Their shared guard must fail closed when the key is unset,
 * compare in constant time, and cap body size before JSON parsing.
 *
 * INGEST_API_KEY is mutated per test and restored afterwards; this file runs
 * in its own process under `node --test`.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { authorizeIngestRequest, MAX_INGEST_BODY_BYTES } from '../lib/ingest/auth.ts';

const ORIGINAL_KEY = process.env.INGEST_API_KEY;
const mutableEnv = process.env as Record<string, string | undefined>;

function makeRequest(url: string, headers: Record<string, string> = {}) {
  return {
    headers: new Headers(headers),
    nextUrl: new URL(url),
  } as never;
}

beforeEach(() => {
  delete process.env.INGEST_API_KEY;
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.INGEST_API_KEY;
  else mutableEnv.INGEST_API_KEY = ORIGINAL_KEY;
});

describe('authorizeIngestRequest', () => {
  it('fails closed with 500 when INGEST_API_KEY is not configured', () => {
    const result = authorizeIngestRequest(makeRequest('https://x.test/api/dance/ingest'), 'test');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 500);
  });

  it('rejects a wrong key with 401', () => {
    mutableEnv.INGEST_API_KEY = 'the-real-key-value';
    const result = authorizeIngestRequest(
      makeRequest('https://x.test/api/dance/ingest', { 'x-api-key': 'wrong-key' }),
      'test'
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 401);
  });

  it('accepts the exact key via x-api-key', () => {
    mutableEnv.INGEST_API_KEY = 'the-real-key-value';
    const result = authorizeIngestRequest(
      makeRequest('https://x.test/api/dance/ingest', { 'x-api-key': 'the-real-key-value' }),
      'test'
    );
    assert.deepEqual(result, { ok: true });
  });

  it('accepts the exact key via Bearer authorization', () => {
    mutableEnv.INGEST_API_KEY = 'the-real-key-value';
    const result = authorizeIngestRequest(
      makeRequest('https://x.test/api/dance/ingest', { authorization: 'Bearer the-real-key-value' }),
      'test'
    );
    assert.deepEqual(result, { ok: true });
  });

  it('rejects near-miss keys', () => {
    mutableEnv.INGEST_API_KEY = 'the-real-key-value';
    for (const guess of ['the-real-key-valu', 'the-real-key-value2', 'The-real-key-value']) {
      const result = authorizeIngestRequest(
        makeRequest('https://x.test/api/dance/ingest', { 'x-api-key': guess }),
        'test'
      );
      assert.equal(result.ok, false, guess);
    }
  });

  it('caps oversized bodies before JSON parsing (413)', () => {
    mutableEnv.INGEST_API_KEY = 'the-real-key-value';
    const result = authorizeIngestRequest(
      makeRequest('https://x.test/api/dance/ingest', {
        'x-api-key': 'the-real-key-value',
        'content-length': String(MAX_INGEST_BODY_BYTES + 1),
      }),
      'test'
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 413);
  });

  it('allows bodies at the cap', () => {
    mutableEnv.INGEST_API_KEY = 'the-real-key-value';
    const result = authorizeIngestRequest(
      makeRequest('https://x.test/api/dance/ingest', {
        'x-api-key': 'the-real-key-value',
        'content-length': String(MAX_INGEST_BODY_BYTES),
      }),
      'test'
    );
    assert.deepEqual(result, { ok: true });
  });
});
