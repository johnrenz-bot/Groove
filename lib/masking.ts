/**
 * Personal Information Masking Utilities.
 *
 * Consistent masking patterns for sensitive data across GrooveSystem (GroovePH).
 * Applies asterisks (*) by default to safeguard personal information:
 * - Username: J*****n
 * - Email: jo*****@gmail.com
 * - Phone: 09******80
 * - Address: protected placeholder (e.g. •••••••••••• (Protected))
 *
 * Supports safe handling for short or missing values and authorization checks.
 */

export type MaskType = 'username' | 'email' | 'phone' | 'address' | 'generic';

/**
 * Masks a username: Keeps first and last characters, replaces middle with asterisks.
 * Preserves leading '@' if present.
 * Example: 'Justin' -> 'J*****n', '@Justin' -> '@J*****n', 'JohnDoe' -> 'J*****e'
 */
export function maskUsername(username: string | null | undefined): string {
  if (!username) return '';
  const trimmed = username.trim();
  if (!trimmed) return '';

  const hasAt = trimmed.startsWith('@');
  const clean = hasAt ? trimmed.slice(1) : trimmed;

  if (clean.length === 0) return hasAt ? '@' : '';
  if (clean.length === 1) return `${hasAt ? '@' : ''}*`;
  if (clean.length === 2) return `${hasAt ? '@' : ''}${clean[0]}*`;

  // For usernames of length >= 3, display first char, 5 asterisks, and last char.
  const masked = `${clean[0]}*****${clean[clean.length - 1]}`;
  return hasAt ? `@${masked}` : masked;
}

/**
 * Masks an email: Keeps first 2 characters of local part, followed by 5 asterisks, keeping domain.
 * Example: 'john.doe@gmail.com' -> 'jo*****@gmail.com'
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const trimmed = email.trim();
  if (!trimmed) return '';

  const atIndex = trimmed.indexOf('@');
  if (atIndex === -1) return maskGeneric(trimmed);

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  if (local.length <= 1) {
    return `*@${domain}`;
  }
  if (local.length === 2) {
    return `${local}*****@${domain}`;
  }

  return `${local.slice(0, 2)}*****@${domain}`;
}

/**
 * Masks a phone number: Keeps first 2 and last 2 digits, replacing middle with 6 asterisks.
 * Handles Philippine mobile numbers (09... or +63 9...) and formatted strings safely.
 * Example: '09123456780' -> '09******80', '+63 912 345 6780' -> '09******80'
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (!trimmed) return '';

  // Extract digits only
  let digits = trimmed.replace(/\D/g, '');

  // Normalize Philippine mobile numbers (+63 9xx -> 09xx)
  if (digits.startsWith('63') && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  }

  if (digits.length <= 4) {
    return '*'.repeat(digits.length || trimmed.length);
  }

  return `${digits.slice(0, 2)}******${digits.slice(-2)}`;
}

/**
 * Masks an address by returning a protected placeholder string.
 */
export function maskAddress(
  address?: string | null,
  placeholder: string = '•••••••••••• (Protected)'
): string {
  if (!address || !address.trim()) return '';
  return placeholder;
}

/**
 * Generic fallback masking: keeps first character and masks the rest.
 */
export function maskGeneric(text: string | null | undefined): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.length === 1) return '*';
  return `${trimmed[0]}****`;
}

/**
 * Convenience helper to mask a value based on its designated type.
 */
export function maskField(value: string | null | undefined, type: MaskType): string {
  switch (type) {
    case 'username':
      return maskUsername(value);
    case 'email':
      return maskEmail(value);
    case 'phone':
      return maskPhone(value);
    case 'address':
      return maskAddress(value);
    case 'generic':
    default:
      return maskGeneric(value);
  }
}

/**
 * Determines if a viewer is authorized to see unmasked private information.
 * Only the owner and administrators can view unmasked private data.
 */
export function canViewUnmasked(
  ownerId: string | null | undefined,
  viewerId: string | null | undefined,
  isAdmin: boolean = false
): boolean {
  if (isAdmin) return true;
  if (!ownerId || !viewerId) return false;
  return ownerId === viewerId;
}

/**
 * Determines if a value must be masked.
 * Returns true if the viewer is not authorized (not owner and not admin).
 */
export function shouldMask(
  ownerId: string | null | undefined,
  viewerId: string | null | undefined,
  isAdmin: boolean = false
): boolean {
  return !canViewUnmasked(ownerId, viewerId, isAdmin);
}
