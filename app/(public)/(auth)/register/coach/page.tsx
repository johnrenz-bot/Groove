'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RegistrationFormFields,
  RegistrationSuccess,
  PersonalData,
  ContactAccountData,
  inputClasses,
  selectClasses,
  labelClasses,
} from '@/components/auth/RegistrationFormFields';
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
  Sparkles,
  ShieldCheck,
  FileCheck,
  Camera,
  Music,
  Mic,
  Clapperboard,
  Drama,
  Check,
  User,
  Layers,
  ClipboardCheck,
  Wallet,
  Smartphone,
  AlertCircle,
  X,
} from 'lucide-react';
import { AuthLayout } from '@/components/shared/AuthLayout';
import { GoogleRegisterButton } from '@/components/shared/GoogleRegisterButton';
import { FormError } from '@/components/ui/FormError';
import { AuthButton, Divider } from '@/components/auth/ui/AuthUI';
import {
  ProgressSegments,
  StepHeader,
  StepTransition,
  WizardFooter,
  WizardRail,
} from '@/components/auth/ui/AuthWizard';
import { FileUpload } from '@/components/auth/ui/FileUpload';
import { ChipSelect, OptionRow } from '@/components/auth/ui/RegistrationOptions';
import {
  ConfirmLeaveModal,
  SuccessModal,
  TermsModal,
} from '@/components/auth/ui/Modal';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  DOCUMENT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  MAX_UPLOAD_BYTES,
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

/* Short blurbs for the discipline rows, keeping the step scannable. */
const SKILL_DESCRIPTIONS: Record<string, string> = {
  Dance: 'Hip-hop, contemporary, street & more',
  Singing: 'Vocal coaching & song training',
  Acting: 'On-camera work, film & stage',
  Theater: 'Stage performance & musical theatre',
};

/* ─── Main Component ─── */
export default function CoachRegistrationPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [direction, setDirection] = useState(1);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
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

  /** Direction-aware step navigation. */
  const goTo = (next: 1 | 2 | 3 | 4, dir: number) => {
    setDirection(dir);
    setStep(next);
    // Step changes used to reset the window scroll; the registration content
    // wrapper is the scroller now, so reset that instead.
    const scroller = document.querySelector<HTMLElement>('[data-registration-scroll]');
    if (scroller) {
      scroller.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /** "Back to login" — confirms before discarding a partially-filled form. */
  const handleBackToLogin = () => {
    if (loading) return;
    if (step > 1) {
      setLeaveOpen(true);
      return;
    }
    router.push('/login');
  };

  /** Shared rate/payment validation, used by the Profile step and re-checked
   *  on submit. */
  const getRateErrors = (): Step3Errors => {
    const next: Step3Errors = {};
    if (!step3Data.service_fee || Number.parseFloat(step3Data.service_fee) <= 0) {
      next.service_fee = 'Set a standard rate greater than zero.';
    }
    if (step3Data.payment === 'online' && !step3Data.payment_handle.trim()) {
      next.payment_handle =
        'Enter the GCash or Maya number clients should pay.';
    }
    return next;
  };

  /** Shared document validation, used by the Credentials step and re-checked
   *  on submit. */
  const getDocumentErrors = (): Step3Errors => {
    const next: Step3Errors = {};
    if (!validIdFile) {
      next.validIdFile = 'Upload a valid government ID for coach verification.';
    }
    if (!idSelfieFile) {
      next.idSelfieFile =
        'Upload a selfie holding your ID for identity verification.';
    }
    return next;
  };

  /** Validation helpers wired into <FileUpload onSelect>. Returning the message
   * lets the upload component render its own error + shake state. */
  const selectValidIdFile = (file: File): string | null => {
    const message = validateUploadFile(file, {
      allowedExtensions: DOCUMENT_EXTENSIONS,
      maxBytes: MAX_UPLOAD_BYTES,
      noun: 'government ID',
    });
    if (message) {
      setValidIdFile(null);
      setStep3Errors((prev) => ({ ...prev, validIdFile: message }));
      return message;
    }
    setValidIdFile(file);
    setStep3Errors((prev) => ({ ...prev, validIdFile: undefined }));
    setError(null);
    return null;
  };

  const selectIdSelfieFile = (file: File): string | null => {
    const message = validateUploadFile(file, {
      allowedExtensions: IMAGE_EXTENSIONS,
      maxBytes: MAX_UPLOAD_BYTES,
      noun: 'ID selfie',
    });
    if (message) {
      setIdSelfieFile(null);
      setStep3Errors((prev) => ({ ...prev, idSelfieFile: message }));
      return message;
    }
    setIdSelfieFile(file);
    setStep3Errors((prev) => ({ ...prev, idSelfieFile: undefined }));
    setError(null);
    return null;
  };

  const selectPortfolioFile = (file: File): string | null => {
    const message = validateUploadFile(file, {
      allowedExtensions: DOCUMENT_EXTENSIONS,
      maxBytes: MAX_UPLOAD_BYTES,
      noun: 'portfolio / resume',
    });
    if (message) {
      setPortfolioFile(null);
      return message;
    }
    setPortfolioFile(file);
    setError(null);
    return null;
  };

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
    setError(null);
    setStep1Data(data);
    goTo(2, 1);
  };

  /* Handler to proceed from Step 2 (Profile) to Step 3 (Credentials) */
  const handleStep2Proceed = () => {
    if (!bio.trim() || bio.trim().length < 10) {
      const message =
        'Please provide a brief bio (minimum 10 characters) about your coaching experience.';
      setBioError(message);
      setError(null);
      window.requestAnimationFrame(() => {
        document.getElementById('coach-bio')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.getElementById('coach-bio')?.focus({ preventScroll: true });
      });
      return;
    }
    setBioError(null);

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

    const rateErrors = getRateErrors();
    if (Object.keys(rateErrors).length > 0) {
      setStep3Errors((prev) => ({ ...prev, ...rateErrors }));
      setError(
        Object.keys(rateErrors).length === 1
          ? 'Please fix the highlighted item below to continue.'
          : `Please fix the ${Object.keys(rateErrors).length} highlighted items below to continue.`
      );
      const firstKey = rateErrors.service_fee ? 'coach-service-fee' : 'coach-payment-handle';
      window.requestAnimationFrame(() => {
        const target = document.getElementById(firstKey);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target?.focus({ preventScroll: true });
      });
      return;
    }

    setStep3Errors((prev) => ({ ...prev, service_fee: undefined, payment_handle: undefined }));
    setError(null);
    goTo(3, 1);
  };

  /* Handler to proceed from Step 3 (Credentials) to Step 4 (Review) */
  const handleStep3Proceed = () => {
    const docErrors = getDocumentErrors();
    if (Object.keys(docErrors).length > 0) {
      setStep3Errors((prev) => ({ ...prev, ...docErrors }));
      setError(
        Object.keys(docErrors).length === 1
          ? 'Please fix the highlighted item below to continue.'
          : `Please fix the ${Object.keys(docErrors).length} highlighted items below to continue.`
      );
      const firstKey = docErrors.validIdFile ? 'coach-valid-id' : 'coach-id-selfie';
      window.requestAnimationFrame(() => {
        const target = document.getElementById(firstKey);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target?.focus?.({ preventScroll: true });
      });
      return;
    }
    setStep3Errors((prev) => ({ ...prev, validIdFile: undefined, idSelfieFile: undefined }));
    setError(null);
    goTo(4, 1);
  };

  /* Final Submit (Step 3) */
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step1Data || loading) return;
    setError(null);
    setStep3Errors({});

    // Validate skills & genres (also re-checked here as a safety net).
    const skillsValidation = validateSkillsSelection(
      selectedSkill,
      activePredefinedGenres,
      hasOther,
      activeCustomGenresList
    );
    if (!skillsValidation.valid) {
      setError(skillsValidation.error);
      goTo(2, -1);
      return;
    }

    // Rate + payment + document validation. These rules are also enforced on
    // the Profile and Credentials steps; this is the final safety net, so we
    // route the coach back to wherever the fix belongs.
    const nextStep3Errors: Step3Errors = { ...getRateErrors(), ...getDocumentErrors() };

    // GCASH-QR (temporarily disabled): the check that a QR upload came with a
    // matching mobile number (gcash_profiles.account_number is NOT NULL) was
    // removed. It was only reachable once a QR had been attached, which is no
    // longer possible. The separate "Online Payment requires a mobile number"
    // rule above is unchanged and still applies.
    if (!step3Data.terms) {
      nextStep3Errors.terms = 'You must agree to the Coach Terms of Service.';
    }

    if (Object.keys(nextStep3Errors).length > 0) {
      setStep3Errors(nextStep3Errors);
      const hasRate = Boolean(nextStep3Errors.service_fee || nextStep3Errors.payment_handle);
      const hasDocument = Boolean(nextStep3Errors.validIdFile || nextStep3Errors.idSelfieFile);
      if (hasRate) {
        goTo(2, -1);
      } else if (hasDocument) {
        goTo(3, -1);
      }
      const firstIdMap: Record<keyof Step3Errors, string> = {
        service_fee: 'coach-service-fee',
        payment_handle: 'coach-payment-handle',
        validIdFile: 'coach-valid-id',
        idSelfieFile: 'coach-id-selfie',
        terms: 'coachTerms',
      };
      const firstKey =
        (['service_fee', 'payment_handle', 'validIdFile', 'idSelfieFile', 'terms'] as (
          keyof Step3Errors
        )[]).find((key) => nextStep3Errors[key]);
      if (firstKey) {
        window.setTimeout(() => {
          document
            .getElementById(firstIdMap[firstKey])
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          document.getElementById(firstIdMap[firstKey])?.focus({ preventScroll: true });
        }, 350);
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
  if (registeredSuccess && successData && successData.verificationRequired) {
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

  const uploadingDocuments = loading && /upload/i.test(submitStage ?? '');

  const genresForSkill = DEFAULT_SKILLS_AND_GENRES[selectedSkill] || [];
  const SkillIcon = SKILL_ICONS[selectedSkill] || Sparkles;

  const rateValid =
    Boolean(step3Data.service_fee) &&
    Number.parseFloat(step3Data.service_fee) > 0 &&
    (step3Data.payment === 'cash' || step3Data.payment_handle.trim().length > 0);
  const skillsValid = validateSkillsSelection(
    selectedSkill,
    activePredefinedGenres,
    hasOther,
    activeCustomGenresList
  ).valid;
  const docValid = Boolean(validIdFile && idSelfieFile);

  const COACH_STEPS = [
    { id: 1, label: 'Account', detail: 'Personal & address', disabled: false },
    {
      id: 2,
      label: 'Profile',
      detail: 'Bio, discipline & rates',
      disabled: !step1Data,
    },
    {
      id: 3,
      label: 'Credentials',
      detail: 'ID & documents',
      disabled: !step1Data || !skillsValid || !rateValid,
    },
    {
      id: 4,
      label: 'Review',
      detail: 'Terms & submit',
      disabled: !step1Data || !skillsValid || !rateValid || !docValid,
    },
  ];

  const showSuccessModal = registeredSuccess && successData !== null && !successData.verificationRequired;

  return (
    <AuthLayout
      wizard
      registration
      title="Join as a Coach"
      subtext="Verified performing arts mentors in San Jose del Monte and other locations in the Philippines."
      imagePanelTitle="Mentor the next generation."
      imagePanelDescription="Join verified coaches across the Philippines. Set your rates, teach your genres, and build your coaching practice with Groove System."
      imagePanelImage="/image/login/LoginPage.jpeg"
      footer={
        <div className="av-footer-copy">
          <p>
            Already have an account?{' '}
            <Link href="/login" className="av-link">
              Sign in
            </Link>
          </p>
        </div>
      }
    >
      <div className="rw">
        <WizardRail
          steps={COACH_STEPS}
          current={step}
          ariaLabel="Coach registration steps"
          helper="Your progress is kept in this tab. Uploaded files stay attached as you move between steps."
          onSelect={(id) => {
            if (loading) return;
            if (id < step) goTo(id as 1 | 2 | 3 | 4, -1);
          }}
        />

        <div className="rw-main">
          {error && <FormError message={error} />}

          <ProgressSegments
            steps={COACH_STEPS}
            current={step}
            label="Coach application progress"
          />

          <StepTransition stepKey={step} direction={direction}>
            {/* ─── STEP 1: Account ─── */}
            {step === 1 && (
              <div className="rw-step-content">
                <StepHeader
                  icon={User}
                  title="Tell us about you"
                  description="Your legal details, service location and account credentials. Everything is saved when you move to the next step."
                />

                <div className="rw-oauth">
                  <GoogleRegisterButton
                    role="coach"
                    label="Continue with Google"
                    badge="Coming soon"
                    className="av-google"
                  />
                  <p className="av-oauth-note">
                    Google sign-up is coming soon. Complete the four-step application below to
                    submit your coaching profile and verification documents.
                  </p>
                </div>

                <Divider label="OR" variant="dotted" />

                <div ref={step1FormRef}>
                  <RegistrationFormFields
                    role="coach"
                    stepNumber={1}
                    loading={false}
                    externalError={error}
                    showSubmitButton={false}
                    onValidatedData={handleStep1Validated}
                    initialPersonal={step1Data?.personal}
                    initialContact={step1Data?.contact}
                    initialAddress={step1Data?.address}
                    documentSection={<></>}
                  />
                </div>

                <WizardFooter onBack={handleBackToLogin} backLabel="Back to login">
                  <AuthButton
                    type="button"
                    trailingIcon={<ArrowRight className="h-4 w-4" />}
                    onClick={() => {
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
                    Continue
                  </AuthButton>
                </WizardFooter>
              </div>
            )}

            {/* ─── STEP 2: Profile ─── */}
            {step === 2 && (
              <div className="rw-step-content">
                <StepHeader
                  icon={Layers}
                  title="Specialization & rates"
                  description="Tell clients what you teach, then set the rate and payment method for a standard session."
                />

                {/* Bio */}
                <section className="rw-block" aria-labelledby="coach-bio-block">
                  <div className="rw-block-head">
                    <h3 id="coach-bio-block" className="rw-block-title">
                      <span className="rw-block-num" aria-hidden="true">1</span>
                      Bio
                    </h3>
                    <span className="rw-block-note">{bio.length} characters</span>
                  </div>
                  <div>
                    <label className={labelClasses} htmlFor="coach-bio">
                      Bio / About your coaching <span className="text-accent-text" aria-hidden="true">*</span>
                    </label>
                    <textarea
                      id="coach-bio"
                      value={bio}
                      onChange={(e) => {
                        setBio(e.target.value);
                        if (bioError) setBioError(null);
                      }}
                      placeholder="Introduce your coaching achievements, experience, specialties, and teaching style..."
                      required
                      rows={4}
                      aria-invalid={bioError ? 'true' : undefined}
                      aria-describedby={bioError ? 'coach-bio-error' : 'coach-bio-hint'}
                      className="g-input"
                    />
                    {bioError ? (
                      <p id="coach-bio-error" className="g-field-error" role="alert">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{bioError}</span>
                      </p>
                    ) : (
                      <p id="coach-bio-hint" className="g-field-hint">
                        Tell clients what you teach, how you teach, and who you work with.
                      </p>
                    )}
                  </div>
                </section>

                {/* Skill (single select) */}
                <section className="rw-block" aria-labelledby="coach-skill-block">
                  <div className="rw-block-head">
                    <h3 id="coach-skill-block" className="rw-block-title">
                      <span className="rw-block-num" aria-hidden="true">2</span>
                      Performing arts skill
                    </h3>
                    <span className="rw-block-note">
                      {allActiveGenres.length > 0
                        ? `${allActiveGenres.length} ${allActiveGenres.length === 1 ? 'genre' : 'genres'} selected`
                        : 'Pick at least 1 genre'}
                    </span>
                  </div>
                  <div className="rw-options" role="group" aria-label="Performing arts skill">
                    {availableSkills.map((skill) => {
                      const isSelected = selectedSkill === skill;
                      const Icon = SKILL_ICONS[skill] || Sparkles;
                      return (
                        <OptionRow
                          key={skill}
                          icon={Icon}
                          title={skill}
                          description={SKILL_DESCRIPTIONS[skill] || 'Teaching specialty'}
                          selected={isSelected}
                          onSelect={() => handleSelectSkill(skill)}
                          meta={isSelected ? 'Teaching now' : undefined}
                        />
                      );
                    })}
                  </div>
                </section>

                {/* Genres (multi select) */}
                <section className="rw-block" aria-labelledby="coach-genres-block">
                  <div className="rw-block-head">
                    <h3 id="coach-genres-block" className="rw-block-title">
                      <span className="rw-block-num" aria-hidden="true">3</span>
                      Specific genres for {selectedSkill}
                    </h3>
                    <span className="rw-block-note">Select every genre you teach</span>
                  </div>
                  <ChipSelect
                    options={genresForSkill}
                    selected={activePredefinedGenres}
                    onToggle={toggleGenre}
                    ariaLabel={`${selectedSkill} genres`}
                    extra={
                      <button
                        type="button"
                        className={cn('rw-chip', hasOther && 'is-selected')}
                        onClick={toggleOther}
                        aria-pressed={hasOther}
                      >
                        {hasOther ? (
                          <span className="rw-chip-check" aria-hidden="true">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                        ) : null}
                        <span>Other</span>
                      </button>
                    }
                  />

                  {hasOther && (
                    <div className="space-y-3">
                      <span className="block text-xs font-medium text-[var(--av-muted)]">
                        Specify your genre <span className="font-normal">(Custom)</span>
                      </span>
                      <div className="space-y-2">
                        {activeCustomGenresList.map((customVal, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={customVal}
                              aria-label={`Custom genre ${idx + 1}`}
                              onChange={(e) => handleCustomGenreChange(idx, e.target.value)}
                              placeholder="e.g. Krump, Waacking, Afro-Fusion..."
                              className="g-input flex-1 text-sm"
                            />
                            {activeCustomGenresList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomGenre(idx)}
                                className="g-topbar-action cursor-pointer"
                                title="Remove custom genre"
                                aria-label={`Remove custom genre ${idx + 1}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddAnotherCustomGenre}
                        className="text-xs font-semibold text-[var(--av-accent)] underline-offset-4 hover:underline"
                      >
                        + Add another custom genre
                      </button>
                    </div>
                  )}

                  <div className="rw-selection-summary">
                    {allActiveGenres.length > 0 ? (
                      <span className="rw-selection-pill">
                        <strong>{selectedSkill}:</strong> {allActiveGenres.join(', ')}
                      </span>
                    ) : (
                      <span className="text-xs italic text-[var(--av-subtle)]">
                        No genres selected yet for {selectedSkill}.
                      </span>
                    )}
                  </div>
                </section>

                {/* Rates & payment */}
                <section className="rw-block" aria-labelledby="coach-rates-block">
                  <div className="rw-block-head">
                    <h3 id="coach-rates-block" className="rw-block-title">
                      <span className="rw-block-num" aria-hidden="true">4</span>
                      Session rate & payment
                    </h3>
                    <span className="rw-block-note">Shown on your profile</span>
                  </div>

                  <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                    <div className="reg-field">
                      <label className={labelClasses} htmlFor="coach-service-fee">
                        Standard rate (PHP) <span className="text-accent-text" aria-hidden="true">*</span>
                      </label>
                      <div className="relative">
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--av-muted)]"
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
                          aria-describedby={step3Errors.service_fee ? 'coach-service-fee-error' : 'coach-service-fee-hint'}
                          className={cn(inputClasses, 'g-input-has-icon')}
                        />
                      </div>
                      {step3Errors.service_fee ? (
                        <p id="coach-service-fee-error" className="g-field-error" role="alert">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{step3Errors.service_fee}</span>
                        </p>
                      ) : (
                        <p id="coach-service-fee-hint" className="g-field-hint">
                          Minimum ₱100 per session. Clients see this on your profile.
                        </p>
                      )}
                    </div>

                    <div className="reg-field">
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
                      <p className="g-field-hint">How long one standard session runs.</p>
                    </div>
                  </div>

                  <div className="rw-options" role="group" aria-label="Accepted payment mode">
                    <OptionRow
                      icon={Wallet}
                      title="Cash on session"
                      description="Clients pay you in person after the session."
                      selected={step3Data.payment === 'cash'}
                      onSelect={() => {
                        setStep3Data({ ...step3Data, payment: 'cash' });
                        if (step3Errors.payment_handle) {
                          setStep3Errors((prev) => ({ ...prev, payment_handle: undefined }));
                        }
                      }}
                    />
                    <OptionRow
                      icon={Smartphone}
                      title="Online (GCash / Maya)"
                      description="Clients pay through your mobile number."
                      selected={step3Data.payment === 'online'}
                      onSelect={() => setStep3Data({ ...step3Data, payment: 'online' })}
                    />
                  </div>

                  {step3Data.payment === 'online' && (
                    <div className="reg-field">
                      <label className={labelClasses} htmlFor="coach-payment-handle">
                        GCash / Maya mobile number <span className="text-accent-text" aria-hidden="true">*</span>
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
                        aria-describedby={step3Errors.payment_handle ? 'coach-payment-handle-error' : 'coach-payment-handle-hint'}
                        className={inputClasses}
                      />
                      {step3Errors.payment_handle ? (
                        <p id="coach-payment-handle-error" className="g-field-error" role="alert">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{step3Errors.payment_handle}</span>
                        </p>
                      ) : (
                        <p id="coach-payment-handle-hint" className="g-field-hint">
                          The number clients pay when booking online.
                        </p>
                      )}
                    </div>
                  )}
                </section>

                <WizardFooter onBack={() => goTo(1, -1)}>
                  <AuthButton
                    type="button"
                    trailingIcon={<ArrowRight className="h-4 w-4" />}
                    onClick={handleStep2Proceed}
                  >
                    Continue
                  </AuthButton>
                </WizardFooter>
              </div>
            )}

            {/* ─── STEP 3: Credentials ─── */}
            {step === 3 && (
              <div className="rw-step-content">
                <StepHeader
                  icon={ShieldCheck}
                  title="Verification documents"
                  description="Required for coach review. Files are uploaded only after your account is created."
                />

                <section className="rw-block" aria-labelledby="coach-documents-block">
                  <div className="rw-block-head">
                    <h3 id="coach-documents-block" className="rw-block-title">
                      <span className="rw-block-num" aria-hidden="true">1</span>
                      Verification documents
                    </h3>
                    <span className="rw-block-note">
                      {[validIdFile, idSelfieFile].filter(Boolean).length} of 2 attached
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FileUpload
                      id="coach-valid-id"
                      label="Government ID"
                      hint="Passport, UMID, Driver's License, Postal ID"
                      accept=".pdf,.jpg,.jpeg,.png"
                      file={validIdFile}
                      onSelect={selectValidIdFile}
                      onRemove={() => setValidIdFile(null)}
                      error={step3Errors.validIdFile}
                      required
                      icon={ShieldCheck}
                      disabled={loading}
                      uploading={uploadingDocuments}
                      progress={null}
                    />
                    <FileUpload
                      id="coach-id-selfie"
                      label="Selfie holding your ID"
                      hint="JPG or PNG only"
                      accept=".jpg,.jpeg,.png"
                      file={idSelfieFile}
                      onSelect={selectIdSelfieFile}
                      onRemove={() => setIdSelfieFile(null)}
                      error={step3Errors.idSelfieFile}
                      required
                      icon={Camera}
                      disabled={loading}
                      uploading={uploadingDocuments}
                      progress={null}
                    />
                    <div className="sm:col-span-2">
                      <FileUpload
                        id="coach-portfolio"
                        label="Portfolio / Resume"
                        hint="PDF, JPG or PNG · optional"
                        accept=".pdf,.jpg,.jpeg,.png"
                        file={portfolioFile}
                        onSelect={selectPortfolioFile}
                        onRemove={() => setPortfolioFile(null)}
                        icon={FileCheck}
                        disabled={loading}
                        uploading={uploadingDocuments}
                        progress={null}
                      />
                    </div>
                  </div>
                </section>

                <WizardFooter onBack={() => goTo(2, -1)} backDisabled={loading}>
                  <AuthButton
                    type="button"
                    trailingIcon={<ArrowRight className="h-4 w-4" />}
                    onClick={handleStep3Proceed}
                  >
                    Continue
                  </AuthButton>
                </WizardFooter>
              </div>
            )}

            {/* ─── STEP 4: Review & submit ─── */}
            {step === 4 && (
              <form
                id="coach-review-form"
                onSubmit={handleFinalSubmit}
                noValidate
                className="rw-step-content"
              >
                <StepHeader
                  icon={ClipboardCheck}
                  title="Review & submit"
                  description="Confirm your details and agree to the coach terms before submitting your application."
                />

                <section className="rw-block" aria-labelledby="coach-summary-block">
                  <div className="rw-block-head">
                    <h3 id="coach-summary-block" className="rw-block-title">
                      <span className="rw-block-num" aria-hidden="true">1</span>
                      Your summary
                    </h3>
                    <span className="rw-block-note">Edit any step before submitting</span>
                  </div>
                  <dl className="rw-review">
                    <div className="rw-review-row">
                      <dt>Name</dt>
                      <dd>
                        {step1Data
                          ? `${step1Data.personal.firstname.trim()} ${step1Data.personal.lastname.trim()}`
                          : '—'}
                      </dd>
                    </div>
                    <div className="rw-review-row">
                      <dt>Username</dt>
                      <dd>{step1Data?.contact.username.trim().toLowerCase() || '—'}</dd>
                    </div>
                    <div className="rw-review-row">
                      <dt>Email</dt>
                      <dd>{step1Data?.contact.email.trim() || '—'}</dd>
                    </div>
                    <div className="rw-review-row">
                      <dt>Skill</dt>
                      <dd>{selectedSkill}</dd>
                    </div>
                    <div className="rw-review-row">
                      <dt>Genres</dt>
                      <dd>
                        {allActiveGenres.length > 0 ? (
                          allActiveGenres.join(', ')
                        ) : (
                          <span className="rw-review-empty">None selected</span>
                        )}
                      </dd>
                    </div>
                    <div className="rw-review-row">
                      <dt>Session rate</dt>
                      <dd>₱{step3Data.service_fee} · {step3Data.duration}</dd>
                    </div>
                    <div className="rw-review-row">
                      <dt>Payment</dt>
                      <dd>
                        {step3Data.payment === 'cash'
                          ? 'Cash on session'
                          : `GCash / Maya · ${step3Data.payment_handle.trim()}`}
                      </dd>
                    </div>
                    <div className="rw-review-row">
                      <dt>Service area</dt>
                      <dd>{step1Data?.address.address_summary || '—'}</dd>
                    </div>
                    <div className="rw-review-row">
                      <dt>Documents</dt>
                      <dd>
                        {[validIdFile, idSelfieFile, portfolioFile].filter(Boolean).length} attached
                        {!validIdFile || !idSelfieFile
                          ? ' · ID documents missing'
                          : ''}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="rw-block" aria-labelledby="coach-agreement-block">
                  <div className="rw-block-head">
                    <h3 id="coach-agreement-block" className="rw-block-title">
                      <span className="rw-block-num" aria-hidden="true">2</span>
                      Agreement
                    </h3>
                    <span className="rw-block-note">Required</span>
                  </div>

                  <div className={cn('rw-terms-row', step3Errors.terms && 'is-error')}>
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
                    <label htmlFor="coachTerms">
                      I agree to the{' '}
                      <Link href="/terms" target="_blank">
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
                  <div className="rw-terms-read">
                    <button type="button" className="rw-terms-inline" onClick={() => setTermsOpen(true)}>
                      Read terms
                    </button>
                    <span aria-hidden="true">·</span>
                    <button type="button" className="rw-terms-inline" onClick={() => setPrivacyOpen(true)}>
                      Read privacy policy
                    </button>
                  </div>
                </section>

                <WizardFooter onBack={() => goTo(3, -1)} backDisabled={loading}>
                  <AuthButton
                    type="submit"
                    form="coach-review-form"
                    loading={loading}
                    trailingIcon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
                  >
                    {loading ? submitStage || 'Submitting your application…' : 'Submit coach registration'}
                  </AuthButton>
                </WizardFooter>

                {loading && (
                  <p className="text-center text-xs text-[var(--av-muted)]" role="status" aria-live="polite">
                    Keep this tab open while we create your account and upload your documents.
                  </p>
                )}
              </form>
            )}
          </StepTransition>
        </div>
      </div>

      {showSuccessModal && successData ? (
        <SuccessModal
          open
          onClose={() => router.push('/login')}
          onCta={() => router.push('/login')}
          title="Registration submitted"
          description={`Your application is now under review. You can sign in to configure your schedule, manage bookings, and communicate with clients in ${successData.locationDisplay}.`}
          details={[
            { label: 'Username', value: successData.username },
            { label: 'Email', value: successData.email },
            { label: 'Specialties', value: successData.talents },
            { label: 'Disciplines & genres', value: successData.genres },
            { label: 'Verification status', value: 'Under review', highlight: true },
          ]}
        />
      ) : null}

      <ConfirmLeaveModal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onLeave={() => router.push('/login')}
      />
      <TermsModal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccept={() => {
          setStep3Data({ ...step3Data, terms: true });
        }}
        kind="terms"
      />
      <TermsModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} kind="privacy" />
    </AuthLayout>
  );
}

