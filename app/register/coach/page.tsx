'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  RegistrationFormFields,
  RegistrationSuccess,
  PersonalData,
  ContactAccountData,
  inputClasses,
  selectClasses,
  labelClasses,
  sectionHeadingClasses,
} from '@/components/auth/RegistrationFormFields';
import { AddressData } from '@/components/auth/AddressSelector';
import {
  DEFAULT_SKILLS_AND_GENRES,
  getAvailableSkills,
  validateSkillsSelection,
} from '@/lib/config/skillsConfig';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Sparkles,
  DollarSign,
  ShieldCheck,
  FileCheck,
  Camera,
  Loader2,
  AlertCircle,
  X,
  MapPin,
  Music,
  Mic,
  Clapperboard,
  Drama,
  Check,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { AuthLayout } from '@/components/shared/AuthLayout';
import { FormError } from '@/components/ui/FormError';
import { createClient } from '@/lib/supabase/client';

/* ─── Skill Icon Mapping ─── */
const SKILL_ICONS: Record<string, React.ElementType> = {
  Dance: Music,
  Singing: Mic,
  Acting: Clapperboard,
  Theater: Drama,
};

/* ─── File Upload Card ─── */
function FileUploadCard({
  label,
  accept,
  file,
  onFileChange,
  onRemove,
  icon: Icon,
  hint,
}: {
  label: string;
  accept: string;
  file: File | null;
  onFileChange: (f: File | null) => void;
  onRemove: () => void;
  icon: React.ElementType;
  hint: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (f && f.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      return;
    }
    onFileChange(f);
  };

  return (
    <div
      className={`group relative cursor-pointer rounded-2xl border border-dashed p-5 text-center transition-colors ${
        file
          ? 'border-accent bg-accent-soft'
          : 'border-border bg-muted/30 hover:border-accent-border hover:bg-muted/60'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />
      <div className="flex flex-col items-center gap-2.5">
        {file ? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-success/30 bg-success-soft text-success">
              <FileCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="max-w-full text-center">
              <span className="block truncate text-xs font-bold text-foreground">{file.name}</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB · Attached
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="relative z-20 mt-1 inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:border-danger/30 hover:bg-danger-soft hover:text-danger"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Remove
            </button>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent-border bg-accent-soft text-accent-text transition-transform group-hover:scale-105">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-xs font-bold text-foreground">{label} *</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">{hint} (max 5MB)</span>
            </div>
            <span className="g-pill-accent mt-1 text-[10px] font-semibold">Click or drag file</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function CoachRegistrationPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    firstname: string;
    username: string;
    email: string;
    talents: string;
    genres: string;
  } | null>(null);

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
      setError('Please provide a brief bio (minimum 10 characters) about your coaching experience.');
      return;
    }
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

    // Step 3 rates and files validation
    if (!step3Data.service_fee || parseFloat(step3Data.service_fee) <= 0) {
      setError('Please set a valid standard rate.');
      return;
    }
    if (step3Data.payment === 'online' && !step3Data.payment_handle.trim()) {
      setError('Please provide your GCash or Maya mobile number for online payments.');
      return;
    }
    if (!validIdFile) {
      setError('Please upload a valid government ID for coach verification.');
      return;
    }
    if (!idSelfieFile) {
      setError('Please upload a selfie holding your ID for identity verification.');
      return;
    }
    if (!step3Data.terms) {
      setError('You must agree to the Coach Terms of Service.');
      return;
    }

    setLoading(true);

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
          data: {
            role: 'coach',
            custom_id: random4Digit,
            firstname: step1Data.personal.firstname.trim(),
            middlename: step1Data.personal.middlename.trim() || null,
            lastname: step1Data.personal.lastname.trim(),
            username: step1Data.contact.username.trim().toLowerCase(),
            contact: formattedContact,
            talent: talentsString,
            skill: selectedSkill,
            skills: [selectedSkill],
            genres: genresJSON,
          },
        },
      });

      if (authErr) {
        if (authErr.status === 429) {
          throw new Error(
            'Too many registration attempts. Please wait a few minutes and try again.'
          );
        }
        if (authErr.status === 422 || /already/i.test(authErr.message)) {
          throw new Error(
            'That email address is already registered. Please sign in instead.'
          );
        }
        if (/database error saving new user/i.test(authErr.message)) {
          throw new Error(
            `Registration could not be completed because the server rejected the new user record. Server said: ${authErr.message}`
          );
        }
        throw new Error(
          authErr.message || 'Registration failed. Username or email may already be registered.'
        );
      }

      if (!authData.user) {
        throw new Error('Registration failed. Username or email may already be registered.');
      }

      // The account now exists, so the Storage writes below are no longer anon.
      // signUp() returns a session only because email confirmation is disabled
      // in this project; if that ever changes, sign in explicitly to obtain the
      // session the upload policy requires rather than letting the upload 403.
      const userId = authData.user.id;
      if (authData.session === null) {
        const { data: signInData, error: signInErr } =
          await supabase.auth.signInWithPassword({
            email: step1Data.contact.email.trim(),
            password: step1Data.contact.password,
          });

        if (signInErr || !signInData.session) {
          throw new Error(
            'Your account was created, but we could not sign you in to upload your verification documents. ' +
              'Please sign in and upload them from your profile.'
          );
        }
      }

      /* -- 2. Upload the documents ------------------------------------------ */

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

      const validIdPath = await uploadCoachDoc(validIdFile, 'government ID');
      const idSelfiePath = await uploadCoachDoc(idSelfieFile, 'ID selfie');
      // Optional: no portfolio file simply means no portfolio. A file that was
      // chosen and fails to upload throws above like any other.
      const portfolioPath = portfolioFile
        ? await uploadCoachDoc(portfolioFile, 'portfolio / resume')
        : null;

      /* -- 3. Persist the profile rows ------------------------------------- */

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

      // `bio` lives on `profiles`. There is no subdivision column: the
      // AddressSelector already folds Subdivision/Village into the street line.
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
        street: step1Data.address.street || null,
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

      setSuccessData({
        firstname: step1Data.personal.firstname.trim(),
        username: step1Data.contact.username.trim().toLowerCase(),
        email: step1Data.contact.email.trim(),
        talents: talentsString,
        genres: readableGenresSummary,
      });
      setRegisteredSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
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
          { label: 'Location', value: 'San Jose del Monte, Bulacan' },
          { label: 'Verification Status', value: 'Under Review', highlight: true },
        ]}
        message="You can now sign in to configure your schedule, manage bookings, and communicate with clients."
      />
    );
  }

  return (
      <AuthLayout
        wide
        title="Join as a Coach"
        subtext="Verified performing arts mentors in San Jose del Monte, Bulacan."
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
        <div className="mb-7 flex justify-center">
          <span className="g-eyebrow">
            <Award className="h-3 w-3" aria-hidden="true" />
            Coach &amp; Choreographer Registration
          </span>
        </div>

        {/* 3-Step Indicator */}
        <div className="mb-8">
          <ol className="flex items-stretch gap-2">
            {/* Step 1 */}
            <li className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                aria-current={step === 1 ? 'step' : undefined}
                className={`flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-full border px-2 py-2 text-[11px] font-semibold transition-colors sm:px-4 sm:text-xs ${
                  step === 1
                    ? 'border-accent bg-accent-soft text-accent-text'
                    : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    step === 1
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  1
                </span>
                <span className="truncate">Personal &amp; Address</span>
              </button>
            </li>

            {/* Step 2 */}
            <li className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  if (step1Data) setStep(2);
                }}
                disabled={!step1Data}
                aria-current={step === 2 ? 'step' : undefined}
                className={`flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-full border px-2 py-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-xs ${
                  step === 2
                    ? 'border-accent bg-accent-soft text-accent-text'
                    : step > 2
                      ? 'border-accent-border bg-accent-soft text-accent-text hover:bg-accent-soft/70'
                      : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    step === 2
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  2
                </span>
                <span className="truncate">Skills &amp; Genres</span>
              </button>
            </li>

            {/* Step 3 */}
            <li className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  if (
                    step1Data &&
                    validateSkillsSelection(
                      selectedSkill,
                      activePredefinedGenres,
                      hasOther,
                      activeCustomGenresList
                    ).valid
                  ) {
                    setStep(3);
                  }
                }}
                disabled={
                  !step1Data ||
                  !validateSkillsSelection(
                    selectedSkill,
                    activePredefinedGenres,
                    hasOther,
                    activeCustomGenresList
                  ).valid
                }
                aria-current={step === 3 ? 'step' : undefined}
                className={`flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-full border px-2 py-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-xs ${
                  step === 3
                    ? 'border-accent bg-accent-soft text-accent-text'
                    : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    step === 3
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  3
                </span>
                <span className="truncate">Rates &amp; Verification</span>
              </button>
            </li>
          </ol>
        </div>

              {/* Form container */}
              <div className="space-y-6">
                {error && (
                  <FormError
                    message={error}
                    className="mb-6"
                  />
                )}

        {/* ─── STEP 1: Personal, Address & Bio ─── */}
        {step === 1 && (
          <div ref={step1FormRef}>
            <RegistrationFormFields
              role="coach"
              loading={false}
              externalError={error}
              showSubmitButton={false}
              onValidatedData={handleStep1Validated}
              bioField={
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelClasses}>Bio / About Your Coaching *</label>
                    <span className="text-[11px] text-muted-foreground">Min. 10 chars</span>
                  </div>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Introduce your coaching achievements, experience, specialties, and teaching style..."
                    required
                    rows={3}
                    className="g-input min-h-[104px] resize-y"
                  />
                </div>
              }
              documentSection={<></>}
            />

            <button
              type="button"
              onClick={() => {
                // RegistrationFormFields owns this step's <form> and calls
                // onValidatedData on a valid submit. A null guard is not
                // enough here: the page renders two <form> elements across its
                // steps and the step-3 form comes first in the document only
                // when step 3 is active, so scope the lookup to this step's
                // container instead of taking the first form on the page.
                const form = step1FormRef.current?.querySelector('form');
                if (form) {
                  form.requestSubmit();
                } else {
                  setError(
                    'Something went wrong loading this step. Please refresh and try again.'
                  );
                }
              }}
              className="mt-7 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-bold tracking-wide text-accent-foreground shadow-[var(--shadow-sm)] transition-all hover:bg-accent-hover hover:shadow-[var(--shadow-accent)] active:scale-[0.99] disabled:opacity-50"
            >
              <span>Next: Select Skills &amp; Genres</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ─── STEP 2: Skills & Genre Selection ─── */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Step Heading */}
            <div className="border-b border-divider pb-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-accent-text">
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Step 2 of 3</span>
              </div>
              <h2 className="mt-1.5 text-xl font-bold tracking-[-0.02em] text-foreground sm:text-2xl">
                Select Your Skill &amp; Genres
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Choose the discipline you teach, then select your specific genres.
              </p>
            </div>

            {/* Skill Single-select Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                  <span>1. Performing Arts Skill (Select One) *</span>
                </label>
                <span className="g-pill-accent text-[11px] font-semibold">
                  Selected: <strong className="text-foreground">{selectedSkill}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {availableSkills.map((skill) => {
                  const isSelected = selectedSkill === skill;
                  const Icon = SKILL_ICONS[skill] || Sparkles;
                  const count = isSelected ? allActiveGenres.length : 0;

                  return (
                    <button
                      type="button"
                      key={skill}
                      onClick={() => handleSelectSkill(skill)}
                      className={`flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border p-4 text-center transition-all ${
                        isSelected
                          ? 'border-accent bg-accent-soft text-accent-text shadow-[var(--shadow-sm)]'
                          : 'border-border bg-card text-muted-foreground hover:-translate-y-px hover:border-border-strong hover:text-foreground'
                      }`}
                    >
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
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
            <div className="space-y-5 pt-2">
              <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
                <Music className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <span>2. Specific Genres for {selectedSkill} *</span>
              </label>

              {(() => {
                const genresForSkill = DEFAULT_SKILLS_AND_GENRES[selectedSkill] || [];
                const SkillIcon = SKILL_ICONS[selectedSkill] || Sparkles;

                return (
                  <div className="g-card space-y-4 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                          <SkillIcon className="h-4 w-4" />
                        </div>
                        <h4 className="text-sm font-bold text-foreground">{selectedSkill} Genres</h4>
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
            <div className="space-y-2 rounded-xl border border-divider bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Summary of Selected Coaching Profile
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">Auto-structured</span>
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
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex h-12 w-1/3 cursor-pointer items-center justify-center rounded-full border border-border bg-card px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Back to Step 1
              </button>
              <button
                type="button"
                onClick={handleStep2Proceed}
                className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-bold tracking-wide text-accent-foreground shadow-[var(--shadow-sm)] transition hover:bg-accent-hover disabled:opacity-50"
              >
                <span>Next: Service Rates &amp; Verification</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Rates, Payment & Verification ─── */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Step Heading */}
            <div className="border-b border-divider pb-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-accent-text">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Step 3 of 3</span>
              </div>
              <h2 className="mt-1.5 text-xl font-bold tracking-[-0.02em] text-foreground sm:text-2xl">
                Rates &amp; Identity Verification
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Set your standard coaching session rate and upload identity verification documents.
              </p>
            </div>

            {/* Service fee & Duration */}
            <div className="space-y-4">
              <h3 className={sectionHeadingClasses}>
                <DollarSign className="h-4 w-4 text-accent-text" aria-hidden="true" />
                <span>Service Rates &amp; Payment Options</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Standard Rate (PHP) *</label>
                  <div className="relative">
                    <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₱</span>
                    <input
                      type="number"
                      min="100"
                      step="50"
                      value={step3Data.service_fee}
                      onChange={(e) => setStep3Data({ ...step3Data, service_fee: e.target.value })}
                      required
                      placeholder="500"
                      className={`${inputClasses} pl-9`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>Session Duration</label>
                  <select
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Accepted Payment Mode</label>
                  <select
                    value={step3Data.payment}
                    onChange={(e) => setStep3Data({ ...step3Data, payment: e.target.value as 'cash' | 'online' })}
                    className={selectClasses}
                  >
                    <option value="cash">Cash on Session</option>
                    <option value="online">Online Payment (GCash / Maya)</option>
                  </select>
                </div>

                {step3Data.payment === 'online' && (
                  <div>
                    <label className={labelClasses}>GCash / Maya Mobile Number *</label>
                    <input
                      type="text"
                      value={step3Data.payment_handle}
                      onChange={(e) => setStep3Data({ ...step3Data, payment_handle: e.target.value })}
                      placeholder="e.g. 09171234567"
                      required
                      className={inputClasses}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Document Uploads */}
            <div className="space-y-4 border-t border-divider pt-6">
              <h3 className={sectionHeadingClasses}>
                <ShieldCheck className="h-4 w-4 text-accent-text" aria-hidden="true" />
                <span>Verification Documents</span>
              </h3>
              <p className="text-xs text-muted-foreground -mt-1">
                Upload your credentials for coach verification (PDF, JPG, or PNG — max 5MB each)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FileUploadCard
                  label="Portfolio / Resume"
                  accept=".pdf,.jpg,.jpeg,.png"
                  file={portfolioFile}
                  onFileChange={setPortfolioFile}
                  onRemove={() => setPortfolioFile(null)}
                  icon={FileCheck}
                  hint="PDF/JPG/PNG"
                />
                <FileUploadCard
                  label="Government ID"
                  accept=".pdf,.jpg,.jpeg,.png"
                  file={validIdFile}
                  onFileChange={setValidIdFile}
                  onRemove={() => setValidIdFile(null)}
                  icon={ShieldCheck}
                  hint="Passport, UMID, Postal"
                />
                <FileUploadCard
                  label="Selfie Holding ID"
                  accept=".jpg,.jpeg,.png"
                  file={idSelfieFile}
                  onFileChange={setIdSelfieFile}
                  onRemove={() => setIdSelfieFile(null)}
                  icon={Camera}
                  hint="JPG/PNG"
                />
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="coachTerms"
                checked={step3Data.terms}
                onChange={(e) => setStep3Data({ ...step3Data, terms: e.target.checked })}
                required
                className="g-checkbox"
              />
              <label htmlFor="coachTerms" className="text-xs text-muted-foreground cursor-pointer select-none leading-relaxed">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="font-semibold text-accent-text hover:underline underline-offset-4">
                  Coach Terms of Service
                </Link>{' '}
                and code of professional conduct on Groove System.
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex h-12 w-1/3 cursor-pointer items-center justify-center rounded-full border border-border bg-card px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Back to Step 2
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-bold tracking-wide text-accent-foreground shadow-[var(--shadow-sm)] transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="g-spin h-4 w-4" aria-hidden="true" />
                    <span>Submitting Coach Application...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Coach Registration</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
                  )}
                </div>
              </AuthLayout>
            );
          }
