/**
 * T2 tests for the /api/send-email abuse controls.
 *
 * Runs with `node --experimental-strip-types --no-warnings scripts/test-send-email.ts`.
 * No network access and no Resend client is involved: these tests exercise the
 * exact rate-limit and same-origin decision logic the route delegates to
 * (lib/sendEmailSecurity.ts). No email is ever sent, and RESEND_API_KEY is
 * never read by this path.
 */

import assert from 'node:assert';
import {
  checkSendEmailRateLimit,
  sameOriginDecision,
  SEND_EMAIL_MIN_LIMIT,
  SEND_EMAIL_DAY_LIMIT,
} from '../lib/sendEmailSecurity.ts';

function runTests() {
  console.log('Testing /api/send-email T2 abuse controls...');

  // ---- 1. Same-origin validation ----

  // Missing Origin: allowed by approved design decision.
  assert.deepStrictEqual(
    sameOriginDecision(null, 'grooveph.vercel.app', 'https:'),
    { allowed: true, reason: 'missing-origin' },
    'missing Origin must be allowed'
  );
  // Opaque "null" Origin: same approved path.
  assert.deepStrictEqual(
    sameOriginDecision('null', 'grooveph.vercel.app', 'https:'),
    { allowed: true, reason: 'missing-origin' },
    'null Origin must be allowed'
  );
  // Matching Origin and Host.
  assert.deepStrictEqual(
    sameOriginDecision('https://grooveph.vercel.app', 'grooveph.vercel.app', 'https:'),
    { allowed: true, reason: 'same-origin' },
    'same-origin Origin must be allowed'
  );
  // Origin with matching port in both.
  assert.deepStrictEqual(
    sameOriginDecision('http://localhost:3000', 'localhost:3000', 'http:'),
    { allowed: true, reason: 'same-origin' },
    'localhost dev origin must be allowed'
  );
  // Cross-site Origin.
  assert.deepStrictEqual(
    sameOriginDecision('https://evil.example.com', 'grooveph.vercel.app', 'https:').allowed,
    false,
    'cross-site Origin must be rejected'
  );
  // Origin host mismatch by port.
  assert.deepStrictEqual(
    sameOriginDecision('http://localhost:4444', 'localhost:3000', 'http:').allowed,
    false,
    'port mismatch must be rejected'
  );
  // Protocol mismatch (http origin against https server).
  assert.deepStrictEqual(
    sameOriginDecision('http://grooveph.vercel.app', 'grooveph.vercel.app', 'https:').allowed,
    false,
    'protocol mismatch must be rejected'
  );
  // Unparseable Origin.
  assert.deepStrictEqual(
    sameOriginDecision('not-a-url', 'grooveph.vercel.app', 'https:').reason,
    'unparseable-origin',
    'unparseable Origin must be rejected'
  );
  // Origin present but Host cannot be verified.
  assert.deepStrictEqual(
    sameOriginDecision('https://grooveph.vercel.app', null, 'https:').reason,
    'missing-host',
    'present Origin without Host must be rejected'
  );
  console.log('PASS: same-origin validation rules');

  // ---- 2. Per-minute limit (3/min) ----
  const minIp = '203.0.113.10';
  for (let i = 1; i <= SEND_EMAIL_MIN_LIMIT; i++) {
    const result = checkSendEmailRateLimit(minIp);
    assert.strictEqual(result.allowed, true, `request ${i} within minute limit must be allowed`);
    assert.strictEqual(result.reason, 'ok');
  }
  const blocked = checkSendEmailRateLimit(minIp);
  assert.strictEqual(blocked.allowed, false, 'request beyond minute limit must be rate-limited');
  assert.strictEqual(blocked.reason, 'minute');
  assert.ok(blocked.retryAfter >= 1, 'rate-limited response must carry Retry-After seconds >= 1');
  console.log('PASS: 3 requests/minute enforced, 4th is rejected');

  // ---- 3. Daily limit (20/day) ----
  const dayIp = '203.0.113.20';
  for (let i = 1; i <= SEND_EMAIL_DAY_LIMIT; i++) {
    checkSendEmailRateLimit(dayIp);
  }
  const daily = checkSendEmailRateLimit(dayIp);
  assert.strictEqual(daily.allowed, false, 'request beyond daily limit must be rejected');
  assert.strictEqual(daily.reason, 'both', 'once the minute bucket is full and the day is spent, both deny');
  console.log('PASS: 20 requests/day enforced');

  // ---- 4. IPs are independent ----
  const ipA = '203.0.113.30';
  const ipB = '203.0.113.31';
  for (let i = 0; i < SEND_EMAIL_MIN_LIMIT; i++) checkSendEmailRateLimit(ipA);
  assert.strictEqual(checkSendEmailRateLimit(ipA).allowed, false, 'ipA must be limited');
  assert.strictEqual(checkSendEmailRateLimit(ipB).allowed, true, 'ipB must not be affected by ipA');
  console.log('PASS: per-IP counters are independent');

  // ---- 5. Existing contract preserved ----
  // (The HTTP boundary itself — Resend, template, error mapping — is unchanged by
  // this change; what remains contractual here is that abuse controls reject
  // BEFORE any Resend call or key read. Verified by code order in route.ts.)

  console.log('All T2 abuse-control tests passed.');
}

runTests();
