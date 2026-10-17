import { createClient } from '@/lib/supabase/client';
import type {
  GCashProfile,
  PaymentTransaction,
  CreatePaymentRequestInput,
  SubmitPaymentProofInput,
  ReviewPaymentProofInput,
} from '../types';

const STORAGE_KEY_GCASH_PROFILES = 'groove_gcash_profiles_v1';
const STORAGE_KEY_TRANSACTIONS = 'groove_gcash_transactions_v1';

/**
 * Generate a unique reference number for payment tracking.
 * Format: GPH-GCASH-YYYYMMDD-XXXX
 */
export function generateTransactionReference(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GPH-GCASH-${dateStr}-${randomSuffix}`;
}

/**
 * Format currency to Philippine Peso (PHP)
 */
export function formatPHP(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Validate Philippine mobile number (GCash format: 09XXXXXXXXX or +639XXXXXXXXX)
 */
export function isValidGCashNumber(number: string): boolean {
  const cleaned = number.replace(/[\s-]/g, '');
  return /^(09|\+639)\d{9}$/.test(cleaned);
}

/**
 * Normalize GCash number to standard 09XXXXXXXXX
 */
export function normalizeGCashNumber(number: string): string {
  const cleaned = number.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+63')) {
    return '0' + cleaned.substring(3);
  }
  return cleaned;
}

// Local cache helpers to maintain optimistic speed & database table fallback
function getLocalProfiles(): Record<string, GCashProfile> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GCASH_PROFILES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalProfile(userId: string, profile: GCashProfile | null) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalProfiles();
    if (profile) {
      current[userId] = profile;
    } else {
      delete current[userId];
    }
    localStorage.setItem(STORAGE_KEY_GCASH_PROFILES, JSON.stringify(current));
  } catch (err) {
    console.warn('Failed to cache GCash profile to localStorage:', err);
  }
}

function getLocalTransactions(): PaymentTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTransaction(tx: PaymentTransaction) {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalTransactions();
    const idx = list.findIndex((item) => item.id === tx.id || item.transaction_reference === tx.transaction_reference);
    if (idx >= 0) {
      list[idx] = tx;
    } else {
      list.unshift(tx);
    }
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to cache transaction to localStorage:', err);
  }
}

/**
 * Fetch GCash payment profile for a user (Client or Coach).
 */
export async function fetchGCashProfile(userId: string): Promise<GCashProfile | null> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('gcash_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      const profile: GCashProfile = {
        id: data.id,
        user_id: data.user_id,
        account_name: data.account_name,
        account_number: data.account_number,
        qr_code_url: data.qr_code_url,
        qr_code_path: data.qr_code_path,
        is_active: data.is_active ?? true,
        notes: data.notes,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      setLocalProfile(userId, profile);
      return profile;
    }
  } catch (err) {
    console.warn('Supabase gcash_profiles query fallback:', err);
  }

  // Fallback 1: check local cache
  const cached = getLocalProfiles()[userId];
  if (cached) return cached;

  // Fallback 2: if user is a coach, check coach_profiles for payment_handle
  try {
    const { data: coachData } = await supabase
      .from('coach_profiles')
      .select('payment_handle, payment_type')
      .eq('id', userId)
      .maybeSingle();

    if (coachData?.payment_handle) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('firstname, lastname')
        .eq('id', userId)
        .maybeSingle();

      const name = userProfile
        ? `${userProfile.firstname || ''} ${userProfile.lastname || ''}`.trim()
        : 'Groove Coach';

      const inferred: GCashProfile = {
        user_id: userId,
        account_name: name,
        account_number: coachData.payment_handle,
        is_active: true,
      };
      setLocalProfile(userId, inferred);
      return inferred;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Upload QR code image to Supabase storage.
 */
export async function uploadGCashQrCode(
  userId: string,
  file: File
): Promise<{ url: string; path: string }> {
  const supabase = createClient();

  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be less than 5 MB.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  const filename = `${userId}/gcash-qr-${Date.now()}.${extension}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage upload error, using object URL fallback:', uploadError.message);
    } else {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename);
      if (urlData?.publicUrl) {
        return { url: urlData.publicUrl, path: filename };
      }
    }
  } catch (err) {
    console.warn('Storage bucket exception, using data URL fallback:', err);
  }

  // Data URL fallback if storage bucket fails or restricts policy
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ url: reader.result as string, path: filename });
    };
    reader.onerror = () => reject(new Error('Failed to read QR image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Save or update GCash payment profile.
 */
export async function saveGCashProfile(
  profile: GCashProfile,
  qrFile?: File | null
): Promise<GCashProfile> {
  const supabase = createClient();

  let qrUrl = profile.qr_code_url;
  let qrPath = profile.qr_code_path;

  if (qrFile) {
    const uploaded = await uploadGCashQrCode(profile.user_id, qrFile);
    qrUrl = uploaded.url;
    qrPath = uploaded.path;
  }

  const normalized = normalizeGCashNumber(profile.account_number);

  const payload: GCashProfile = {
    ...profile,
    account_number: normalized,
    qr_code_url: qrUrl,
    qr_code_path: qrPath,
    is_active: profile.is_active ?? true,
    updated_at: new Date().toISOString(),
  };

  // 1. Try to upsert into gcash_profiles table
  try {
    const { data, error } = await supabase
      .from('gcash_profiles')
      .upsert(
        {
          user_id: payload.user_id,
          account_name: payload.account_name.trim(),
          account_number: payload.account_number,
          qr_code_url: payload.qr_code_url,
          qr_code_path: payload.qr_code_path,
          is_active: payload.is_active,
          notes: payload.notes?.trim() || null,
          updated_at: payload.updated_at,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .maybeSingle();

    if (!error && data) {
      payload.id = data.id;
    }
  } catch (err) {
    console.warn('Supabase gcash_profiles upsert skipped or table missing:', err);
  }

  // 2. Synchronize coach_profiles row if user is a coach
  try {
    await supabase
      .from('coach_profiles')
      .update({
        payment_handle: payload.account_number,
        payment_provider: 'GCash',
        payment_type: 'online',
      })
      .eq('id', payload.user_id);
  } catch {
    // ignore
  }

  // 3. Mirror in local storage
  setLocalProfile(payload.user_id, payload);

  return payload;
}

/**
 * Remove / Delete GCash profile
 */
export async function deleteGCashProfile(userId: string): Promise<void> {
  const supabase = createClient();

  try {
    await supabase.from('gcash_profiles').delete().eq('user_id', userId);
  } catch {
    // ignore
  }

  try {
    await supabase
      .from('coach_profiles')
      .update({
        payment_handle: null,
        payment_provider: null,
      })
      .eq('id', userId);
  } catch {
    // ignore
  }

  setLocalProfile(userId, null);
}

/**
 * Upload Payment Proof / Receipt image
 */
export async function uploadPaymentProofImage(
  senderId: string,
  file: File
): Promise<{ url: string; path: string }> {
  const supabase = createClient();

  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid receipt image (PNG, JPG, WEBP).');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Receipt image must be smaller than 5 MB.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `${senderId}/payment-proof-${Date.now()}.${extension}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename);
      if (urlData?.publicUrl) {
        return { url: urlData.publicUrl, path: filename };
      }
    }
  } catch (err) {
    console.warn('Storage proof upload error, using data URL fallback:', err);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ url: reader.result as string, path: filename });
    };
    reader.onerror = () => reject(new Error('Failed to read proof image.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Create a new Payment Request
 */
export async function createPaymentRequest(
  input: CreatePaymentRequestInput
): Promise<PaymentTransaction> {
  const supabase = createClient();
  const ref = generateTransactionReference();
  const now = new Date().toISOString();

  const newTx: PaymentTransaction = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`,
    transaction_reference: ref,
    appointment_id: input.appointment_id ?? null,
    agreement_id: input.agreement_id ?? null,
    sender_id: input.sender_id,
    recipient_id: input.recipient_id,
    amount: input.amount,
    currency: 'PHP',
    description: input.description,
    payment_status: 'pending',
    payee_account_name: input.payee_account_name,
    payee_account_number: normalizeGCashNumber(input.payee_account_number),
    payee_qr_url: input.payee_qr_url ?? null,
    instructions:
      input.instructions ||
      'Please scan the GCash QR code or send to the mobile number above. Upload your transaction screenshot with reference number once done.',
    created_at: now,
    updated_at: now,
  };

  // 1. Try to insert into database
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert({
        transaction_reference: newTx.transaction_reference,
        appointment_id: newTx.appointment_id,
        agreement_id: newTx.agreement_id,
        sender_id: newTx.sender_id,
        recipient_id: newTx.recipient_id,
        amount: newTx.amount,
        currency: newTx.currency,
        description: newTx.description,
        payment_status: newTx.payment_status,
        payee_account_name: newTx.payee_account_name,
        payee_account_number: newTx.payee_account_number,
        payee_qr_url: newTx.payee_qr_url,
        instructions: newTx.instructions,
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      newTx.id = data.id;
    }
  } catch (err) {
    console.warn('payment_transactions insert fallback:', err);
  }

  // 2. Dispatch real notification to payer (sender_id)
  try {
    await supabase.from('notifications').insert({
      user_id: newTx.sender_id,
      title: 'GCash Payment Requested',
      message: `${input.payee_account_name} requested payment of ${formatPHP(input.amount)} for "${input.description}". Please view GCash details and submit proof.`,
      cta_url: input.appointment_id ? `/client/appointments` : `/messages?user=${input.recipient_id}`,
    });
  } catch (err) {
    console.warn('Failed to insert notification:', err);
  }

  // 3. Save local mirror
  saveLocalTransaction(newTx);

  return newTx;
}

/**
 * Submit Payment Proof for a transaction.
 */
export async function submitPaymentProof(
  input: SubmitPaymentProofInput
): Promise<PaymentTransaction> {
  const supabase = createClient();
  const now = new Date().toISOString();

  let proofUrl = input.proof_data_url || null;
  let proofPath: string | null = null;

  if (input.proof_file) {
    const uploaded = await uploadPaymentProofImage(input.sender_id, input.proof_file);
    proofUrl = uploaded.url;
    proofPath = uploaded.path;
  }

  if (!proofUrl) {
    throw new Error('Please upload a screenshot or receipt of your GCash payment.');
  }

  if (!input.gcash_ref_number.trim()) {
    throw new Error('Please enter the GCash Reference Number from your receipt.');
  }

  let updatedTx: PaymentTransaction | null = null;

  // 1. Database update
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .update({
        payment_status: 'submitted',
        proof_image_url: proofUrl,
        proof_image_path: proofPath,
        proof_uploaded_at: now,
        proof_notes: input.proof_notes?.trim() || null,
        gcash_ref_number: input.gcash_ref_number.trim(),
        updated_at: now,
      })
      .eq('id', input.transaction_id)
      .select(`
        *,
        sender:sender_id(*),
        recipient:recipient_id(*)
      `)
      .maybeSingle();

    if (!error && data) {
      updatedTx = data as PaymentTransaction;
    }
  } catch (err) {
    console.warn('payment_transactions update fallback:', err);
  }

  // Local fallback
  if (!updatedTx) {
    const list = getLocalTransactions();
    const existing = list.find((t) => t.id === input.transaction_id);
    if (existing) {
      existing.payment_status = 'submitted';
      existing.proof_image_url = proofUrl;
      existing.proof_uploaded_at = now;
      existing.proof_notes = input.proof_notes?.trim() || null;
      existing.gcash_ref_number = input.gcash_ref_number.trim();
      existing.updated_at = now;
      saveLocalTransaction(existing);
      updatedTx = existing;
    }
  }

  if (!updatedTx) {
    throw new Error('Transaction could not be found to update.');
  }

  // 2. Notify recipient (payee) that proof was submitted
  try {
    await supabase.from('notifications').insert({
      user_id: updatedTx.recipient_id,
      title: 'Payment Proof Submitted',
      message: `Proof submitted for GCash reference #${input.gcash_ref_number.trim()} (${formatPHP(
        updatedTx.amount
      )}). Please verify funds in your GCash app and confirm.`,
      cta_url: updatedTx.appointment_id
        ? `/coach/appointments`
        : `/messages?user=${updatedTx.sender_id}`,
    });
  } catch (err) {
    console.warn('Failed to insert recipient notification:', err);
  }

  saveLocalTransaction(updatedTx);
  return updatedTx;
}

/**
 * Review submitted proof: Confirm or Reject
 */
export async function reviewPaymentProof(
  input: ReviewPaymentProofInput
): Promise<PaymentTransaction> {
  const supabase = createClient();
  const now = new Date().toISOString();

  let updatedTx: PaymentTransaction | null = null;

  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .update({
        payment_status: input.payment_status,
        reviewed_at: now,
        review_notes: input.review_notes?.trim() || null,
        updated_at: now,
      })
      .eq('id', input.transaction_id)
      .select(`
        *,
        sender:sender_id(*),
        recipient:recipient_id(*)
      `)
      .maybeSingle();

    if (!error && data) {
      updatedTx = data as PaymentTransaction;
    }
  } catch (err) {
    console.warn('reviewPaymentProof database update fallback:', err);
  }

  if (!updatedTx) {
    const list = getLocalTransactions();
    const existing = list.find((t) => t.id === input.transaction_id);
    if (existing) {
      existing.payment_status = input.payment_status;
      existing.reviewed_at = now;
      existing.review_notes = input.review_notes?.trim() || null;
      existing.updated_at = now;
      saveLocalTransaction(existing);
      updatedTx = existing;
    }
  }

  if (!updatedTx) {
    throw new Error('Transaction could not be found to update.');
  }

  // Notify payer (sender_id) of confirmation or rejection
  try {
    const isConfirmed = input.payment_status === 'confirmed';
    await supabase.from('notifications').insert({
      user_id: updatedTx.sender_id,
      title: isConfirmed ? 'GCash Payment Confirmed! 🎉' : 'Payment Proof Declined',
      message: isConfirmed
        ? `Your GCash payment of ${formatPHP(updatedTx.amount)} (${
            updatedTx.transaction_reference
          }) has been verified and confirmed.`
        : `Your payment proof was declined: ${input.review_notes || 'Please verify transaction details and upload valid proof.'}`,
      cta_url: updatedTx.appointment_id
        ? `/client/appointments`
        : `/messages?user=${updatedTx.recipient_id}`,
    });
  } catch (err) {
    console.warn('Failed to insert reviewer notification:', err);
  }

  saveLocalTransaction(updatedTx);
  return updatedTx;
}

/**
 * Fetch all transactions for a user (either sender or recipient).
 */
export async function fetchUserTransactions(userId: string): Promise<PaymentTransaction[]> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        sender:sender_id(id, firstname, lastname, email, photo_url),
        recipient:recipient_id(id, firstname, lastname, email, photo_url)
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      data.forEach((t) => saveLocalTransaction(t));
      return data as PaymentTransaction[];
    }
  } catch (err) {
    console.warn('fetchUserTransactions database query fallback:', err);
  }

  // Fallback to local transactions
  const localList = getLocalTransactions().filter(
    (t) => t.sender_id === userId || t.recipient_id === userId
  );
  return localList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Fetch transaction tied to an appointment.
 */
export async function fetchTransactionByAppointment(
  appointmentId: number
): Promise<PaymentTransaction | null> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        sender:sender_id(id, firstname, lastname, email, photo_url),
        recipient:recipient_id(id, firstname, lastname, email, photo_url)
      `)
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      saveLocalTransaction(data);
      return data as PaymentTransaction;
    }
  } catch {
    // ignore
  }

  const local = getLocalTransactions().find((t) => t.appointment_id === appointmentId);
  return local || null;
}
