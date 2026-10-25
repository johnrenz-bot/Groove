'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  AddressSelector,
  AddressData,
  validateAddress,
} from '@/components/auth/AddressSelector';
import {
  UploadCloud,
  Mail,
  AtSign,
  FileText,
  User,
  Phone,
  ArrowRight,
  X,
  CheckCircle,
  Check,
  MapPin,
  Shield,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import {
  PasswordInput,
  PASSWORD_REQUIREMENTS,
} from '@/components/ui/FormField';
import { FormError } from '@/components/ui/FormError';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/components/shared/cn';
import { AnimatedLogo } from '@/components/header/AnimatedLogo';
import {
  MAX_UPLOAD_BYTES,
  DOCUMENT_EXTENSIONS,
  formatFileSize,
  validateUploadFile,
} from '@/lib/uploadValidation';
import {
  BIRTH_YEARS,
  MONTHS,
  EMAIL_RE,
  USERNAME_RE,
  MIN_PASSWORD_LENGTH,
  isValidMobile,
  getDaysInMonth,
} from '@/lib/profileFields';

/* ─── Shared types ─── */

export interface PersonalData {
  firstname: string;
  middlename: string;
  lastname: string;
  suffix: string;
  birth_year: string;
  birth_month: string;
  birth_day: string;
}

export interface ContactAccountData {
  contact: string;
  email: string;
  username: string;
  password: string;
  password_confirmation: string;
}

export interface RegistrationFormFieldsProps {
  role: 'client' | 'coach';
  /** Extra fields rendered beside the username field */
  extraFields?: React.ReactNode;
  /** Extra bio field for coach */
  bioField?: React.ReactNode;
  /** Override document section rendering entirely */
  documentSection?: React.ReactNode;
  /**
   * When set, section badges render as "step.section" (e.g. 1.1). The coach
   * flow passes its current step; the single-page client flow omits it.
   */
  stepNumber?: number;
  /** Called when step-1 shared fields pass validation */
  onValidatedData?: (data: {
    personal: PersonalData;
    contact: ContactAccountData;
    address: AddressData;
  }) => void;
  /** Whether to render as a submittable form with button (default true) */
  showSubmitButton?: boolean;
  /** Custom submit button label */
  submitLabel?: string;
  /** External loading state */
  loading?: boolean;
  /** Optional stage label shown while the account is being created/saved */
  loadingLabel?: string;
  /** External error */
  externalError?: string | null;
  /** Called on form submit after validation */
  onSubmit?: (data: {
    personal: PersonalData;
    contact: ContactAccountData;
    address: AddressData;
    idFile: File | null;
  }) => void;
}

/* ─── Constants ─── */

// MONTHS, BIRTH_YEARS, EMAIL_RE, USERNAME_RE, isValidMobile and getDaysInMonth
// all come from @/lib/profileFields, which is the shared contract with the
// Profile/Settings forms. Registration and Profile therefore cannot drift.
/** Re-exported so the option lists and rules have exactly one definition. */
export { MONTHS, BIRTH_YEARS, EMAIL_RE, USERNAME_RE, isValidMobile, getDaysInMonth };

/* ─── Shared classes ──────────────────────────────────────────────────────────
   These are exported because the coach and client registration pages use them
   for their own role-specific fields. They resolve to the shared design-system
   primitives in globals.css, so a form field looks identical everywhere and
   follows the theme automatically.
   ──────────────────────────────────────────────────────────────────────────── */

export const inputClasses = 'g-input';
export const selectClasses = 'g-input';
export const labelClasses = 'g-label';
export const sectionHeadingClasses = 'g-form-section-title';

/** Per-field validation messages, keyed by field name. */
type FieldErrors = Partial<Record<string, string>>;

/* ─── Small building blocks ─── */

/** Label row with an optional live "valid" chip on the right. */
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

/**
 * Registration section heading. The number, icon and hairline give each block
 * the same start point even when the fields below are a different shape. It is
 * exported because the coach-only steps reuse it for their own sections.
 */
export function RegistrationSectionHeading({
  id,
  index,
  step,
  icon: Icon,
  title,
  description,
  className = '',
}: {
  id?: string;
  /** One-based section number within the current step. */
  index: number;
  /**
   * Optional one-based step. When provided the badge reads "1.1", "2.3", etc.
   * The coach flow uses it so numbering follows the step the member is on; the
   * single-page performer flow omits it and renders 01, 02, … instead.
   */
  step?: number;
  icon: React.ElementType;
  title: string;
  description?: string;
  className?: string;
}) {
  const displayIndex = step ? `${step}.${index}` : String(index).padStart(2, '0');

  return (
    <div className={cn('reg-section-heading', className)}>
      <span className="reg-section-index" aria-hidden="true">
        {displayIndex}
      </span>
      <div className="min-w-0 flex-1">
        <h3 id={id} className="reg-section-title">
          <Icon className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
          <span>{title}</span>
        </h3>
        {description && <p className="reg-section-description">{description}</p>}
      </div>
      <span className="sr-only">
        {step ? `Step ${step}, section ${index}` : `Section ${index}`}
      </span>
    </div>
  );
}

/**
 * The heading at the top of each coach step. It carries the same "Step X of Y"
 * phrasing as the progress rail above it, so the page never shows two
 * different step counts.
 */
export function RegistrationStepHeader({
  step,
  total,
  icon: Icon,
  title,
  description,
}: {
  step: number;
  total: number;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="reg-step-header">
      <div className="reg-step-header-kicker">
        <span>
          Step {step} of {total}
        </span>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="reg-step-header-rule" aria-hidden="true" />
      </div>
      <h2 className="reg-step-header-title">{title}</h2>
      <p className="reg-step-header-description">{description}</p>
    </div>
  );
}

/**
 * Every fieldset names itself through its section heading. Without this a
 * screen reader announces the inputs as an unlabelled group, and the numbered
 * sections lose their meaning.
 */
function SectionFieldset({
  id,
  className = '',
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className={className} aria-labelledby={id}>
      {children}
    </fieldset>
  );
}

/** Inline error text, matching the shared field-error treatment. */
function InlineError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="g-field-error" role="alert">
      {message}
    </p>
  );
}

/* ─── Component ─── */

export function RegistrationFormFields({
  role,
  extraFields,
  bioField,
  documentSection,
  stepNumber,
  showSubmitButton = true,
  submitLabel,
  loading = false,
  loadingLabel,
  externalError,
  onSubmit,
  onValidatedData,
}: RegistrationFormFieldsProps) {
  /* State */
  const [personal, setPersonal] = useState<PersonalData>({
    firstname: '',
    middlename: '',
    lastname: '',
    suffix: '',
    birth_year: '',
    birth_month: '',
    birth_day: '',
  });

  const [contact, setContact] = useState<ContactAccountData>({
    contact: '',
    email: '',
    username: '',
    password: '',
    password_confirmation: '',
  });

  const [address, setAddress] = useState<AddressData>({
    region_code: '',
    region_name: '',
    province_code: '',
    province_name: '',
    city_code: '',
    city_name: '',
    barangay_code: '',
    barangay_name: '',
    street: '',
    subdivision: '',
    postal_code: '',
    address_summary: '',
    location_mode: 'sjdm',
  });

  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idFileError, setIdFileError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  /* The file input is visually hidden under its own card, so it has no
     browser-drawn focus ring. Track it and paint the ring on the card instead,
     otherwise keyboard users cannot see where they are. */
  const [fileInputFocused, setFileInputFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const displayError = externalError || error;

  // Blob URLs are only needed while this preview is mounted. Revoking the old
  // one when it is replaced or when the form unmounts prevents a long form from
  // retaining every selected file in memory.
  useEffect(() => {
    return () => {
      if (idPreview) URL.revokeObjectURL(idPreview);
    };
  }, [idPreview]);

  /* Live checks — only reported once the user has typed something */
  const isEmailValid = useMemo(() => {
    if (!contact.email) return null;
    return EMAIL_RE.test(contact.email.trim());
  }, [contact.email]);

  const isUsernameValid = useMemo(() => {
    if (!contact.username) return null;
    return contact.username.trim().length >= 3 && USERNAME_RE.test(contact.username.trim());
  }, [contact.username]);

  const isMobileValid = useMemo(() => {
    if (!contact.contact) return null;
    return isValidMobile(contact.contact);
  }, [contact.contact]);

  const passwordsMatch = useMemo(() => {
    if (!contact.password_confirmation || !contact.password) return null;
    return contact.password === contact.password_confirmation;
  }, [contact.password, contact.password_confirmation]);

  /* Inline checks. These follow the SAME rules as validate() below — the two
     must not drift, so both read from one place. */
  const liveErrors = useMemo<FieldErrors>(() => {
    const next: FieldErrors = {};

    if (contact.email && !EMAIL_RE.test(contact.email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    if (contact.username) {
      if (contact.username.trim().length < 3) {
        next.username = 'Username must be at least 3 characters.';
      } else if (!USERNAME_RE.test(contact.username.trim())) {
        next.username = 'Use letters, numbers, underscores, and periods only.';
      }
    }
    if (contact.contact) {
      if (!isValidMobile(contact.contact)) {
        next.contact = 'Must be 10 digits starting with 9 (e.g. 9171234567).';
      }
    }
    if (contact.password) {
      if (contact.password.length < MIN_PASSWORD_LENGTH) {
        next.password = 'Password must be at least 8 characters long.';
      }
    }
    if (contact.password_confirmation) {
      if (contact.password !== contact.password_confirmation) {
        next.password_confirmation = 'Passwords do not match.';
      }
    }
    if (personal.firstname === '' || (personal.firstname && !personal.firstname.trim())) {
      if (personal.firstname !== '') next.firstname = 'First name cannot be blank.';
    }
    if (personal.lastname !== '' && !personal.lastname.trim()) {
      next.lastname = 'Last name cannot be blank.';
    }

    return next;
  }, [contact, personal]);

  /* File handlers */
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileError = validateUploadFile(file, {
      allowedExtensions: DOCUMENT_EXTENSIONS,
      maxBytes: MAX_UPLOAD_BYTES,
      noun: 'ID document',
    });

    if (fileError) {
      setIdFileError(fileError);
      setFieldErrors((prev) => {
        if (!prev.idFile) return prev;
        const next = { ...prev };
        delete next.idFile;
        return next;
      });
      setIdFile(null);
      setIdPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIdFileError(null);
    setIdFile(file);
    setError(null);
    setFieldErrors((prev) => {
      if (!prev.idFile) return prev;
      const next = { ...prev };
      delete next.idFile;
      return next;
    });

    if (file.type.startsWith('image/')) {
      setIdPreview(URL.createObjectURL(file));
    } else {
      setIdPreview(null);
    }
  };

  const removeIdFile = () => {
    setIdFile(null);
    setIdFileError(null);
    setIdPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /* Validation — collects every problem at once so the user sees the full
     picture in a single pass instead of fixing one field per submit. */
  const validate = (): FieldErrors => {
    setError(null);

    const errs: FieldErrors = {};

    if (!personal.firstname.trim() || !personal.lastname.trim()) {
      errs.firstname = 'Please provide your full name.';
    }
    if (!personal.birth_year || !personal.birth_month || !personal.birth_day) {
      errs.birth = 'Please select your complete date of birth.';
    }
    // Address rules live in the shared selector so Registration and Profile
    // cannot accept different SJDM or nationwide values.
    Object.assign(errs, validateAddress(address));

    const cleanContact = contact.contact.replace(/\D/g, '');
    if (!isValidMobile(cleanContact)) {
      errs.contact = 'Mobile number must be 10 digits starting with 9 (e.g. 9171234567).';
    }

    if (!EMAIL_RE.test(contact.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (contact.username.trim().length < 3) {
      errs.username = 'Username must be at least 3 characters.';
    } else if (!USERNAME_RE.test(contact.username.trim())) {
      errs.username = 'Username can only contain letters, numbers, underscores, and periods.';
    }

    if (contact.password.length < MIN_PASSWORD_LENGTH) {
      errs.password = 'Password must be at least 8 characters long.';
    }

    if (contact.password !== contact.password_confirmation) {
      errs.password_confirmation = 'Password and confirmation do not match.';
    }

    // Only validate ID file for client (coach handles documents separately)
    if (role === 'client' && !documentSection && !idFile) {
      errs.idFile = 'Please upload a valid government or student ID.';
    }

    if (showSubmitButton && !termsAccepted) {
      errs.terms = 'You must accept the Terms & Conditions and Privacy Policy to register.';
    }

    setFieldErrors(errs);
    return errs;
  };

  /**
   * Bring the user to the problem. On a long registration form the failing
   * field is frequently scrolled off-screen, so without this the submit looks
   * inert even when errors are rendered. Focus the first invalid control when
   * the browser can reach it, otherwise fall back to the error banner.
   */
  const revealErrors = (errs: FieldErrors) => {
    const order = [
      'firstname', 'lastname', 'birth', 'region', 'province', 'city', 'barangay', 'street',
      'postal', 'contact', 'email', 'username', 'password', 'password_confirmation', 'idFile',
      'terms',
    ];
    const firstKey = order.find((k) => errs[k]);
    const addressKeys = new Set(['region', 'province', 'city', 'barangay', 'street', 'postal']);

    if (firstKey && addressKeys.has(firstKey)) {
      const target = document.getElementById(`reg-${firstKey}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (target instanceof HTMLElement) target.focus({ preventScroll: true });
      return;
    }

    const idMap: Record<string, string> = {
      firstname: 'reg-firstname',
      lastname: 'reg-lastname',
      contact: 'reg-contact',
      email: 'reg-email',
      username: 'reg-username',
      password: 'reg-password',
      password_confirmation: 'reg-password-confirm',
      idFile: `${role}TermsUpload`,
      terms: `${role}Terms`,
    };

    const target = firstKey ? document.getElementById(idMap[firstKey] ?? '') : null;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (target instanceof HTMLElement) {
        // Don't steal focus from the day/month selects, but do focus text inputs.
        if (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'file') {
          target.focus({ preventScroll: true });
        }
      }
    } else {
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  /* Submit */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Any click is an explicit statement of intent: from here on, the form
    // always responds with feedback, never silence.
    const errs = validate();
    const failed = Object.keys(errs).length > 0;

    if (failed) {
      const count = Object.keys(errs).length;
      setError(
        count === 1
          ? 'Please fix the highlighted field below to continue.'
          : `Please fix the ${count} highlighted fields below to continue.`
      );
      // Defer one frame so the errors are committed before we scroll.
      window.requestAnimationFrame(() => revealErrors(errs));
      return;
    }

    if (onValidatedData) {
      onValidatedData({ personal, contact, address });
    }

    if (onSubmit) {
      onSubmit({ personal, contact, address, idFile });
    }
  };

  // Server/validation errors and live typing errors are merged, so a field the
  // user has since corrected stops showing a stale message.
  const err = (key: string) => fieldErrors[key] || liveErrors[key];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {/* Error banner */}
      <div ref={errorBannerRef}>
        <FormError message={displayError} />
      </div>

      {/* One quiet line explains the asterisks without taking a full card. */}
      <p className="reg-required-note">
        <span aria-hidden="true" className="reg-required-star">
          *
        </span>
        <span>
          <span className="font-medium text-foreground">Required field</span> &mdash;
          everything else is optional.
        </span>
      </p>

      {/* ── Section 1: Personal Information ── */}
      <SectionFieldset id="reg-legend-personal" className="space-y-4">
        <RegistrationSectionHeading
          id="reg-legend-personal"
          index={1}
          step={stepNumber}
          icon={User}
          title="Personal information"
          description="Enter your legal name and date of birth for account identity."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="g-label" htmlFor="reg-firstname">
              First Name <span className="text-accent-text">*</span>
            </label>
            <input
              id="reg-firstname"
              type="text"
              value={personal.firstname}
              onChange={(e) => setPersonal({ ...personal, firstname: e.target.value })}
              placeholder="Juan"
              autoComplete="given-name"
              required
              aria-invalid={err('firstname') ? 'true' : undefined}
              aria-describedby={err('firstname') ? 'reg-firstname-error' : undefined}
              className={`${inputClasses} ${err('firstname') ? 'border-danger' : ''}`}
            />
            <InlineError id="reg-firstname-error" message={err('firstname')} />
          </div>

          <div>
            <label className="g-label" htmlFor="reg-lastname">
              Last Name <span className="text-accent-text">*</span>
            </label>
            <input
              id="reg-lastname"
              type="text"
              value={personal.lastname}
              onChange={(e) => setPersonal({ ...personal, lastname: e.target.value })}
              placeholder="Dela Cruz"
              autoComplete="family-name"
              required
              aria-invalid={err('lastname') ? 'true' : undefined}
              aria-describedby={err('lastname') ? 'reg-lastname-error' : undefined}
              className={`${inputClasses} ${err('lastname') ? 'border-danger' : ''}`}
            />
            <InlineError id="reg-lastname-error" message={err('lastname')} />
          </div>

          <div>
            <label className="g-label" htmlFor="reg-middlename">
              Middle Name <span className="font-normal text-subtle-foreground">Optional</span>
            </label>
            <input
              id="reg-middlename"
              type="text"
              value={personal.middlename}
              onChange={(e) => setPersonal({ ...personal, middlename: e.target.value })}
              placeholder="Santos"
              autoComplete="additional-name"
              className={inputClasses}
            />
          </div>

          <div>
            <label className="g-label" htmlFor="reg-suffix">
              Suffix <span className="font-normal text-subtle-foreground">Optional</span>
            </label>
            <input
              id="reg-suffix"
              type="text"
              value={personal.suffix}
              onChange={(e) => setPersonal({ ...personal, suffix: e.target.value })}
              placeholder="Jr., III"
              className={inputClasses}
            />
          </div>
        </div>

        {/* Date of birth — a labelled group, not a nested card. */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="g-label mb-0" id="reg-dob-label">
              Date of Birth <span className="text-accent-text">*</span>
            </span>
            <span className="rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-subtle-foreground">
              Minimum 13 years old
            </span>
          </div>
          <div
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            role="group"
            aria-labelledby="reg-dob-label"
          >
            <select
              id="reg-birth-year"
              name="birth_year"
              aria-label="Birth year"
              aria-invalid={err('birth') ? 'true' : undefined}
              aria-describedby={err('birth') ? 'reg-birth-error' : undefined}
              value={personal.birth_year}
              onChange={(e) => setPersonal({ ...personal, birth_year: e.target.value, birth_day: '' })}
              required
              className={`${selectClasses} ${err('birth') ? 'border-danger' : ''}`}
            >
              <option value="">Year</option>
              {BIRTH_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <select
              id="reg-birth-month"
              name="birth_month"
              aria-label="Birth month"
              aria-invalid={err('birth') ? 'true' : undefined}
              aria-describedby={err('birth') ? 'reg-birth-error' : undefined}
              value={personal.birth_month}
              onChange={(e) => setPersonal({ ...personal, birth_month: e.target.value, birth_day: '' })}
              required
              className={`${selectClasses} ${err('birth') ? 'border-danger' : ''}`}
            >
              <option value="">Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>

            <select
              id="reg-birth-day"
              name="birth_day"
              aria-label="Birth day"
              value={personal.birth_day}
              onChange={(e) => setPersonal({ ...personal, birth_day: e.target.value })}
              required
              aria-invalid={err('birth') ? 'true' : undefined}
              aria-describedby={err('birth') ? 'reg-birth-error' : undefined}
              className={`${selectClasses} ${err('birth') ? 'border-danger' : ''}`}
            >
              <option value="">Day</option>
              {getDaysInMonth(personal.birth_year, personal.birth_month).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <InlineError id="reg-birth-error" message={err('birth')} />
        </div>
      </SectionFieldset>

      {/* ── Section 2: Philippine Address ── */}
      <SectionFieldset id="reg-legend-address" className="space-y-4 border-t border-border pt-4">
        <RegistrationSectionHeading
          id="reg-legend-address"
          index={2}
          step={stepNumber}
          icon={MapPin}
          title="Service location"
          description="Choose verified San Jose del Monte coverage, or register from another location in the Philippines."
        />
        <AddressSelector
          initialData={address}
          onChange={setAddress}
          required
          errors={{
            region: fieldErrors.region,
            province: fieldErrors.province,
            city: fieldErrors.city,
            barangay: fieldErrors.barangay,
            street: fieldErrors.street,
            postal: fieldErrors.postal,
            location_mode: fieldErrors.location_mode,
          }}
        />
      </SectionFieldset>

      {/* ── Section 3: Contact & Account ── */}
      <SectionFieldset id="reg-legend-contact" className="space-y-4 border-t border-border pt-4">
        <RegistrationSectionHeading
          id="reg-legend-contact"
          index={3}
          step={stepNumber}
          icon={Phone}
          title="Contact & account details"
          description="Your credentials for secure authentication and booking notifications."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Mobile */}
          <div>
            <FieldLabel htmlFor="reg-contact" valid={isMobileValid === true} validText="Valid mobile">
              Philippine Mobile Number <span className="text-accent-text">*</span>
            </FieldLabel>
            <div className="flex w-full">
              <span
                className="g-input-static w-auto min-w-[86px] justify-center rounded-r-none border-r-0 font-semibold bg-muted/60"
                aria-hidden="true"
              >
                <img
                  src="https://flagcdn.com/w40/ph.png"
                  alt=""
                  className="h-3 w-auto rounded-xs mr-1"
                  loading="lazy"
                />
                +63
              </span>
              <input
                id="reg-contact"
                type="tel"
                inputMode="numeric"
                value={contact.contact}
                onChange={(e) =>
                  setContact({ ...contact, contact: e.target.value.replace(/\D/g, '').slice(0, 10) })
                }
                placeholder="9171234567"
                autoComplete="tel-national"
                required
                aria-invalid={err('contact') ? 'true' : undefined}
                aria-describedby={err('contact') ? 'reg-contact-error' : 'reg-contact-hint'}
                className={`g-input flex-1 rounded-l-none border-l-0 ${err('contact') ? 'border-danger' : ''}`}
              />
            </div>
            {err('contact') ? (
              <InlineError id="reg-contact-error" message={err('contact')} />
            ) : (
              <p id="reg-contact-hint" className="g-field-hint">10 digits starting with 9</p>
            )}
          </div>

          {/* Email */}
          <div>
            <FieldLabel htmlFor="reg-email" valid={isEmailValid === true} validText="Valid email">
              Email Address <span className="text-accent-text">*</span>
            </FieldLabel>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="reg-email"
                type="email"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
                placeholder="yourname@gmail.com"
                autoComplete="email"
                required
                aria-invalid={err('email') ? 'true' : undefined}
                aria-describedby={err('email') ? 'reg-email-error' : undefined}
                className={`g-input g-input-has-icon ${err('email') ? 'border-danger' : ''}`}
              />
            </div>
            <InlineError id="reg-email-error" message={err('email')} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Username */}
          <div>
            <FieldLabel htmlFor="reg-username" valid={isUsernameValid === true} validText="Looks good">
              Username <span className="text-accent-text">*</span>
            </FieldLabel>
            <div className="relative">
              <AtSign
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="reg-username"
                type="text"
                value={contact.username}
                onChange={(e) => setContact({ ...contact, username: e.target.value.toLowerCase() })}
                placeholder={role === 'coach' ? 'coach_maria' : 'juan_dancer'}
                autoComplete="username"
                required
                aria-invalid={err('username') ? 'true' : undefined}
                aria-describedby={err('username') ? 'reg-username-error' : 'reg-username-hint'}
                className={`g-input g-input-has-icon ${err('username') ? 'border-danger' : ''}`}
              />
            </div>
            {err('username') ? (
              <InlineError id="reg-username-error" message={err('username')} />
            ) : (
              <p id="reg-username-hint" className="g-field-hint">
                At least 3 characters (letters, numbers, _, .)
              </p>
            )}
          </div>

          {/* Extra slot for role-specific fields like talent */}
          {extraFields && <div>{extraFields}</div>}
        </div>

        {/* Bio field slot (coach only) */}
        {bioField}

        {/* Password fields — the shared PasswordInput provides the reveal
            toggle and the live requirement checklist, so they match Login and
            password reset exactly. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PasswordInput
            id="reg-password"
            name="password"
            label="Password"
            value={contact.password}
            onChange={(e) => setContact({ ...contact, password: e.target.value })}
            placeholder="Create a password"
            autoComplete="new-password"
            required
            error={err('password')}
            showStrength
          />

          <div>
            <PasswordInput
              id="reg-password-confirm"
              name="password_confirmation"
              label="Confirm password"
              value={contact.password_confirmation}
              onChange={(e) => setContact({ ...contact, password_confirmation: e.target.value })}
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
              error={err('password_confirmation')}
              hint="Both passwords must match."
            />
            {passwordsMatch && contact.password_confirmation.length >= MIN_PASSWORD_LENGTH && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-success">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Passwords match</span>
              </div>
            )}
          </div>
        </div>
      </SectionFieldset>

      {/* ── Section 4: Document Upload ── */}
      {documentSection ? (
        documentSection
      ) : (
        <SectionFieldset id="reg-legend-id" className="space-y-4 border-t border-border pt-4">
          <RegistrationSectionHeading
            id="reg-legend-id"
            index={4}
            step={stepNumber}
            icon={Shield}
            title="Identity verification"
            description="Upload a government-issued or student ID to verify your artist status and protect the community."
          />

          <div
            className={cn(
              'reg-upload-card relative cursor-pointer rounded-xl border-2 border-dashed p-3.5 transition-all duration-200 sm:p-4',
              fileInputFocused && 'border-accent bg-accent-soft/40',
              idFile
                ? 'border-accent-border bg-card/80 shadow-md'
                : 'border-border bg-muted/30 hover:border-accent-border/70 hover:bg-muted/60',
              (idFileError || err('idFile')) && 'border-danger/60'
            )}
          >
            <input
              ref={fileInputRef}
              id={`${role}TermsUpload`}
              type="file"
              accept={DOCUMENT_EXTENSIONS.map((extension) => `.${extension}`).join(',')}
              onChange={handleIdChange}
              onFocus={() => setFileInputFocused(true)}
              onBlur={() => setFileInputFocused(false)}
              aria-label="Upload identity document"
              aria-invalid={idFileError || err('idFile') ? 'true' : undefined}
              aria-describedby={
                idFileError || err('idFile') ? `${role}TermsUpload-error` : undefined
              }
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />

            {idFile ? (
              <div className="flex flex-col items-center gap-2.5">
                {idPreview ? (
                  <div className="relative overflow-hidden rounded-lg border border-glass-border bg-muted/60 p-1 shadow-sm">
                    {/* Blob preview only; next/image cannot optimise object URLs. */}
                    <img
                      src={idPreview}
                      alt="Preview of the uploaded ID document"
                      className="max-h-36 rounded-md object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent-border/40 bg-accent-soft text-accent-text shadow-sm">
                    <FileText className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}
                <div className="max-w-full text-center">
                  <p className="mx-auto max-w-xs truncate text-sm font-semibold text-foreground">
                    {idFile.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatFileSize(idFile.size)} · Ready for verification
                  </p>
                </div>
                <div className="relative z-20 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:border-accent-border hover:bg-accent-soft hover:text-accent-text"
                  >
                    <FileCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeIdFile();
                    }}
                    className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:border-danger/30 hover:bg-danger-soft hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5 py-1 text-center text-muted-foreground">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent-border/30 bg-accent-soft text-accent-text shadow-sm transition-transform group-hover:scale-105">
                  <UploadCloud className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Click to upload your ID document
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Passport, UMID, Driver&apos;s License, Postal ID, or Student ID
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5 text-[11px] text-subtle-foreground">
                  <span className="rounded-md border border-border bg-card px-2 py-0.5 font-medium">PDF</span>
                  <span className="rounded-md border border-border bg-card px-2 py-0.5 font-medium">JPG</span>
                  <span className="rounded-md border border-border bg-card px-2 py-0.5 font-medium">PNG</span>
                  <span>· Max 5 MB</span>
                </div>
              </div>
            )}
          </div>
          <InlineError
            id={`${role}TermsUpload-error`}
            message={idFileError || err('idFile')}
          />
        </SectionFieldset>
      )}

      {/* ── Section 5: Terms & Submit ── */}
      {showSubmitButton && (
        <div className="space-y-4 border-t border-border pt-4">
          <RegistrationSectionHeading
            id="reg-legend-terms"
            index={5}
            step={stepNumber}
            icon={ShieldCheck}
            title="Review & submit"
            description="Confirm the agreements below, then create your account."
          />
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id={`${role}Terms`}
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (e.target.checked) {
                  setFieldErrors((prev) => {
                    if (!prev.terms) return prev;
                    const next = { ...prev };
                    delete next.terms;
                    return next;
                  });
                }
              }}
              aria-invalid={err('terms') ? 'true' : undefined}
              aria-describedby={err('terms') ? `${role}Terms-error` : undefined}
              className="g-checkbox mt-0.5"
            />
            <label
              htmlFor={`${role}Terms`}
              className="cursor-pointer select-none text-xs leading-relaxed text-muted-foreground"
            >
              I have read and agree to the{' '}
              <Link
                href="/terms"
                target="_blank"
                className="font-semibold text-accent-text hover:underline underline-offset-2"
              >
                Terms &amp; Conditions
              </Link>{' '}
              and the{' '}
              <Link
                href="/privacy"
                target="_blank"
                className="font-semibold text-accent-text hover:underline underline-offset-2"
              >
                Privacy Policy
              </Link>{' '}
              for Groove System.
            </label>
          </div>
          {err('terms') && (
            <InlineError id={`${role}Terms-error`} message={err('terms')} />
          )}

          <Button
            type="submit"
            size="lg"
            loading={loading}
            className="h-11 w-full bg-[#F4BE4D] font-bold text-[#121008] transition-all hover:bg-[#E5B23E] hover:shadow-[0_4px_24px_rgba(244,190,77,0.25)] active:scale-[0.99]"
            trailingIcon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
          >
            {loading
              ? loadingLabel || 'Creating account…'
              : submitLabel || `Complete ${role === 'coach' ? 'Coach' : 'Client'} Registration`}
          </Button>
          {loading && (
            <p className="text-center text-xs text-muted-foreground" role="status" aria-live="polite">
              Keep this tab open while we finish setting up your account.
            </p>
          )}
        </div>
      )}
    </form>
  );
}

/* ─── Reusable Success Screen ─── */

interface RegistrationSuccessProps {
  firstname: string;
  role: 'client' | 'coach';
  details: { label: string; value: string; highlight?: boolean }[];
  message?: string;
  /**
   * True when Supabase created the account but did not return a session because
   * the project requires the address to be confirmed first. In that state we
   * must not imply that setup is complete, and we can offer a resend.
   */
  verificationRequired?: boolean;
  /** Address the confirmation email was sent to. Required to offer a resend. */
  email?: string;
  /** Role-specific explanation of what still has to happen after confirmation. */
  verificationNote?: string;
  /**
   * Optional post-registration problem that did NOT roll the registration back.
   * Rendered as an alert inside the card, because a message placed outside it
   * lands below the fold of this full-height layout and is never read.
   */
  warning?: string;
}

export function RegistrationSuccess({
  firstname,
  role,
  details,
  message,
  verificationRequired = false,
  email,
  verificationNote,
  warning,
}: RegistrationSuccessProps) {
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );
  const [resendMessage, setResendMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!email || resendStatus === 'sending' || resendCooldown > 0) return;
    setResendStatus('sending');
    setResendMessage('');

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (resendError) {
        const status = (resendError as { status?: number }).status;
        const text = resendError.message || '';
        if (
          status === 429 &&
          /email|rate|limit/i.test(text)
        ) {
          setResendMessage(
            'Too many verification emails have been requested. Please wait a little while before trying again.'
          );
        } else {
          setResendMessage(
            'We could not resend the verification email right now. Please try again in a moment.'
          );
        }
        setResendStatus('error');
        return;
      }

      setResendStatus('sent');
      setResendMessage(`A new verification link was sent to ${email}.`);
      setResendCooldown(45);
    } catch {
      setResendStatus('error');
      setResendMessage(
        'We could not reach the verification service. Check your connection and try again.'
      );
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 font-sans sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[450px] w-[650px] -translate-x-1/2 rounded-full bg-accent/10 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 right-0 h-[340px] w-[340px] rounded-full bg-accent/[0.04] blur-[110px]"
      />
      <div className="glass relative z-10 w-full max-w-lg animate-in space-y-6 rounded-[26px] border border-glass-border p-6 text-center shadow-[var(--glass-shadow)] backdrop-blur-xl fade-in zoom-in-95 sm:p-9">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
        />

        <div className="flex justify-center">
          <AnimatedLogo
            href="/"
            variant="lockup"
            subtitle="Performing Arts"
            className="au-success-lockup"
          />
        </div>

        <div
          className={cn(
            'mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm',
            verificationRequired
              ? 'border-accent-border bg-accent-soft text-accent-text'
              : 'border-success/30 bg-success-soft text-success'
          )}
        >
          {verificationRequired ? (
            <Mail className="h-8 w-8" aria-hidden="true" />
          ) : (
            <CheckCircle className="h-8 w-8" aria-hidden="true" />
          )}
        </div>

        <div className="space-y-2">
          <span className="g-eyebrow">
            {verificationRequired
              ? 'Account created · Email verification required'
              : role === 'coach'
                ? 'Coach application received'
                : 'Performer account created'}
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {verificationRequired ? (
              <>
                Confirm your email,{' '}
                <span className="text-accent-text">{firstname}</span>
              </>
            ) : (
              <>
                Welcome, <span className="text-accent-text">{firstname}</span>!
              </>
            )}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {verificationRequired
              ? 'Your account was created, but it is not active until you confirm your email address.'
              : role === 'coach'
                ? 'Your coach application has been submitted successfully.'
                : 'Your performer account is ready to use.'}
          </p>
        </div>

        <dl className="space-y-2.5 rounded-2xl border border-border bg-card/60 p-4 text-left text-xs backdrop-blur-sm sm:p-5">
          {details.map((d, i) => (
            <div
              key={`${d.label}-${i}`}
              className="flex items-center justify-between gap-3 border-b border-divider pb-2 last:border-none last:pb-0"
            >
              <dt className="font-medium text-muted-foreground">{d.label}:</dt>
              <dd
                className={cn(
                  'max-w-[65%] truncate text-right font-semibold',
                  d.highlight ? 'text-accent-text' : 'text-foreground'
                )}
              >
                {d.value}
              </dd>
            </div>
          ))}
        </dl>

        {verificationRequired ? (
          <div className="rounded-2xl border border-accent-border/50 bg-accent-soft p-4 text-left shadow-sm">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-accent-text" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">
                  Check your inbox to activate your account
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  We sent a confirmation link{email ? ` to ${email}` : ''}.{' '}
                  {verificationNote ||
                    'After confirming, sign in to finish any remaining setup steps.'}
                </p>
                {email && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    loading={resendStatus === 'sending'}
                    disabled={resendCooldown > 0}
                    icon={<RefreshCw className="h-3.5 w-3.5" />}
                    onClick={handleResend}
                  >
                    {resendCooldown > 0
                      ? `Resend available in ${resendCooldown}s`
                      : 'Resend verification email'}
                  </Button>
                )}
                {resendMessage && (
                  <p
                    role={resendStatus === 'error' ? 'alert' : 'status'}
                    className={cn(
                      'mt-2 text-xs leading-relaxed',
                      resendStatus === 'error' ? 'text-danger' : 'text-success'
                    )}
                  >
                    {resendMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success-soft p-3.5 text-left text-xs text-foreground shadow-sm">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <span className="leading-relaxed">
              Email verification is not required for this account. You can sign in now.
            </span>
          </div>
        )}

        {warning && (
          <p
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger-soft p-3.5 text-left text-xs leading-relaxed text-danger"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{warning}</span>
          </p>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          {message ||
            (verificationRequired
              ? 'The confirmation link may take a minute to arrive. Check your spam folder if you do not see it.'
              : 'You can now proceed to sign in and explore the platform.')}
        </p>

        <Link href="/login" className="block w-full">
          <Button
            size="lg"
            pill={false}
            className="h-12 w-full bg-[#F4BE4D] text-sm font-bold tracking-wide text-[#121008] transition-all hover:bg-[#E5B23E] hover:shadow-[0_4px_24px_rgba(244,190,77,0.25)] active:scale-[0.99]"
            trailingIcon={<ArrowRight className="h-4 w-4" />}
          >
            {verificationRequired ? 'Return to Sign In' : 'Proceed to Sign In'}
          </Button>
        </Link>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-subtle-foreground">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Your account is protected by Supabase authentication.
        </p>
      </div>
    </div>
  );
}

/** Exported for the coach page, which builds its own strength-aware field. */
export { PASSWORD_REQUIREMENTS };