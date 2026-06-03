'use client';

import { useState, useCallback } from 'react';

export interface PostcodeAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}

/**
 * Hook for looking up UK addresses by postcode via our internal API route.
 */
export function usePostcodeLookup() {
  const [addresses, setAddresses] = useState<PostcodeAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupPostcode = useCallback(async (postcode: string) => {
    const trimmed = postcode.trim();

    if (!trimmed) {
      setAddresses([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAddresses([]);

    try {
      const res = await fetch(
        `/api/postcode/lookup?postcode=${encodeURIComponent(trimmed)}`,
      );

      if (!res.ok) {
        throw new Error('Postcode lookup failed');
      }

      const data = await res.json();
      setAddresses(data.addresses ?? []);
    } catch {
      setError('Failed to look up postcode. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    lookupPostcode,
    addresses,
    isLoading,
    error,
  };
}
