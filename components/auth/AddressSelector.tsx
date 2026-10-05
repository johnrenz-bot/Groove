'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, ShieldCheck, CheckCircle2, Lock, Building } from 'lucide-react';

export interface AddressData {
  region_code: string;
  region_name: string;
  province_code: string;
  province_name: string;
  city_code: string;
  city_name: string;
  barangay_code: string;
  barangay_name: string;
  street: string;
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

export function AddressSelector({ initialData, onChange, required = true, errors }: AddressSelectorProps) {
  const [selectedBarangay, setSelectedBarangay] = useState<string>(initialData?.barangay_name || '');
  const [street, setStreet] = useState<string>(initialData?.street || '');
  const [subdivision, setSubdivision] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>(initialData?.postal_code || '3023');

  useEffect(() => {
    if (initialData?.barangay_name) {
      setSelectedBarangay(initialData.barangay_name);
    }
    if (initialData?.street) {
      setStreet(initialData.street);
    }
    if (initialData?.postal_code) {
      setPostalCode(initialData.postal_code);
    }
  }, [initialData]);

  const emitAddress = (brgy: string, st: string, sub: string, pc: string) => {
    const combinedStreet = [st, sub].filter(Boolean).join(', ');
    const parts = [
      combinedStreet,
      brgy ? `Brgy. ${brgy}` : '',
      SJDM_LOCATION.city_name,
      SJDM_LOCATION.province_name,
      SJDM_LOCATION.country,
    ].filter(Boolean);

    const summary = parts.join(', ') + (pc ? ` ${pc}` : '');

    onChange({
      region_code: SJDM_LOCATION.region_code,
      region_name: SJDM_LOCATION.region_name,
      province_code: SJDM_LOCATION.province_code,
      province_name: SJDM_LOCATION.province_name,
      city_code: SJDM_LOCATION.city_code,
      city_name: SJDM_LOCATION.city_name,
      barangay_code: `${SJDM_LOCATION.city_code}-${brgy.replace(/\s+/g, '-').toLowerCase()}`,
      barangay_name: brgy,
      street: combinedStreet,
      postal_code: pc,
      address_summary: summary,
    });
  };

  // Sync initial setup
  useEffect(() => {
    emitAddress(selectedBarangay, street, subdivision, postalCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBarangayChange = (brgy: string) => {
    setSelectedBarangay(brgy);
    emitAddress(brgy, street, subdivision, postalCode);
  };

  const handleStreetChange = (st: string) => {
    setStreet(st);
    emitAddress(selectedBarangay, st, subdivision, postalCode);
  };

  const handleSubdivisionChange = (sub: string) => {
    setSubdivision(sub);
    emitAddress(selectedBarangay, street, sub, postalCode);
  };

  const handlePostalChange = (pc: string) => {
    setPostalCode(pc);
    emitAddress(selectedBarangay, street, subdivision, pc);
  };

  // Fields use the shared design-system input primitives so they match every
  // other form on the site and follow the theme automatically.
  const inputClasses = 'g-input';
  const selectClasses = 'g-input';
  const labelClasses = 'g-label';

  return (
    <div className="space-y-4 rounded-2xl border border-glass-border bg-card/60 p-4 sm:p-5 backdrop-blur-sm shadow-sm">
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
              Groove exclusively connects verified artists, coaches, and studios within San Jose del Monte.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Country & Region (Locked) */}
        <div>
          <span className={labelClasses}>Country &amp; Region</span>
          <div className="g-input-static justify-between bg-muted/60">
            <span className="font-medium text-foreground/90">Philippines • Region III (Central Luzon)</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Fixed
            </span>
          </div>
        </div>

        {/* Province & City (Locked) */}
        <div>
          <span className={labelClasses}>Province &amp; City</span>
          <div className="g-input-static justify-between bg-muted/60">
            <span className="font-medium text-foreground/90">Bulacan — San Jose del Monte</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Fixed
            </span>
          </div>
        </div>

        {/* Barangay (Selectable) */}
        <div className="md:col-span-2">
          <label className={labelClasses} htmlFor="reg-region-city">
            Barangay in San Jose del Monte <span className="text-accent-text">*</span>
          </label>
          <select
            id="reg-region-city"
            value={selectedBarangay}
            onChange={(e) => handleBarangayChange(e.target.value)}
            required={required}
            aria-invalid={errors?.barangay ? 'true' : undefined}
            className={`${selectClasses} ${errors?.barangay ? 'border-danger' : ''}`}
          >
            <option value="">Select your Barangay ({SJDM_LOCATION.barangays.length} Barangays of SJDM)</option>
            {SJDM_LOCATION.barangays.map((b) => (
              <option key={b} value={b}>
                Brgy. {b}
              </option>
            ))}
          </select>
          {errors?.barangay && (
            <p className="g-field-error" role="alert">
              {errors.barangay}
            </p>
          )}
        </div>

        {/* Street / House No. / Building */}
        <div>
          <label className={labelClasses} htmlFor="reg-street">
            Street / House No. / Building <span className="text-accent-text">*</span>
          </label>
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="reg-street"
              type="text"
              value={street}
              onChange={(e) => handleStreetChange(e.target.value)}
              placeholder="e.g. Blk 12 Lot 3, Quirino Highway"
              autoComplete="street-address"
              required={required}
              aria-invalid={errors?.street ? 'true' : undefined}
              className={`${inputClasses} g-input-has-icon ${errors?.street ? 'border-danger' : ''}`}
            />
          </div>
          {errors?.street && (
            <p className="g-field-error" role="alert">
              {errors.street}
            </p>
          )}
        </div>

        {/* Subdivision / Village */}
        <div>
          <label className={labelClasses} htmlFor="reg-subdivision">
            Subdivision / Village <span className="font-normal text-subtle-foreground">Optional</span>
          </label>
          <div className="relative">
            <Building
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="reg-subdivision"
              type="text"
              value={subdivision}
              onChange={(e) => handleSubdivisionChange(e.target.value)}
              placeholder="e.g. Francisco Homes / Pleasant Hills"
              className={`${inputClasses} g-input-has-icon`}
            />
          </div>
        </div>

        {/* Postal Code */}
        <div className="md:col-span-2">
          <label className={labelClasses} htmlFor="reg-postal">
            Postal Code <span className="text-accent-text">*</span>
          </label>
          <select
            id="reg-postal"
            value={postalCode}
            onChange={(e) => handlePostalChange(e.target.value)}
            required={required}
            className={selectClasses}
          >
            <option value="3023">3023 — San Jose del Monte (Main)</option>
            <option value="3024">3024 — Sapang Palay</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default AddressSelector;
