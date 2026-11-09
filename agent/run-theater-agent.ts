import { runTheaterBeatAgent } from '../features/theater/services/theaterBeatAgent.ts';

async function main() {
  console.log('====================================================');
  console.log('⚡ THEATERBEAT AGENT — STARTING DISCOVERY CYCLE');
  console.log('Time:', new Date().toISOString());
  console.log('====================================================');

  const result = await runTheaterBeatAgent();

  if (result.success) {
    console.log('\n✅ [TheaterBeat Agent] Discovery run succeeded:');
    console.log(`   Items discovered: ${result.itemsFound}`);
    console.log(`   Items inserted:   ${result.itemsInserted}`);
    console.log(`   Items updated:    ${result.itemsUpdated}`);
    console.log(`   Duration:         ${result.durationMs}ms`);
    if (result.updates.length > 0) {
      console.log('\nPublished updates:');
      result.updates.forEach((u, i) => console.log(`   ${i + 1}. [${u.organization}] ${u.title}`));
    }
    process.exit(0);
  } else {
    console.error('\n❌ [TheaterBeat Agent] Discovery run failed:');
    console.error(`   Error: ${result.error}`);
    process.exit(1);
  }
}

main().catch((err) => { console.error('Fatal crash in agent runner:', err); process.exit(1); });
