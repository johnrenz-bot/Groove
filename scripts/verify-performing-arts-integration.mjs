/**
 * Integration checks for the portal integration of the performing-arts hub.
 *
 * Guards the things that would break silently: a portal route that is not
 * actually registered in its navigation, a nav link pointing at a route that
 * does not exist, a feature link into a role's own portal, an image referenced
 * that is not in /public, and alt text that is empty or missing.
 *
 * Run: node scripts/verify-performing-arts-integration.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const clientNav = read('components/client/navigation.ts');
const coachNav = read('components/coach/navigation.ts');
const hub = read('features/performing-arts/components/PerformingArtsHub.tsx');
const route = read('features/performing-arts/components/HubRoute.tsx');
const editorial = read('features/performing-arts/data/editorial.ts');
const publicPage = read('app/performing-arts-philippines/page.tsx');

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
};

console.log('\nPerforming arts — portal integration\n');

/* 1. Both portal routes exist. */
check(
  '/client/performing-arts-philippines route exists',
  existsSync(join(root, 'app/(client)/client/performing-arts-philippines/page.tsx'))
);
check(
  '/coach/performing-arts-philippines route exists',
  existsSync(join(root, 'app/(coach)/coach/performing-arts-philippines/page.tsx'))
);

/* 2. Each portal registers it in its own nav, pointing at its OWN route. */
check(
  'client nav links to /client/performing-arts-philippines',
  /href:\s*'\/client\/performing-arts-philippines'/.test(clientNav)
);
check(
  'coach nav links to /coach/performing-arts-philippines',
  /href:\s*'\/coach\/performing-arts-philippines'/.test(coachNav)
);
// The cross-wiring guard: a client link inside the coach menu would leak the
// route into the wrong portal and bounce the user via middleware.
check(
  'coach nav does NOT link to the client route',
  !/\/client\/performing-arts-philippines/.test(coachNav)
);
check(
  'client nav does NOT link to the coach route',
  !/\/coach\/performing-arts-philippines/.test(clientNav)
);

/* 3. The nav entry is labelled "Performing Arts" as the brief specifies. */
check('client nav labels it "Performing Arts"', /label:\s*'Performing Arts'/.test(clientNav));
check('coach nav labels it "Performing Arts"', /label:\s*'Performing Arts'/.test(coachNav));

/* 4. Each nav entry carries an icon (NavItem.icon is required). */
{
  const entryRe = /href:\s*'\/(?:client|coach)\/performing-arts-philippines',[\s\S]{0,200}?icon:\s*(\w+)/g;
  const clientIcons = [...clientNav.matchAll(/href:\s*'\/client\/performing-arts-philippines',[\s\S]{0,200}?icon:\s*(\w+)/g)].map(m=>m[1]);
  const coachIcons = [...coachNav.matchAll(/href:\s*'\/coach\/performing-arts-philippines',[\s\S]{0,200}?icon:\s*(\w+)/g)].map(m=>m[1]);
  check('client nav entry has an icon', clientIcons.length === 1 && clientIcons[0] !== 'undefined', `got ${clientIcons}`);
  check('coach nav entry has an icon', coachIcons.length === 1 && coachIcons[0] !== 'undefined', `got ${coachIcons}`);
  // And the icon must actually be imported in that file.
  check('client nav imports its icon', new RegExp(`\\b${clientIcons[0]},`).test(clientNav));
  check('coach nav imports its icon', new RegExp(`\\b${coachIcons[0]},`).test(coachNav));
}

/* 5. No existing navigation entry was removed. */
check(
  'client nav still has Dashboard / Find Coaches / Groovey AI / Appointments / Calendar',
  ['/client/home', '/client/talent', '/client/groovey', '/client/appointments', '/client/calendar']
    .every((h) => clientNav.includes(h)),
  'a pre-existing client destination may have been dropped'
);
check(
  'coach nav still has Dashboard / Showcase / Bookings / Calendar',
  ['/coach/home', '/coach/talents', '/coach/appointments', '/coach/calendar']
    .every((h) => coachNav.includes(h)),
  'a pre-existing coach destination may have been dropped'
);
check(
  'both navs keep the Community and About groups',
  clientNav.includes("label: 'Community'") &&
    clientNav.includes("label: 'About'") &&
    coachNav.includes("label: 'Community'") &&
    coachNav.includes("label: 'About'")
);

/* 6. The three routes render ONE shared component (no duplicated pages). */
check('client route renders the shared HubRoute', /<HubRoute role="client" \/>/.test(read('app/(client)/client/performing-arts-philippines/page.tsx')));
check('coach route renders the shared HubRoute', /<HubRoute role="coach" \/>/.test(read('app/(coach)/coach/performing-arts-philippines/page.tsx')));
check('public route renders the shared PerformingArtsHub', /<PerformingArtsHub role="public" \/>/.test(publicPage));
check('HubRoute delegates to PerformingArtsHub', /<PerformingArtsHub role=\{role\} \/>/.test(route));

/* 6b. Portal parity.
 *
 * Both portal routes need a signed-in session, so their markup cannot be
 * fetched in CI. What guarantees they show the same images is structural: they
 * render one shared component, and no image selection anywhere in that
 * component or its data depends on `role`. If either of those ever changes,
 * the portals could drift apart silently — so both are asserted here.
 */
{
  // Image choice must not branch on role anywhere in the hub or its data.
  // Copy may legitimately differ per role (the closing heading does), so this
  // only rejects a role branch that sits on a line choosing an image.
  const imageRoleBranches = hub
    .split('\n')
    .map((line, i) => [i + 1, line])
    .filter(([, line]) => /role\s*===|role\s*!==|role\s*\?|role\s*&&/.test(line))
    .filter(([, line]) => /<Image|\bimg\b|\.src\b|\bimage\b/i.test(line));
  check(
    'no image selection branches on role',
    imageRoleBranches.length === 0,
    imageRoleBranches.map(([n, l]) => `line ${n}: ${l.trim()}`).join('\n        ')
  );

  // The image maps themselves must not be role-keyed.
  const mapsBlock = editorial.slice(
    editorial.indexOf('export const HUB_IMAGES'),
    editorial.indexOf('export const GROOVE_FEATURES')
  );
  check(
    'the image maps are not role-keyed',
    !/role/.test(mapsBlock),
    'HUB_IMAGES / EDITORIAL_CATEGORIES / ORG_IMAGES / ARTICLE_IMAGES must be role-independent'
  );

  // GROOVE_FEATURES is the only role-keyed map, and it holds no image data.
  const featuresBlock = editorial.slice(
    editorial.indexOf('export const GROOVE_FEATURES'),
    editorial.length
  );
  check(
    'the only role-keyed data is the Groove feature links, which carry no images',
    featuresBlock.includes('GROOVE_FEATURES') &&
      !/src:\s*['"`]/.test(featuresBlock) &&
      !/<Image/.test(featuresBlock),
    'GROOVE_FEATURES must not contain image sources'
  );

  // ORG_IMAGES / ARTICLE_IMAGES / HUB_IMAGES are shared, role-independent maps.
  check(
    'the image maps are shared by both portals',
    /export const ORG_IMAGES/.test(editorial) &&
      /export const ARTICLE_IMAGES/.test(editorial) &&
      /export const HUB_IMAGES/.test(editorial)
  );
}

/* 7. Each route has its own metadata + canonical. */
for (const [name, file, role, portal] of [
  ['client', 'app/(client)/client/performing-arts-philippines/page.tsx', 'client', 'Client'],
  ['coach', 'app/(coach)/coach/performing-arts-philippines/page.tsx', 'coach', 'Coach'],
]) {
  const src = read(file);
  check(`${name} route exports metadata`, /export const metadata/.test(src));
  check(`${name} metadata is role-specific`, src.includes(`buildHubMetadata('${role}', '${portal}')`));
}
check('public route keeps its own canonical', /alternates:\s*\{ canonical: PAGE_PATH \}/.test(publicPage));
check('canonical points at the matching portal path', /\`\/\$\{role\}\/performing-arts-philippines\`/.test(route));

/* 8. Middleware must still gate the new routes (it classifies by prefix). */
{
  const mw = read('lib/supabase/middleware.ts');
  check(
    'middleware classifies /client and /coach by prefix (so new routes are covered)',
    mw.includes("path.startsWith('/client')") && mw.includes("path.startsWith('/coach')")
  );
  check('middleware is unchanged by this feature', !mw.includes('performing-arts'));
}

/* 9. Every image referenced actually exists in /public. */
{
  const src = [...hub.matchAll(/HUB_IMAGES\.(\w+)/g)].map((m) => m[1]);
  const mapBlock = editorial.slice(editorial.indexOf('export const HUB_IMAGES'), editorial.indexOf('} as const;'));
  const paths = [...mapBlock.matchAll(/(\w+):\s*'\/([^']+)'/g)];
  const missing = paths.filter(([, , p]) => !existsSync(join(root, 'public', p)));
  check(`all ${paths.length} HUB_IMAGES assets exist in /public`, missing.length === 0,
    missing.map((m) => m[2]).join(', '));
  check('the hub actually references HUB_IMAGES', src.length > 0);
}

/* 10. No fabricated asset paths — everything is a local /public path. */
{
  const remote = [...hub.matchAll(/src="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  check('no remote image hosts (no unlicensed third-party images)', remote.length === 0, remote.join(', '));
  const remoteEditorial = [...editorial.matchAll(/src:\s*'(https?:\/\/[^']+)'/g)].map((m) => m[1]);
  check('editorial data has no remote images', remoteEditorial.length === 0, remoteEditorial.join(', '));
}

/* 11. Every alt string in the editorial data is meaningful. */
{
  const alts = [...editorial.matchAll(/alt:\s*'([^']*)'/g)].map((m) => m[1]);
  const weak = alts.filter((a) => a.length < 20 || !/[a-z]/.test(a));
  check(`all ${alts.length} editorial alt texts are descriptive`, weak.length === 0,
    weak.map((a) => `"${a}"`).join(', '));
}

/* 12. Accessibility essentials in the redesigned component. */
check('exactly one H1 in the hub', (hub.match(/<h1/g) || []).length === 1);
check('hero image has priority', /priority/.test(hub));
// Match `<Image` only when it is a real tag: `<ImageCredit` also starts with
// "<Image" and would otherwise be counted as an unlabelled image.
check(
  'every image has alt={',
  (hub.match(/alt=/g) || []).length >= (hub.match(/<Image[\s/>]/g) || []).length,
  `${(hub.match(/alt=/g) || []).length} alt= vs ${(hub.match(/<Image[\s/>]/g) || []).length} <Image tags`
);
check('search input is labelled', /htmlFor="hub-search"/.test(hub) && /id="hub-search"/.test(hub));
check('search input uses type="search"', /type="search"/.test(hub));
check('filter chips expose pressed state', /aria-pressed/.test(hub));
check('result count is announced', /aria-live="polite"/.test(hub));
check('empty state is rendered', /EmptyState/.test(hub));
check('external links use safe rel', /rel="noopener noreferrer external"/.test(hub));
check('reduced-motion guards on hover zoom', /motion-reduce:group-hover:scale-100/.test(hub));
check('sections use scroll-mt so the sticky header does not cover headings', /scroll-mt-24/.test(hub));

/* 13. Category cards deep-link into the explorer rather than nowhere. */
check('category cards dispatch a category to the explorer', /pa:set-category/.test(hub));
check('explorer listens for that event', /addEventListener\('pa:set-category'/.test(hub));

/* 14. Role-specific feature links stay inside the right portal. */
{
  const clientBlock = editorial.slice(
    editorial.indexOf('client: ['),
    editorial.indexOf('coach: [')
  );
  const coachBlock = editorial.slice(
    editorial.indexOf('coach: ['),
    editorial.indexOf('public: [')
  );
  check('client feature links stay in /client or shared routes',
    !/\/coach\//.test(clientBlock) && clientBlock.includes('/client/talent'));
  check('coach feature links stay in /coach or shared routes',
    !/\/client\//.test(coachBlock) && coachBlock.includes('/coach/talents'));
}

/* 15. Content provenance: the hub must not restate dataset text inline. */
check('hub imports records from the shared dataset', /from '\.\.\/data\/content'/.test(hub));
check('editorial file imports the dataset types', /from '\.\/content'/.test(editorial));
check('editorial file invents no article titles', !/title:\s*'/.test(editorial));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);