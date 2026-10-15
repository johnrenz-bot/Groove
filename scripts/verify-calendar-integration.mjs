/**
 * Guards the constraint that matters most for this work: the calendar was a
 * VIEW upgrade only.
 *
 * The appointment fetching, the Supabase queries, the row scope that decides
 * which bookings a user may see, and the surrounding routes must be exactly as
 * they were. These checks fail if any of that is weakened, dropped, or moved
 * into a place that could diverge between the two portals.
 *
 * Run: node scripts/verify-calendar-integration.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const clientPage = read('app/(client)/client/calendar/page.tsx');
const coachPage = read('app/(coach)/coach/calendar/page.tsx');
const calendar = read('features/calendar/components/AppointmentCalendar.tsx');
const toolbar = read('features/calendar/components/CalendarToolbar.tsx');
const entryCard = read('features/calendar/components/EntryCard.tsx');
const dateUtils = read('features/calendar/lib/dateUtils.ts');
const entries = read('features/calendar/lib/entries.ts');
const middleware = read('lib/supabase/middleware.ts');

let pass = 0;
let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
};

console.log('\nCalendar integration\n');

/* 1. Row scope: a user must only ever see their own bookings. */
check(
  'client calendar is scoped to the signed-in client',
  /from\('appointments'\)[\s\S]*?\.eq\('client_id', user\.id\)/.test(clientPage),
  'the client_id scope must be present'
);
check(
  'coach calendar is scoped to the signed-in coach',
  /from\('appointments'\)[\s\S]*?\.eq\('coach_id', user\.id\)/.test(coachPage),
  'the coach_id scope must be present'
);
check('client calendar reads the session user', /supabase\.auth\.getUser\(\)/.test(clientPage));
check('coach calendar reads the session user', /supabase\.auth\.getUser\(\)/.test(coachPage));
check(
  'neither portal filters by a client-supplied id',
  !/searchParams|useSearchParams|\bid=\s*searchParams/.test(clientPage + coachPage),
  'row scope must come from the session, not the URL'
);

/* 2. The joins the cards depend on are unchanged. */
check('client calendar still joins the coach profile', /coach:coach_id\(\*\)/.test(clientPage));
check('coach calendar still joins the client profile', /client:client_id\(\*\)/.test(coachPage));
check('coach calendar still reads its own profile', /from\('profiles'\)/.test(coachPage));

/* 3. No writes. A calendar is read-only; booking changes go through the
      appointments pages. */
const writes = [
  ['client', clientPage],
  ['coach', coachPage],
];
for (const [label, src] of writes) {
  check(
    `${label} calendar performs no writes`,
    !/\.(insert|update|upsert|delete)\(/.test(src),
    'a read-only calendar must never mutate appointments'
  );
  check(
    `${label} calendar creates no realtime channel`,
    !/\.channel\(/.test(src),
    'no subscription was added'
  );
}

/* 4. Both portals render one shared calendar. */
check('client renders the shared calendar', /<AppointmentCalendar/.test(clientPage));
check('coach renders the shared calendar', /<AppointmentCalendar/.test(coachPage));
check(
  'the calendar takes appointments as a prop and fetches nothing itself',
  /appointments=\{appointments\}/.test(clientPage) &&
    /appointments=\{appointments\}/.test(coachPage) &&
    !/createClient|supabase/.test(calendar),
  'the view component must not reach for Supabase'
);
check('the calendar is told which side of the booking it shows', /role="client"/.test(clientPage) && /role="coach"/.test(coachPage));

/* 5. Existing affordances are preserved. */
check('client keeps its Book New Session link', /\/client\/talent/.test(clientPage) && /Book New Session/.test(clientPage));
check('coach keeps its Manage All Bookings link', /\/coach\/appointments/.test(coachPage) && /Manage All Bookings/.test(coachPage));
check('client keeps its back-to-appointments link', /href="\/client\/appointments"/.test(clientPage));
check('coach keeps its back-to-appointments link', /href="\/coach\/appointments"/.test(coachPage));
check('the message link is preserved', /messages\?user=/.test(entries));
check('the loading skeleton is preserved', /g-skeleton/.test(clientPage) && /Loading schedule/.test(coachPage));

/* 6. All five views exist and are reachable. */
const viewFiles = [
  'YearView', 'MonthView', 'WeekView', 'DayView', 'AgendaView',
];
for (const v of viewFiles) {
  check(`the ${v.replace('View', '').toLowerCase()} view is rendered`, new RegExp(`<${v}`).test(calendar));
}
check('the toolbar offers five views', (toolbar.match(/VIEW_LABELS\[option\]/g) || []).length === 1 && /CALENDAR_VIEWS\.map/.test(toolbar));
check('dateUtils declares exactly five views', /'year',\s*'month',\s*'week',\s*'day',\s*'agenda'/.test(dateUtils));
check('there is a Today control', /Today/.test(toolbar) && /onToday/.test(toolbar));
check('prev and next are labelled for the active view', /Previous \$\{VIEW_LABELS\[view\]/.test(toolbar) && /Next \$\{VIEW_LABELS\[view\]/.test(toolbar));

/* 7. The timezone fix: no UTC-based date keys anywhere in the calendar. */
{
  // Comments explain WHY toISOString() is wrong, so strip them before checking
  // that the code does not still use it.
  const code = [calendar, toolbar, dateUtils, entries]
    .map((s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''))
    .join('\n');
  check(
    'the calendar never derives a day from toISOString()',
    !/toISOString\(\)\s*\.split/.test(code),
    'toISOString() is UTC and lands on the wrong day in UTC+8 before 08:00'
  );
  check(
    'the reason is documented where it matters',
    /WHY NOT toISOString/.test(dateUtils),
    'a future reader needs to know why this is hand-rolled'
  );
}
check('date keys are built from local date parts', /getFullYear\(\)[\s\S]*?getMonth\(\)[\s\S]*?getDate\(\)/.test(dateUtils));
check('date keys are parsed from parts, not new Date(string)', /new Date\(Number\(match\[1\]\)/.test(dateUtils));

/* 8. Accessibility affordances. */
check('the view switcher is a tablist', /role="tablist"/.test(toolbar));
check('tabs expose selection state', /aria-selected/.test(toolbar));
check('tabs are arrow-key navigable', /ArrowRight/.test(toolbar) && /ArrowLeft/.test(toolbar));
check('only the selected tab is tabbable', /tabIndex=\{selected \? 0 : -1\}/.test(toolbar));
check('the panel is associated with the tabs', /role="tabpanel"/.test(calendar) && /aria-controls="calendar-view-panel"/.test(toolbar));
check('day buttons announce their session count', /aria-label=/.test(read('features/calendar/components/views/MonthView.tsx')));
check('the selected day is announced politely', /aria-live="polite"/.test(toolbar) && /sr-only/.test(toolbar));
check('every status renders a label, not just a colour', /\{entry\.status\.replace/.test(entryCard));

/* 9. Nothing was rewritten outside the calendar's scope. */
check('the auth middleware was not modified for this feature', !/AppointmentCalendar|performing-arts/.test(middleware));
check('the calendar does not import from another feature', !/@\/features\/(?!calendar)/.test(calendar + dateUtils + entries));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);