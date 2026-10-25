'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  RegistrationFormFields,
  RegistrationSuccess,
  RegistrationSectionHeading,
  RegistrationStepHeader,
  PersonalData,
  ContactAccountData,
  inputClasses,
  selectClasses,
  labelClasses,
} from '@/components/auth/RegistrationFormFields';
import { RegistrationProgress } from '@/components/auth/RegistrationProgress';
import {
  AddressData,
  composeStreetLine,
  getServiceLocationMode,
} from '@/components/auth/AddressSelector';
import {
  DEFAULT_SKILLS_AND_GENRES,
  getAvailableSkills,
  validateSkillsSelection,
} from '@/lib/config/skillsConfig';
import {
  ArrowRight,
  Award,
  Sparkles,
  DollarSign,
  ShieldCheck,
  FileCheck,
  Camera,
  X,
  Music,
  Mic,
  Clapperboard,
  Drama,
  Check,
  Layers,
  AlertCircle,
  User,
} from 'lucide-react';
import { AuthLayout } from '@/components/shared/AuthLayout';
import { GoogleRegisterButton } from '@/components/shared/GoogleRegisterButton';
import { FormError } from '@/components/ui/FormError';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/shared/cn';
import { createClient } from '@/lib/supabase/client';
import {
  DOCUMENT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  formatFileSize,
  validateUploadFile,
} from '@/lib/uploadValidation';
import { getFeaturedLocationsDisplay, getFeaturedLocationsAddressSummary } from '@/lib/config/featuredLocations';
// GCASH-QR (temporarily disabled)
// The optional GCash QR upload is hidden in this form. Its component and service
// are deliberately left in place and untouched — both are still used by the
// profile pages, and nothing here was deleted. Every removed piece below is
// fenced with "GCASH-QR (temporarily disabled)" so the block can be restored by
// uncommenting the original code, which is preserved in the project history.

/* ─── Skill Icon Mapping ─── */
const SKILL_ICONS: Record<string, React.ElementType> = {
  Dance: Music,
  Singing: Mic,
  Acting: Clapperboard,
  Theater: Drama,
};

/* ─── File Upload Card ─── */
function FileUploadCard({
  id,
  label,
  accept,
  file,
  onFileChange,
  onRemove,
  icon: Icon,
  hint,
  required = true,
  disabled = false,
  error,
}: {
  id: string;
  label: string;
  accept: string;
  file: File | null;
  onFileChange: (f: File | null) => void;
  onRemove: () => void;
  icon: React.ElementType;
  hint: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);

  const allowedExtensions = /pdf/i.test(accept) ? DOCUMENT_EXTENSIONS : IMAGE_EXTENSIONS;
  const shownError = error || localError;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = (nextFile: File | null) => {
    if (!nextFile) return;

    const validation = validateUploadFile(nextFile, {
      allowedExtensions,
      maxBytes: MAX_UPLOAD_BYTES,
      noun: label.toLowerCase(),
    });

    if (validation) {
      setLocalError(validation);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setLocalError(null);
    onFileChange(nextFile);
    setPreview(nextFile.type.startsWith('image/') ? URL.createObjectURL(nextFile) : null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
  };

  const remove = () => {
    setLocalError(null);
    setPreview(null);
    onRemove();
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          'reg-upload-card group relative cursor-pointer rounded-xl border-2 border-dashed p-3 text-center transition-all',
          file
            ? 'border-accent-border bg-card/80 shadow-sm'
            : 'border-border bg-muted/25 hover:border-accent-border hover:bg-muted/50',
          dragging && 'border-accent bg-accent-soft/50',
          focused && 'border-accent bg-accent-soft/40',
          shownError && 'border-danger/60',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          aria-label={`Upload ${label}`}
          aria-invalid={shownError ? 'true' : undefined}
          aria-describedby={shownError ? `${id}-error` : undefined}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <div className="flex flex-col items-center gap-1.5">
          {file ? (
            <>
              {preview ? (
                <div className="relative overflow-hidden rounded-lg border border-glass-border bg-muted/60 p-1">
                  {/* Blob preview only; next/image cannot optimise object URLs. */}
                  <img
                    src={preview}
                    alt={`Preview of ${label}`}
                    className="max-h-20 rounded-md object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-success/30 bg-success-soft text-success">
                  <FileCheck className="h-4 w-4" aria-hidden="true" />
                </div>
              )}
              <div className="max-w-full text-center">
                <span className="block truncate text-xs font-semibold text-foreground" title={file.name}>
                  {file.name}
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {formatFileSize(file.size)} · Attached
                </span>
              </div>
              <div className="relative z-20 flex flex-wrap items-center justify-center gap-1.5">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                  className="inline-flex min-h-[32px] cursor-pointer items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-accent-border hover:bg-accent-soft hover:text-accent-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileCheck className="h-3 w-3" aria-hidden="true" />
                  Replace
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    remove();
                  }}
                  className="inline-flex min-h-[32px] cursor-pointer items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-danger/30 hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent-border bg-accent-soft text-accent-text transition-transform group-hover:scale-105">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <span className="block text-xs font-semibold text-foreground">{label}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">{hint}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="g-pill-accent text-[10px] font-semibold">Click or drop</span>
                <span className="text-[10px] text-subtle-foreground">
                  {required ? 'Required' : 'Optional'} · max 5 MB
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      {shownError && (
        <p id={`${id}-error`} className="g-field-error" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{shownError}</span>
        </p>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export default function CoachRegistrationPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [submitStage, setSubmitStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    firstname: string;
    username: string;
    email: string;
    talents: string;
    genres: string;
    location: string;
    locationDisplay: string;
    verificationRequired: boolean;
    // GCASH-QR (temporarily disabled): restore `gcashWarning?: string | null;`
    // here when the optional QR upload is re-enabled.
  } | null>(null);

  type Step3Errors = {
    service_fee?: string;
    payment_handle?: string;
    validIdFile?: string;
    idSelfieFile?: string;
    terms?: string;
  };
  const [step3Errors, setStep3Errors] = useState<Step3Errors>({});

  /* Step 1 data captured from RegistrationFormFields */
  const [step1Data, setStep1Data] = useState<{
    personal: PersonalData;
    contact: ContactAccountData;
    address: AddressData;
  } | null>(null);
  const [bio, setBio] = useState('');

  /* Step 2 specific state: Skill & Genres */
  const availableSkills = getAvailableSkills();
  const [selectedSkill, setSelectedSkill] = useState<string>('Dance');
  const [selectedGenres, setSelectedGenres] = useState<Record<string, string[]>>({
    Dance: ['Hip-Hop'],
  });
  const [isOtherSelected, setIsOtherSelected] = useState<Record<string, boolean>>({
    Dance: false,
  });
  const [customGenres, setCustomGenres] = useState<Record<string, string[]>>({
    Dance: [''],
  });

  const activePredefinedGenres = selectedGenres[selectedSkill] || [];
  const hasOther = isOtherSelected[selectedSkill] || false;
  const activeCustomGenresList = hasOther ? (customGenres[selectedSkill] || ['']) : [];
  const formattedCustomGenres = activeCustomGenresList
    .map((g) => g.trim())
    .filter(Boolean)
    .map((g) => (g.toLowerCase().endsWith('(custom)') ? g : `${g} (custom)`));
  const allActiveGenres = [...activePredefinedGenres, ...formattedCustomGenres];

  /* Step 3 specific state: Rates, Payment, Files */
  const [step3Data, setStep3Data] = useState({
    service_fee: '500',
    duration: '1 hour',
    payment: 'cash' as 'cash' | 'online',
    payment_handle: '',
    terms: false,
  });
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [validIdFile, setValidIdFile] = useState<File | null>(null);
  const [idSelfieFile, setIdSelfieFile] = useState<File | null>(null);

  // GCASH-QR (temporarily disabled): the optional QR upload state lived here —
  // `gcashQrFile`, `gcashQrNotes` and the derived `wantsGCashQr` flag.
  // step3Data.payment_handle already collects a GCash number when the coach picks
  // "Online Payment" and is UNCHANGED; that field and its validation stay. Only
  // the QR image/notes half was hidden. To restore, reinstate these three hooks
  // exactly as they were.

  /* Step 1 is rendered by RegistrationFormFields, which owns its own <form>.
     The Next button must submit THAT form, not the first form on the page. */
  const step1FormRef = useRef<HTMLDivElement>(null);

  /* Select Skill Category (Single-select radio behavior) */
  const handleSelectSkill = (skill: string) => {
    setError(null);
    setSelectedSkill(skill);
    // Pre-select first genre if this skill has never had genres selected
    if (!selectedGenres[skill] || selectedGenres[skill].length === 0) {
      const defaultFirstGenre = DEFAULT_SKILLS_AND_GENRES[skill]?.[0];
      if (defaultFirstGenre) {
        setSelectedGenres((prev) => ({ ...prev, [skill]: [defaultFirstGenre] }));
      }
    }
  };

  /* Toggle Predefined Genre */
  const toggleGenre = (genre: string) => {
    setError(null);
    setSelectedGenres((prev) => {
      const current = prev[selectedSkill] || [];
      const updated = current.includes(genre)
        ? current.filter((g) => g !== genre)
        : [...current, genre];
      return { ...prev, [selectedSkill]: updated };
    });
  };

  /* Toggle Other / Custom Genre */
  const toggleOther = () => {
    setError(null);
    setIsOtherSelected((prev) => {
      const nextVal = !prev[selectedSkill];
      if (nextVal) {
        setCustomGenres((cg) => {
          const existing = cg[selectedSkill] || [];
          return {
            ...cg,
            [selectedSkill]: existing.length > 0 ? existing : [''],
          };
        });
      }
      return { ...prev, [selectedSkill]: nextVal };
    });
  };

  /* Custom Genre handlers */
  const handleCustomGenreChange = (index: number, val: string) => {
    setError(null);
    setCustomGenres((prev) => {
      const list = [...(prev[selectedSkill] || [''])];
      list[index] = val;
      return { ...prev, [selectedSkill]: list };
    });
  };

  const handleAddAnotherCustomGenre = () => {
    setError(null);
    setCustomGenres((prev) => {
      const list = [...(prev[selectedSkill] || [''])];
      return { ...prev, [selectedSkill]: [...list, ''] };
    });
  };

  const handleRemoveCustomGenre = (index: number) => {
    setError(null);
    setCustomGenres((prev) => {
      const list = (prev[selectedSkill] || ['']).filter((_, i) => i !== index);
      return {
        ...prev,
        [selectedSkill]: list.length > 0 ? list : [''],
      };
    });
  };

  /* Handler when step-1 fields pass validation */
  const handleStep1Validated = (data: {
    personal: PersonalData;
    contact: ContactAccountData;
    address: AddressData;
  }) => {
    if (!bio.trim() || bio.trim().length < 10) {
      const message =
        'Please provide a brief bio (minimum 10 characters) about your coaching experience.';
      setBioError(message);
      setError(null);
      document.getElementById('coach-bio')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('coach-bio')?.focus({ preventScroll: true });
      return;
    }
    setBioError(null);
    setError(null);
    setStep1Data(data);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Handler to proceed from Step 2 to Step 3 */
  const handleStep2Proceed = () => {
    const validation = validateSkillsSelection(
      selectedSkill,
      activePredefinedGenres,
      hasOther,
      activeCustomGenresList
    );
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    setError(null);
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Final Submit (Step 3) */
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step1Data || loading) return;
    setError(null);
    setStep3Errors({});

    // Validate skills & genres
    const skillsValidation = validateSkillsSelection(
      selectedSkill,
      activePredefinedGenres,
      hasOther,
      activeCustomGenresList
    );
    if (!skillsValidation.valid) {
      setError(skillsValidation.error);
      setStep(2);
      return;
    }

    // Step 3 field-level validation. Collect every problem so the user does not
    // have to submit repeatedly to discover each missing document.
    const nextStep3Errors: Step3Errors = {};

    if (!step3Data.service_fee || Number.parseFloat(step3Data.service_fee) <= 0) {
      nextStep3Errors.service_fee = 'Set a standard rate greater than zero.';
    }
    if (step3Data.payment === 'online' && !step3Data.payment_handle.trim()) {
      nextStep3Errors.payment_handle =
        'Enter the GCash or Maya number clients should pay.';
    }
    // GCASH-QR (temporarily disabled): the check that a QR upload came with a
    // matching mobile number (gcash_profiles.account_number is NOT NULL) was
    // removed. It was only reachable once a QR had been attached, which is no
    // longer possible. The separate "Online Payment requires a mobile number"
    // rule above is unchanged and still applies.
    if (!validIdFile) {
      nextStep3Errors.validIdFile = 'Upload a valid government ID for coach verification.';
    }
    if (!idSelfieFile) {
      nextStep3Errors.idSelfieFile =
        'Upload a selfie holding your ID for identity verification.';
    }
    if (!step3Data.terms) {
      nextStep3Errors.terms = 'You must agree to the Coach Terms of Service.';
    }

    if (Object.keys(nextStep3Errors).length > 0) {
      setStep3Errors(nextStep3Errors);
      const firstIdMap: Record<keyof Step3Errors, string> = {
        service_fee: 'coach-service-fee',
        payment_handle: 'coach-payment-handle',
        validIdFile: 'coach-valid-id',
        idSelfieFile: 'coach-id-selfie',
        terms: 'coachTerms',
      };
      const firstKey = (
        [
          'service_fee',
          'payment_handle',
          'validIdFile',
          'idSelfieFile',
          'terms',
        ] as (keyof Step3Errors)[]
      ).find((key) => nextStep3Errors[key]);
      if (firstKey) {
        window.requestAnimationFrame(() => {
          document
            .getElementById(firstIdMap[firstKey])
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          document.getElementById(firstIdMap[firstKey])?.focus({ preventScroll: true });
        });
      }
      setError(
        Object.keys(nextStep3Errors).length === 1
          ? 'Please fix the highlighted item below to submit your application.'
          : `Please fix the ${Object.keys(nextStep3Errors).length} highlighted items below to submit your application.`
      );
      return;
    }

    setLoading(true);
    setSubmitStage('Creating your account…');

    // The auth row is the point of no return. Later failures must not tell the
    // coach to submit the whole application again.
    let accountCreated = false;

    try {
      // Coach registration runs entirely in the browser against the signed-up
      // user's own session. Email confirmation is disabled in this project, so
      // auth.signUp() returns a session immediately and RLS evaluates the
      // Storage and table writes as `authenticated` -- which is what the
      // storage policies and the coach_profiles policies require.
      const supabase = createClient();
      const random4Digit = Math.floor(1000 + Math.random() * 9000).toString();
      const birthdate = `${step1Data.personal.birth_year}-${String(step1Data.personal.birth_month).padStart(2, '0')}-${String(step1Data.personal.birth_day).padStart(2, '0')}`;

      const cleanContact = step1Data.contact.contact.replace(/\D/g, '');
      const normalizedContact = cleanContact.startsWith('0')
        ? cleanContact.slice(1)
        : cleanContact.startsWith('63')
          ? cleanContact.slice(2)
          : cleanContact;
      const formattedContact = `+63${normalizedContact}`;

      // Structured Skills & Genres Object
      const structuredSkillsObject = {
        skill: selectedSkill,
        genres: allActiveGenres,
      };

      const talentsString = selectedSkill;
      const genresJSON = JSON.stringify(structuredSkillsObject);
      const readableGenresSummary = `${selectedSkill}: ${allActiveGenres.join(', ')}`;

      /* -- 1. Create the auth user ------------------------------------------ */

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: step1Data.contact.email.trim(),
        password: step1Data.contact.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role: 'coach',
            custom_id: random4Digit,
            firstname: step1Data.personal.firstname.trim(),
            middlename: step1Data.personal.middlename.trim() || null,
            lastname: step1Data.personal.lastname.trim(),
            username: step1Data.contact.username.trim().toLowerCase(),
            contact: formattedContact,
            talent: talentsString,
            talents: talentsString,
            skill: selectedSkill,
            skills: [selectedSkill],
            genres: genresJSON,
          },
        },
      });

      if (authErr) {
        const authCode = (authErr as { code?: string }).code;
        const authMessage = authErr.message || '';

        if (
          authCode === 'over_email_send_rate_limit' ||
          /email rate limit exceeded/i.test(authMessage) ||
          /over_email_send_rate_limit/i.test(authMessage)
        ) {
          throw new Error(
            'Too many confirmation emails have been requested for this address. Your account was not created — please wait about an hour before trying again, or use a different email address.'
          );
        }
        if (authErr.status === 429) {
          throw new Error(
            'Too many registration attempts. Please wait a few minutes and try again.'
          );
        }
        if (authErr.status === 422 || /already/i.test(authMessage)) {
          throw new Error(
            'That email address is already registered. Please sign in instead.'
          );
        }
        if (/database error saving new user/i.test(authMessage)) {
          throw new Error(
            `Registration could not be completed because the server rejected the new user record. Server said: ${authErr.message}`
          );
        }
        throw new Error(
          authMessage || 'Registration failed. Username or email may already be registered.'
        );
      }

      if (!authData.user) {
        throw new Error('Registration failed. Username or email may already be registered.');
      }

      if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
        throw new Error(
          'That email address is already registered. Please sign in instead, or use a different email address.'
        );
      }

      accountCreated = true;

      // Welcome email. Best-effort only: the account already exists at this point,
      // so a delivery failure must not abort the rest of the registration or turn a
      // successful signup into an error for the user. The inner catch is what makes
      // that true for a network-level rejection, which `!response.ok` never sees --
      // without it the throw would land in the outer catch below as a signup failure.
      // The recipient is the address Supabase actually created the user with.
      if (authData.user?.email) {
        try {
          const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: authData.user.email,
              name: step1Data.personal.firstname.trim(),
            }),
          });

          if (!response.ok) {
            // Best-effort diagnostic: log the HTTP status and any detail the
            // route returned. Registration already succeeded at this point.
            try {
              const body = await response.json().catch(() => ({}));
              console.error(
                `[coach-reg] Welcome email not sent. HTTP ${response.status}.` +
                  (body?.detail ? ` detail="${body.detail}"` : '') +
                  (body?.error ? ` error="${body.error}"` : '')
              );
            } catch {
              console.error(`[coach-reg] Welcome email not sent. HTTP ${response.status}.`);
            }
          }
        } catch {
          // Swallowed on purpose; see the note above.
        }
      }

      // The account now exists, so the Storage writes below are no longer anon.
      // signUp() returns a session only when email confirmation is disabled in
      // this project. If that setting changes, do not attempt privileged work
      // without a session: report the exact pending state instead.
      const userId = authData.user.id;
      const location =
        getServiceLocationMode(step1Data.address) === 'other'
          ? step1Data.address.address_summary
          : getFeaturedLocationsAddressSummary();
      const locationDisplay =
        getServiceLocationMode(step1Data.address) === 'other'
          ? [
              step1Data.address.city_name,
              step1Data.address.province_name || step1Data.address.region_name,
            ]
              .filter(Boolean)
              .join(', ')
          : getFeaturedLocationsDisplay();
      const verificationRequired =
        authData.session === null && !authData.user.email_confirmed_at;

      if (verificationRequired) {
        setSuccessData({
          firstname: step1Data.personal.firstname.trim(),
          username: step1Data.contact.username.trim().toLowerCase(),
          email: step1Data.contact.email.trim(),
          talents: talentsString,
          genres: readableGenresSummary,
          location,
          locationDisplay,
          verificationRequired: true,
        });
        setRegisteredSuccess(true);
        return;
      }

      if (authData.session === null) {
        const { data: signInData, error: signInErr } =
          await supabase.auth.signInWithPassword({
            email: step1Data.contact.email.trim(),
            password: step1Data.contact.password,
          });

        if (signInErr || !signInData.session) {
          if (/email not confirmed/i.test(signInErr?.message ?? '')) {
            setSuccessData({
              firstname: step1Data.personal.firstname.trim(),
              username: step1Data.contact.username.trim().toLowerCase(),
              email: step1Data.contact.email.trim(),
              talents: talentsString,
              genres: readableGenresSummary,
              location,
              locationDisplay,
              verificationRequired: true,
            });
            setRegisteredSuccess(true);
            return;
          }

          throw new Error(
            'Your account was created, but we could not sign you in to upload your verification documents. ' +
              'Please sign in and upload them from your profile.'
          );
        }
      }

      /* -- 2. Upload the documents ------------------------------------------ */
      setSubmitStage('Uploading verification documents…');

      // The object name shape is mandated by supabase/storage_policies.sql:
      // exactly `coaches/<auth uid>/<13-digit epoch ms>_<4 digits>.<ext>`. The
      // INSERT / SELECT / UPDATE policies match those three segments exactly,
      // so `coaches/ids/...` and any nested folder are rejected by RLS.
const uploadCoachDoc = async (file: File, label: string): Promise<string> => {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'jpg';
  const fileName = `coaches/${userId}/${Date.now()}_${random4Digit}.${safeExt}`;

  const { error: storageErr } = await supabase.storage
    .from('verification-documents')
    .upload(fileName, file, { upsert: false });

  if (storageErr) {
    throw new Error(`Could not upload your ${label}: ${storageErr.message}`);
  }

  return fileName;
};

      const validIdPath = await uploadCoachDoc(validIdFile!, 'government ID');
      const idSelfiePath = await uploadCoachDoc(idSelfieFile!, 'ID selfie');
      // Optional: no portfolio file simply means no portfolio. A file that was
      // chosen and fails to upload throws above like any other.
      const portfolioPath = portfolioFile
        ? await uploadCoachDoc(portfolioFile, 'portfolio / resume')
        : null;

      /* -- 3. Persist the profile rows ------------------------------------- */
      setSubmitStage('Saving your coaching profile…');

      // `barangay_code` is the one address value that can exceed its column.
      // AddressSelector builds it as "<city_code>-<barangay name, slugified>"
      // (components/auth/AddressSelector.tsx:144), so it runs 16-35 chars
      // against a VARCHAR(20) column, and 37 of the 60 SJDM barangays overflow
      // it -- that is the SQLSTATE 22001 rejection on this upsert.
      //
      // The slug is the bug, not the column: it is a synthetic key assembled
      // from the display name, not a PSGC barangay code, and nothing in the app
      // reads it back as a lookup (it is only written, never compared). So the
      // honest value to store is the city code prefix the column can hold, and
      // the barangay identity is already preserved losslessly in
      // `barangay_name` (VARCHAR 120) and in `address_summary`. Truncating the
      // slug to fit would invent a code that is neither the city code nor the
      // barangay's own, so it is not done.
      const rawBarangayCode = step1Data.address.barangay_code;
      const cityCodePrefix = `${step1Data.address.city_code}-`;
      const barangayCode =
        rawBarangayCode && rawBarangayCode.length <= 20
          ? rawBarangayCode
          : cityCodePrefix;

      // `bio` lives on `profiles`. There is no subdivision column, so the street
      // line and the subdivision are joined here. composeStreetLine() is the
      // one definition of that join, so the stored value is byte-identical to
      // what the old folded selector produced.
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: userId,
        custom_id: random4Digit,
        role: 'coach',
        firstname: step1Data.personal.firstname.trim(),
        middlename: step1Data.personal.middlename.trim() || null,
        lastname: step1Data.personal.lastname.trim(),
        suffix: step1Data.personal.suffix.trim() || null,
        birthdate,
        contact: formattedContact,
        email: step1Data.contact.email.trim(),
        username: step1Data.contact.username.trim().toLowerCase(),
        bio: bio.trim(),
        status: 'offline',
        address_summary: step1Data.address.address_summary,
        region_code: step1Data.address.region_code,
        region_name: step1Data.address.region_name,
        province_code: step1Data.address.province_code,
        province_name: step1Data.address.province_name,
        city_code: step1Data.address.city_code,
        city_name: step1Data.address.city_name,
        barangay_code: barangayCode,
        barangay_name: step1Data.address.barangay_name,
        street: composeStreetLine(step1Data.address.street, step1Data.address.subdivision) || null,
        postal_code: step1Data.address.postal_code || null,
        terms_accepted: true,
        email_verified: false,
        account_verified: false,
      });

      // Swallowing this would report success for a registration whose profile
      // was never saved.
      if (profileErr) {
        throw new Error(`Your profile could not be saved: ${profileErr.message}`);
      }

      // Column names mirror supabase/schema.sql `coach_profiles`: `payment` is
      // `payment_type`, `portfolio_url` is `portfolio_path`, `bio` is not a
      // column here, and there is no `verification_status` column.
      const { error: coachErr } = await supabase.from('coach_profiles').upsert({
        id: userId,
        talents: talentsString,
        genres: genresJSON,
        service_fee: parseFloat(step3Data.service_fee),
        duration: step3Data.duration,
        payment_type: step3Data.payment,
        payment_handle: step3Data.payment_handle.trim() || null,
        portfolio_path: portfolioPath,
        valid_id_path: validIdPath,
        id_selfie_path: idSelfiePath,
      });

      if (coachErr) {
        throw new Error(`Your coaching details could not be saved: ${coachErr.message}`);
      }

      // GCASH-QR (temporarily disabled): the optional GCash QR attach step that ran
      // here is removed. It only ran when a QR had been attached and never threw,
      // so a coach who left it blank is unaffected. To restore, re-add the
      // `attachGCashQrAfterSignup` call guarded by `wantsGCashQr` and pass its
      // result back as `gcashWarning`.

      setSubmitStage('Finalizing your application…');
      setSuccessData({
        firstname: step1Data.personal.firstname.trim(),
        username: step1Data.contact.username.trim().toLowerCase(),
        email: step1Data.contact.email.trim(),
        talents: talentsString,
        genres: readableGenresSummary,
        location,
        locationDisplay,
        verificationRequired: false,
      });
      setRegisteredSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      const alreadyExplainsAccount = /account was created|account exists/i.test(message);
      setError(
        accountCreated && !alreadyExplainsAccount
          ? `${message} Your account was created — sign in and finish the remaining setup from your profile.`
          : message
      );
    } finally {
      setLoading(false);
      setSubmitStage(null);
    }
  };

  /* ─── Success Screen ─── */
  if (registeredSuccess && successData) {
    return (
      <RegistrationSuccess
        firstname={successData.firstname}
        role="coach"
        details={[
          { label: 'Username', value: successData.username },
          { label: 'Email', value: successData.email },
          { label: 'Specialties', value: successData.talents },
          { label: 'Disciplines & Genres', value: successData.genres },
          { label: 'Location', value: successData.location },
          {
            label: 'Verification Status',
            value: successData.verificationRequired ? 'Email verification pending' : 'Under Review',
            highlight: true,
          },
          ...(successData.verificationRequired
            ? [{ label: 'Documents', value: 'Upload after sign-in', highlight: true }]
            : []),
        ]}
        verificationRequired={successData.verificationRequired}
        email={successData.email}
        verificationNote={
          successData.verificationRequired
            ? 'Then sign in and upload your government ID and ID selfie from your coach profile to submit the application for review.'
            : undefined
        }
        // GCASH-QR (temporarily disabled): the conditional "GCash QR — not saved"
        // detail row and the matching `warning` prop that rendered beside it were
        // removed here. Restore both alongside `gcashWarning` above.
        message={
          successData.verificationRequired
            ? 'Your account is not active yet. Confirm your email first, then sign in and upload your verification documents.'
            : `Your application is now under review. You can sign in to configure your schedule, manage bookings, and communicate with clients in ${successData.locationDisplay}.`
        }
      />
    );
  }

  return (
      <AuthLayout
        wide
        registration
        eyebrow={
          <span className="au-eyebrow">
            <Award className="h-3 w-3" aria-hidden="true" />
            Coach &amp; Choreographer Registration
          </span>
        }
        title="Join as a Coach"
        subtext="Verified performing arts mentors in San Jose del Monte and other locations in the Philippines."
        // Image panel props for coach registration
        imagePanelTitle="Mentor the next generation."
        imagePanelDescription="Join verified coaches across the Philippines. Set your rates, teach your genres, and build your coaching practice with Groove System."
        imagePanelImage="/image/bg/hero-theater.jpg"
        footer={
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-accent-text hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        }
      >
        <RegistrationProgress
          className="mb-5"
          label="Coach application"
          status={`Step ${step} of 3`}
          percent={(step / 3) * 100}
          activeId={step}
          ariaLabel="Coach registration steps"
          onSelect={(id) => {
            if (loading) return;
            setStep(id as 1 | 2 | 3);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          items={[
            { id: 1, label: 'About you', detail: 'Personal & address' },
            {
              id: 2,
              label: 'Skills',
              detail: 'Discipline & genres',
              disabled: loading || !step1Data,
            },
            {
              id: 3,
              label: 'Verification',
              detail: 'Rates & documents',
              disabled:
                loading ||
                !step1Data ||
                !validateSkillsSelection(
                  selectedSkill,
                  activePredefinedGenres,
                  hasOther,
                  activeCustomGenresList
                ).valid,
            },
          ]}
        />

        <div className="space-y-5">
          {error && <FormError message={error} className="mb-5" />}

        {/* ─── STEP 1: Personal, Address & Bio ─── */}
        {step === 1 && (
          <div ref={step1FormRef} className="space-y-4">
            <RegistrationStepHeader
              step={1}
              total={3}
              icon={User}
              title="Tell us about you"
              description="Your legal details, service location and account credentials."
            />

            {/* Fast-track with Google. Kept visible but labelled honestly while
                the provider is disabled. */}
            <div className="reg-oauth-card">
              <div className="mb-2.5 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="reg-oauth-icon" aria-hidden="true">⚡</span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Fast-track with Google</h3>
                    <p className="text-[11px] text-muted-foreground">Optional shortcut</p>
                  </div>
                </div>
                <span className="reg-soft-badge">Coming soon</span>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                Google sign-up is not available yet. Complete the three-step application below to
                submit your coaching profile and verification documents.
              </p>
              <GoogleRegisterButton role="coach" label="Continue with Google as Coach" />
            </div>

            <div className="reg-divider">
              <span>or complete the 3-step coach application</span>
            </div>

            <RegistrationFormFields
              role="coach"
              stepNumber={1}
              loading={false}
              externalError={error}
              showSubmitButton={false}
              onValidatedData={handleStep1Validated}
              bioField={
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className={labelClasses} htmlFor="coach-bio">
                      Bio / About Your Coaching <span className="text-accent-text">*</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground">Min. 10 chars</span>
                  </div>
                  <textarea
                    id="coach-bio"
                    value={bio}
                    onChange={(e) => {
                      setBio(e.target.value);
                      if (bioError) setBioError(null);
                    }}
                    placeholder="Introduce your coaching achievements, experience, specialties, and teaching style..."
                    required
                    rows={3}
                    aria-invalid={bioError ? 'true' : undefined}
                    aria-describedby={bioError ? 'coach-bio-error' : undefined}
                    className={cn('g-input min-h-[96px] resize-y', bioError && 'border-danger')}
                  />
                  {bioError ? (
                    <p id="coach-bio-error" className="g-field-error" role="alert">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{bioError}</span>
                    </p>
                  ) : (
                    <p className="g-field-hint">
                      Tell clients what you teach, how you teach, and who you work with.
                    </p>
                  )}
                </div>
              }
              documentSection={<></>}
            />

            <Button
              type="button"
              size="lg"
              className="h-11 w-full"
              trailingIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => {
                // RegistrationFormFields owns this step's <form> and calls
                // onValidatedData on a valid submit. Scope the lookup to this
                // step's container because the page renders multiple forms.
                const form = step1FormRef.current?.querySelector('form');
                if (form) {
                  form.requestSubmit();
                } else {
                  setError(
                    'Something went wrong loading this step. Please refresh and try again.'
                  );
                }
              }}
            >
              Next: select skills &amp; genres
            </Button>
          </div>
        )}

        {/* ─── STEP 2: Skills & Genre Selection ─── */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <RegistrationStepHeader
              step={2}
              total={3}
              icon={Layers}
              title="Select your skill & genres"
              description="Choose the discipline you teach, then select your specific genres."
            />

            {/* Skill Single-select Section */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <RegistrationSectionHeading
                  id="coach-skill-heading"
                  index={1}
                  step={2}
                  icon={Sparkles}
                  title="Performing arts skill"
                  description="Choose the one discipline you teach. You can refine genres in the next section."
                  className="flex-1"
                />
                <span className="g-pill-accent text-[11px] font-semibold">
                  Selected: <strong className="text-foreground">{selectedSkill}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {availableSkills.map((skill) => {
                  const isSelected = selectedSkill === skill;
                  const Icon = SKILL_ICONS[skill] || Sparkles;
                  const count = isSelected ? allActiveGenres.length : 0;

                  return (
                    <button
                      type="button"
                      key={skill}
                      onClick={() => handleSelectSkill(skill)}
                      className={`flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-all ${
                        isSelected
                          ? 'border-accent bg-accent-soft text-accent-text shadow-[var(--shadow-sm)]'
                          : 'border-border bg-card text-muted-foreground hover:-translate-y-px hover:border-border-strong hover:text-foreground'
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                          isSelected ? 'bg-accent text-accent-foreground shadow-sm' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-bold">{skill}</span>
                        {isSelected && (
                          <span className="text-[10px] text-foreground font-medium">
                            {count} {count === 1 ? 'genre' : 'genres'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Genres Section for the single selected skill */}
            <div className="space-y-4">
              <RegistrationSectionHeading
                id="coach-genres-heading"
                index={2}
                step={2}
                icon={Music}
                title={`Specific genres for ${selectedSkill}`}
                description="Select every genre you teach. Add a custom genre if yours is not listed."
              />

              {(() => {
                const genresForSkill = DEFAULT_SKILLS_AND_GENRES[selectedSkill] || [];
                const SkillIcon = SKILL_ICONS[selectedSkill] || Sparkles;

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                          <SkillIcon className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">{selectedSkill} Genres</h3>
                      </div>
                      <span className="g-pill text-xs font-semibold text-foreground">
                        {allActiveGenres.length > 0
                          ? `${allActiveGenres.length} selected`
                          : 'Select at least 1'}
                      </span>
                    </div>

                    {/* Chips for predefined genres */}
                    <div className="flex flex-wrap gap-2">
                      {genresForSkill.map((genre) => {
                        const isSelected = activePredefinedGenres.includes(genre);
                        return (
                          <button
                            type="button"
                            key={genre}
                            onClick={() => toggleGenre(genre)}
                            className={`inline-flex select-none cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              isSelected
                                ? 'border-accent-border bg-accent-soft font-semibold text-accent-text'
                                : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-foreground" />}
                            <span>{genre}</span>
                          </button>
                        );
                      })}

                      {/* "Other" chip */}
                      <button
                        type="button"
                        onClick={toggleOther}
                        className={`inline-flex select-none cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          hasOther
                            ? 'border-accent-border bg-accent-soft font-semibold text-accent-text'
                            : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
                        }`}
                      >
                        {hasOther && <Check className="h-3 w-3 text-foreground" />}
                        <span>Other</span>
                      </button>
                    </div>

                    {/* Other / Custom Genre Input Fields */}
                    {hasOther && (
                      <div className="pt-3 border-t border-border space-y-3 animate-in fade-in duration-150">
                        <label className="block text-xs font-semibold text-foreground">
                          Specify your genre <span className="text-muted-foreground font-normal">(Custom)</span>
                        </label>

                        <div className="space-y-2">
                          {activeCustomGenresList.map((customVal, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={customVal}
                                onChange={(e) => handleCustomGenreChange(idx, e.target.value)}
                                placeholder="e.g. Krump, Waacking, Afro-Fusion..."
                                className="g-input h-10 flex-1 text-sm"
                              />
                              {activeCustomGenresList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomGenre(idx)}
                                  className="g-topbar-action cursor-pointer"
                                  title="Remove custom genre"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleAddAnotherCustomGenre}
                          className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-accent-text transition-colors hover:underline hover:underline-offset-4"
                        >
                          <span>+ Add another</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Structured Selection Summary Box */}
            <div className="space-y-2 rounded-lg border border-divider bg-muted/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Selection summary
                </span>
                <span className="text-[11px] text-subtle-foreground font-medium">Auto-structured</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allActiveGenres.length > 0 ? (
                  <div className="g-pill text-xs text-foreground">
                    <span className="font-bold text-foreground">{selectedSkill}:</span>
                    <span className="text-muted-foreground">{allActiveGenres.join(', ')}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    No genres selected yet for {selectedSkill}.
                  </span>
                )}
              </div>
            </div>

            {/* Step 2 Action Buttons */}
            <div className="flex flex-col-reverse items-center gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 w-full sm:w-1/3"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                type="button"
                size="lg"
                className="h-11 w-full sm:flex-1"
                trailingIcon={<ArrowRight className="h-4 w-4" />}
                onClick={handleStep2Proceed}
              >
                Next: service rates &amp; verification
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Rates, Payment & Verification ─── */}
        {step === 3 && (
          <form
            onSubmit={handleFinalSubmit}
            noValidate
            className="flex animate-in flex-col gap-5 fade-in duration-200"
          >
            <RegistrationStepHeader
              step={3}
              total={3}
              icon={ShieldCheck}
              title="Rates & identity verification"
              description="Set your standard coaching session rate and upload identity verification documents."
            />

            {/* Service fee & Duration */}
            <div className="space-y-4">
              <RegistrationSectionHeading
                id="coach-rates-heading"
                index={1}
                step={3}
                icon={DollarSign}
                title="Service rates & payment"
                description="Set the rate and payment method clients will see on your profile."
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClasses} htmlFor="coach-service-fee">
                    Standard rate (PHP) <span className="text-accent-text">*</span>
                  </label>
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground"
                    >
                      ₱
                    </span>
                    <input
                      id="coach-service-fee"
                      type="number"
                      min="100"
                      step="50"
                      value={step3Data.service_fee}
                      onChange={(e) => {
                        setStep3Data({ ...step3Data, service_fee: e.target.value });
                        if (step3Errors.service_fee) {
                          setStep3Errors((prev) => ({ ...prev, service_fee: undefined }));
                        }
                      }}
                      required
                      placeholder="500"
                      aria-invalid={step3Errors.service_fee ? 'true' : undefined}
                      aria-describedby={step3Errors.service_fee ? 'coach-service-fee-error' : undefined}
                      className={cn(inputClasses, 'g-input-has-icon', step3Errors.service_fee && 'border-danger')}
                    />
                  </div>
                  {step3Errors.service_fee && (
                    <p id="coach-service-fee-error" className="g-field-error" role="alert">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{step3Errors.service_fee}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClasses} htmlFor="coach-duration">
                    Session duration
                  </label>
                  <select
                    id="coach-duration"
                    value={step3Data.duration}
                    onChange={(e) => setStep3Data({ ...step3Data, duration: e.target.value })}
                    className={selectClasses}
                  >
                    <option value="1 hour">1 hour</option>
                    <option value="1.5 hours">1.5 hours</option>
                    <option value="2 hours">2 hours</option>
                    <option value="3 hours">3 hours</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClasses} htmlFor="coach-payment-mode">
                    Accepted payment mode
                  </label>
                  <select
                    id="coach-payment-mode"
                    value={step3Data.payment}
                    onChange={(e) => {
                      setStep3Data({ ...step3Data, payment: e.target.value as 'cash' | 'online' });
                      if (step3Errors.payment_handle) {
                        setStep3Errors((prev) => ({ ...prev, payment_handle: undefined }));
                      }
                    }}
                    className={selectClasses}
                  >
                    <option value="cash">Cash on Session</option>
                    <option value="online">Online Payment (GCash / Maya)</option>
                  </select>
                </div>

                {step3Data.payment === 'online' && (
                  <div>
                    <label className={labelClasses} htmlFor="coach-payment-handle">
                      GCash / Maya mobile number <span className="text-accent-text">*</span>
                    </label>
                    <input
                      id="coach-payment-handle"
                      type="text"
                      value={step3Data.payment_handle}
                      onChange={(e) => {
                        setStep3Data({ ...step3Data, payment_handle: e.target.value });
                        if (step3Errors.payment_handle) {
                          setStep3Errors((prev) => ({ ...prev, payment_handle: undefined }));
                        }
                      }}
                      placeholder="e.g. 09171234567"
                      required
                      aria-invalid={step3Errors.payment_handle ? 'true' : undefined}
                      aria-describedby={
                        step3Errors.payment_handle ? 'coach-payment-handle-error' : undefined
                      }
                      className={cn(inputClasses, step3Errors.payment_handle && 'border-danger')}
                    />
                    {step3Errors.payment_handle && (
                      <p id="coach-payment-handle-error" className="g-field-error" role="alert">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{step3Errors.payment_handle}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Document Uploads */}
            <div className="space-y-4 border-t border-divider pt-4">
              <RegistrationSectionHeading
                id="coach-documents-heading"
                index={2}
                step={3}
                icon={ShieldCheck}
                title="Verification documents"
                description="Required for coach review. Files are uploaded only after the account is created."
              />

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-md border border-border bg-card px-2 py-0.5 font-medium">PDF</span>
                <span className="rounded-md border border-border bg-card px-2 py-0.5 font-medium">JPG</span>
                <span className="rounded-md border border-border bg-card px-2 py-0.5 font-medium">PNG</span>
                <span>· Max 5 MB each</span>
                <span className="ml-auto font-semibold text-foreground">
                  {[validIdFile, idSelfieFile].filter(Boolean).length} of 2 required attached
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FileUploadCard
                  id="coach-valid-id"
                  label="Government ID"
                  accept=".pdf,.jpg,.jpeg,.png"
                  file={validIdFile}
                  onFileChange={(nextFile) => {
                    setValidIdFile(nextFile);
                    if (nextFile && step3Errors.validIdFile) {
                      setStep3Errors((prev) => ({ ...prev, validIdFile: undefined }));
                    }
                  }}
                  onRemove={() => setValidIdFile(null)}
                  icon={ShieldCheck}
                  hint="Passport, UMID, Postal"
                  required
                  disabled={loading}
                  error={step3Errors.validIdFile}
                />
                <FileUploadCard
                  id="coach-id-selfie"
                  label="Selfie Holding ID"
                  accept=".jpg,.jpeg,.png"
                  file={idSelfieFile}
                  onFileChange={(nextFile) => {
                    setIdSelfieFile(nextFile);
                    if (nextFile && step3Errors.idSelfieFile) {
                      setStep3Errors((prev) => ({ ...prev, idSelfieFile: undefined }));
                    }
                  }}
                  onRemove={() => setIdSelfieFile(null)}
                  icon={Camera}
                  hint="JPG or PNG"
                  required
                  disabled={loading}
                  error={step3Errors.idSelfieFile}
                />
                <div className="sm:col-span-2">
                  <FileUploadCard
                    id="coach-portfolio"
                    label="Portfolio / Resume"
                    accept=".pdf,.jpg,.jpeg,.png"
                    file={portfolioFile}
                    onFileChange={setPortfolioFile}
                    onRemove={() => setPortfolioFile(null)}
                    icon={FileCheck}
                    hint="PDF, JPG or PNG"
                    required={false}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* GCASH-QR (temporarily disabled): the optional GCash QR upload block is
                hidden here. The "Online Payment (GCash / Maya)" method and the
                GCash / Maya Mobile Number field above it are UNCHANGED — only
                the QR image and notes fields were hidden. To restore, re-render
                <GCashRegistrationSection audience="coach" … /> against the
                state hooks near the top of this component. */}

            {/* Terms */}
            <div className="space-y-4 border-t border-divider pt-4">
              <RegistrationSectionHeading
                id="coach-terms-heading"
                index={3}
                step={3}
                icon={FileCheck}
                title="Agreement & submit"
                description="Confirm the coaching terms before submitting for review."
              />
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="coachTerms"
                  checked={step3Data.terms}
                  onChange={(e) => {
                    setStep3Data({ ...step3Data, terms: e.target.checked });
                    if (e.target.checked && step3Errors.terms) {
                      setStep3Errors((prev) => ({ ...prev, terms: undefined }));
                    }
                  }}
                  required
                  aria-invalid={step3Errors.terms ? 'true' : undefined}
                  aria-describedby={step3Errors.terms ? 'coachTerms-error' : undefined}
                  className="g-checkbox"
                />
                <label
                  htmlFor="coachTerms"
                  className="cursor-pointer select-none text-xs leading-relaxed text-muted-foreground"
                >
                  I agree to the{' '}
                  <Link
                    href="/terms"
                    target="_blank"
                    className="font-semibold text-accent-text underline-offset-4 hover:underline"
                  >
                    Coach Terms of Service
                  </Link>{' '}
                  and code of professional conduct on Groove System.
                </label>
              </div>
              {step3Errors.terms && (
                <p id="coachTerms-error" className="g-field-error" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{step3Errors.terms}</span>
                </p>
              )}
            </div>

            {/* Form Actions */}
            <div className="space-y-3">
              <div className="flex flex-col-reverse items-center gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-11 w-full sm:w-1/3"
                  disabled={loading}
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full sm:flex-1"
                  loading={loading}
                  trailingIcon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
                >
                  {loading ? submitStage || 'Submitting your application…' : 'Submit coach registration'}
                </Button>
              </div>
              {loading && (
                <p className="text-center text-xs text-muted-foreground" role="status" aria-live="polite">
                  Keep this tab open while we create your account and upload your documents.
                </p>
              )}
            </div>
          </form>
                  )}
                </div>
              </AuthLayout>
            );
          }
