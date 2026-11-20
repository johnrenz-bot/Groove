/**
 * scripts/verify-discipline-data.ts
 *
 * Validates ALL FOUR performing-arts discipline datasets against their zod
 * contracts and checks that local logo/image paths they reference exist:
 *
 *   dance     — VERIFIED_LEAGUES + FEATURED_CREWS + VERIFIED_DANCE_UPDATES
 *   singing   — VERIFIED_SINGING_UPDATES + VERIFIED_SINGING_ORGS
 *   acting    — VERIFIED_ACTING_UPDATES + VERIFIED_ACTING_ORGS
 *   theater   — VERIFIED_THEATER_UPDATES + VERIFIED_THEATER_ORGS
 *
 * Usage: npx tsx scripts/verify-discipline-data.ts
 * (wired as `npm run test:discipline-data`)
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { danceUpdateSchema } from '../lib/dance/schema.ts';
import { leagueSchema, crewSchema, COMPLETENESS_THRESHOLD } from '../lib/dance/contracts.ts';
import { VERIFIED_LEAGUES } from '../features/dance/data/leagues.ts';
import { FEATURED_CREWS } from '../features/dance/data/crews.ts';
import { VERIFIED_DANCE_UPDATES } from '../features/dance/data/danceUpdates.ts';
import { VERIFIED_SINGING_UPDATES } from '../features/singing/data/singingUpdates.ts';
import { VERIFIED_ACTING_UPDATES } from '../features/acting/data/actingUpdates.ts';
import { VERIFIED_THEATER_UPDATES } from '../features/theater/data/theaterUpdates.ts';
import { VERIFIED_SINGING_ORGS } from '../features/singing/data/singingOrgs.ts';
import { VERIFIED_ACTING_ORGS } from '../features/acting/data/actingOrgs.ts';
import { VERIFIED_THEATER_ORGS } from '../features/theater/data/theaterOrgs.ts';

const errors: string[] = [];
const notes: string[] = [];

function checkUpdates(name: string, updates: Array<{ id?: unknown }>) {
  const seen = new Set<string>();
  for (const update of updates) {
    const result = danceUpdateSchema.safeParse(update);
    if (!result.success) {
      errors.push(
        `${name} update ${update?.id ?? '(unknown)'}: ${result.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`
      );
      continue;
    }
    const id = String(update?.id);
    if (seen.has(id)) errors.push(`${name} update ${id}: duplicate id`);
    seen.add(id);
  }
  console.log(`${name} updates: ${updates.length}`);
}

function checkLocalPath(kind: string, owner: string, url: string | null | undefined) {
  if (typeof url === 'string' && url.startsWith('/') && !existsSync(path.join(process.cwd(), 'public', url))) {
    errors.push(`${owner}: local ${kind} missing at public${url}`);
  }
}

function checkOrgs(name: string, orgs: Array<Record<string, unknown>>) {
  const seen = new Set<string>();
  for (const org of orgs) {
    const id = org?.id as string | undefined;
    if (!id || typeof id !== 'string') {
      errors.push(`${name} org (unknown): missing id`);
      continue;
    }
    if (seen.has(id)) errors.push(`${name} org ${id}: duplicate id`);
    seen.add(id);
    if (typeof org.name !== 'string' || !org.name.trim()) errors.push(`${name} org ${id}: missing name`);
    if (typeof org.website_url !== 'string' || !/^https?:\/\//i.test(org.website_url as string)) {
      errors.push(`${name} org ${id}: website_url must be an http(s) URL`);
    }
    checkLocalPath('logo', `${name} org ${id}`, org.logo_url as string | null | undefined);
  }
  console.log(`${name} orgs:    ${orgs.length}`);
}

/* ------------------------------- dance ------------------------------------- */

const seenLeagueIds = new Set<string>();
for (const league of VERIFIED_LEAGUES) {
  const result = leagueSchema.safeParse(league);
  if (!result.success) {
    errors.push(
      `league ${league?.id ?? '(unknown)'}: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`
    );
    continue;
  }
  if (seenLeagueIds.has(league.id)) errors.push(`league ${league.id}: duplicate id in registry`);
  seenLeagueIds.add(league.id);
  checkLocalPath('logo', `league ${league.id}`, league.logoUrl);
  if (!league.matchTokens.length) errors.push(`league ${league.id}: matchTokens must not be empty`);
  if (league.status !== 'approved') notes.push(`league ${league.id}: status=${league.status} (hidden from public UI)`);
}
console.log(`dance leagues:  ${VERIFIED_LEAGUES.length}`);

for (const crew of FEATURED_CREWS) {
  const result = crewSchema.safeParse(crew);
  if (!result.success) {
    errors.push(
      `crew ${crew?.id ?? '(unknown)'}: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`
    );
    continue;
  }
  for (const leagueId of crew.leagueIds) {
    if (!seenLeagueIds.has(leagueId)) errors.push(`crew ${crew.id}: references unknown league id '${leagueId}'`);
  }
  checkLocalPath('hero image', `crew ${crew.id}`, crew.heroImageUrl);
  checkLocalPath('logo', `crew ${crew.id}`, crew.logo?.url);
  if (crew.completenessScore < COMPLETENESS_THRESHOLD) {
    notes.push(`crew ${crew.id}: completeness ${crew.completenessScore} (< ${COMPLETENESS_THRESHOLD})`);
  }
}
console.log(`dance crews:    ${FEATURED_CREWS.length}`);

/* ------------------------------ all four ----------------------------------- */

checkUpdates('dance', VERIFIED_DANCE_UPDATES as unknown as Array<{ id?: unknown }>);
checkUpdates('singing', VERIFIED_SINGING_UPDATES as unknown as Array<{ id?: unknown }>);
checkUpdates('acting', VERIFIED_ACTING_UPDATES as unknown as Array<{ id?: unknown }>);
checkUpdates('theater', VERIFIED_THEATER_UPDATES as unknown as Array<{ id?: unknown }>);

checkOrgs('singing', VERIFIED_SINGING_ORGS as unknown as Array<Record<string, unknown>>);
checkOrgs('acting', VERIFIED_ACTING_ORGS as unknown as Array<Record<string, unknown>>);
checkOrgs('theater', VERIFIED_THEATER_ORGS as unknown as Array<Record<string, unknown>>);

/* -------------------------------- verdict ----------------------------------- */

if (notes.length > 0) {
  console.log('\nNotes (not failures):');
  for (const note of notes) console.log(`- ${note}`);
}

if (errors.length > 0) {
  console.error(`\nFAILED — ${errors.length} problem${errors.length === 1 ? '' : 's'}:`);
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log('\nOK — all discipline registries valid against contracts.');
