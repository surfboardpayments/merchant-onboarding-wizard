"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface CompanyResult {
  companyNumber: string;
  companyName: string;
  companyStatus: string;
  companyType: string;
  addressSnippet: string;
  dateOfCreation: string;
}

interface CompanySearchInputProps {
  onSelect: (company: CompanyResult) => void;
  /** Pre-fills the box when a company is already chosen. */
  initialQuery?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

const MIN_QUERY = 2;

/**
 * The first and most important control in the flow. Everything downstream is
 * pre-filled from what this returns, so it gets the size and the prominence
 * that importance deserves.
 */
export function CompanySearchInput({
  onSelect,
  initialQuery = "",
  placeholder = "Start typing your company name",
  error,
  disabled = false,
}: CompanySearchInputProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searched, setSearched] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const listboxId = useId();
  const statusId = useId();

  const search = useCallback(async (q: string) => {
    if (q.trim().length < MIN_QUERY) {
      setResults([]);
      setIsOpen(false);
      setSearched(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setIsOpen(true);

    try {
      const response = await fetch(
        `/api/companies-house/search?q=${encodeURIComponent(q)}`,
      );
      // A slow earlier request must not overwrite a fast later one.
      if (requestId !== requestIdRef.current) return;

      const data = response.ok ? await response.json() : { results: [] };
      setResults(data.results || []);
      setActiveIndex(-1);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setResults([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setSearched(true);
      }
    }
  }, []);

  const handleChange = (nextValue: string) => {
    setQuery(nextValue);
    setActiveIndex(-1);
    setSearched(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(nextValue), 280);
  };

  const choose = (company: CompanyResult) => {
    setQuery(company.companyName);
    setIsOpen(false);
    setResults([]);
    onSelect(company);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      choose(results[activeIndex]);
    }
  };

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const showEmpty = isOpen && searched && !isLoading && results.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m13.5 13.5 3.5 3.5" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          aria-describedby={statusId}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          spellCheck={false}
          value={query}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "h-14 w-full rounded-[var(--radius-md)] border bg-surface pl-12 pr-12 text-md text-ink",
            "placeholder:text-ink-subtle",
            "transition-[border-color,box-shadow] duration-[var(--dur-tap)] ease-[var(--ease-out)]",
            "hover:border-ink-subtle",
            "focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-wash)] focus:outline-none",
            "disabled:cursor-not-allowed disabled:bg-surface-sunk",
            error ? "border-danger" : "border-field-line",
          )}
        />

        {isLoading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2" aria-hidden="true">
            <svg className="h-4 w-4 animate-spin text-ink-subtle" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-30" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </span>
        )}

        {!isLoading && query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
              setSearched(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[var(--radius-xs)] text-ink-subtle transition-colors duration-[var(--dur-tap)] hover:bg-surface-sunk hover:text-ink"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>
        )}
      </div>

      <p id={statusId} aria-live="polite" className="sr-only">
        {isLoading
          ? "Searching Companies House"
          : searched
            ? `${results.length} ${results.length === 1 ? "company" : "companies"} found`
            : ""}
      </p>

      {error && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}

      {isOpen && (isLoading || results.length > 0) && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Company search results"
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100]",
            "max-h-[22rem] overflow-y-auto overscroll-contain",
            "rounded-[var(--radius-md)] border border-line-strong bg-surface shadow-[var(--shadow-card)]",
          )}
        >
          {isLoading && results.length === 0
            ? // Skeletons preview the shape of what's coming; a spinner doesn't.
              [0, 1, 2].map((i) => (
                <li key={i} className="border-b border-line px-4 py-3.5 last:border-0">
                  <div className="h-3.5 w-1/2 animate-pulse rounded bg-surface-veil" />
                  <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-surface-sunk" />
                </li>
              ))
            : results.map((company, index) => {
                const active = index === activeIndex;
                const isActive = company.companyStatus === "active";
                return (
                  <li
                    key={company.companyNumber}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={active}
                    onClick={() => choose(company)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "cursor-pointer border-b border-line px-4 py-3.5 last:border-0",
                      "transition-colors duration-[var(--dur-tap)]",
                      active ? "bg-accent-wash" : "hover:bg-surface-sunk",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium text-ink">
                          {company.companyName}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-ink-muted">
                          <span className="font-mono">{company.companyNumber}</span>
                          {company.addressSnippet ? ` · ${company.addressSnippet}` : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          isActive ? "bg-ok-wash text-ok" : "bg-warn-wash text-warn",
                        )}
                      >
                        {company.companyStatus?.replace(/-/g, " ")}
                      </span>
                    </div>
                  </li>
                );
              })}
        </ul>
      )}

      {showEmpty && (
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100]",
            "rounded-[var(--radius-md)] border border-line-strong bg-surface px-4 py-4 shadow-[var(--shadow-card)]",
          )}
        >
          <p className="text-base font-medium text-ink">
            Nothing matched &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Try your registered name rather than your trading name, or search by
            your eight-digit company number.
          </p>
        </div>
      )}
    </div>
  );
}
