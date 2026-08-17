/**
 * Dialling codes offered by the phone field.
 *
 * The UK sits first because it is the default and the overwhelming majority of
 * merchants. Everything after it is alphabetical: every European market, plus
 * the places a director or beneficial owner is most likely to be reachable.
 *
 * Not exhaustive by design. A 240-entry list makes the common case slower for
 * no benefit, and a pasted international number is absorbed by the field
 * regardless of whether its code appears here.
 */

export interface DiallingCode {
  /** E.164 country calling code, including the plus. */
  code: string;
  /** Country as a merchant would name it. */
  country: string;
}

export const DEFAULT_DIALLING_CODE = '+44';

export const DIALLING_CODES: DiallingCode[] = [
  { code: '+44', country: 'United Kingdom' },

  { code: '+61', country: 'Australia' },
  { code: '+43', country: 'Austria' },
  { code: '+32', country: 'Belgium' },
  { code: '+359', country: 'Bulgaria' },
  { code: '+385', country: 'Croatia' },
  { code: '+357', country: 'Cyprus' },
  { code: '+420', country: 'Czechia' },
  { code: '+45', country: 'Denmark' },
  { code: '+372', country: 'Estonia' },
  { code: '+358', country: 'Finland' },
  { code: '+33', country: 'France' },
  { code: '+49', country: 'Germany' },
  { code: '+30', country: 'Greece' },
  { code: '+852', country: 'Hong Kong' },
  { code: '+36', country: 'Hungary' },
  { code: '+354', country: 'Iceland' },
  { code: '+91', country: 'India' },
  { code: '+353', country: 'Ireland' },
  { code: '+972', country: 'Israel' },
  { code: '+39', country: 'Italy' },
  { code: '+81', country: 'Japan' },
  { code: '+371', country: 'Latvia' },
  { code: '+423', country: 'Liechtenstein' },
  { code: '+370', country: 'Lithuania' },
  { code: '+352', country: 'Luxembourg' },
  { code: '+356', country: 'Malta' },
  { code: '+377', country: 'Monaco' },
  { code: '+31', country: 'Netherlands' },
  { code: '+64', country: 'New Zealand' },
  { code: '+47', country: 'Norway' },
  { code: '+48', country: 'Poland' },
  { code: '+351', country: 'Portugal' },
  { code: '+40', country: 'Romania' },
  { code: '+65', country: 'Singapore' },
  { code: '+421', country: 'Slovakia' },
  { code: '+386', country: 'Slovenia' },
  { code: '+27', country: 'South Africa' },
  { code: '+34', country: 'Spain' },
  { code: '+46', country: 'Sweden' },
  { code: '+41', country: 'Switzerland' },
  { code: '+90', country: 'Türkiye' },
  { code: '+971', country: 'United Arab Emirates' },
  { code: '+1', country: 'United States and Canada' },
];

/** Longest first, so "+353" is matched before "+35" would be. */
const CODES_BY_LENGTH = [...new Set(DIALLING_CODES.map((c) => c.code))].sort(
  (a, b) => b.length - a.length,
);

/** An example national number per code, so the placeholder matches the choice. */
const PLACEHOLDERS: Record<string, string> = {
  '+44': '7700 900123',
  '+46': '70 123 45 67',
  '+47': '406 12 345',
  '+45': '32 12 34 56',
  '+358': '40 1234567',
  '+353': '85 123 4567',
  '+49': '1512 3456789',
  '+33': '6 12 34 56 78',
  '+31': '6 12345678',
  '+34': '612 34 56 78',
  '+39': '312 345 6789',
  '+1': '555 123 4567',
};

export function nationalPlaceholder(code: string): string {
  return PLACEHOLDERS[code] ?? '70 123 4567';
}

export interface SplitPhone {
  code: string;
  national: string;
}

/**
 * Split a stored phone number into a dialling code and the national part.
 *
 * Accepts anything a merchant might reasonably paste: `+46 70 123 45 67`,
 * `0046701234567`, or a bare national number left over from when this field
 * assumed everyone was in the UK.
 */
export function splitPhone(
  value: string | undefined,
  fallback: string = DEFAULT_DIALLING_CODE,
): SplitPhone {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return { code: fallback, national: '' };

  // 00 is the international prefix dialled from most of Europe.
  const normalised = trimmed.startsWith('00')
    ? `+${trimmed.slice(2)}`
    : trimmed;

  if (!normalised.startsWith('+')) {
    return { code: fallback, national: normalised };
  }

  const digits = `+${normalised.slice(1).replace(/[^\d]/g, '')}`;
  const match = CODES_BY_LENGTH.find((code) => digits.startsWith(code));

  if (!match) {
    // An unrecognised code: keep every digit rather than silently dropping it.
    return { code: fallback, national: normalised.slice(1).trim() };
  }

  // Re-derive the national part from the original so spacing survives.
  const withoutPlus = normalised.slice(1);
  const codeDigits = match.slice(1);
  let seen = 0;
  let cut = 0;
  for (let i = 0; i < withoutPlus.length && seen < codeDigits.length; i++) {
    if (/\d/.test(withoutPlus[i])) seen++;
    cut = i + 1;
  }

  return { code: match, national: withoutPlus.slice(cut).trim() };
}

/** Join a code and national number back into one stored value. */
export function joinPhone(code: string, national: string): string {
  const trimmed = national.trim();
  return trimmed ? `${code} ${trimmed}` : '';
}
