"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  placeholder?: string;
  error?: string;
}

export function CompanySearchInput({
  onSelect,
  placeholder = "Search by company name or number...",
  error,
}: CompanySearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchCompanies = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/companies-house/search?q=${encodeURIComponent(q)}`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setIsOpen(true);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCompanies(value), 300);
  };

  const handleSelect = (company: CompanyResult) => {
    setQuery(company.companyName);
    setIsOpen(false);
    setResults([]);
    onSelect(company);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "w-full pl-10 pr-10 py-3 text-base border rounded-lg bg-white transition-colors",
            "placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground",
            error
              ? "border-error focus:ring-error/20 focus:border-error"
              : "border-border"
          )}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="company-search-results"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="animate-spin w-4 h-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <ul
          ref={listRef}
          id="company-search-results"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {results.map((company, index) => (
            <li
              key={company.companyNumber}
              role="option"
              aria-selected={index === selectedIndex}
              className={cn(
                "px-4 py-3 cursor-pointer transition-colors border-b border-border/50 last:border-0",
                index === selectedIndex
                  ? "bg-muted"
                  : "hover:bg-muted/50"
              )}
              onClick={() => handleSelect(company)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {company.companyName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {company.companyNumber} &middot;{" "}
                    {company.addressSnippet}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                    company.companyStatus === "active"
                      ? "bg-success-light text-success"
                      : "bg-error-light text-error"
                  )}
                >
                  {company.companyStatus}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            No companies found for &quot;{query}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
