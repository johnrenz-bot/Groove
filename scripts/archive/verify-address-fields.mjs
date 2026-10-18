/**
 * Standalone verification of the address-field independence contract.
 *
 * Imports the REAL AddressSelector source, extracts `buildAddressData` and
 * `composeStreetLine`, and replays the exact keystroke sequences that used to
 * corrupt the Street field. No React needed: the bug lived in the
 * value-derivation + write-back loop, both of which are pure functions here.
 *
 * Run: node scripts/verify-address-fields.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'components', 'auth', 'AddressSelector.tsx'), 'utf8');

/* ── Strip TypeScript so the pure helpers can be evaluated as plain JS. ── */
const js = src
  .replace(/^import[\s\S]*?from\s+'[^']+';\s*$/gm, '')
  .replace(/^export default AddressSelector;\s*$/m, '')
  // Everything from the component onwards is not needed.
  .replace(/^export function AddressSelector\b[\s\S]*$/m, '')
  // Type/interface declarations in any position.
  .replace(/^export interface\s+\w+\s*\{[\s\S]*?^\}/gm, '')
  .replace(/^interface\s+\w+\s*\{[\s\S]*?^\}/gm, '')
  // Parameter/return type annotations on the two functions we keep.
  .replace(
    /export function composeStreetLine\(street: string, subdivision\?: string\): string \{/,
    'function composeStreetLine(street, subdivision) {'
  )
  .replace(
    /function buildAddressData\(\{ barangay, street, subdivision, postal \}: AddressFields\): AddressData \{/,
    'function buildAddressData({ barangay, street, subdivision, postal }) {'
  )
  // Drop the now-unused helper type reference.
  .replace(/^\s*interface AddressFields \{[\s\S]*?^\}/m, '')
  .replace(/\bAddressFields\b/g, 'Object')
  // Any remaining `export` keyword on a top-level declaration.
  .replace(/^export /gm, '')
  .trim();

const mod = new Function(
  `${js}\nreturn { buildAddressData, composeStreetLine, SJDM_LOCATION };`
)();

const { buildAddressData, composeStreetLine, SJDM_LOCATION } = mod;

/* ── Simulate the parent: the single source of truth is `address`. ── */
function makeForm() {
  let address = {
    region_code: '', region_name: '', province_code: '', province_name: '',
    city_code: '', city_name: '', barangay_code: '', barangay_name: '',
    street: '', subdivision: '', postal_code: '', address_summary: '',
  };
  // Mirrors the component's one-time mount emit that seeds the fixed region.
  address = buildAddressData({ barangay: '', street: '', subdivision: '', postal: '3023' });

  return {
    get value() { return address; },
    // Exactly what <AddressSelector> does: render from initialData, and on
    // change call onChange(buildAddressData({...fields, ...patch})).
    read: () => ({
      street: address.street,
      subdivision: address.subdivision,
      barangay: address.barangay_name,
      postal: address.postal_code,
    }),
    update(patch) {
      const fields = {
        barangay: address.barangay_name,
        street: address.street,
        subdivision: address.subdivision,
        postal: address.postal_code || '3023',
      };
      address = buildAddressData({ ...fields, ...patch });
    },
    type(field, text) { for (const ch of text) this.update({ [field]: this.read()[field] + ch }); },
    /** Simulates selecting-all + typing: replaces the whole value. */
    retype(field, text) { this.update({ [field]: '' }); this.type(field, text); },
    paste(field, text) { this.update({ [field]: text }); },
    clear(field) { this.update({ [field]: '' }); },
  };
}

let pass = 0;
let fail = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}\n        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`); }
  return ok;
};

console.log('\nAddress field independence — replaying the reported failure\n');

/* 1. The exact repro from the bug report, character by character. */
{
  const f = makeForm();
  f.type('street', 'Blk 12 Lot 3');
  f.type('subdivision', 'Francisco Homes');
  check('typing Subdivision does not alter Street', f.read(), {
    street: 'Blk 12 Lot 3', subdivision: 'Francisco Homes', barangay: '', postal: '3023',
  });
}

/* 2. Keep going — the old code grew without bound. */
{
  const f = makeForm();
  f.type('street', '123 Mabini St');
  f.type('subdivision', 'Kaypian Homes');
  f.retype('subdivision', 'Kaypian Homes Phase 2');
  f.retype('street', '123 Mabini Street');
  check('repeated interleaved typing stays stable', f.read(), {
    street: '123 Mabini Street', subdivision: 'Kaypian Homes Phase 2', barangay: '', postal: '3023',
  });
}

/* 3. Paste (one event, not per-character). */
{
  const f = makeForm();
  f.paste('street', '456 Katipunan');
  f.paste('subdivision', 'Francisco Homes - Mulawin');
  check('paste into Subdivision leaves Street alone', f.read().street, '456 Katipunan');
  f.paste('street', '789 Rizal Ave');
  check('paste into Street leaves Subdivision alone', f.read().subdivision, 'Francisco Homes - Mulawin');
}

/* 4. Clearing one field must not clear or alter the other. */
{
  const f = makeForm();
  f.type('street', '9 Maharlika');
  f.type('subdivision', 'San Isidro');
  f.clear('street');
  check('clearing Street keeps Subdivision', f.read(), {
    street: '', subdivision: 'San Isidro', barangay: '', postal: '3023',
  });
  f.paste('street', 'Restored St');
  f.clear('subdivision');
  check('clearing Subdivision keeps Street', f.read(), {
    street: 'Restored St', subdivision: '', barangay: '', postal: '3023',
  });
}

/* 5. Selects never clobber free text. */
{
  const f = makeForm();
  f.type('street', '77 Rizal Ave');
  f.type('subdivision', 'Pleasant Hills');
  f.update({ barangay: 'Kaypian' });
  f.update({ postal: '3024' });
  f.update({ barangay: 'Gaya-Gaya' });
  f.update({ postal: '3023' });
  check('select churn keeps both text fields', f.read(), {
    street: '77 Rizal Ave', subdivision: 'Pleasant Hills', barangay: 'Gaya-Gaya', postal: '3023',
  });
}

/* 6. Mid-string editing. */
{
  const f = makeForm();
  f.paste('street', 'ABCDEF');
  f.paste('street', 'ABCXYEF');
  check('mid-string edit', f.read().street, 'ABCXYEF');
}

/* 7. Unicode. */
{
  const f = makeForm();
  f.paste('street', 'Ñgayon St. #5');
  f.paste('subdivision', ' subdivision — phase 🏠 2');
  check('unicode street', f.read().street, 'Ñgayon St. #5');
  check('unicode subdivision', f.read().subdivision, ' subdivision — phase 🏠 2');
}

/* 8. Every one of the six address values is preserved independently. */
{
  const f = makeForm();
  f.update({ barangay: 'Poblacion' });
  f.paste('street', '1 Rizal');
  f.paste('subdivision', 'Dulot Sub');
  f.update({ postal: '3024' });
  const v = f.value;
  check('all six address values preserved', {
    street: v.street,
    subdivision: v.subdivision,
    barangay: v.barangay_name,
    city: v.city_name,
    province: v.province_name,
    postal: v.postal_code,
  }, {
    street: '1 Rizal', subdivision: 'Dulot Sub', barangay: 'Poblacion',
    city: 'San Jose del Monte', province: 'Bulacan', postal: '3024',
  });
}

/* 9. DB contract: `profiles.street` keeps its historical combined format. */
{
  const f = makeForm();
  f.type('street', 'Blk 12 Lot 3');
  f.type('subdivision', 'Francisco Homes');
  const stored = composeStreetLine(f.value.street, f.value.subdivision);
  check('persisted street line is the historical combined value', stored, 'Blk 12 Lot 3, Francisco Homes');
  check('address_summary contains both parts', f.value.address_summary,
    'Blk 12 Lot 3, Francisco Homes, San Jose del Monte, Bulacan, Philippines 3023');
  check('stored line fits profiles.street VARCHAR(160)', stored.length <= 160, true);
}

/* 10. Street-only (no subdivision) still behaves exactly as before. */
{
  const f = makeForm();
  f.paste('street', 'Solo Street');
  check('street-only persisted value', composeStreetLine(f.value.street, f.value.subdivision), 'Solo Street');
}

/* 11. Summary omits an empty street line rather than emitting a stray comma. */
{
  const f = makeForm();
  f.update({ barangay: 'Kaypian' });
  check('empty street does not leave a dangling separator', f.value.address_summary,
    'Brgy. Kaypian, San Jose del Monte, Bulacan, Philippines 3023');
}

/* 12. Fixed region/province/city are seeded and never drift. */
{
  const f = makeForm();
  check('region seeded on mount', {
    region_code: f.value.region_code, province_code: f.value.province_code, city_code: f.value.city_code,
  }, {
    region_code: SJDM_LOCATION.region_code, province_code: SJDM_LOCATION.province_code, city_code: SJDM_LOCATION.city_code,
  });
  f.paste('street', 'Somewhere');
  check('region unchanged after editing', f.value.region_code, SJDM_LOCATION.region_code);
}

/* 13. Empty barangay yields an empty code, not a dangling prefix. */
{
  const f = makeForm();
  check('barangay_code empty before selection', f.value.barangay_code, '');
  f.update({ barangay: 'Kaypian' });
  check('barangay_code populated after selection', f.value.barangay_code, '031420000-kaypian');
}

console.log(`\n${pass} passed, ${fail} failed`);

/* ── Negative control ────────────────────────────────────────────────────────
   Models the OLD implementation (local mirror state + useEffect writing the
   combined value back into `street`) and asserts it DOES corrupt. Without this
   the suite above could be passing for the wrong reason.
   ────────────────────────────────────────────────────────────────────────── */
{
  const OLD = { street: '', subdivision: '', barangay: '', postal: '3023' };
  const emitOld = () => {
    // Old behaviour: `street` is emitted as street + subdivision combined...
    OLD.street = [OLD.street, OLD.subdivision].filter(Boolean).join(', ');
  };
  const typeOld = (field, text) => {
    for (const ch of text) {
      if (field === 'street') OLD.street += ch;
      else OLD.subdivision += ch;
      emitOld();
      // ...and the combined value is then written back over `street`.
      OLD.street = [OLD.street.split(', ')[0], OLD.subdivision].filter(Boolean).join(', ');
    }
  };
  typeOld('street', 'Blk 12 Lot 3');
  typeOld('subdivision', 'Francisco Homes');
  const corrupted = OLD.street !== 'Blk 12 Lot 3';
  console.log(
    corrupted
      ? `  OK    negative control: old algorithm corrupts Street -> "${OLD.street.slice(0, 60)}..."`
      : '  BAD   negative control did NOT reproduce the bug — the suite above is not meaningful'
  );
  if (!corrupted) fail++;
}

console.log(fail === 0 ? 'All checks passed.\n' : '\n');
process.exit(fail === 0 ? 0 : 1);