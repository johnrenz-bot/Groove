'use client';

import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { AddressSelector, AddressData } from '@/components/auth/AddressSelector';
import {
  Eye,
  EyeOff,
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
} from 'lucide-react';
import {
  PasswordInput,
  PasswordRequirements,
  PASSWORD_REQUIREMENTS,
} from '@/components/ui/FormField';
import { FormError } from '@/components/ui/FormError';
import { Button } from '@/components/ui/Button';
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

/** Form Section Header with numbered icon container and descriptive subtext. */
function FormSectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3.5 pb-1">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-border/40 bg-accent-soft text-accent-text shadow-sm">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-sm sm:text-base font-bold text-foreground">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
    </div>
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
  showSubmitButton = true,
  submitLabel,
  loading = false,
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
    postal_code: '',
    address_summary: '',
  });

  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const displayError = externalError || error;

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
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Document file size must be less than 5MB.');
        return;
      }
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setError('Only PDF, JPG, and PNG files are accepted.');
        return;
      }
      setIdFile(file);
      setError(null);
      if (file.type.startsWith('image/')) {
        setIdPreview(URL.createObjectURL(file));
      } else {
        setIdPreview(null);
      }
    }
  };

  const removeIdFile = () => {
    setIdFile(null);
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
    if (!address.barangay_name) {
      errs.barangay = 'Please select your Barangay in San Jose del Monte.';
    }
    if (!address.street.trim()) {
      errs.street = 'Please enter your Street / House Number.';
    }

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
      'firstname', 'lastname', 'birth', 'barangay', 'street', 'contact',
      'email', 'username', 'password', 'password_confirmation', 'idFile', 'terms',
    ];
    const firstKey = order.find((k) => errs[k]);

    if (firstKey === 'barangay' || firstKey === 'street') {
      document.getElementById(firstKey === 'barangay' ? 'reg-region-city' : 'reg-street')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-9" noValidate>
      {/* Error banner */}
      <div ref={errorBannerRef}>
        <FormError message={displayError} />
      </div>

      {/* ── Section 1: Personal Information ── */}
      <fieldset className="space-y-6">
        <FormSectionHeader
          icon={User}
          title="1. Personal Information"
          description="Enter your legal name and date of birth for account identity."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Date of Birth Container */}
        <div className="rounded-2xl border border-glass-border bg-card/50 p-4 sm:p-5 backdrop-blur-sm shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
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
              aria-label="Birth year"
              value={personal.birth_year}
              onChange={(e) => setPersonal({ ...personal, birth_year: e.target.value, birth_day: '' })}
              required
              className={selectClasses}
            >
              <option value="">Year</option>
              {BIRTH_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <select
              aria-label="Birth month"
              value={personal.birth_month}
              onChange={(e) => setPersonal({ ...personal, birth_month: e.target.value, birth_day: '' })}
              required
              className={selectClasses}
            >
              <option value="">Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>

            <select
              aria-label="Birth day"
              value={personal.birth_day}
              onChange={(e) => setPersonal({ ...personal, birth_day: e.target.value })}
              required
              aria-invalid={err('birth') ? 'true' : undefined}
              className={`${selectClasses} ${err('birth') ? 'border-danger' : ''}`}
            >
              <option value="">Day</option>
              {getDaysInMonth(personal.birth_year, personal.birth_month).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <InlineError message={err('birth')} />
        </div>
      </fieldset>

      {/* ── Section 2: Philippine Address ── */}
      <fieldset className="space-y-4 border-t border-border pt-8">
        <FormSectionHeader
          icon={MapPin}
          title="2. Service Location (San Jose del Monte, Bulacan)"
          description="Verified local coverage within San Jose del Monte city limits."
        />
        <AddressSelector
          initialData={address}
          onChange={setAddress}
          required
          errors={{
            barangay: fieldErrors.barangay,
            street: fieldErrors.street,
          }}
        />
      </fieldset>

      {/* ── Section 3: Contact & Account ── */}
      <fieldset className="space-y-5 border-t border-border pt-8">
        <FormSectionHeader
          icon={Phone}
          title="3. Contact &amp; Account Details"
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
            toggle, so it matches Login and password reset exactly. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PasswordInput
            id="reg-password"
            name="password"
            label="Password"
            value={contact.password}
            onChange={(e) => setContact({ ...contact, password: e.target.value })}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            error={err('password')}
            showStrength
            aria-describedby="reg-password-hint"
          />
          <p id="reg-password-hint" className="sr-only">
            Password requirements are listed below the field.
          </p>

          <div>
            <PasswordInput
              id="reg-password-confirm"
              name="password_confirmation"
              label="Confirm Password"
              value={contact.password_confirmation}
              onChange={(e) => setContact({ ...contact, password_confirmation: e.target.value })}
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
              error={err('password_confirmation')}
              hint="Both passwords must match."
            />
            {passwordsMatch && contact.password_confirmation.length >= 8 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-success">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Passwords match</span>
              </div>
            )}
          </div>
        </div>
      </fieldset>

      {/* ── Section 4: Document Upload ── */}
      {documentSection ? (
        documentSection
      ) : (
        <fieldset className="space-y-4 border-t border-border pt-8">
          <FormSectionHeader
            icon={Shield}
            title="4. Identity Verification"
            description="Upload a government-issued or student ID to verify your artist status and protect the community."
          />

          <div
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-200 ${
              idFile
                ? 'border-accent-border bg-card/80 shadow-md'
                : 'border-border bg-muted/30 hover:border-accent-border/70 hover:bg-muted/60'
            }`}
          >
            <input
              ref={fileInputRef}
              id={`${role}TermsUpload`}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleIdChange}
              aria-label="Upload identity document"
              aria-invalid={err('idFile') ? 'true' : undefined}
              aria-describedby={err('idFile') ? `${role}TermsUpload-error` : undefined}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />

            {idFile ? (
              <div className="flex flex-col items-center gap-3">
                {idPreview ? (
                  <div className="relative overflow-hidden rounded-xl border border-glass-border bg-black/40 p-1 shadow-md">
                    <img
                      src={idPreview}
                      alt="Preview of the uploaded ID document"
                      className="max-h-40 rounded-lg object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-border/40 bg-accent-soft text-accent-text shadow-sm">
                    <FileText className="h-7 w-7" aria-hidden="true" />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground max-w-xs truncate mx-auto">{idFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(idFile.size / (1024 * 1024)).toFixed(2)} MB · Ready for verification
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeIdFile();
                  }}
                  className="relative z-20 inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-danger-soft hover:text-danger hover:border-danger/30"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground py-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-border/30 bg-accent-soft text-accent-text shadow-sm group-hover:scale-105 transition-transform">
                  <UploadCloud className="h-7 w-7" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Click to upload your ID document
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Passport, UMID, Driver&apos;s License, Postal ID, or Student ID
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-subtle-foreground">
                  <span className="rounded-md border border-border bg-card px-2 py-0.5 font-medium">PDF</span>
                  <span className="rounded-md border border-border bg-card px-2 py-0.5 font-medium">JPG</span>
                  <span className="rounded-md border border-border bg-card px-2 py-0.5 font-medium">PNG</span>
                  <span>· Max 5MB</span>
                </div>
              </div>
            )}
          </div>
          <InlineError id={`${role}TermsUpload-error`} message={err('idFile')} />
        </fieldset>
      )}

      {/* ── Section 5: Terms & Submit ── */}
      {showSubmitButton && (
        <div className="space-y-6 border-t border-border pt-8">
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
            pill={false}
            loading={loading}
            className="w-full h-12 text-sm font-bold tracking-wide shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-accent)]"
            trailingIcon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
          >
            {loading
              ? 'Creating account…'
              : submitLabel || `Complete ${role === 'coach' ? 'Coach' : 'Client'} Registration`}
          </Button>
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
}

export function RegistrationSuccess({ firstname, role, details, message }: RegistrationSuccessProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 font-sans">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[450px] w-[650px] rounded-full bg-accent/10 blur-[130px]"
      />
      <div className="glass relative z-10 w-full max-w-lg space-y-6 rounded-[24px] border border-glass-border p-8 sm:p-10 text-center shadow-[var(--glass-shadow)] backdrop-blur-xl animate-in fade-in zoom-in-95">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-success/30 bg-success-soft text-success shadow-sm">
          <CheckCircle className="h-8 w-8" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <span className="g-eyebrow">
            {role === 'coach' ? 'Coach Registration Received' : 'Performer Account Created'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Welcome, <span className="text-accent-text">{firstname}</span>!
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your {role === 'coach' ? 'coach application' : 'account'} has been successfully registered on Groove.
          </p>
        </div>

        <dl className="space-y-2.5 rounded-2xl border border-border bg-card/60 p-4 sm:p-5 text-left text-xs backdrop-blur-sm">
          {details.map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-3 border-b border-divider pb-2 last:border-none last:pb-0">
              <dt className="text-muted-foreground font-medium">{d.label}:</dt>
              <dd className={`truncate font-semibold text-right ${d.highlight ? 'text-accent-text' : 'text-foreground'}`}>
                {d.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex items-center gap-3 rounded-2xl border border-accent-border/50 bg-accent-soft p-3.5 text-xs text-foreground text-left shadow-sm">
          <ShieldCheck className="h-5 w-5 shrink-0 text-accent-text" aria-hidden="true" />
          <span className="leading-relaxed">
            Please check your inbox for the email confirmation link to activate all platform features.
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          {message || 'You can now proceed to sign in and explore the platform.'}
        </p>

        <Link href="/login" className="block w-full">
          <Button
            size="lg"
            pill={false}
            className="w-full h-12 text-sm font-bold tracking-wide shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-accent)]"
            trailingIcon={<ArrowRight className="h-4 w-4" />}
          >
            Proceed to Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}

/** Exported for the coach page, which builds its own strength-aware field. */
export { PASSWORD_REQUIREMENTS };