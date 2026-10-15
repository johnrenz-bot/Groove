/**
 * Seeding script for Dance Community updates.
 * Executed via: npm run seed:dance
 */

import { FALLBACK_UPDATES, ingestDanceUpdates } from '../features/dance/services/danceService.ts';

async function main() {
  console.log('====================================================');
  console.log('🌱 SEEDING VERIFIED DANCE COMMUNITY UPDATES');
  console.log('====================================================');

  console.log(`Seeding ${FALLBACK_UPDATES.length} curated dance updates...`);

  const { inserted, updated, total } = await ingestDanceUpdates(FALLBACK_UPDATES);

  console.log('✅ Seeding completed:');
  console.log(`   Total processed: ${total}`);
  console.log(`   New inserted:    ${inserted}`);
  console.log(`   Existing updated:${updated}`);
}

main().catch((err) => {
  console.error('Fatal crash during seeding:', err);
  process.exit(1);
});
