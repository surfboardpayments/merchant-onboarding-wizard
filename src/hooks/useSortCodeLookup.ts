'use client';

import { useState, useCallback } from 'react';

/**
 * Well-known UK sort code prefix -> bank name mappings.
 *
 * This is a lightweight client-side lookup covering the most common UK banks.
 * Sort codes are matched by their first two digits (the bank identifier).
 * If no match is found we return null and consumers can fall back to manual
 * entry or a server-side lookup.
 */
const SORT_CODE_BANKS: Record<string, string> = {
  '01': 'National Westminster Bank',
  '04': 'Citibank',
  '05': 'Clydesdale Bank',
  '07': 'Nationwide Building Society',
  '08': 'The Co-operative Bank',
  '09': 'Santander',
  '10': 'Bank of Scotland',
  '11': 'Halifax',
  '12': 'Bank of Scotland',
  '15': 'The Royal Bank of Scotland',
  '16': 'The Royal Bank of Scotland',
  '17': 'Yorkshire Bank',
  '20': 'Barclays Bank',
  '23': 'Bank of Ireland',
  '30': 'Lloyds Bank',
  '40': 'HSBC Bank',
  '50': 'Barclays Bank',
  '51': 'National Westminster Bank',
  '52': 'National Westminster Bank',
  '53': 'National Westminster Bank',
  '54': 'National Westminster Bank',
  '55': 'National Westminster Bank',
  '56': 'National Westminster Bank',
  '60': 'National Westminster Bank',
  '70': 'Lloyds Bank',
  '72': 'Lloyds Bank',
  '73': 'Lloyds Bank',
  '77': 'Lloyds Bank',
  '80': 'Bank of Scotland',
  '82': 'Clydesdale Bank',
  '83': 'The Royal Bank of Scotland',
  '87': 'Bank of Scotland',
};

/**
 * Hook for resolving a UK bank sort code to its bank name.
 *
 * Uses a local prefix table for instant lookups without a network call.
 */
export function useSortCodeLookup() {
  const [bankName, setBankName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupSortCode = useCallback((sortCode: string) => {
    // Strip dashes and whitespace to normalise input.
    const digits = sortCode.replace(/[\s-]/g, '');

    if (digits.length < 2) {
      setBankName(null);
      setError(null);
      return;
    }

    if (!/^\d{6}$/.test(digits)) {
      setBankName(null);
      setError('Enter a valid 6-digit sort code');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Use a micro-delay to avoid UI flash if this is called during typing.
    setTimeout(() => {
      const prefix = digits.slice(0, 2);
      const match = SORT_CODE_BANKS[prefix] ?? null;

      setBankName(match);
      setIsLoading(false);

      if (!match) {
        setError(null); // Not an error – just unknown
      }
    }, 0);
  }, []);

  return {
    lookupSortCode,
    bankName,
    isLoading,
    error,
  };
}
