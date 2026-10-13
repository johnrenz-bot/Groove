'use client';

import React, { useEffect } from 'react';
import { MapPin, ShieldCheck, CheckCircle2, Lock, Building, Info, Navigation } from 'lucide-react';

export interface AddressData {
  region_code: string;
  region_name: string;
  province_code: string;
  province_name: string;
  city_code: string;
  city_name: string;
  barangay_code: string;
  barangay_name: string;
  /**
   * Street / House No. / Building EXACTLY as typed in that field.
   *
   * This is deliberately the raw street line and never includes the
   * subdivision. An earlier version folded `subdivision` into this field and
   * also fed the result back down through `initialData`, which let the
   * subdivision value bleed into the street input on every keystroke. Persist
   * the combined line with `composeStreetLine()` where the database needs one.
   */
  street: string;
  /**
   * Subdivision / Village EXACTLY as typed in that field.
   *
   * Optional so callers that only hold a combined address line — the profile
   * forms, which hydrate from `profiles.street` — keep compiling unchanged.
   */
  subdivision?: string;
  postal_code: string;
  address_summary: string;
}

interface AddressSelectorProps {
  initialData?: Partial<AddressData>;
  onChange: (data: AddressData) => void;
  required?: boolean;
  /**
   * Server-side validation messages for the two required fields, keyed by
   * field name. Registration collects these in its validate() pass but the
   * fields live in this component, so the messages are handed down and
   * rendered here — otherwise a failed submit looks like nothing happened.
   */
  errors?: Partial<Record<'barangay' | 'street', string>>;
  /**
   * Namespace for the generated `id`/`name` attributes. Every control gets a
   * unique id derived from it so the label→input and `aria-describedby`
   * relationships stay unambiguous when more than one selector is on a page.
   * `revealErrors()` in RegistrationFormFields relies on the `reg` default.
   */
  idPrefix?: string;
}

// Strict location restriction: San Jose del Monte, Bulacan, Philippines only
export const SJDM_LOCATION = {
  country: 'Philippines',
  region_code: '030000000',
  region_name: 'Region III (Central Luzon)',
  province_code: '031400000',
  province_name: 'Bulacan',
  city_code: '031420000',
  city_name: 'San Jose del Monte',
  postal_codes: ['3023', '3024'],
  barangays: [
    'Assumption',
    'Bagong Buhay I',
    'Bagong Buhay II',
    'Bagong Buhay III',
    'Citrus',
    'Ciudad Real',
    'Dulong Bayan',
    'Fatima I',
    'Fatima II',
    'Fatima III',
    'Fatima IV',
    'Fatima V',
    'Francisco Homes - Guijo',
    'Francisco Homes - Mulawin',
    'Francisco Homes - Narra',
    'Francisco Homes - Yakal',
    'Gaya-Gaya',
    'Graceville',
    'Gumaoc Central',
    'Gumaoc East',
    'Gumaoc West',
    'Kaybanban',
    'Kaypian',
    'Maharlika',
    'Minuyan I',
    'Minuyan II',
    'Minuyan III',
    'Minuyan IV',
    'Minuyan V',
    'Minuyan Proper',
    'Muzon East',
    'Muzon Proper',
    'Muzon South',
    'Muzon West',
    'Paradise III',
    'Poblacion',
    'Poblacion I',
    'San Isidro',
    'San Manuel',
    'San Martin I',
    'San Martin II',
    'San Martin III',
    'San Martin IV',
    'San Pedro',
    'San Rafael I',
    'San Rafael II',
    'San Rafael III',
    'San Rafael IV',
    'San Rafael V',
    'San Roque',
    'Santa Cruz I',
    'Santa Cruz II',
    'Santa Cruz III',
    'Santa Cruz IV',
    'Santa Cruz V',
    'Santo Cristo',
    'Santo Niño I',
    'Santo Niño II',
    'Sapang Palay Proper',
    'Tungkong Mangga',
  ],
};

/** `profiles.street` is VARCHAR(160) and holds the street line + ", " + subdivision. */
const MAX_STREET_LENGTH = 110;
const MAX_SUBDIVISION_LENGTH = 48;

/**
 * Join the two free-text address lines into the single line that the
 * `profiles.street` column and the address summary are built from.
 *
 * Exported so the registration pages persist exactly the same combined value
 * the selector has always produced, while the form itself keeps the two
 * fields apart. Keeping one definition here means the stored format cannot
 * drift from the displayed one.
 */
export function composeStreetLine(street: string, subdivision?: string): string {
  return [street, subdivision].filter(Boolean).join(', ');
}

/** The four values this component owns; the rest of the address is fixed. */
interface AddressFields {
  barangay: string;
  street: string;
  subdivision: string;
  postal: string;
}

/**
 * Build the full AddressData payload from the four editable fields.
 *
 * Every field is read from its own key, so no value can be written into
 * another field's slot regardless of what order the caller updates them in.
 */
function buildAddressData({ barangay, street, subdivision, postal }: AddressFields): AddressData {
  const streetLine = composeStreetLine(street, subdivision);
  const parts = [
    streetLine,
    barangay ? `Brgy. ${barangay}` : '',
    SJDM_LOCATION.city_name,
    SJDM_LOCATION.province_name,
    SJDM_LOCATION.country,
  ].filter(Boolean);

  return {
    region_code: SJDM_LOCATION.region_code,
    region_name: SJDM_LOCATION.region_name,
    province_code: SJDM_LOCATION.province_code,
    province_name: SJDM_LOCATION.province_name,
    city_code: SJDM_LOCATION.city_code,
    city_name: SJDM_LOCATION.city_name,
    // Empty until a barangay is chosen. The registration pages store the
    // city-code prefix when this is blank, which is what the old
    // "<city_code>-" placeholder produced anyway.
    barangay_code: barangay
      ? `${SJDM_LOCATION.city_code}-${barangay.replace(/\s+/g, '-').toLowerCase()}`
      : '',
    barangay_name: barangay,
    street,
    subdivision,
    postal_code: postal,
    address_summary: parts.join(', ') + (postal ? ` ${postal}` : ''),
  };
}

export function AddressSelector({
  initialData,
  onChange,
  required = true,
  errors,
  idPrefix = 'reg',
}: AddressSelectorProps) {
  /**
   * Single source of truth.
   *
   * The component is fully controlled from `initialData` and keeps NO local
   * copies of the field values. That is the fix for the field-corruption bug:
   * with no mirror state there is no path for one field's value to be written
   * into another field, and no effect that can push a derived value back over
   * what the user typed.
   */
  const barangay = initialData?.barangay_name ?? '';
  const street = initialData?.street ?? '';
  const subdivision = initialData?.subdivision ?? '';
  const postal = initialData?.postal_code || '3023';

  const fields: AddressFields = { barangay, street, subdivision, postal };

  /**
   * Apply a single-field patch. Each handler touches exactly one key, so
   * typing, pasting, editing or clearing one field cannot affect another.
   */
  const update = (patch: Partial<AddressFields>) => {
    onChange(buildAddressData({ ...fields, ...patch }));
  };

  /**
   * Seed the fixed region/province/city into the parent once on mount.
   *
   * Registration initialises its `address` state with empty codes and relies
   * on this to supply the locked SJDM values. `[]` is deliberate and correct:
   * the payload is derived purely from the props read at mount, and calling
   * `onChange` again on a later render would either be a no-op or, worse,
   * re-seed the form over the user's input. ESLint cannot see that reasoning
   * because `onChange` is an inline arrow in the parent, hence the disable.
   */
  useEffect(() => {
    onChange(buildAddressData({ barangay, street, subdivision, postal }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Stable id helpers — one unique id per control, derived from idPrefix. */
  const ids = {
    uid: `${idPrefix}-address`,
    barangay: `${idPrefix}-barangay`,
    street: `${idPrefix}-street`,
    subdivision: `${idPrefix}-subdivision`,
    postal: `${idPrefix}-postal`,
  };

  const errorId = (key: string) => `${ids.uid}-${key}-error`;
  const hintId = (key: string) => `${ids.uid}-${key}-hint`;

  /* Fields use the shared design-system input primitives so they match every
     other form on the site and follow the theme automatically. */
  const inputClasses = 'g-input';
  const selectClasses = 'g-input';
  const labelClasses = 'g-label';

  const streetError = errors?.street;
  const barangayError = errors?.barangay;

  return (
    <div
      className="space-y-5 rounded-2xl border border-glass-border bg-card/60 p-4 backdrop-blur-sm shadow-sm sm:p-5"
      role="group"
      aria-labelledby={`${ids.uid}-legend`}
    >
      <p id={`${ids.uid}-legend`} className="sr-only">
        Service location within San Jose del Monte, Bulacan. Fields marked with an asterisk are
        required.
      </p>

      {/* Service Area Restriction Banner */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-muted/50 p-3.5 text-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-success/30 bg-success-soft text-success shadow-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-foreground">Service Area Verified</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                San Jose del Monte, Bulacan
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Groove exclusively connects verified artists, coaches, and studios within San Jose del
              Monte.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
        {/* Country & Region (Locked) */}
        <div>
          <span className={labelClasses}>Country &amp; Region</span>
          <div className="g-input-static justify-between gap-2 bg-muted/60">
            <span className="truncate font-medium text-foreground/90">
              Philippines • Region III (Central Luzon)
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Fixed
            </span>
          </div>
        </div>

        {/* Province & City (Locked) */}
        <div>
          <span className={labelClasses}>Province &amp; City</span>
          <div className="g-input-static justify-between gap-2 bg-muted/60">
            <span className="truncate font-medium text-foreground/90">
              Bulacan — San Jose del Monte
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Fixed
            </span>
          </div>
        </div>

        {/* Barangay (Selectable) */}
        <div className="md:col-span-2">
          <label className={labelClasses} htmlFor={ids.barangay}>
            Barangay in San Jose del Monte{' '}
            <span className="text-accent-text" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(required)</span>
          </label>
          <select
            id={ids.barangay}
            name={`${idPrefix}-barangay`}
            value={barangay}
            onChange={(e) => update({ barangay: e.target.value })}
            required={required}
            aria-invalid={barangayError ? 'true' : undefined}
            aria-describedby={barangayError ? errorId('barangay') : hintId('barangay')}
            className={`${selectClasses} ${barangayError ? 'border-danger' : ''}`}
          >
            <option value="">
              Select your Barangay ({SJDM_LOCATION.barangays.length} Barangays of SJDM)
            </option>
            {SJDM_LOCATION.barangays.map((b) => (
              <option key={b} value={b}>
                Brgy. {b}
              </option>
            ))}
          </select>
          {barangayError ? (
            <p id={errorId('barangay')} className="g-field-error" role="alert">
              {barangayError}
            </p>
          ) : (
            <p id={hintId('barangay')} className="g-field-hint">
              Required — used to confirm coverage within the city.
            </p>
          )}
        </div>

        {/* Street / House No. / Building */}
        <div className="md:col-span-2">
          <label className={labelClasses} htmlFor={ids.street}>
            Street / House No. / Building{' '}
            <span className="text-accent-text" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(required)</span>
          </label>
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id={ids.street}
              name={`${idPrefix}-street`}
              type="text"
              value={street}
              onChange={(e) => update({ street: e.target.value })}
              placeholder="e.g. Blk 12 Lot 3, Quirino Highway"
              /* Precise tokens so browser autofill fills THIS field only.
                 `street-address` (the old value) invites the browser to write
                 the whole address — subdivision included — into the street box. */
              autoComplete="address-line1"
              maxLength={MAX_STREET_LENGTH}
              spellCheck={false}
              enterKeyHint="next"
              required={required}
              aria-invalid={streetError ? 'true' : undefined}
              aria-describedby={streetError ? errorId('street') : hintId('street')}
              className={`${inputClasses} g-input-has-icon ${streetError ? 'border-danger' : ''}`}
            />
          </div>
          {streetError ? (
            <p id={errorId('street')} className="g-field-error" role="alert">
              {streetError}
            </p>
          ) : (
            <p id={hintId('street')} className="g-field-hint">
              House number, street and building only — keep the village in the next field.
            </p>
          )}
        </div>

        {/* Subdivision / Village */}
        <div className="md:col-span-2">
          <div className="flex items-baseline justify-between gap-2">
            <label className={`${labelClasses} mb-0`} htmlFor={ids.subdivision}>
              Subdivision / Village
            </label>
            <span className="g-pill mb-[0.4375rem] shrink-0 text-[10px]">Optional</span>
          </div>
          <div className="relative mt-1.5">
            <Building
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id={ids.subdivision}
              name={`${idPrefix}-subdivision`}
              type="text"
              value={subdivision}
              onChange={(e) => update({ subdivision: e.target.value })}
              placeholder="e.g. Francisco Homes / Pleasant Hills"
              /* Distinct from the street field so autofill cannot cross-write. */
              autoComplete="address-line2"
              maxLength={MAX_SUBDIVISION_LENGTH}
              spellCheck={false}
              enterKeyHint="next"
              aria-describedby={hintId('subdivision')}
              className={`${inputClasses} g-input-has-icon`}
            />
          </div>
          <p id={hintId('subdivision')} className="g-field-hint">
            Saved separately from your street line and appended to it in your address summary.
          </p>
        </div>

        {/* Postal Code */}
        <div className="md:col-span-2">
          <label className={labelClasses} htmlFor={ids.postal}>
            Postal Code{' '}
            <span className="text-accent-text" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(required)</span>
          </label>
          <select
            id={ids.postal}
            name={`${idPrefix}-postal`}
            value={postal}
            onChange={(e) => update({ postal: e.target.value })}
            required={required}
            aria-describedby={hintId('postal')}
            className={selectClasses}
          >
            {SJDM_LOCATION.postal_codes.map((code) => (
              <option key={code} value={code}>
                {code} — {code === '3024' ? 'Sapang Palay' : 'San Jose del Monte (Main)'}
              </option>
            ))}
          </select>
          <p id={hintId('postal')} className="g-field-hint">
            {postal === '3024'
              ? 'Zip code for the Sapang Palay area.'
              : 'Default zip code for the city.'}
          </p>
        </div>
      </div>

      {/* Live preview — shows the two lines are tracked independently and the
          order they are combined in when the address summary is built. */}
      <div className="flex items-start gap-3 rounded-xl border border-divider bg-muted/40 p-3.5 text-xs">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">Your address will read as</p>
          <p className="mt-1 break-words leading-relaxed text-muted-foreground">
            {composeStreetLine(street, subdivision) || (
              <span className="italic text-subtle-foreground">Street line — not entered yet</span>
            )}
            {barangay ? `, Brgy. ${barangay}` : ''}
            {`, ${SJDM_LOCATION.city_name}, ${SJDM_LOCATION.province_name}`}
            {postal ? ` ${postal}` : ''}
          </p>
        </div>
        <Navigation className="ml-auto hidden h-4 w-4 shrink-0 text-subtle-foreground sm:block" aria-hidden="true" />
      </div>
    </div>
  );
}

export default AddressSelector;