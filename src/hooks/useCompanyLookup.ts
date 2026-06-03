'use client';

import { useState, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Response shapes returned by our internal API routes
// ---------------------------------------------------------------------------

export interface CompanySearchResult {
  companyNumber: string;
  title: string;
  companyStatus: string;
  companyType: string;
  dateOfCreation: string;
  addressSnippet: string;
}

export interface CompanyAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}

export interface CompanyData {
  companyNumber: string;
  companyName: string;
  companyStatus: string;
  companyType: string;
  dateOfCreation: string;
  jurisdiction: string;
  registeredAddress: CompanyAddress;
  sicCodes: string[];
}

export interface Officer {
  name: string;
  role: string;
  appointedOn: string;
  resignedOn?: string;
  dateOfBirth?: { month: number; year: number };
  nationality?: string;
  occupation?: string;
  address?: CompanyAddress;
}

export interface PSC {
  name: string;
  naturesOfControl: string[];
  notifiedOn: string;
  ceasedOn?: string;
  dateOfBirth?: { month: number; year: number };
  nationality?: string;
  address?: CompanyAddress;
  kind: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const SEARCH_DEBOUNCE_MS = 300;

export function useCompanyLookup() {
  // Search state
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Full lookup state
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [pscs, setPscs] = useState<PSC[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Debounced search ────────────────────────────────────────────────────

  const searchCompanies = useCallback((query: string) => {
    // Clear previous timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    searchTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/companies-house/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );

        if (!res.ok) {
          throw new Error('Search failed');
        }

        const data = await res.json();
        setSearchResults(data.items ?? []);
        setError(null);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Failed to search companies. Please try again.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  // ── Full company lookup ─────────────────────────────────────────────────

  const lookupCompany = useCallback(async (companyNumber: string) => {
    setIsLoading(true);
    setError(null);
    setCompanyData(null);
    setOfficers([]);
    setPscs([]);

    try {
      const res = await fetch(
        `/api/companies-house/company/${encodeURIComponent(companyNumber)}`,
      );

      if (!res.ok) {
        throw new Error('Lookup failed');
      }

      const data = await res.json();

      setCompanyData(data.company ?? null);
      setOfficers(data.officers ?? []);
      setPscs(data.pscs ?? []);
    } catch {
      setError('Failed to look up company. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // Search
    searchCompanies,
    searchResults,
    isSearching,

    // Full lookup
    lookupCompany,
    companyData,
    officers,
    pscs,
    isLoading,

    // Error
    error,
  };
}
