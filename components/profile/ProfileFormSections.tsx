'use client';

/**
 * Profile form sections — the editable half of Profile/Settings.
 *
 * These are deliberately built from the SAME components and the SAME field
 * contract as `RegistrationFormFields`:
 *   - `g-input` / `g-label` design-system primitives (identical geometry)
 *   - `AddressSelector` — the very same component registration uses, so the
 *     barangay list and validation cannot diverge
 *   - option lists and rules from `@/lib/profileFields`
 *
 * Nothing is invented here. Each field maps to a column that role's
 * registration form already collects; there is no field in Profile that
 * Registration does not also collect.
 */

import React from 'react';
import { cn } from '@/components/shared/cn';
import {
  Mail,
  AtSign,
  Phone,
  MapPin,
  User as UserIcon,
  ShieldCheck,
  FileText,
  Info,
  Check,
  AlertCircle,
} from 'lucide-react';
import { AddressSelector, type AddressData } from '@/components/auth/AddressSelector';
import {
  BIRTH_YEARS,
  MONTHS,
  CLIENT_TALENT_OPTIONS,
  COACH_SKILL_OPTIONS,
  COACH_DURATION_OPTIONS,
  COACH_PAYMENT_OPTIONS,
  getDaysInMonth,
  isValidMobile,
  isValidEmail,
  isValidUsername,
  MIN_PASSWORD_LENGTH,
  VALIDATION_MESSAGES,
  DEFAULT_SKILLS_AND_GENRES,
} from '@/lib/profileFields';

/* ------------------------------------------------------------------ */
/* Shared field primitives — mirrors RegistrationFormFields exactly     */
/* ------------------------------------------------------------------ */

export const inputClasses = 'g-input';
export const selectClasses = 'g-input';
export const labelClasses = 'g-label';

function FieldLabel({
  htmlFor,
  children,
  valid,
  validText,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  valid?: boolean;
  validText?: string;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label className="g-label mb-0" htmlFor={htmlFor}>
        {children}
      </label>
      {valid && (
        <span className="g-field-valid">
          <Check className="h-3 w-3" aria-hidden="true" />
          {validText}
        </span>
      )}
    </div>
  );
}

function InlineError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="g-field-error" role="alert">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <legend className="g-form-section-title mb-4">
      {icon}
      <span>{children}</span>
    </legend>
  );
}

/* ------------------------------------------------------------------ */
/* Shared field values + errors                                       */
/* ------------------------------------------------------------------ */

/**
 * The subset of `RegistrationFormFields`' state that Profile edits. Field
 * names match the registration state object keys one-for-one.
 */
export interface PersonalFormValues {
  firstname: string;
  middlename: string;
  lastname: string;
  suffix: string;
  birth_year: string;
  birth_month: string;
  birth_day: string;
}

export interface ContactFormValues {
  contact: string;
  email: string;
  username: string;
}

export type ProfileFieldErrors = Partial<Record<string, string>>;

/* ------------------------------------------------------------------ */
/* Section 1 — Personal Information (identical to registration)        */
/* ------------------------------------------------------------------ */

export function PersonalSection({
  values,
  errors,
  onChange,
  disabled,
}: {
  values: PersonalFormValues;
  errors: ProfileFieldErrors;
  onChange: (next: PersonalFormValues) => void;
  disabled?: boolean;
}) {
  const err = (key: string) => errors[key];
  const set = (patch: Partial<PersonalFormValues>) => onChange({ ...values, ...patch });

  return (
    <fieldset className="space-y-5" disabled={disabled}>
      <SectionHeading icon={<UserIcon className="h-4 w-4 text-accent-text" aria-hidden="true" />}>
        Personal Information
      </SectionHeading>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClasses} htmlFor="pf-firstname">
            First Name <span className="text-accent-text">*</span>
          </label>
          <input
            id="pf-firstname"
            type="text"
            value={values.firstname}
            onChange={(e) => set({ firstname: e.target.value })}
            placeholder="Juan"
            autoComplete="given-name"
            required
            aria-invalid={err('firstname') ? 'true' : undefined}
            aria-describedby={err('firstname') ? 'pf-firstname-error' : undefined}
            className={inputClasses}
          />
          <InlineError id="pf-firstname-error" message={err('firstname')} />
        </div>

        <div>
          <label className={labelClasses} htmlFor="pf-middlename">
            Middle Name <span className="font-normal text-subtle-foreground">Optional</span>
          </label>
          <input
            id="pf-middlename"
            type="text"
            value={values.middlename}
            onChange={(e) => set({ middlename: e.target.value })}
            placeholder="Santos"
            autoComplete="additional-name"
            className={inputClasses}
          />
        </div>

        <div>
          <label className={labelClasses} htmlFor="pf-lastname">
            Last Name <span className="text-accent-text">*</span>
          </label>
          <input
            id="pf-lastname"
            type="text"
            value={values.lastname}
            onChange={(e) => set({ lastname: e.target.value })}
            placeholder="Dela Cruz"
            autoComplete="family-name"
            required
            aria-invalid={err('lastname') ? 'true' : undefined}
            aria-describedby={err('lastname') ? 'pf-lastname-error' : undefined}
            className={inputClasses}
          />
          <InlineError id="pf-lastname-error" message={err('lastname')} />
        </div>

        <div>
          <label className={labelClasses} htmlFor="pf-suffix">
            Suffix <span className="font-normal text-subtle-foreground">Optional</span>
          </label>
          <input
            id="pf-suffix"
            type="text"
            value={values.suffix}
            onChange={(e) => set({ suffix: e.target.value })}
            placeholder="Jr., III"
            className={cn(inputClasses, err('suffix') && 'border-danger')}
            aria-invalid={err('suffix') ? 'true' : undefined}
            aria-describedby={err('suffix') ? 'pf-suffix-error' : undefined}
          />
          <InlineError id="pf-suffix-error" message={err('suffix')} />
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className={labelClasses} id="pf-dob-label">
            Date of Birth <span className="text-accent-text">*</span>
          </span>
          <span className="text-[11px] text-subtle-foreground">Minimum 13 years old</span>
        </div>
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          role="group"
          aria-labelledby="pf-dob-label"
        >
          <select
            aria-label="Birth year"
            value={values.birth_year}
            onChange={(e) => set({ birth_year: e.target.value, birth_day: '' })}
            className={selectClasses}
          >
            <option value="">Year</option>
            {BIRTH_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            aria-label="Birth month"
            value={values.birth_month}
            onChange={(e) => set({ birth_month: e.target.value, birth_day: '' })}
            className={selectClasses}
          >
            <option value="">Month</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>

          <select
            aria-label="Birth day"
            value={values.birth_day}
            onChange={(e) => set({ birth_day: e.target.value })}
            aria-invalid={err('birth') ? 'true' : undefined}
            className={selectClasses}
          >
            <option value="">Day</option>
            {getDaysInMonth(values.birth_year, values.birth_month).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <InlineError message={err('birth')} />
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Section 2 — Service Location (the shared AddressSelector)           */
/* ------------------------------------------------------------------ */

export function AddressSection({
  address,
  onChange,
  errors,
  disabled,
}: {
  address: AddressData;
  onChange: (next: AddressData) => void;
  /**
   * Barangay and Street live inside `AddressSelector`, so their messages have to
   * be handed down or a failed submit shows nothing next to the offending field.
   */
  errors?: ProfileFieldErrors;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-4 border-t border-border pt-7" disabled={disabled}>
      <SectionHeading icon={<MapPin className="h-4 w-4 text-accent-text" aria-hidden="true" />}>
        Service Location (San Jose del Monte, Bulacan)
      </SectionHeading>
      <AddressSelector
        initialData={address}
        onChange={onChange}
        required
        errors={{ barangay: errors?.barangay, street: errors?.street }}
      />
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Section 3 — Contact & Account (email/username shown per role)      */
/* ------------------------------------------------------------------ */

export function ContactSection({
  values,
  errors,
  onChange,
  disabled,
  /** Client and coach registration both collect email + username. */
  showAccount = true,
}: {
  values: ContactFormValues;
  errors: ProfileFieldErrors;
  onChange: (next: ContactFormValues) => void;
  disabled?: boolean;
  showAccount?: boolean;
}) {
  const err = (key: string) => errors[key];
  const set = (patch: Partial<ContactFormValues>) => onChange({ ...values, ...patch });

  const mobileValid = values.contact ? isValidMobile(values.contact) : false;
  const emailValid = values.email ? isValidEmail(values.email) : false;
  const usernameValid = values.username ? isValidUsername(values.username) : false;

  return (
    <fieldset className="space-y-5 border-t border-border pt-7" disabled={disabled}>
      <SectionHeading icon={<Phone className="h-4 w-4 text-accent-text" aria-hidden="true" />}>
        Contact &amp; Account Details
      </SectionHeading>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Mobile — the +63 prefix treatment is registration's, unchanged. */}
        <div>
          <FieldLabel htmlFor="pf-contact" valid={mobileValid} validText="Valid">
            Philippine Mobile Number <span className="text-accent-text">*</span>
          </FieldLabel>
          <div className="flex w-full">
            <span
              className="g-input-static w-auto min-w-[86px] justify-center rounded-r-none border-r-0 font-semibold"
              aria-hidden="true"
            >
              <img
                src="https://flagcdn.com/w40/ph.png"
                alt=""
                className="h-3 w-auto rounded-xs"
                loading="lazy"
              />
              +63
            </span>
            <input
              id="pf-contact"
              type="tel"
              inputMode="numeric"
              value={values.contact}
              onChange={(e) =>
                set({ contact: e.target.value.replace(/\D/g, '').slice(0, 10) })
              }
              placeholder="9171234567"
              autoComplete="tel-national"
              required
              aria-invalid={err('contact') ? 'true' : undefined}
              aria-describedby={err('contact') ? 'pf-contact-error' : 'pf-contact-hint'}
              className="g-input flex-1 rounded-l-none border-l-0"
            />
          </div>
          {err('contact') ? (
            <InlineError id="pf-contact-error" message={err('contact')} />
          ) : (
            <p id="pf-contact-hint" className="g-field-hint">
              10 digits starting with 9
            </p>
          )}
        </div>

        <div>
          <FieldLabel htmlFor="pf-email" valid={emailValid} validText="Valid email">
            Email Address <span className="text-accent-text">*</span>
          </FieldLabel>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="pf-email"
              type="email"
              value={values.email}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="yourname@gmail.com"
              autoComplete="email"
              required
              aria-invalid={err('email') ? 'true' : undefined}
              aria-describedby={err('email') ? 'pf-email-error' : undefined}
              className="g-input g-input-has-icon"
            />
          </div>
          <InlineError id="pf-email-error" message={err('email')} />
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-subtle-foreground">
            <Info className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
            <span>Changing this also updates your sign-in address.</span>
          </p>
        </div>
      </div>

      {showAccount && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="pf-username" valid={usernameValid} validText="Looks good">
              Username <span className="text-accent-text">*</span>
            </FieldLabel>
            <div className="relative">
              <AtSign
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="pf-username"
                type="text"
                value={values.username}
                onChange={(e) => set({ username: e.target.value.toLowerCase() })}
                placeholder="juan_dancer"
                autoComplete="username"
                required
                aria-invalid={err('username') ? 'true' : undefined}
                aria-describedby={err('username') ? 'pf-username-error' : 'pf-username-hint'}
                className="g-input g-input-has-icon"
              />
            </div>
            {err('username') ? (
              <InlineError id="pf-username-error" message={err('username')} />
            ) : (
              <p id="pf-username-hint" className="g-field-hint">
                At least 3 characters (letters, numbers, _, .)
              </p>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Section 4 — Client role field (client_profiles.talent)              */
/* ------------------------------------------------------------------ */

export function ClientTalentSection({
  talent,
  errors,
  onChange,
  disabled,
}: {
  talent: string;
  errors: ProfileFieldErrors;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-4 border-t border-border pt-7" disabled={disabled}>
      <SectionHeading icon={<ShieldCheck className="h-4 w-4 text-accent-text" aria-hidden="true" />}>
        Performing Interest
      </SectionHeading>

      <div className="max-w-sm">
        <label className={labelClasses} htmlFor="pf-talent">
          Primary Performing Interest
        </label>
        <select
          id="pf-talent"
          value={talent}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={errors.talent ? 'true' : undefined}
          className={selectClasses}
        >
          {CLIENT_TALENT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <InlineError message={errors.talent} />
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Section 5 — Coach role fields (coach_profiles.*)                    */
/* ------------------------------------------------------------------ */

export interface CoachFormValues {
  talents: string;
  genres: string[];
  service_fee: string;
  duration: string;
  payment_type: string;
  payment_handle: string;
  notice_hours: string;
  notice_days: string;
  cancellation_method: string;
}

export function CoachSkillsSection({
  values,
  errors,
  onChange,
  disabled,
}: {
  values: CoachFormValues;
  errors: ProfileFieldErrors;
  onChange: (next: CoachFormValues) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<CoachFormValues>) => onChange({ ...values, ...patch });
  const toggleGenre = (genre: string) =>
    set({
      genres: values.genres.includes(genre)
        ? values.genres.filter((g) => g !== genre)
        : [...values.genres, genre],
    });

  return (
    <fieldset className="space-y-4 border-t border-border pt-7" disabled={disabled}>
      <SectionHeading icon={<ShieldCheck className="h-4 w-4 text-accent-text" aria-hidden="true" />}>
        Skills &amp; Genres
      </SectionHeading>

      <div className="max-w-sm">
        <label className={labelClasses} htmlFor="pf-talents">
          Performing Arts Skill (Select One) <span className="text-accent-text">*</span>
        </label>
        <select
          id="pf-talents"
          value={values.talents}
          onChange={(e) => {
            // Genres belong to the skill, so switching skill clears them —
            // matching registration, where genres are re-picked per skill.
            set({ talents: e.target.value, genres: [] });
          }}
          className={selectClasses}
        >
          {COACH_SKILL_OPTIONS.map((skill) => (
            <option key={skill} value={skill}>
              {skill}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className={labelClasses}>Specific Genres for {values.talents || '—'}</span>
        <div className="flex flex-wrap gap-2">
          {GENRE_OPTIONS_FOR[values.talents]?.map((genre) => {
            const selected = values.genres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                aria-pressed={selected}
                className={`inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  selected
                    ? 'border-accent-border bg-accent-soft font-semibold text-accent-text'
                    : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
                }`}
              >
                {selected && <Check className="h-3 w-3 text-foreground" />}
                {genre}
              </button>
            );
          })}
        </div>
        <InlineError message={errors.genres} />
      </div>
    </fieldset>
  );
}

export function CoachRatesSection({
  values,
  errors,
  onChange,
  disabled,
}: {
  values: CoachFormValues;
  errors: ProfileFieldErrors;
  onChange: (next: CoachFormValues) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<CoachFormValues>) => onChange({ ...values, ...patch });

  return (
    <fieldset className="space-y-4 border-t border-border pt-7" disabled={disabled}>
      <SectionHeading icon={<FileText className="h-4 w-4 text-accent-text" aria-hidden="true" />}>
        Service Rates &amp; Payment Options
      </SectionHeading>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClasses} htmlFor="pf-service-fee">
            Standard Rate (PHP) <span className="text-accent-text">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
              &#8369;
            </span>
            <input
              id="pf-service-fee"
              type="number"
              min="100"
              step="50"
              value={values.service_fee}
              onChange={(e) => set({ service_fee: e.target.value })}
              required
              aria-invalid={errors.service_fee ? 'true' : undefined}
              className={`${inputClasses} pl-9`}
            />
          </div>
          <InlineError message={errors.service_fee} />
        </div>

        <div>
          <label className={labelClasses} htmlFor="pf-duration">
            Session Duration
          </label>
          <select
            id="pf-duration"
            value={values.duration}
            onChange={(e) => set({ duration: e.target.value })}
            className={selectClasses}
          >
            {COACH_DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClasses} htmlFor="pf-payment">
            Accepted Payment Mode
          </label>
          <select
            id="pf-payment"
            value={values.payment_type}
            onChange={(e) => set({ payment_type: e.target.value })}
            className={selectClasses}
          >
            {COACH_PAYMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {values.payment_type === 'online' && (
          <div>
            <label className={labelClasses} htmlFor="pf-payment-handle">
              GCash / Maya Mobile Number <span className="text-accent-text">*</span>
            </label>
            <input
              id="pf-payment-handle"
              type="text"
              value={values.payment_handle}
              onChange={(e) => set({ payment_handle: e.target.value })}
              placeholder="e.g. 09171234567"
              required
              aria-invalid={errors.payment_handle ? 'true' : undefined}
              className={inputClasses}
            />
            <InlineError message={errors.payment_handle} />
          </div>
        )}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Section 6 — Coach bio                                               */
/* ------------------------------------------------------------------ */

export function CoachBioSection({
  bio,
  errors,
  onChange,
  disabled,
}: {
  bio: string;
  errors: ProfileFieldErrors;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-4 border-t border-border pt-7" disabled={disabled}>
      <SectionHeading icon={<UserIcon className="h-4 w-4 text-accent-text" aria-hidden="true" />}>
        Bio / About Your Coaching
      </SectionHeading>
      <div>
        <label className={labelClasses} htmlFor="pf-bio">
          Bio / About Your Coaching <span className="text-accent-text">*</span>
        </label>
        <textarea
          id="pf-bio"
          value={bio}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Introduce your coaching achievements, experience, specialties, and teaching style..."
          required
          aria-invalid={errors.bio ? 'true' : undefined}
          aria-describedby="pf-bio-hint"
          className="g-input min-h-[104px]"
        />
        <p id="pf-bio-hint" className="g-field-hint">
          Minimum 10 characters
        </p>
        <InlineError message={errors.bio} />
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Verification — read-only, never editable                            */
/* ------------------------------------------------------------------ */

/**
 * Registration collects identity documents once and stores their paths. Profile
 * only displays that state; re-upload is intentionally not offered, so this
 * surface is strictly read-only.
 */
export function VerificationReadOnly({
  rows,
}: {
  rows: { label: string; uploaded: boolean; detail?: string }[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-accent-text" aria-hidden="true" />
        <h3 className="text-sm font-bold text-foreground">Identity Verification</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Documents submitted at registration. Verification status is managed by Groove and cannot be
        changed from your profile.
      </p>
      <dl className="mt-4 space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs"
          >
            <dt className="font-medium text-muted-foreground">{row.label}</dt>
            <dd className="flex items-center gap-2 font-semibold">
              {row.uploaded ? (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Submitted
                </span>
              ) : (
                <span className="text-subtle-foreground">Not submitted</span>
              )}
              {row.detail && <span className="text-subtle-foreground">{row.detail}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Validation — the registration rules, run unchanged                  */
/* ------------------------------------------------------------------ */

/**
 * Validates the shared sections. The rules and messages are the registration
 * ones, sourced from `VALIDATION_MESSAGES`, so Profile cannot accept something
 * Registration would reject.
 */
export function validateProfileSections(input: {
  personal: PersonalFormValues;
  contact: ContactFormValues;
  address: AddressData;
  /** Role-specific extras; each role supplies only its own. */
  bio?: string;
  genres?: string[];
  service_fee?: string;
  payment_type?: string;
  payment_handle?: string;
  /** When false, the username is left untouched (Settings > Account). */
  checkUsername?: boolean;
  checkEmail?: boolean;
}): ProfileFieldErrors {
  const errs: ProfileFieldErrors = {};
  const { personal, contact, address } = input;

  if (!personal.firstname.trim() || !personal.lastname.trim()) {
    errs.firstname = VALIDATION_MESSAGES.firstnameRequired;
  }
  if (!personal.birth_year || !personal.birth_month || !personal.birth_day) {
    errs.birth = VALIDATION_MESSAGES.birthRequired;
  }
  if (!address.barangay_name) {
    errs.barangay = VALIDATION_MESSAGES.barangayRequired;
  }
  if (!address.street.trim()) {
    errs.street = VALIDATION_MESSAGES.streetRequired;
  }
  if (!isValidMobile(contact.contact)) {
    errs.contact = VALIDATION_MESSAGES.mobile;
  }
  if (input.checkEmail !== false && !isValidEmail(contact.email)) {
    errs.email = VALIDATION_MESSAGES.email;
  }
  if (input.checkUsername !== false) {
    if (contact.username.trim().length < 3) {
      errs.username = VALIDATION_MESSAGES.usernameShort;
    } else if (!isValidUsername(contact.username)) {
      errs.username = VALIDATION_MESSAGES.usernameChars;
    }
  }

  if (input.bio !== undefined && input.bio.trim().length < 10) {
    errs.bio = VALIDATION_MESSAGES.bioRequired;
  }
  if (input.genres !== undefined && input.genres.length === 0) {
    errs.genres = 'Please select at least one genre.';
  }
  if (input.service_fee !== undefined) {
    const fee = parseFloat(input.service_fee);
    if (!input.service_fee || Number.isNaN(fee) || fee <= 0) {
      errs.service_fee = VALIDATION_MESSAGES.rateInvalid;
    }
  }
  if (input.payment_type === 'online' && !input.payment_handle?.trim()) {
    errs.payment_handle = VALIDATION_MESSAGES.paymentHandleRequired;
  }
  if (personal.suffix && personal.suffix.trim().length > 50) {
    errs.suffix = VALIDATION_MESSAGES.suffixTooLong;
  }

  return errs;
}

/** New-password rules for Settings > Account, matching registration. */
export function validatePasswordChange(password: string, confirm: string): ProfileFieldErrors {
  const errs: ProfileFieldErrors = {};
  if (!password) {
    errs.password = 'Please enter a new password.';
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errs.password = VALIDATION_MESSAGES.passwordShort;
  }
  if (password !== confirm) {
    errs.password_confirmation = VALIDATION_MESSAGES.passwordMismatch;
  }
  return errs;
}

/**
 * Genres available for a skill. Read from the same `skillsConfig` the coach
 * registration step 2 renders, so the picker list is identical.
 */
export const GENRE_OPTIONS_FOR: Record<string, string[]> = DEFAULT_SKILLS_AND_GENRES;