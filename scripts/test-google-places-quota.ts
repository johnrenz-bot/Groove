import { isGooglePlacesQuotaExhaustedFor, getGooglePlacesQuotaStateFor, resetGooglePlacesQuotaCooldown, isQuotaExhaustionError } from '../lib/googlePlacesQuota.ts';

let passed = 0; let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log('PASS', msg); }
  else { failed++; console.log('FAIL', msg); }
}

resetGooglePlacesQuotaCooldown();
assert(!isGooglePlacesQuotaExhaustedFor('text'), 'text not exhausted initially');
assert(getGooglePlacesQuotaStateFor('text').exhausted === false, 'state not exhausted');

assert(isQuotaExhaustionError(new Error('RESOURCE_EXHAUSTED')), 'detects quota error');
assert(!isQuotaExhaustionError(new Error('not found')), 'non-quota error');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);