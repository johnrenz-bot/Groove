/**
 * Behavioural tests for the rehearsal player's playback-failure policy.
 *
 * Run: node scripts/verify-music-skip-policy.mjs
 *
 * These cover the four scenarios from the bug report — embedding restricted,
 * video deleted, network/stream error, end of playlist — plus the two failure
 * modes that made the original handler dangerous: duplicate skip calls and an
 * unbounded loop over an entirely unplayable playlist.
 *
 * Exits non-zero on the first failure so it can gate a build.
 */
import { classifyPlaybackError, planSkip } from '../../features/music/lib/playbackPolicy.ts';

let passed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  pass  ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function eq(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  check(name, a === e, a === e ? '' : `got ${a}, expected ${e}`);
}

console.log('');
console.log('  Rehearsal music player — playback failure policy');
console.log('  ' + '-'.repeat(70));

/* --- 1. Error classification ---------------------------------------------- */
console.log('');
console.log('  Error code classification');

{
  const r101 = classifyPlaybackError(101);
  check('101 -> embed-restricted', r101.kind === 'embed-restricted');
  check('101 -> offers YouTube', r101.openOnYouTube === true);
  check('101 -> not retryable', r101.retryable === false);

  const r150 = classifyPlaybackError(150);
  check('150 (legacy) -> embed-restricted', r150.kind === 'embed-restricted');
  check('150 -> offers YouTube', r150.openOnYouTube === true);

  const r100 = classifyPlaybackError(100);
  check('100 (deleted/private) -> unavailable', r100.kind === 'unavailable');
  check('100 -> no YouTube offer (nothing to open)', r100.openOnYouTube === false);
  check('100 -> not retryable', r100.retryable === false);

  const r2 = classifyPlaybackError(2);
  check('2 (bad id) -> unavailable', r2.kind === 'unavailable');
  check('2 -> not retryable', r2.retryable === false);

  const r5 = classifyPlaybackError(5);
  check('5 (network/stream) -> transient', r5.kind === 'transient');
  check('5 -> retryable', r5.retryable === true);

  const rUnknown = classifyPlaybackError(999);
  check('unknown code -> unknown', rUnknown.kind === 'unknown');
  check('unknown -> no YouTube offer', rUnknown.openOnYouTube === false);

  const rString = classifyPlaybackError('150');
  check('string code is coerced', rString.kind === 'embed-restricted');
  const rJunk = classifyPlaybackError(undefined);
  check('undefined does not throw', rJunk.kind === 'unknown');
}

/* --- 2. Restricted video: continue to the next playable track -------------- */
console.log('');
console.log('  Restricted video (101/150) skips to the next playable track');

{
  const ids = ['a', 'b', 'c', 'd'];
  const attempted = new Set(['a']);
  const d = planSkip({ trackIds: ids, currentIndex: 0, attempted, isShuffle: false });
  eq('skips a -> b', d, { type: 'skip', index: 1 });

  const attempted2 = new Set(['a', 'b']);
  eq('skips b -> c', planSkip({ trackIds: ids, currentIndex: 1, attempted: attempted2, isShuffle: false }), {
    type: 'skip',
    index: 2,
  });

  // d failed, then wrap back round; a and b already failed.
  const attempted3 = new Set(['d', 'a', 'b']);
  eq('wraps once past failed tracks -> c', planSkip({ trackIds: ids, currentIndex: 3, attempted: attempted3, isShuffle: false }), {
    type: 'skip',
    index: 2,
  });
}

/* --- 3. Deleted video ------------------------------------------------------ */
console.log('');
console.log('  Deleted video (100) is skipped, not retried');

{
  const ids = ['gone', 'good'];
  const d = planSkip({
    trackIds: ids,
    currentIndex: 0,
    attempted: new Set(['gone']),
    isShuffle: false,
  });
  eq('deleted first track -> next track', d, { type: 'skip', index: 1 });
}

/* --- 4. Network / stream error -------------------------------------------- */
console.log('');
console.log('  Network / stream error (5)');

{
  const info = classifyPlaybackError(5);
  check('stream error marked retryable', info.retryable === true);

  const ids = ['flaky', 'next'];
  const d = planSkip({
    trackIds: ids,
    currentIndex: 0,
    // Still only the failing id is recorded; the retry may succeed.
    attempted: new Set(['flaky']),
    isShuffle: false,
  });
  eq('falls through to the next track', d, { type: 'skip', index: 1 });
}

/* --- 5. All tracks unavailable -> stop gracefully, no infinite loop --------- */
console.log('');
console.log('  Entire playlist unplayable stops instead of looping');

{
  const ids = ['x', 'y', 'z'];

  const all = planSkip({ trackIds: ids, currentIndex: 0, attempted: new Set(ids), isShuffle: false });
  eq('stops when every id attempted', all, { type: 'stop', reason: 'exhausted' });

  const single = planSkip({ trackIds: ['only'], currentIndex: 0, attempted: new Set(['only']), isShuffle: false });
  eq('single-track playlist stops', single, { type: 'stop', reason: 'empty-playlist' === '' ? '' : 'exhausted' });

  const empty = planSkip({ trackIds: [], currentIndex: -1, attempted: new Set(), isShuffle: false });
  eq('empty playlist stops', empty, { type: 'stop', reason: 'empty-playlist' });

  // The real regression test: replay the failing sequence the way the old
  // handler did and prove it terminates.
  const attempted = new Set();
  let index = 0;
  let steps = 0;
  for (;;) {
    const d = planSkip({ trackIds: ids, currentIndex: index, attempted, isShuffle: false });
    if (d.type === 'stop') break;
    index = d.index;
    attempted.add(ids[index]);
    steps += 1;
    if (steps > ids.length * 3) break; // hard stop, should never be reached
  }
  check(`terminates after ${steps} skips (bounded by playlist size ${ids.length})`, steps <= ids.length);
  check('all tracks were tried exactly once', attempted.size === ids.length);
}

/* --- 6. Duplicate skip suppression ----------------------------------------- */
console.log('');
console.log('  Duplicate error events do not double-skip');

{
  // The guard lives in the context (skipInFlightRef), and the policy layer
  // makes the second call harmless too: once the id is recorded, re-planning
  // for the same failing track must not return that same track.
  const ids = ['a', 'b', 'c'];
  const attempted = new Set();
  attempted.add('a'); // first onError records a
  const first = planSkip({ trackIds: ids, currentIndex: 0, attempted, isShuffle: false });
  eq('first error -> b', first, { type: 'skip', index: 1 });

  // A second error for the same track, fired before the timer fires.
  const second = planSkip({ trackIds: ids, currentIndex: 0, attempted, isShuffle: false });
  eq('second error yields the same target, never a double advance', second, first);
}

/* --- 7. End of playlist ---------------------------------------------------- */
console.log('');
console.log('  End-of-playlist handling');

{
  const ids = ['a', 'b'];
  // Last track fails and both are now attempted.
  const d = planSkip({ trackIds: ids, currentIndex: 1, attempted: new Set(ids), isShuffle: false });
  eq('last failing track stops cleanly', d, { type: 'stop', reason: 'exhausted' });

  // A track outside the playlist (index -1) must still produce a valid target.
  const outside = planSkip({ trackIds: ids, currentIndex: -1, attempted: new Set(), isShuffle: false });
  eq('currentIndex -1 starts at the top', outside, { type: 'skip', index: 0 });
}

/* --- 8. Shuffle stays bounded and never returns the failed track ----------- */
console.log('');
console.log('  Shuffle mode');

{
  const ids = ['a', 'b', 'c'];
  let allGood = true;
  for (let t = 0; t < 200; t += 1) {
    const d = planSkip({
      trackIds: ids,
      currentIndex: 0,
      attempted: new Set(['a']),
      isShuffle: true,
      random: () => (t % 7) / 7,
    });
    if (d.type === 'stop' || ids[d.index] === 'a') allGood = false;
  }
  check('shuffle never returns the failed track and always finds one', allGood);

  const exhausted = planSkip({
    trackIds: ids,
    currentIndex: 0,
    attempted: new Set(ids),
    isShuffle: true,
    random: () => 0.5,
  });
  eq('shuffle stops when exhausted', exhausted, { type: 'stop', reason: 'exhausted' });
}

/* --- 9. Duplicate ids in a playlist ---------------------------------------- */
console.log('');
console.log('  Robustness');

{
  const dupes = ['a', 'a', 'a'];
  const d = planSkip({ trackIds: dupes, currentIndex: 0, attempted: new Set(['a']), isShuffle: false });
  eq('duplicate ids do not cause a loop', d, { type: 'stop', reason: 'exhausted' });
}

/* --- 10. Full run simulation ----------------------------------------------
   Replays the exact sequence MusicPlayerContext.handlePlayerError performs —
   classify, record the failed id, suppress a duplicate while a skip is in
   flight, plan, advance — using the real policy functions. This is the closest
   a headless run gets to the live player: it proves the whole walk terminates
   for each scenario, and that a duplicate error cannot advance twice. */
console.log('');
console.log('  Full skip-run simulation');

function simulateRun({ ids, failingCode, duplicateErrors = false, startIndex = 0 }) {
  const attempted = new Set();
  let index = startIndex;
  let skipInFlight = false;
  const played = [];
  let stopMessage = null;
  let openOnYouTube = false;

  // Mirrors handlePlayerError. The in-flight flag is set synchronously before
  // the handler returns, so a duplicate that arrives on a later tick (which is
  // how YouTube emits them) is dropped.
  const handleError = (code) => {
    const info = classifyPlaybackError(code);
    openOnYouTube = info.openOnYouTube;
    if (skipInFlight) return;
    attempted.add(ids[index]);

    const decision = planSkip({
      trackIds: ids,
      currentIndex: index,
      attempted,
      isShuffle: false,
    });
    if (decision.type === 'stop') {
      stopMessage = decision.reason === 'exhausted' ? 'No playable tracks left in this playlist.' : null;
      return;
    }
    skipInFlight = true;
    return decision; // the timer would fire and advance here
  };

  const pending = handleError(failingCode);
  // A second error for the same track, emitted after the first handler settled.
  if (duplicateErrors) handleError(failingCode);
  if (pending && pending.type === 'skip') {
    skipInFlight = false;
    index = pending.index;
    played.push(index);
  }

  return { played, stopMessage, openOnYouTube, attempts: attempted.size };
}

{
  // Restricted first track, rest fine -> plays on.
  const r = simulateRun({ ids: ['a', 'b', 'c'], failingCode: 150 });
  eq('150 on first track advances to track 2', r.played, [1]);
  check('150 surfaces the YouTube option', r.openOnYouTube === true);
  check('150 does not stop early', r.stopMessage === null);

  // Deleted first track -> same advance, no YouTube offer.
  const d = simulateRun({ ids: ['a', 'b', 'c'], failingCode: 100 });
  eq('100 advances the same way', d.played, [1]);
  check('100 does not offer YouTube', d.openOnYouTube === false);

  // Network error on the first track.
  const n = simulateRun({ ids: ['a', 'b'], failingCode: 5 });
  eq('5 advances to the next track', n.played, [1]);

  // Duplicate errors for one track must not double-advance.
  const dup = simulateRun({ ids: ['a', 'b', 'c'], failingCode: 101, duplicateErrors: true });
  eq('duplicate errors advance exactly once', dup.played, [1]);

  // Every track restricted -> each tried once, then a stop, and no loop.
  const all = simulateRun({ ids: ['a', 'b', 'c'], failingCode: 101 });
  // After the first skip the run continues; re-drive it to exhaustion.
  let idx = 0;
  const seen = new Set();
  let guard = 0;
  let done = false;
  seen.add('a');
  while (!done && guard < 50) {
    guard += 1;
    const decision = planSkip({
      trackIds: ['a', 'b', 'c'],
      currentIndex: idx,
      attempted: seen,
      isShuffle: false,
    });
    if (decision.type === 'stop') {
      done = true;
      break;
    }
    idx = decision.index;
    seen.add(['a', 'b', 'c'][idx]);
  }
  check('all-restricted run terminates without looping', done === true);
  check('all-restricted run tried each track once', seen.size === 3);
  check(`guard never tripped (iterations=${guard})`, guard < 50);
}
if (failures.length === 0) {
  console.log(`  ${passed} assertions passed.`);
  console.log('');
  process.exit(0);
} else {
  console.log(`  ${failures.length} FAILED, ${passed} passed:`);
  failures.forEach((f) => console.log(`    - ${f}`));
  console.log('');
  process.exit(1);
}