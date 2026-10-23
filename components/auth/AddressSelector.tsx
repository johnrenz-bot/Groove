'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Globe2,
  Info,
  Loader2,
  Lock,
  MapPin,
  Navigation,
  ShieldCheck,
} from 'lucide-react';
import { getFeaturedLocations, hasSecondaryFeaturedLocation } from '@/lib/config/featuredLocations';
import { VALIDATION_MESSAGES } from '@/lib/profileFields';

/** Where the service address is located. Optional for old saved payloads. */
export type ServiceLocationMode = 'sjdm' | 'other';

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
   * subdivision. Persist the combined line with `composeStreetLine()` where the
   * database needs one.
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
  /**
   * Which service-location form produced this payload. Omitted from every
   * database write; it exists so Profile can re-open the same form the member
   * used and so legacy SJDM records continue to hydrate as SJDM.
   */
  location_mode?: ServiceLocationMode;
  /**
   * UI-only flag: the selected region has a provincial level. Regions such as
   * the National Capital Region have none, so City/Municipality follows Region.
   */
  province_required?: boolean;
}

/** Keys of the address controls that can display an inline validation error. */
export type AddressFieldKey = 'region' | 'province' | 'city' | 'barangay' | 'street' | 'postal';
export type AddressErrors = Partial<Record<AddressFieldKey | 'location_mode', string>>;

interface AddressSelectorProps {
  initialData?: Partial<AddressData>;
  onChange: (data: AddressData) => void;
  required?: boolean;
  /**
   * Server-side validation messages for the address fields. Registration
   * collects these in its validate() pass but the fields live in this
   * component, so the messages are handed down and rendered here.
   */
  errors?: AddressErrors;
  /**
   * Namespace for the generated `id`/`name` attributes. Every control gets a
   * unique id derived from it so the label→input and `aria-describedby`
   * relationships stay unambiguous when more than one selector is on a page.
   * `revealErrors()` in RegistrationFormFields relies on the `reg` default.
   */
  idPrefix?: string;
}

// Strict location restriction: San Jose del Monte, Bulacan, Philippines only.
// Kept byte-for-byte compatible with the original form: the synthetic
// `<city_code>-<slug>` barangay code, the two ZIP choices, and the address
// summary shape are unchanged for existing SJDM registrations.
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
const DEFAULT_SJDM_POSTAL = '3023';
const PH_POSTAL_RE = /^\d{4}$/;

const SJDM_CITY_CODES = new Set([SJDM_LOCATION.city_code, '0301420000']);
const SJDM_CITY_NAMES = new Set([
  SJDM_LOCATION.city_name,
  'San Jose Del Monte',
  'San Jose Del Monte City',
  'City of San Jose Del Monte',
]);
const SJDM_REGION_CODES = new Set([SJDM_LOCATION.region_code, '0300000000']);
const SJDM_PROVINCE_CODES = new Set([SJDM_LOCATION.province_code, '0301400000']);

/**
 * Join the two free-text address lines into the single line that the
 * `profiles.street` column and the address summary are built from.
 */
export function composeStreetLine(street: string, subdivision?: string): string {
  return [street, subdivision].filter(Boolean).join(', ');
}

/**
 * Decide which form a saved payload belongs to. Records written before the
 * location choice existed have no `location_mode`; those are SJDM records when
 * their city/region matches SJDM (or when they are entirely empty).
 */
export function getServiceLocationMode(data?: Partial<AddressData> | null): ServiceLocationMode {
  if (data?.location_mode === 'other') return 'other';
  if (data?.location_mode === 'sjdm') return 'sjdm';

  const cityCode = data?.city_code?.trim() || '';
  const cityName = data?.city_name?.trim() || '';
  if (SJDM_CITY_CODES.has(cityCode) || SJDM_CITY_NAMES.has(cityName)) return 'sjdm';
  if (cityCode || cityName) return 'other';

  const regionCode = data?.region_code?.trim() || '';
  const regionName = data?.region_name?.trim() || '';
  if (SJDM_REGION_CODES.has(regionCode) || regionName === SJDM_LOCATION.region_name) return 'sjdm';
  if (regionCode || regionName) return 'other';

  const provinceCode = data?.province_code?.trim() || '';
  const provinceName = data?.province_name?.trim() || '';
  if (SJDM_PROVINCE_CODES.has(provinceCode) || provinceName === SJDM_LOCATION.province_name) {
    return 'sjdm';
  }
  if (provinceCode || provinceName) return 'other';

  return 'sjdm';
}

function buildSjdmAddressData(input: Partial<AddressData>): AddressData {
  const barangay = input.barangay_name ?? '';
  const street = input.street ?? '';
  const subdivision = input.subdivision ?? '';
  const postal = input.postal_code?.trim() || DEFAULT_SJDM_POSTAL;
  const streetLine = composeStreetLine(street, subdivision);
  const parts = [
    streetLine,
    barangay ? `Brgy. ${barangay}` : '',
    SJDM_LOCATION.city_name,
    SJDM_LOCATION.province_name,
    SJDM_LOCATION.country,
  ].filter(Boolean);

  return {
    location_mode: 'sjdm',
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
    province_required: true,
    address_summary: parts.join(', ') + (postal ? ` ${postal}` : ''),
  };
}

function buildOtherAddressData(input: Partial<AddressData>): AddressData {
  const street = input.street ?? '';
  const subdivision = input.subdivision ?? '';
  const barangay = input.barangay_name ?? '';
  const city = input.city_name ?? '';
  const province = input.province_name ?? '';
  const region = input.region_name ?? '';
  const postal = input.postal_code?.trim() || '';
  const streetLine = composeStreetLine(street, subdivision);
  // SJDM summaries deliberately omit the region because province + country is
  // enough. For a nationwide address, the region replaces the province only
  // when the area has no provincial level (for example, NCR).
  const parts = [
    streetLine,
    barangay ? `Brgy. ${barangay}` : '',
    city,
    province || region,
    'Philippines',
  ].filter(Boolean);

  return {
    location_mode: 'other',
    region_code: input.region_code ?? '',
    region_name: region,
    province_code: input.province_code ?? '',
    province_name: province,
    city_code: input.city_code ?? '',
    city_name: city,
    barangay_code: input.barangay_code ?? '',
    barangay_name: barangay,
    street,
    subdivision,
    postal_code: postal,
    province_required: input.province_required ?? Boolean(province),
    address_summary: parts.join(', ') + (postal ? ` ${postal}` : ''),
  };
}

/** Build a complete payload, including the address summary, from any partial input. */
export function buildAddressData(input: Partial<AddressData>): AddressData {
  return getServiceLocationMode(input) === 'other'
    ? buildOtherAddressData(input)
    : buildSjdmAddressData(input);
}

/**
 * The one address validation contract used by Registration and Profile.
 * SJDM keeps its original required fields; nationwide addresses additionally
 * require the region/city/barangay chain and a 4-digit postal code.
 */
export function validateAddress(data: Partial<AddressData> | null | undefined): AddressErrors {
  const errors: AddressErrors = {};
  const mode = getServiceLocationMode(data);
  const street = data?.street?.trim() || '';
  const barangay = data?.barangay_name?.trim() || '';
  const postal = data?.postal_code?.trim() || '';

  if (!street) errors.street = VALIDATION_MESSAGES.streetRequired;

  if (mode === 'other') {
    if (!data?.region_name?.trim()) errors.region = 'Please select a region.';
    if (data?.province_required && !data?.province_name?.trim()) {
      errors.province = 'Please select a province.';
    }
    if (!data?.city_name?.trim()) errors.city = 'Please select a city or municipality.';
    if (!barangay) errors.barangay = 'Please select your barangay.';
    if (!postal) errors.postal = 'Please enter your postal code.';
    else if (!PH_POSTAL_RE.test(postal)) errors.postal = 'Postal code must be 4 digits.';
  } else {
    if (!barangay) errors.barangay = VALIDATION_MESSAGES.barangayRequired;
    if (!postal) errors.postal = 'Please select a postal code.';
  }

  return errors;
}

type PhAddressModule = typeof import('@aivangogh/ph-address');

interface Option {
  code: string;
  name: string;
}

interface RegionOption extends Option {
  designation: string;
}

type PhState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; module: PhAddressModule }
  | { status: 'error'; message: string };

/**
 * One shared module-level promise, so switching the radio back and forth never
 * starts a second 400 KB download. The package is imported only when the
 * member actually chooses "Other Locations in the Philippines".
 */
let phAddressPromise: Promise<PhAddressModule> | null = null;
function loadPhAddress(): Promise<PhAddressModule> {
  if (!phAddressPromise) {
    phAddressPromise = import('@aivangogh/ph-address');
  }
  return phAddressPromise;
}

function formatRegionName(region: { name: string; designation?: string }): string {
  const designation = region.designation?.trim();
  return /^Region\b/i.test(region.name) && designation
    ? `${region.name} (${designation})`
    : region.name;
}

function dedupePostalCodes(
  entries: readonly { postalCode: string; placeName?: string }[]
): { code: string; place: string }[] {
  const seen = new Set<string>();
  return entries
    .filter((entry) => {
      const code = entry.postalCode?.trim();
      if (!code || seen.has(code)) return false;
      seen.add(code);
      return true;
    })
    .map((entry) => ({ code: entry.postalCode.trim(), place: entry.placeName?.trim() || '' }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

function AddressError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="g-field-error" role="alert">
      {message}
    </p>
  );
}

function AddressHint({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="g-field-hint">
      {children}
    </p>
  );
}

export function AddressSelector({
  initialData,
  onChange,
  required = true,
  errors,
  idPrefix = 'reg',
}: AddressSelectorProps) {
  const mode = getServiceLocationMode(initialData);
  const current: Partial<AddressData> = { ...(initialData ?? {}), location_mode: mode };

  const barangay = current.barangay_name ?? '';
  const street = current.street ?? '';
  const subdivision = current.subdivision ?? '';
  const sjdmPostal = current.postal_code?.trim() || DEFAULT_SJDM_POSTAL;
  const otherRegionCode = current.region_code ?? '';
  const otherProvinceCode = current.province_code ?? '';
  const otherCityCode = current.city_code ?? '';
  const otherBarangayCode = current.barangay_code ?? '';
  const otherPostal = current.postal_code ?? '';

  const [phState, setPhState] = useState<PhState>({ status: 'idle' });

  /**
   * Seed the parent once on mount.
   *
   * Registration initialises its `address` state with empty strings and relies
   * on this to supply the fixed SJDM values and default ZIP. Profile passes an
   * already-hydrated address, so the same builder preserves a nationwide saved
   * location instead of overwriting it with SJDM.
   */
  useEffect(() => {
    onChange(buildAddressData(initialData ?? {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== 'other' || phState.status !== 'idle') return;
    let cancelled = false;
    // Defer the first setState out of the effect body: the React lint contract
    // forbids synchronous state writes there, and the import itself is async.
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setPhState({ status: 'loading' });
      loadPhAddress()
        .then((module) => setPhState({ status: 'ready', module }))
        .catch((error: unknown) =>
          setPhState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'The Philippine location dataset could not be loaded.',
          })
        );
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, phState.status]);

  const ph = phState.status === 'ready' ? phState.module : null;

  const regions = useMemo<RegionOption[]>(() => {
    if (!ph) return [];
    return ph.getAllRegions().map((region) => ({
      code: region.psgcCode,
      name: formatRegionName(region),
      designation: region.designation,
    }));
  }, [ph]);

  const selectedRegion = regions.find((region) => region.code === otherRegionCode);

  const provinces = useMemo<Option[]>(() => {
    if (!ph || !selectedRegion) return [];
    return ph
      .getProvincesByRegion(selectedRegion.code)
      .map((province) => ({ code: province.psgcCode, name: province.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [ph, selectedRegion]);

  const hasProvinces = provinces.length > 0;
  const selectedProvince = provinces.find((province) => province.code === otherProvinceCode);
  const cityParentCode = hasProvinces
    ? selectedProvince?.code || ''
    : selectedRegion?.code || '';

  const cities = useMemo<Option[]>(() => {
    if (!ph || !cityParentCode) return [];
    return ph
      .getMunicipalitiesByProvince(cityParentCode)
      .filter(
        (city) =>
          !SJDM_CITY_CODES.has(city.psgcCode) &&
          // Never expose SJDM through the "other" path: it has its own
          // verified form and must not be relabelled as a non-SJDM address.
          city.name !== 'San Jose Del Monte City'
      )
      .map((city) => ({ code: city.psgcCode, name: city.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [ph, cityParentCode]);

  const selectedCity = cities.find((city) => city.code === otherCityCode);

  const barangays = useMemo<Option[]>(() => {
    if (!ph || !selectedCity) return [];
    return ph
      .getBarangaysByMunicipality(selectedCity.code)
      .map((item) => ({ code: item.psgcCode, name: item.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [ph, selectedCity]);

  const postalOptions = useMemo(() => {
    if (!ph || !selectedCity) return [];
    return dedupePostalCodes(ph.getPostalCodesByMunicipality(selectedCity.code));
  }, [ph, selectedCity]);

  /* Stable id helpers — one unique id per control, derived from idPrefix. */
  const ids = {
    uid: `${idPrefix}-address`,
    mode: `${idPrefix}-location-mode`,
    region: `${idPrefix}-region`,
    province: `${idPrefix}-province`,
    city: `${idPrefix}-city`,
    barangay: `${idPrefix}-barangay`,
    street: `${idPrefix}-street`,
    subdivision: `${idPrefix}-subdivision`,
    postal: `${idPrefix}-postal`,
  };

  const errorId = (key: string) => `${ids.uid}-${key}-error`;
  const hintId = (key: string) => `${ids.uid}-${key}-hint`;
  const fieldError = (key: AddressFieldKey) => errors?.[key];
  const describedBy = (key: AddressFieldKey, hint: string) =>
    fieldError(key) ? errorId(key) : hintId(hint);

  /* Fields use the shared design-system input primitives so they match every
     other form on the site and follow the theme automatically. */
  const inputClasses = 'g-input';
  const selectClasses = 'g-input';
  const labelClasses = 'g-label';

  const update = (patch: Partial<AddressData>) => {
    onChange(buildAddressData({ ...current, ...patch }));
  };

  const switchMode = (next: ServiceLocationMode) => {
    if (next === mode) return;
    // Keep the two free-text lines when the member changes their mind, but
    // reset every codes/name/ZIP value that belongs to the other location.
    if (next === 'sjdm') {
      onChange(
        buildSjdmAddressData({
          street,
          subdivision,
          barangay_name: '',
          postal_code: DEFAULT_SJDM_POSTAL,
        })
      );
    } else {
      onChange(
        buildOtherAddressData({
          street,
          subdivision,
          region_code: '',
          region_name: '',
          province_code: '',
          province_name: '',
          city_code: '',
          city_name: '',
          barangay_code: '',
          barangay_name: '',
          postal_code: '',
          province_required: false,
        })
      );
    }
  };

  const handleRegionChange = (code: string) => {
    const region = regions.find((item) => item.code === code);
    if (!ph || !region) {
      update({
        region_code: '',
        region_name: '',
        province_code: '',
        province_name: '',
        city_code: '',
        city_name: '',
        barangay_code: '',
        barangay_name: '',
        postal_code: '',
        province_required: false,
      });
      return;
    }

    const regionProvinces = ph.getProvincesByRegion(region.code);
    update({
      region_code: region.code,
      region_name: region.name,
      province_code: '',
      province_name: '',
      province_required: regionProvinces.length > 0,
      city_code: '',
      city_name: '',
      barangay_code: '',
      barangay_name: '',
      postal_code: '',
    });
  };

  const handleProvinceChange = (code: string) => {
    const province = provinces.find((item) => item.code === code);
    update({
      province_code: province?.code || '',
      province_name: province?.name || '',
      province_required: true,
      city_code: '',
      city_name: '',
      barangay_code: '',
      barangay_name: '',
      postal_code: '',
    });
  };

  const handleCityChange = (code: string) => {
    const city = cities.find((item) => item.code === code);
    if (!ph || !city) {
      update({
        city_code: '',
        city_name: '',
        barangay_code: '',
        barangay_name: '',
        postal_code: '',
      });
      return;
    }

    const cityPostalCodes = dedupePostalCodes(ph.getPostalCodesByMunicipality(city.code));
    update({
      city_code: city.code,
      city_name: city.name,
      barangay_code: '',
      barangay_name: '',
      // Auto-select only when the dataset offers one unambiguous ZIP. A city
      // with several ZIPs must not silently inherit the wrong one.
      postal_code: cityPostalCodes.length === 1 ? cityPostalCodes[0].code : '',
    });
  };

  const handleBarangayChange = (code: string) => {
    const item = barangays.find((entry) => entry.code === code);
    update({
      barangay_code: item?.code || '',
      barangay_name: item?.name || '',
    });
  };

  const unsupportedSavedSelection =
    phState.status === 'ready' &&
    Boolean(otherRegionCode || otherCityCode) &&
    (!selectedRegion ||
      (Boolean(otherCityCode) && !selectedCity) ||
      (Boolean(otherBarangayCode) &&
        !barangays.some((item) => item.code === otherBarangayCode)));

  return (
    <div className="space-y-4" role="group" aria-labelledby={`${ids.uid}-legend`}>
      <p id={`${ids.uid}-legend`} className="sr-only">
        Service location. Fields marked with an asterisk are required.
      </p>

      {/* Location choice */}
      <fieldset className="space-y-2">
        <legend className={labelClasses}>Service location</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-accent-border focus-within:ring-offset-2 focus-within:ring-offset-card ${
              mode === 'sjdm'
                ? 'border-accent-border bg-accent-soft/60'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <input
              id={`${ids.mode}-sjdm`}
              name={ids.mode}
              type="radio"
              value="sjdm"
              checked={mode === 'sjdm'}
              onChange={() => switchMode('sjdm')}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                mode === 'sjdm' ? 'border-accent-text' : 'border-muted-foreground/60'
              }`}
            >
              {mode === 'sjdm' && <span className="h-2 w-2 rounded-full bg-accent-text" />}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                San Jose del Monte, Bulacan
                <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Existing
                </span>
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                Verified local coverage within the city limits.
              </span>
            </span>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-accent-border focus-within:ring-offset-2 focus-within:ring-offset-card ${
              mode === 'other'
                ? 'border-accent-border bg-accent-soft/60'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <input
              id={`${ids.mode}-other`}
              name={ids.mode}
              type="radio"
              value="other"
              checked={mode === 'other'}
              onChange={() => switchMode('other')}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                mode === 'other' ? 'border-accent-text' : 'border-muted-foreground/60'
              }`}
            >
              {mode === 'other' && <span className="h-2 w-2 rounded-full bg-accent-text" />}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                Other Locations in the Philippines
                <span className="inline-flex items-center rounded-full border border-accent-border bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-text">
                  New
                </span>
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                Nationwide — choose your region, province, city, and barangay.
              </span>
            </span>
          </label>
        </div>
        <AddressError id={errorId('location_mode')} message={errors?.location_mode} />
      </fieldset>

      {mode === 'sjdm' ? (
        <>
          {/* Service Area Restriction Banner */}
          <div className="flex flex-col justify-between gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-success/30 bg-success-soft text-success shadow-sm">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-foreground">Service Area Verified</span>
                  {getFeaturedLocations().map((location, index) => (
                    <span
                      key={location.cityName}
                      className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success"
                    >
                      {index > 0 && <span className="text-muted-foreground">+</span>}
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      {location.displayName}
                    </span>
                  ))}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {hasSecondaryFeaturedLocation()
                    ? 'SJDM and its featured partner locations are verified. Other Philippine locations can still register.'
                    : 'SJDM addresses are verified. Choose “Other Locations” if you are based elsewhere in the Philippines.'}
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
                onChange={(e) => update({ barangay_name: e.target.value })}
                required={required}
                aria-invalid={fieldError('barangay') ? 'true' : undefined}
                aria-describedby={describedBy('barangay', 'barangay')}
                className={`${selectClasses} ${fieldError('barangay') ? 'border-danger' : ''}`}
              >
                <option value="">
                  Select your Barangay ({SJDM_LOCATION.barangays.length} Barangays of SJDM)
                </option>
                {SJDM_LOCATION.barangays.map((item) => (
                  <option key={item} value={item}>
                    Brgy. {item}
                  </option>
                ))}
              </select>
              {fieldError('barangay') ? (
                <AddressError id={errorId('barangay')} message={fieldError('barangay')} />
              ) : (
                <AddressHint id={hintId('barangay')}>
                  Required — used to confirm coverage within the city.
                </AddressHint>
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
                  /* Precise tokens so browser autofill fills THIS field only. */
                  autoComplete="address-line1"
                  maxLength={MAX_STREET_LENGTH}
                  spellCheck={false}
                  enterKeyHint="next"
                  required={required}
                  aria-invalid={fieldError('street') ? 'true' : undefined}
                  aria-describedby={describedBy('street', 'street')}
                  className={`${inputClasses} g-input-has-icon ${
                    fieldError('street') ? 'border-danger' : ''
                  }`}
                />
              </div>
              {fieldError('street') ? (
                <AddressError id={errorId('street')} message={fieldError('street')} />
              ) : (
                <AddressHint id={hintId('street')}>
                  House number, street and building only — keep the village in the next field.
                </AddressHint>
              )}
            </div>

            {/* Subdivision / Village */}
            <div>
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
              <AddressHint id={hintId('subdivision')}>
                Saved separately from your street line and appended to it in your address summary.
              </AddressHint>
            </div>

            {/* Postal Code */}
            <div>
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
                value={sjdmPostal}
                onChange={(e) => update({ postal_code: e.target.value })}
                required={required}
                aria-invalid={fieldError('postal') ? 'true' : undefined}
                aria-describedby={describedBy('postal', 'postal')}
                className={`${selectClasses} ${fieldError('postal') ? 'border-danger' : ''}`}
              >
                {SJDM_LOCATION.postal_codes.map((code) => (
                  <option key={code} value={code}>
                    {code} — {code === '3024' ? 'Sapang Palay' : 'San Jose del Monte (Main)'}
                  </option>
                ))}
              </select>
              {fieldError('postal') ? (
                <AddressError id={errorId('postal')} message={fieldError('postal')} />
              ) : (
                <AddressHint id={hintId('postal')}>
                  {sjdmPostal === '3024'
                    ? 'Zip code for the Sapang Palay area.'
                    : 'Default zip code for the city.'}
                </AddressHint>
              )}
            </div>
          </div>

          {/* Live preview */}
          <div className="flex items-start gap-2.5 rounded-lg border border-divider bg-muted/30 p-3 text-xs">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground">Your address will read as</p>
              <p className="mt-1 break-words leading-relaxed text-muted-foreground">
                {composeStreetLine(street, subdivision) || (
                  <span className="italic text-subtle-foreground">Street line — not entered yet</span>
                )}
                {barangay ? `, Brgy. ${barangay}` : ''}
                {`, ${SJDM_LOCATION.city_name}, ${SJDM_LOCATION.province_name}`}
                {sjdmPostal ? ` ${sjdmPostal}` : ''}
              </p>
            </div>
            <Navigation
              className="ml-auto hidden h-4 w-4 shrink-0 text-subtle-foreground sm:block"
              aria-hidden="true"
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 p-3 text-xs">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent-border bg-accent-soft text-accent-text shadow-sm">
              <Globe2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="font-bold text-foreground">Nationwide service location</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                Your address is saved as entered. Only San Jose del Monte coverage is verified today;
                other locations are not marked as SJDM-verified.
              </p>
            </div>
          </div>

          {phState.status === 'loading' || phState.status === 'idle' ? (
            <div
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-4 w-4 animate-spin text-accent-text" aria-hidden="true" />
              Loading Philippine locations…
            </div>
          ) : phState.status === 'error' ? (
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-3.5 text-xs" role="alert">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-foreground">
                    Philippine locations could not be loaded.
                  </p>
                  <p className="mt-1 text-muted-foreground">{phState.message}</p>
                  <button
                    type="button"
                    className="mt-2 font-semibold text-accent-text underline underline-offset-4"
                    onClick={() => setPhState({ status: 'idle' })}
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {unsupportedSavedSelection && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3.5 text-xs" role="status">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <p className="text-muted-foreground">
                  Your saved location could not be matched in the current PSGC dataset. Please select
                  your region, province, city, or barangay again.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
            {/* Country (Fixed) */}
            <div>
              <span className={labelClasses}>Country</span>
              <div className="g-input-static justify-between gap-2 bg-muted/60">
                <span className="truncate font-medium text-foreground/90">Philippines</span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  Fixed
                </span>
              </div>
            </div>

            {/* Region */}
            <div>
              <label className={labelClasses} htmlFor={ids.region}>
                Region{' '}
                <span className="text-accent-text" aria-hidden="true">
                  *
                </span>
                <span className="sr-only">(required)</span>
              </label>
              <select
                id={ids.region}
                name={`${idPrefix}-region`}
                value={otherRegionCode}
                onChange={(e) => handleRegionChange(e.target.value)}
                required={required}
                disabled={!ph}
                aria-invalid={fieldError('region') ? 'true' : undefined}
                aria-describedby={describedBy('region', 'region')}
                className={`${selectClasses} ${fieldError('region') ? 'border-danger' : ''} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">{ph ? 'Select region' : 'Loading regions…'}</option>
                {otherRegionCode && !selectedRegion && current.region_name ? (
                  <option value={otherRegionCode}>{current.region_name} (saved)</option>
                ) : null}
                {regions.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.name}
                  </option>
                ))}
              </select>
              {fieldError('region') ? (
                <AddressError id={errorId('region')} message={fieldError('region')} />
              ) : (
                <AddressHint id={hintId('region')}>
                  Philippine Standard Geographic Code (PSGC) region.
                </AddressHint>
              )}
            </div>

            {/* Province */}
            <div>
              <label className={labelClasses} htmlFor={ids.province}>
                Province{' '}
                {hasProvinces && (
                  <>
                    <span className="text-accent-text" aria-hidden="true">
                      *
                    </span>
                    <span className="sr-only">(required)</span>
                  </>
                )}
              </label>
              {!ph || !selectedRegion ? (
                <select
                  id={ids.province}
                  name={`${idPrefix}-province`}
                  disabled
                  value=""
                  className={`${selectClasses} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <option value="">{ph ? 'Select a region first' : 'Loading provinces…'}</option>
                </select>
              ) : hasProvinces ? (
                <select
                  id={ids.province}
                  name={`${idPrefix}-province`}
                  value={otherProvinceCode}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  required={required}
                  aria-invalid={fieldError('province') ? 'true' : undefined}
                  aria-describedby={describedBy('province', 'province')}
                  className={`${selectClasses} ${fieldError('province') ? 'border-danger' : ''}`}
                >
                  <option value="">Select province</option>
                  {otherProvinceCode && !selectedProvince && current.province_name ? (
                    <option value={otherProvinceCode}>{current.province_name} (saved)</option>
                  ) : null}
                  {provinces.map((province) => (
                    <option key={province.code} value={province.code}>
                      {province.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  id={ids.province}
                  className="g-input-static justify-between gap-2 bg-muted/60"
                  aria-describedby={hintId('province')}
                >
                  <span className="truncate font-medium text-foreground/90">
                    Not applicable — {selectedRegion.name} has no provincial level
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    N/A
                  </span>
                </div>
              )}
              {fieldError('province') ? (
                <AddressError id={errorId('province')} message={fieldError('province')} />
              ) : (
                <AddressHint id={hintId('province')}>
                  {ph && selectedRegion && !hasProvinces
                    ? 'This region has no provinces; city/municipality comes next.'
                    : 'Select the province where your city or municipality belongs.'}
                </AddressHint>
              )}
            </div>

            {/* City / Municipality */}
            <div>
              <label className={labelClasses} htmlFor={ids.city}>
                City / Municipality{' '}
                <span className="text-accent-text" aria-hidden="true">
                  *
                </span>
                <span className="sr-only">(required)</span>
              </label>
              <select
                id={ids.city}
                name={`${idPrefix}-city`}
                value={otherCityCode}
                onChange={(e) => handleCityChange(e.target.value)}
                required={required}
                disabled={!ph || !cityParentCode}
                aria-invalid={fieldError('city') ? 'true' : undefined}
                aria-describedby={describedBy('city', 'city')}
                className={`${selectClasses} ${fieldError('city') ? 'border-danger' : ''} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">
                  {!ph
                    ? 'Loading cities…'
                    : !selectedRegion
                      ? 'Select a region first'
                      : hasProvinces && !selectedProvince
                        ? 'Select a province first'
                        : 'Select city / municipality'}
                </option>
                {otherCityCode && !selectedCity && current.city_name ? (
                  <option value={otherCityCode}>{current.city_name} (saved)</option>
                ) : null}
                {cities.map((city) => (
                  <option key={city.code} value={city.code}>
                    {city.name}
                  </option>
                ))}
              </select>
              {fieldError('city') ? (
                <AddressError id={errorId('city')} message={fieldError('city')} />
              ) : (
                <AddressHint id={hintId('city')}>
                  {hasProvinces && !selectedProvince
                    ? 'Choose a province to load its cities and municipalities.'
                    : 'SJDM is listed under the existing verified option above, not here.'}
                </AddressHint>
              )}
            </div>

            {/* Barangay */}
            <div className="md:col-span-2">
              <label className={labelClasses} htmlFor={ids.barangay}>
                Barangay{' '}
                <span className="text-accent-text" aria-hidden="true">
                  *
                </span>
                <span className="sr-only">(required)</span>
              </label>
              <select
                id={ids.barangay}
                name={`${idPrefix}-barangay`}
                value={otherBarangayCode}
                onChange={(e) => handleBarangayChange(e.target.value)}
                required={required}
                disabled={!selectedCity}
                aria-invalid={fieldError('barangay') ? 'true' : undefined}
                aria-describedby={describedBy('barangay', 'barangay')}
                className={`${selectClasses} ${fieldError('barangay') ? 'border-danger' : ''} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">
                  {selectedCity
                    ? `Select your barangay (${barangays.length})`
                    : 'Select a city / municipality first'}
                </option>
                {otherBarangayCode &&
                !barangays.some((item) => item.code === otherBarangayCode) &&
                current.barangay_name ? (
                  <option value={otherBarangayCode}>{current.barangay_name} (saved)</option>
                ) : null}
                {barangays.map((item) => (
                  <option key={item.code} value={item.code}>
                    Brgy. {item.name}
                  </option>
                ))}
              </select>
              {fieldError('barangay') ? (
                <AddressError id={errorId('barangay')} message={fieldError('barangay')} />
              ) : (
                <AddressHint id={hintId('barangay')}>
                  {selectedCity && barangays.length === 0
                    ? 'No barangay records are available for this city in the PSGC dataset.'
                    : 'Required — used to match you with nearby clients, coaches, and studios.'}
                </AddressHint>
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
                  autoComplete="address-line1"
                  maxLength={MAX_STREET_LENGTH}
                  spellCheck={false}
                  enterKeyHint="next"
                  required={required}
                  aria-invalid={fieldError('street') ? 'true' : undefined}
                  aria-describedby={describedBy('street', 'street')}
                  className={`${inputClasses} g-input-has-icon ${
                    fieldError('street') ? 'border-danger' : ''
                  }`}
                />
              </div>
              {fieldError('street') ? (
                <AddressError id={errorId('street')} message={fieldError('street')} />
              ) : (
                <AddressHint id={hintId('street')}>
                  House number, street and building only — keep the village in the next field.
                </AddressHint>
              )}
            </div>

            {/* Subdivision / Village */}
            <div>
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
                  placeholder="e.g. Casa Milan / Villa Espina"
                  autoComplete="address-line2"
                  maxLength={MAX_SUBDIVISION_LENGTH}
                  spellCheck={false}
                  enterKeyHint="next"
                  aria-describedby={hintId('subdivision')}
                  className={`${inputClasses} g-input-has-icon`}
                />
              </div>
              <AddressHint id={hintId('subdivision')}>
                Optional — appended to your street line in the saved address summary.
              </AddressHint>
            </div>

            {/* Postal Code */}
            <div>
              <label className={labelClasses} htmlFor={ids.postal}>
                Postal Code{' '}
                <span className="text-accent-text" aria-hidden="true">
                  *
                </span>
                <span className="sr-only">(required)</span>
              </label>
              <input
                id={ids.postal}
                name={`${idPrefix}-postal`}
                type="text"
                inputMode="numeric"
                value={otherPostal}
                onChange={(e) =>
                  update({ postal_code: e.target.value.replace(/\D/g, '').slice(0, 4) })
                }
                placeholder="e.g. 3023"
                autoComplete="postal-code"
                list={postalOptions.length > 0 ? `${ids.postal}-options` : undefined}
                maxLength={4}
                spellCheck={false}
                enterKeyHint="done"
                required={required}
                aria-invalid={fieldError('postal') ? 'true' : undefined}
                aria-describedby={describedBy('postal', 'postal')}
                className={`${inputClasses} ${fieldError('postal') ? 'border-danger' : ''}`}
              />
              {postalOptions.length > 0 && (
                <datalist id={`${ids.postal}-options`}>
                  {postalOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.place}
                    </option>
                  ))}
                </datalist>
              )}
              {fieldError('postal') ? (
                <AddressError id={errorId('postal')} message={fieldError('postal')} />
              ) : (
                <AddressHint id={hintId('postal')}>
                  {!selectedCity
                    ? 'Select a city / municipality to load a suggested postal code.'
                    : postalOptions.length === 0
                      ? 'No postal-code mapping is available for this city. Enter your 4-digit postal code.'
                      : postalOptions.length === 1
                        ? `Suggested postal code: ${postalOptions[0].code}. You can replace it with the code for your barangay.`
                        : `Known postal codes for this city: ${postalOptions
                            .map((option) => option.code)
                            .join(', ')}. Enter the one that applies to your barangay.`}
                </AddressHint>
              )}
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-subtle-foreground">
            Region, province, city/municipality, and barangay options follow the Philippine Standard
            Geographic Code (PSGC) dataset published by the Philippine Statistics Authority (June
            2026 release).
          </p>

          {/* Live preview */}
          <div className="flex items-start gap-2.5 rounded-lg border border-divider bg-muted/30 p-3 text-xs">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground">Your address will read as</p>
              <p className="mt-1 break-words leading-relaxed text-muted-foreground">
                {composeStreetLine(street, subdivision) || (
                  <span className="italic text-subtle-foreground">Street line — not entered yet</span>
                )}
                {barangay ? `, Brgy. ${barangay}` : ''}
                {current.city_name ? `, ${current.city_name}` : ''}
                {current.province_name
                  ? `, ${current.province_name}`
                  : current.region_name
                    ? `, ${current.region_name}`
                    : ''}
                {`, Philippines`}
                {otherPostal ? ` ${otherPostal}` : ''}
              </p>
            </div>
            <Navigation
              className="ml-auto hidden h-4 w-4 shrink-0 text-subtle-foreground sm:block"
              aria-hidden="true"
            />
          </div>
        </>
      )}
    </div>
  );
}

export default AddressSelector;
