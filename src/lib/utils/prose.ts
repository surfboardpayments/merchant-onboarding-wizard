/**
 * Turning stored values into readable English.
 *
 * The wizard shows retrieved data as sentences rather than as form state, so
 * every enum, code and address in the store needs a human phrasing. Keeping
 * that mapping here means the sentences stay consistent between the steps and
 * the final summary.
 */

import type { Address } from '@/store/onboardingStore';

/** Merchant category codes we actually assign, in the merchant's words. */
const MCC_LABELS: Record<string, string> = {
  '4121': 'taxi and rideshare journeys',
  '5045': 'computers and software',
  '5122': 'health and beauty products',
  '5192': 'books and periodicals',
  '5199': 'non-durable goods',
  '5211': 'building materials',
  '5251': 'hardware',
  '5311': 'department store goods',
  '5411': 'groceries',
  '5462': 'bakery goods',
  '5499': 'food and convenience goods',
  '5511': 'cars and vans',
  '5541': 'fuel',
  '5611': 'menswear',
  '5621': 'womenswear',
  '5641': "children's clothing",
  '5651': 'clothing',
  '5655': 'sportswear',
  '5661': 'shoes',
  '5691': 'clothing and accessories',
  '5712': 'furniture',
  '5732': 'consumer electronics',
  '5733': 'musical instruments',
  '5734': 'computer software',
  '5735': 'records and music',
  '5812': 'restaurant meals',
  '5813': 'drinks',
  '5814': 'fast food',
  '5912': 'pharmacy goods',
  '5941': 'sporting goods',
  '5942': 'books',
  '5943': 'stationery and office supplies',
  '5944': 'jewellery and watches',
  '5945': 'toys and games',
  '5946': 'photographic equipment',
  '5947': 'gifts and novelties',
  '5949': 'fabric and craft supplies',
  '5977': 'cosmetics',
  '5992': 'flowers',
  '5995': 'pet supplies',
  '5999': 'speciality retail goods',
  '7011': 'accommodation',
  '7230': 'hair and beauty services',
  '7297': 'massage and wellbeing services',
  '7298': 'health and beauty treatments',
  '7299': 'personal services',
  '7372': 'software and programming services',
  '7392': 'consulting services',
  '7399': 'business services',
  '7997': 'club and gym membership',
  '7999': 'recreation services',
  '8011': 'medical services',
  '8021': 'dental services',
  '8049': 'chiropody and physiotherapy',
  '8099': 'health services',
  '8351': 'childcare',
  '8398': 'charitable donations',
  '8931': 'accounting services',
  '8999': 'professional services',
};

export function mccLabel(mcc?: string): string | null {
  if (!mcc) return null;
  return MCC_LABELS[mcc] ?? null;
}

export const BUSINESS_TYPE_PHRASE = {
  online_only: 'online only',
  in_store_only: 'in person only',
  both: 'both in person and online',
} as const;

export const BUSINESS_TYPE_LABEL = {
  online_only: 'Online only',
  in_store_only: 'In person only',
  both: 'In person and online',
} as const;

export const MONTHLY_VOLUME_PHRASE = {
  under_10k: 'under £10,000 a month',
  '10k_50k': 'between £10,000 and £50,000 a month',
  '50k_100k': 'between £50,000 and £100,000 a month',
  '100k_plus': 'over £100,000 a month',
} as const;

export const AVG_TRANSACTION_PHRASE = {
  under_25: 'under £25',
  '25_50': 'between £25 and £50',
  '50_100': 'between £50 and £100',
  '100_250': 'between £100 and £250',
  '250_plus': 'over £250',
} as const;

export const REFUND_POLICY_PHRASE = {
  full_refund: 'a full refund within 30 days',
  partial_refund: 'partial refunds',
  no_refunds: 'no refunds',
  custom: 'your own refund terms',
} as const;

export const REFUND_POLICY_LABEL = {
  full_refund: 'Full refund within 30 days',
  partial_refund: 'Partial refund',
  no_refunds: 'No refunds',
  custom: 'Something else',
} as const;

export const ROLE_LABEL = {
  director: 'Director',
  psc: 'Owner',
  ubo: 'Owner',
  director_and_psc: 'Director and owner',
  sole_trader: 'Sole trader',
} as const;

/** Plain-English gloss for the compliance term, used the first time it appears. */
export const ROLE_GLOSS = {
  director: 'listed at Companies House as a director',
  psc: 'listed at Companies House as having significant control',
  ubo: 'someone who ultimately owns or controls the business',
  director_and_psc: 'a director who also holds significant control',
  sole_trader: 'you, trading in your own name',
} as const;

/** One-line address, e.g. "12 High Street, London, SW1A 1AA". */
export function addressLine(address?: Partial<Address> | null): string {
  if (!address) return '';
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.county,
    address.postcode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

/** Shortest address that still identifies the place, for inline sentences. */
export function shortAddress(address?: Partial<Address> | null): string {
  if (!address) return '';
  return [address.addressLine1, address.city, address.postcode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

export function fullName(person: {
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
}): string {
  return [person.firstName, person.middleName, person.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

/** "March 1985" from a Companies House partial date of birth. */
export function birthPhrase(dob?: {
  day?: number;
  month?: number;
  year?: number;
}): string | null {
  if (!dob?.month || !dob?.year) return null;
  const month = new Date(2000, dob.month - 1, 1).toLocaleString('en-GB', {
    month: 'long',
  });
  return dob.day ? `${dob.day} ${month} ${dob.year}` : `${month} ${dob.year}`;
}

export function formatUkDate(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Joins a list the way a person would: "a, b and c". */
export function sentenceList(items: string[]): string {
  const parts = items.filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Trims a URL down to the bit a person recognises. */
export function prettyUrl(url?: string): string {
  if (!url) return '';
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}
