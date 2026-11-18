/**
 * scripts/verify-dance-data.ts
 *
 * Validates the static dance registries against their zod contracts and
 * checks that local logo/hero files referenced by them actually exist.
 *
 * Usage: npx tsx scripts/verify-dance-data.ts   (npm run test:dance-data)
 *
 * This is a gate, not a report you read once: it fails the build-quality
 * workflow when a registry entry drifts — an unknown league id in crews,
 * a duplicate id, a logo path that 404s, or a missing provenance stamp.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  leagueSchema,
  crewSchema,
  COMPLETENESS_THRESHOLD,
} from '../lib/dance/contracts.ts';
import { danceUpdateSchema } from '../lib/dance/schema.ts';
import { VERIFIED_LEAGUES } from '../features/dance/data/leagues.ts';
import { FEATURED_CREWS } from '../features/dance/data/crews.ts';
import { VERIFIED_DANCE_UPDATES } from '../features/dance/data/danceUpdates.ts';

const errors: string[] = [];
const notes: string[] = [];

/* ------------------------------- leagues ----------------------------------- */

const seenLeagueIds = new Set<string>();

for (const league of VERIFIED_LEAGUES) {
  const result = leagueSchema.safeParse(league);
  if (!result.success) {
    errors.push(`league ${league?.id ?? '(unknown)'}: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    continue;
  }
  if (seenLeagueIds.has(league.id)) {
    errors.push(`league ${league.id}: duplicate id in registry`);
  }
  seenLeagueIds.add(league.id);

  if (league.logoUrl?.startsWith('/') && !existsSync(path.join(process.cwd(), 'public', league.logoUrl))) {
    errors.push(`league ${league.id}: local logo missing at public${league.logoUrl}`);
  }
  if (!league.matchTokens.length) {
    errors.push(`league ${league.id}: matchTokens must not be empty`);
  }
  if (league.status !== 'approved') {
    notes.push(`league ${league.id}: status=${league.status} (hidden from public UI)`);
  }
}

/* -------------------------------- crews ------------------------------------- */

const seenCrewIds = new Set<string>();

for (const crew of FEATURED_CREWS) {
  const result = crewSchema.safeParse(crew);
  if (!result.success) {
    errors.push(`crew ${crew?.id ?? '(unknown)'}: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    continue;
  }
  if (seenCrewIds.has(crew.id)) {
    errors.push(`crew ${crew.id}: duplicate id in registry`);
  }
  seenCrewIds.add(crew.id);

  for (const leagueId of crew.leagueIds) {
    if (!seenLeagueIds.has(leagueId)) {
      errors.push(`crew ${crew.id}: references unknown league id '${leagueId}'`);
    }
  }
  if (crew.heroImageUrl?.startsWith('/') && !existsSync(path.join(process.cwd(), 'public', crew.heroImageUrl))) {
    errors.push(`crew ${crew.id}: local hero image missing at public${crew.heroImageUrl}`);
  }
  if (crew.logo?.url?.startsWith('/') && !existsSync(path.join(process.cwd(), 'public', crew.logo.url))) {
    errors.push(`crew ${crew.id}: local logo missing at public${crew.logo.url}`);
  }
  if (crew.completenessScore < COMPLETENESS_THRESHOLD) {
    notes.push(`crew ${crew.id}: completeness ${crew.completenessScore} (< ${COMPLETENESS_THRESHOLD}) — shows "Needs info" until enriched`);
  }
}

/* ------------------------------ dispatches ---------------------------------- */

for (const update of VERIFIED_DANCE_UPDATES) {
  const result = danceUpdateSchema.safeParse(update);
  if (!result.success) {
    errors.push(`update ${update?.id ?? '(unknown)'}: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
}

/* -------------------------------- verdict ----------------------------------- */

console.log(`Leagues: ${VERIFIED_LEAGUES.length} (${VERIFIED_LEAGUES.filter((l) => l.status === 'approved').length} approved)`);
console.log(`Crews:   ${FEATURED_CREWS.length}`);
console.log(`Updates: ${VERIFIED_DANCE_UPDATES.length}`);

if (notes.length > 0) {
  console.log('\nNotes (not failures):');
  for (const note of notes) console.log(`- ${note}`);
}

if (errors.length > 0) {
  console.error(`\nFAILED — ${errors.length} problem${errors.length === 1 ? '' : 's'}:`);
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log('\nOK — dance registries valid against contracts.');
