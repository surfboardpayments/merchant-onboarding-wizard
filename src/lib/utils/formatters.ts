// ---------------------------------------------------------------------------
// Formatting utilities for UK merchant onboarding fields
// ---------------------------------------------------------------------------

/**
 * Format a raw numeric string into a UK sort code: XX-XX-XX.
 *
 * Strips any non-digit characters before formatting.
 *
 * @example formatSortCode('123456')  // '12-34-56'
 * @example formatSortCode('12-3456') // '12-34-56'
 */
export function formatSortCode(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 6);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

/**
 * Format a raw string into a UK postcode: AB1 2CD (outward code + space +
 * inward code).
 *
 * The inward code is always the last 3 characters. If the input is too short
 * to split we return the uppercased string as-is.
 *
 * @example formatPostcode('SW1A1AA') // 'SW1A 1AA'
 * @example formatPostcode('ec2a4')   // 'EC2A4' (too short to split)
 */
export function formatPostcode(value: string): string {
  const cleaned = value.replace(/\s/g, '').toUpperCase();

  if (cleaned.length < 5) return cleaned;

  const inward = cleaned.slice(-3);
  const outward = cleaned.slice(0, -3);

  return `${outward} ${inward}`;
}

/**
 * Format a UK phone number for display.
 *
 * - Strips non-digit characters (except a leading +).
 * - If the number starts with +44 or 44, formats as +44 XXXX XXXXXX.
 * - If the number starts with 0, formats as 0XXXX XXXXXX.
 * - Otherwise returns the cleaned string as-is.
 *
 * @example formatPhoneNumber('07911123456')   // '07911 123456'
 * @example formatPhoneNumber('+447911123456') // '+44 7911 123456'
 */
export function formatPhoneNumber(value: string): string {
  const hasPlus = value.startsWith('+');
  const digits = value.replace(/\D/g, '');

  // International format: +44 ...
  if (hasPlus && digits.startsWith('44') && digits.length >= 12) {
    const national = digits.slice(2);
    return `+44 ${national.slice(0, 4)} ${national.slice(4)}`;
  }

  // Domestic format with leading 0
  if (digits.startsWith('0') && digits.length >= 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  // Digits starting with 44 without "+"
  if (digits.startsWith('44') && digits.length >= 12) {
    const national = digits.slice(2);
    return `+44 ${national.slice(0, 4)} ${national.slice(4)}`;
  }

  return hasPlus ? `+${digits}` : digits;
}

/**
 * Format a number as a GBP currency string.
 *
 * Uses the `en-GB` locale and the `GBP` currency code so the output is
 * localised (e.g. "£1,234.56").
 *
 * @example formatCurrency(1234.5) // '£1,234.50'
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(value);
}

/**
 * Pad a Companies House company number to 8 characters with leading zeros.
 *
 * Companies House numbers are always 8 characters; older numbers may be stored
 * without leading zeros.
 *
 * @example formatCompanyNumber('123456')   // '00123456'
 * @example formatCompanyNumber('SC123456') // 'SC123456'
 */
export function formatCompanyNumber(value: string): string {
  const trimmed = value.trim().toUpperCase();

  // If the number starts with letters (e.g. SC, NI, OC) don't pad – just
  // ensure the numeric portion is padded.
  const match = trimmed.match(/^([A-Z]{0,2})(\d+)$/);

  if (!match) return trimmed;

  const [, prefix, digits] = match;
  const targetDigits = 8 - prefix.length;

  return prefix + digits.padStart(targetDigits, '0');
}
