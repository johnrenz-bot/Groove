/**
 * Behavioural tests for the Showcase music route gate and the genre taxonomy.
 *
 * Run: node scripts/verify-music-routes.mjs
 *
 * The route gate is the rule behind "music must play ONLY on /client/talent and
 * /coach/talents", so it is worth pinning down precisely — especially the
 * near-miss cases. `/coach/talentsX` must NOT match, because a naive `startsWith`
 * would let any sibling route smuggle in background audio.
 *
 * The genre checks cover the panel's browsing contract: every required tab
 * exists, and a genre with no keywords (Custom) behaves differently from the
 * keyword-matched ones.
 *
 * Exits non-zero on the first failure so it can gate a build.
 */
import { isMusicRoute, MUSIC_ALLOWED_ROUTES } from '../features/music/lib/routes.ts';
import {
  MUSIC_GENRES,
  DEFAULT_GENRE_ID,
  getGenre,
  matchGenre,
} from '../features/music/config/genres.ts';

let passed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  pass  ${name}`);
  } else {
    failures.push(`${name}${detail ? ` - ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`);
  }
}

/* --- the two Showcase routes --------------------------------------------- */

console.log('\nisMusicRoute - allowed routes');
check('/client/talent plays', isMusicRoute('/client/talent') === true);
check('/coach/talents plays', isMusicRoute('/coach/talents') === true);
check(
  '/coach/talent (alias) plays',
  isMusicRoute('/coach/talent') === true,
  'it re-exports /coach/talents, so it must behave identically'
);

/* --- everything else is blocked ------------------------------------------ */

console.log('\nisMusicRoute - blocked routes');
const blocked = [
  '/',
  '/login',
  '/register/client',
  '/coach/home',
  '/coach/talentss', // a sibling that merely shares a prefix
  '/client/talents',
  '/client/talentshow',
  '/coach/calendar',
  '/client/appointments',
  '/messages',
  '/admin/users',
  '/coach',
  '/client',
  '/coach/talents-archive',
  '/userprofile/abc',
];
for (const path of blocked) {
  check(`${path} is blocked`, isMusicRoute(path) === false);
}

// The sibling-prefix trap: '/coach/talentsX' must not slip through.
check(
  "'/coach/talentsX' is blocked",
  isMusicRoute('/coach/talentsX') === false,
  'prefix match must require a "/" boundary'
);
check(
  "'/client/talents' is blocked",
  isMusicRoute('/client/talents') === false,
  'plural /client/talents is not a real route'
);

/* --- nesting and hydration edge cases ------------------------------------ */

console.log('\nisMusicRoute - nesting and hydration');
check(
  'nested sub-path is allowed',
  isMusicRoute('/client/talent/123') === true,
  'a future detail page should keep playing'
);
check('null is blocked', isMusicRoute(null) === false, 'usePathname() pre-hydration');
check('undefined is blocked', isMusicRoute(undefined) === false);
check('empty string is blocked', isMusicRoute('') === false);

check(
  'allowed list has no duplicates',
  new Set(MUSIC_ALLOWED_ROUTES).size === MUSIC_ALLOWED_ROUTES.length
);
check(
  'every allowed entry actually passes its own predicate',
  MUSIC_ALLOWED_ROUTES.every((r) => isMusicRoute(r))
);
check(
  'every allowed entry is normalised',
  MUSIC_ALLOWED_ROUTES.every((r) => r === r.trim() && r.startsWith('/') && !r.endsWith('/'))
);

/* --- genre taxonomy ------------------------------------------------------ */

console.log('\ngenres - required tabs');
const labels = MUSIC_GENRES.map((g) => g.label);
for (const required of [
  'Hip Hop',
  'Lo-fi',
  'Contemporary',
  'Pop',
  'R&B',
  'Acoustic',
  'Instrumental',
  'Theater/Cinematic',
  '+ Custom',
]) {
  check(`tab "${required}" exists`, labels.includes(required));
}
check('tab ids are unique', new Set(MUSIC_GENRES.map((g) => g.id)).size === MUSIC_GENRES.length);
check('default genre resolves', getGenre(DEFAULT_GENRE_ID).id === DEFAULT_GENRE_ID);
check('unknown id falls back', getGenre('nope').id === DEFAULT_GENRE_ID);

console.log('\ngenres - matching');
const catalogue = [
  { title: 'Dance Rehearsal 8-Count Hip Hop Beat', artist: 'Groove Practice Beats' },
  { title: 'Lofi Chill Hip Hop Beats', artist: 'Lofi Girl' },
  { title: 'Contemporary Instrumental Piano & Cello', artist: 'Studios' },
];

const hiphop = matchGenre(getGenre('hiphop'), catalogue);
check('hip hop matches the 8-count beat', hiphop.length >= 1);
check(
  'hip hop does not match the lofi track title only',
  hiphop.every((t) => /hip hop/i.test(`${t.title} ${t.artist}`))
);

const contemporary = matchGenre(getGenre('contemporary'), catalogue);
check(
  'contemporary matches the piano/cello track',
  contemporary.some((t) => t.title.includes('Piano'))
);

const custom = matchGenre(getGenre('custom'), catalogue);
check('custom matches nothing (free-form search only)', custom.length === 0);

check(
  'every non-custom genre has keywords and a search term',
  MUSIC_GENRES.filter((g) => g.id !== 'custom').every(
    (g) => g.keywords.length > 0 && g.searchTerm.length > 0
  )
);

/* --- result -------------------------------------------------------------- */

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length > 0) {
  for (const f of failures) console.error(`  FAILED: ${f}`);
  process.exit(1);
}