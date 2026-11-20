/**
 * T4 tests for the Groovey AI abuse controls.
 *
 * Runs with `node --experimental-strip-types --no-warnings scripts/test-groovey.ts`.
 * No network access and no AI provider client is involved: these tests exercise
 * the exact rate-limit and validation logic the routes delegate to
 * (lib/grooveyValidation.ts). No AI request is ever sent.
 */

import assert from 'node:assert';
import {
  checkGrooveyChatRate,
  checkGrooveyTitleRate,
  validateChatBody,
  validateTitleBody,
  GROOVEY_CHAT_LIMIT,
  GROOVEY_TITLE_LIMIT,
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_CHARS,
  MAX_TITLE_CHARS,
} from '../lib/grooveyValidation.ts';

const userA = 'user-t4-a';
const userB = 'user-t4-b';
const userC = 'user-t4-c';
const userD = 'user-t4-d';

function chatMessages(n: number, text = 'hello'): Array<{ role: string; content: string }> {
  return Array.from({ length: n }, (_, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: `${text} ${i}` }));
}

function runTests() {
  console.log('Testing /api/groovey T4 abuse controls...');

  // ---- 1. Rate limits: chat bucket (30 / 5 min) ----
  for (let i = 1; i <= GROOVEY_CHAT_LIMIT; i++) {
    const result = checkGrooveyChatRate(userA);
    assert.strictEqual(result.allowed, true, `chat request ${i} must be allowed`);
  }
  const blockedChat = checkGrooveyChatRate(userA);
  assert.strictEqual(blockedChat.allowed, false, 'chat request beyond limit must be rejected');
  assert.strictEqual(blockedChat.reason, 'limited');
  assert.ok(blockedChat.retryAfter >= 1, 'Retry-After must be >= 1 second');
  console.log('PASS: 30 chat requests/5min per user enforced');

  // ---- 2. Independence: title bucket is separate ----
  assert.strictEqual(checkGrooveyTitleRate(userA).allowed, true, 'title bucket must not be consumed by chat usage');
  console.log('PASS: title bucket is independent of the chat bucket');

  // ---- 3. Different users have independent quotas ----
  for (let i = 0; i < GROOVEY_CHAT_LIMIT; i++) checkGrooveyChatRate(userB);
  assert.strictEqual(checkGrooveyChatRate(userB).allowed, false, 'userB must be limited');
  assert.strictEqual(checkGrooveyChatRate(userC).allowed, true, 'userC must not be affected by userB');
  console.log('PASS: per-user quotas are independent');

  // ---- 4. Title limit (10 / minute) ----
  for (let i = 1; i <= GROOVEY_TITLE_LIMIT; i++) {
    assert.strictEqual(checkGrooveyTitleRate(userD).allowed, true, `title request ${i} must be allowed`);
  }
  assert.strictEqual(checkGrooveyTitleRate(userD).allowed, false, 'title request beyond limit must be rejected');
  console.log('PASS: 10 title requests/minute per user enforced');

  // ---- 5. Rate-limit identity comes from the authenticated session, not the body ----
  // The routes call checkGrooveyChatRate(user.id) AFTER auth.getUser(); the body is
  // never consulted for identity. A body claiming another user is rate-limited as
  // the authenticated caller regardless of what it contains (see route ordering).

  // ---- 6. Message history validation: >16 is ACCEPTED, last 16 are used ----
  const sixteen = validateChatBody({ messages: chatMessages(MAX_HISTORY_MESSAGES) });
  assert.strictEqual(sixteen.ok, true, 'exactly 16 messages must be accepted');
  assert.strictEqual(sixteen.ok && sixteen.messages.length, MAX_HISTORY_MESSAGES);

  const seventeen = validateChatBody({ messages: chatMessages(17) });
  assert.strictEqual(seventeen.ok, true, '17 messages must be accepted');
  assert.strictEqual(seventeen.ok && seventeen.messages.length, MAX_HISTORY_MESSAGES, 'latest 16 retained');
  assert.strictEqual(
    seventeen.ok && seventeen.messages[0].text,
    'hello 1',
    'oldest message (index 0) must be excluded'
  );
  assert.strictEqual(
    seventeen.ok && seventeen.messages[seventeen.messages.length - 1].text,
    'hello 16',
    'newest message must be retained'
  );

  const twentyFive = validateChatBody({ messages: chatMessages(25) });
  assert.strictEqual(twentyFive.ok, true, '25 messages must be accepted');
  assert.strictEqual(twentyFive.ok && twentyFive.messages.length, MAX_HISTORY_MESSAGES);
  assert.deepStrictEqual(
    twentyFive.ok && twentyFive.messages.map((m) => m.text),
    Array.from({ length: MAX_HISTORY_MESSAGES }, (_, i) => `hello ${i + 9}`),
    'latest 16 messages retained, in order'
  );
  console.log('PASS: >16-message conversations accepted; last 16 sent to provider');

  // ---- 7. Per-message content length ----
  const longMessage = validateChatBody({ messages: [{ role: 'user', content: 'x'.repeat(MAX_MESSAGE_CHARS + 1) }] });
  assert.strictEqual(longMessage.ok, false);
  assert.strictEqual(longMessage.ok === false && longMessage.status, 413, 'message over 2000 chars must return 413');
  const exactlyLong = validateChatBody({ messages: [{ role: 'user', content: 'x'.repeat(MAX_MESSAGE_CHARS) }] });
  assert.strictEqual(exactlyLong.ok, true, 'exactly 2000 chars must be accepted');
  console.log('PASS: 2000-character message limit enforced');

  // ---- 8. Role validation and mapping ----
  const badRole = validateChatBody({ messages: [{ role: 'system', content: 'hi' }] });
  assert.strictEqual(badRole.ok, false, 'unsupported role must be rejected');
  assert.strictEqual(badRole.ok === false && badRole.status, 400);
  const assistantMaps = validateChatBody({ messages: [{ role: 'assistant', content: 'hi' }] });
  assert.strictEqual(assistantMaps.ok, true);
  assert.strictEqual(assistantMaps.ok && assistantMaps.messages[0].role, 'model', 'assistant must map to model');
  console.log('PASS: roles restricted to user/assistant/model (assistant -> model)');

  // ---- 9. Structural validation ----
  assert.strictEqual(validateChatBody(null).ok, false, 'null body must be rejected');
  assert.strictEqual(validateChatBody([]).ok, false, 'array body must be rejected');
  assert.strictEqual(validateChatBody({}).ok, false, 'missing messages must be rejected');
  assert.strictEqual(validateChatBody({ messages: [] }).ok, false, 'empty messages must be rejected');
  assert.strictEqual(validateChatBody({ messages: [{ role: 'user' }] }).ok, false, 'missing content must be rejected');
  assert.strictEqual(validateChatBody({ messages: [{ role: 'user', content: '   ' }] }).ok, false, 'blank content must be rejected');
  assert.strictEqual(validateChatBody({ messages: ['nope'] }).ok, false, 'non-object message must be rejected');
  console.log('PASS: malformed bodies and messages rejected');

  // ---- 10. Text property aliases ----
  const textAlias = validateChatBody({ messages: [{ role: 'user', text: 'hi' }] });
  assert.strictEqual(textAlias.ok, true, 'text alias must be accepted');
  const contentWins = validateChatBody({ messages: [{ role: 'user', content: 'from-content', text: 'from-text' }] });
  assert.strictEqual(contentWins.ok && contentWins.messages[0].text, 'from-content', 'content must win over text');
  console.log('PASS: content/text message shape accepted as before');

  // ---- 11. Title validation ----
  assert.strictEqual(validateTitleBody(null).ok, false);
  assert.strictEqual(validateTitleBody({}).ok, false);
  assert.strictEqual(validateTitleBody({ prompt: 42 }).ok, false);
  assert.strictEqual(validateTitleBody({ prompt: '   ' }).ok, false, 'blank prompt must be rejected');
  const longPrompt = validateTitleBody({ prompt: 'x'.repeat(MAX_TITLE_CHARS + 1) });
  assert.strictEqual(longPrompt.ok, false);
  assert.strictEqual(longPrompt.ok === false && longPrompt.status, 413);
  assert.strictEqual(validateTitleBody({ prompt: 'Coaching plan for stage presence' }).ok, true);
  const exactlyLongPrompt = validateTitleBody({ prompt: 'x'.repeat(MAX_TITLE_CHARS) });
  assert.strictEqual(exactlyLongPrompt.ok, true);
  console.log('PASS: title input contract enforced');

  // ---- 12. Validation passes through unmodified text (no truncation) ----
  const spaced = '  keep me  ';
  const kept = validateChatBody({ messages: [{ role: 'user', content: spaced }] });
  assert.strictEqual(kept.ok && kept.messages[0].text, spaced, 'message text must pass through unmodified');
  console.log('PASS: no silent truncation or mutation');

  console.log('All T4 abuse-control tests passed.');
}

runTests();
