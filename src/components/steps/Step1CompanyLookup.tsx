"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { useOnboardingStore } from "@/store/onboardingStore";
import type {
  Person,
  Address,
  CompanyInfo,
  EntityType,
} from "@/store/onboardingStore";
import { CompanySearchInput } from "@/components/form/CompanySearchInput";
import { PhoneInput } from "@/components/form/PhoneInput";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { AIAutofillIndicator } from "@/components/ui/AIAutofillIndicator";
import { useAIAutofill } from "@/hooks/useAIAutofill";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Types for the Companies House / Creditsafe API response
// ---------------------------------------------------------------------------

interface CHNameElements {
  title?: string;
  forename?: string;
  otherForenames?: string;
  middleName?: string;
  surname?: string;
}

interface CHAddress {
  addressLine1?: string;
  addressLine2?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

interface CHOfficer {
  name: string;
  nameElements: CHNameElements;
  role: string;
  dateOfBirth: { month: number; year: number } | null;
  nationality: string | null;
  appointedOn: string | null;
  address: CHAddress | null;
}

interface CHPSC {
  name: string;
  nameElements: CHNameElements;
  dateOfBirth: { month: number; year: number } | null;
  nationality: string | null;
  countryOfResidence: string | null;
  naturesOfControl: string[];
  notifiedOn: string | null;
  address: CHAddress | null;
}

interface CompanyLookupResponse {
  company: {
    companyNumber: string;
    companyName: string;
    companyStatus: string;
    registeredAddress: CHAddress | null;
    sicCodes: string[];
    dateOfCreation: string;
    companyType: string;
    jurisdiction: string;
  };
  officers: CHOfficer[];
  pscs: CHPSC[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatAddress(addr: CHAddress | Address | null | undefined): string {
  if (!addr) return "";
  const parts = [
    (addr as CHAddress).addressLine1 ?? (addr as Address).addressLine1,
    (addr as CHAddress).addressLine2 ?? (addr as Address).addressLine2,
    (addr as CHAddress).locality ?? (addr as Address).city,
    (addr as CHAddress).region ?? (addr as Address).county,
    (addr as CHAddress).postalCode ?? (addr as Address).postcode,
  ].filter(Boolean);
  return parts.join(", ");
}

function normaliseAddressToStore(addr: CHAddress | null): Address | undefined {
  if (!addr) return undefined;
  return {
    addressLine1: addr.addressLine1 || "",
    addressLine2: addr.addressLine2 || "",
    city: addr.locality || "",
    county: addr.region || "",
    postcode: addr.postalCode || "",
    country: addr.country || "United Kingdom",
  };
}

/**
 * Deduplicate officers and PSCs by matching surname + month/year of birth.
 */
function buildPeopleArray(officers: CHOfficer[], pscs: CHPSC[]): Person[] {
  const people: Person[] = [];

  for (const officer of officers) {
    people.push({
      id: uuidv4(),
      source: "companies_house",
      firstName: officer.nameElements?.forename || "",
      middleName: officer.nameElements?.otherForenames || "",
      lastName: officer.nameElements?.surname || "",
      title: officer.nameElements?.title || "",
      dateOfBirth: officer.dateOfBirth
        ? { month: officer.dateOfBirth.month, year: officer.dateOfBirth.year }
        : undefined,
      nationality: officer.nationality || undefined,
      residentialAddress: normaliseAddressToStore(officer.address),
      role: "director",
      naturesOfControl: [],
    });
  }

  for (const psc of pscs) {
    const surname = (psc.nameElements?.surname || "").toLowerCase().trim();
    const dobMonth = psc.dateOfBirth?.month;
    const dobYear = psc.dateOfBirth?.year;

    const matchIndex = people.findIndex((p) => {
      if (p.role !== "director") return false;
      const pSurname = (p.lastName || "").toLowerCase().trim();
      if (pSurname !== surname) return false;
      if (dobMonth && dobYear && p.dateOfBirth) {
        return (
          p.dateOfBirth.month === dobMonth && p.dateOfBirth.year === dobYear
        );
      }
      return !dobMonth && !p.dateOfBirth?.month;
    });

    if (matchIndex >= 0) {
      people[matchIndex] = {
        ...people[matchIndex],
        role: "director_and_psc",
        naturesOfControl: psc.naturesOfControl || [],
        middleName:
          people[matchIndex].middleName || psc.nameElements?.middleName || "",
      };
    } else {
      people.push({
        id: uuidv4(),
        source: "companies_house",
        firstName: psc.nameElements?.forename || "",
        middleName: psc.nameElements?.middleName || "",
        lastName: psc.nameElements?.surname || "",
        title: psc.nameElements?.title || "",
        dateOfBirth: psc.dateOfBirth
          ? { month: psc.dateOfBirth.month, year: psc.dateOfBirth.year }
          : undefined,
        nationality: psc.nationality || undefined,
        residentialAddress: normaliseAddressToStore(psc.address),
        role: "psc",
        naturesOfControl: psc.naturesOfControl || [],
      });
    }
  }

  return people;
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const cardPopVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
  exit: { opacity: 0, scale: 0.95, y: -8, transition: { duration: 0.15 } },
};

// ---------------------------------------------------------------------------
// Entity type options
// ---------------------------------------------------------------------------

const ENTITY_TYPES: {
  value: EntityType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "limited_company",
    label: "Limited Company",
    description: "Registered at Companies House (Ltd, LLP, PLC)",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    value: "sole_trader",
    label: "Sole Trader",
    description: "Self-employed individual with HMRC UTR number",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Step1CompanyLookup() {
  const {
    company,
    contactEmail,
    contactPhone,
    updateCompany,
    setContactInfo,
    addPerson,
    people,
    isLoading,
    setLoading,
    setError,
    clearError,
  } = useOnboardingStore();

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lookupData, setLookupData] = useState<CompanyLookupResponse | null>(
    null,
  );
  const [dataSource, setDataSource] = useState<string>("unknown");

  // AI autofill hook
  const { triggerAutofill, status: aiStatus, filledFields: aiFilledFields, dismiss: aiDismiss } = useAIAutofill();

  // Sole trader debounce ref for AI autofill
  const soleTraderDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entityType = company.entityType || null;

  // ── Entity type selection ─────────────────────────────────────────────
  const handleEntityTypeSelect = (type: EntityType) => {
    // Reset company data when switching entity type
    updateCompany({
      entityType: type,
      companyNumber: undefined,
      companyName: undefined,
      companyStatus: undefined,
      registeredAddress: undefined,
      sicCodes: undefined,
      dateOfCreation: undefined,
      companyType: type === "sole_trader" ? "sole-trader" : undefined,
      jurisdiction: undefined,
      creditCheck: undefined,
      utrNumber: undefined,
      tradingName: undefined,
    });
    // Clear AI-autofilled data from previous company/entity
    const store = useOnboardingStore.getState();
    store.updateBusiness({
      merchantDba: undefined,
      dbaAddressSameAsRegistered: undefined,
      companyUrl: undefined,
      salesUrl: undefined,
      businessType: undefined,
      productsDescription: undefined,
      mcc: undefined,
      tradingHistory: undefined,
      expectedMonthlyVolume: undefined,
      averageTransactionValue: undefined,
      inStoreDetails: undefined,
    });
    store.updateTransactions({
      transactionDescriptor: undefined,
      refundPolicy: undefined,
    });
    store.updateSettlement({
      nameOnAccount: undefined,
    });
    // Remove auto-populated people (CH directors/PSCs and sole trader person)
    const autoPeople = store.people.filter(
      (p) => p.source === "companies_house" || p.role === "sole_trader",
    );
    for (const p of autoPeople) store.removePerson(p.id);
    setLookupData(null);
    setFetchError(null);
    aiDismiss();
  };

  // ── Limited company: handle company selection ─────────────────────────
  const handleCompanySelect = useCallback(
    async (selected: { companyNumber: string; companyName: string }) => {
      setFetchError(null);
      clearError("company");
      setLoading(true);
      aiDismiss();

      // Clear previously AI-filled data so new company gets fresh autofill
      const storeRef = useOnboardingStore.getState();
      storeRef.updateBusiness({
        merchantDba: undefined,
        dbaAddressSameAsRegistered: undefined,
        companyUrl: undefined,
        salesUrl: undefined,
        businessType: undefined,
        productsDescription: undefined,
        mcc: undefined,
        tradingHistory: undefined,
        expectedMonthlyVolume: undefined,
        averageTransactionValue: undefined,
        inStoreDetails: undefined,
        annualTurnover: undefined,
        annualCardTurnover: undefined,
        estAvgTicket: undefined,
      });
      storeRef.updateCompany({
        vatNumber: undefined,
        charityNumber: undefined,
      });
      storeRef.updateOutletSales({ ftf: 0, internet: 0, moto: 0 });
      storeRef.updateOutletDelivery({
        d0: 0,
        d1to7: 0,
        d8to14: 0,
        d15to30: 0,
        dOver30: 0,
      });
      storeRef.updateTransactions({
        transactionDescriptor: undefined,
        refundPolicy: undefined,
      });
      storeRef.updateSettlement({
        nameOnAccount: undefined,
        bankCity: undefined,
        bankAccountType: undefined,
      });

      try {
        const response = await fetch(
          `/api/companies-house/company/${encodeURIComponent(selected.companyNumber)}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch company details");
        }

        const data = await response.json();
        setLookupData(data as CompanyLookupResponse);
        setDataSource(data.source || "unknown");

        updateCompany({
          entityType: "limited_company",
          companyNumber: data.company.companyNumber,
          companyName: data.company.companyName,
          companyStatus: data.company.companyStatus as CompanyInfo["companyStatus"],
          registeredAddress: normaliseAddressToStore(
            data.company.registeredAddress,
          ),
          sicCodes: data.company.sicCodes,
          dateOfCreation: data.company.dateOfCreation,
          companyType: data.company.companyType,
          jurisdiction: data.company.jurisdiction,
        });

        if (data.creditCheck) {
          updateCompany({
            creditCheck: {
              status: "completed",
              creditScore: data.creditCheck.creditScore,
              creditRating: data.creditCheck.creditRating,
              riskLevel: data.creditCheck.riskLevel,
              provider: "creditsafe",
              checkedAt: new Date().toISOString(),
            },
          });
        }

        const newPeople = buildPeopleArray(
          data.officers || [],
          data.pscs || [],
        );

        // Fallback: if the provider returned no officers/PSCs (typical for
        // Creditsafe search-tier), seed a placeholder "self" director so the
        // merchant can identify themselves on Step 3 instead of hitting a blank.
        if (newPeople.length === 0) {
          newPeople.push({
            id: uuidv4(),
            source: "manual",
            firstName: "",
            lastName: "",
            role: "director",
            naturesOfControl: [],
            signatoryType: "SINGLE_SIGNATORY",
            ownershipPercentage: 100,
          });
        }

        const chPeople = people.filter((p) => p.source === "companies_house");
        const store = useOnboardingStore.getState();
        for (const p of chPeople) store.removePerson(p.id);
        for (const p of newPeople) store.addPerson(p);

        // Fire AI autofill immediately (non-blocking, background)
        // When data came from Creditsafe (or the source was missing fields),
        // enable web search so the AI can fill blanks from public sources.
        const isSparse =
          data.source === "creditsafe" ||
          !data.company.sicCodes?.length ||
          !data.company.dateOfCreation ||
          (data.officers || []).length === 0;

        triggerAutofill({
          companyName: data.company.companyName,
          companyNumber: data.company.companyNumber,
          sicCodes: data.company.sicCodes,
          entityType: "limited_company",
          companyType: data.company.companyType,
          registeredAddress: normaliseAddressToStore(data.company.registeredAddress),
          dateOfCreation: data.company.dateOfCreation,
          people: newPeople
            .filter((p) => p.firstName || p.lastName)
            .map((p) => ({
              firstName: p.firstName,
              lastName: p.lastName,
              role: p.role,
              naturesOfControl: p.naturesOfControl,
            })),
          useWebSearch: isSparse,
        });

        if (data.source === "companies_house" && !data.creditCheck) {
          updateCompany({ creditCheck: { status: "pending" } });
          fetch(
            `/api/creditsafe/company-check?companyNumber=${encodeURIComponent(data.company.companyNumber)}`,
          )
            .then((res) => (res.ok ? res.json() : null))
            .then((csData) => {
              if (!csData || csData.status === "skipped") {
                updateCompany({ creditCheck: { status: "skipped" } });
                return;
              }
              const result = csData.results?.[0];
              if (result) {
                updateCompany({
                  creditCheck: {
                    status: "completed",
                    creditScore: result.creditScore,
                    creditRating: result.creditRating,
                    riskLevel: result.riskLevel,
                    provider: result.provider,
                    checkedAt: new Date().toISOString(),
                  },
                });
              }
            })
            .catch(() => {
              updateCompany({ creditCheck: { status: "failed" } });
            });
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to fetch company details";
        setFetchError(message);
        setError("company", message);
      } finally {
        setLoading(false);
      }
    },
    [updateCompany, setContactInfo, addPerson, people, setLoading, setError, clearError, triggerAutofill, aiDismiss],
  );

  // ── Sole trader: handle form updates ──────────────────────────────────
  const handleSoleTraderUpdate = (
    field: "tradingName" | "utrNumber",
    value: string,
  ) => {
    if (field === "tradingName") {
      updateCompany({
        tradingName: value,
        companyName: value, // companyName drives the validation gate
      });
    } else {
      updateCompany({
        utrNumber: value,
        companyNumber: value, // companyNumber drives the validation gate
      });
    }
  };

  const handleSoleTraderAddressUpdate = (addr: Partial<Address>) => {
    updateCompany({
      registeredAddress: { ...(company.registeredAddress || {}), ...addr },
    });
  };

  // ── Sole trader: debounced AI autofill ────────────────────────────────
  useEffect(() => {
    if (entityType !== "sole_trader") return;
    if (!company.tradingName || company.tradingName.length < 3) return;

    if (soleTraderDebounceRef.current) {
      clearTimeout(soleTraderDebounceRef.current);
    }
    soleTraderDebounceRef.current = setTimeout(() => {
      triggerAutofill({
        companyName: company.tradingName!,
        companyNumber: company.utrNumber,
        entityType: "sole_trader",
        registeredAddress: company.registeredAddress,
        useWebSearch: true,
      });
    }, 1500);

    return () => {
      if (soleTraderDebounceRef.current) {
        clearTimeout(soleTraderDebounceRef.current);
      }
    };
  }, [entityType, company.tradingName, company.utrNumber, triggerAutofill]);

  const isInactive =
    entityType === "limited_company" &&
    company.companyStatus &&
    company.companyStatus !== "active";
  const hasCompany =
    entityType === "limited_company" && !!company.companyNumber;
  const hasSoleTrader =
    entityType === "sole_trader" &&
    !!company.tradingName &&
    !!company.utrNumber;

  // ── Sole trader: auto-add the person when they have a trading name ────
  useEffect(() => {
    if (entityType !== "sole_trader") return;
    if (!company.tradingName || !company.utrNumber) return;

    const store = useOnboardingStore.getState();
    const existing = store.people.find((p) => p.role === "sole_trader");
    if (existing) return; // Already created

    store.addPerson({
      id: uuidv4(),
      source: "manual",
      isSelf: true,
      firstName: "",
      lastName: "",
      role: "sole_trader",
      nationality: "British",
      email: contactEmail || undefined,
      phoneNumber: contactPhone || undefined,
      residentialAddress: company.registeredAddress
        ? { ...company.registeredAddress }
        : undefined,
    });
  }, [entityType, company.tradingName, company.utrNumber, contactEmail, contactPhone, company.registeredAddress]);

  // ── Keep sole trader person in sync with contact details ──────────────
  useEffect(() => {
    if (entityType !== "sole_trader") return;
    const store = useOnboardingStore.getState();
    const soleTraderPerson = store.people.find((p) => p.role === "sole_trader");
    if (!soleTraderPerson) return;

    const updates: Partial<Person> = {};
    if (contactEmail && !soleTraderPerson.email) {
      updates.email = contactEmail;
    }
    if (contactPhone && !soleTraderPerson.phoneNumber) {
      updates.phoneNumber = contactPhone;
    }
    if (Object.keys(updates).length > 0) {
      store.updatePerson(soleTraderPerson.id, updates);
    }
  }, [entityType, contactEmail, contactPhone]);

  return (
    <div className="space-y-8">
      {/* ────────── Entity type selector ────────── */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          What type of business are you?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ENTITY_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleEntityTypeSelect(type.value)}
              className={cn(
                "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 cursor-pointer text-center",
                "hover:border-brand/50 hover:bg-brand/5",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                entityType === type.value
                  ? "border-brand bg-brand/5 shadow-sm"
                  : "border-border bg-white",
              )}
            >
              <div
                className={cn(
                  "transition-colors",
                  entityType === type.value
                    ? "text-brand"
                    : "text-muted-foreground",
                )}
              >
                {type.icon}
              </div>
              <span className="text-sm font-medium text-foreground">
                {type.label}
              </span>
              <span className="text-xs text-muted-foreground leading-tight">
                {type.description}
              </span>
              {entityType === type.value && (
                <motion.div
                  layoutId="entity-check"
                  className="absolute top-2 right-2"
                  initial={false}
                >
                  <svg
                    className="w-5 h-5 text-brand"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </motion.div>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Other business type or need help?{" "}
          <a
            href="mailto:support@surfboard.se"
            className="text-brand hover:underline font-medium"
          >
            Contact us
          </a>
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          LIMITED COMPANY FLOW
          ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {entityType === "limited_company" && (
          <motion.div
            key="ltd-flow"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-8"
          >
            {/* Company search */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Find your company
              </label>
              <CompanySearchInput onSelect={handleCompanySelect} />
              <p className="text-xs text-muted-foreground">
                Search by company name or Companies House number
              </p>
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center gap-3 py-8 justify-center">
                <svg
                  className="animate-spin h-5 w-5 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm text-muted-foreground">
                  Looking up company details...
                </span>
              </div>
            )}

            {/* Fetch error */}
            {fetchError && (
              <Alert variant="error" title="Lookup failed" description={fetchError} />
            )}

            {/* Company card */}
            <AnimatePresence mode="wait">
              {hasCompany && !isLoading && (
                <motion.div
                  key={company.companyNumber}
                  variants={cardPopVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <Card variant="elevated" className="space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="text-xl font-semibold text-foreground leading-tight truncate">
                          {company.companyName}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Company number: {company.companyNumber}
                        </p>
                      </div>
                      <Badge
                        variant={isInactive ? "error" : "success"}
                        className="shrink-0 capitalize"
                      >
                        {company.companyStatus}
                      </Badge>
                    </div>

                    {isInactive && (
                      <Alert
                        variant="warning"
                        title="This company is not active"
                        description="Only active companies can proceed with merchant onboarding. Please check the company number and try again."
                      />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          Registered Address
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {formatAddress(company.registeredAddress)}
                        </p>
                      </div>
                      {company.dateOfCreation && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            Incorporated
                          </p>
                          <p className="text-sm text-foreground">
                            {formatDate(company.dateOfCreation)}
                          </p>
                        </div>
                      )}
                      {company.sicCodes && company.sicCodes.length > 0 && (
                        <div className="sm:col-span-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                            SIC Codes
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {company.sicCodes.map((code) => (
                              <Badge key={code} variant="default">
                                {code}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Credit check result */}
                    {company.creditCheck?.status === "completed" && (
                      <div className="grid grid-cols-2 gap-3 bg-muted/50 rounded-lg p-3">
                        {company.creditCheck.creditScore !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Credit Score</p>
                            <p className="text-lg font-semibold font-mono text-foreground">
                              {company.creditCheck.creditScore}
                            </p>
                          </div>
                        )}
                        {company.creditCheck.riskLevel && (
                          <div>
                            <p className="text-xs text-muted-foreground">Risk Level</p>
                            <Badge
                              variant={
                                company.creditCheck.riskLevel === "low"
                                  ? "success"
                                  : company.creditCheck.riskLevel === "medium"
                                    ? "warning"
                                    : "error"
                              }
                              className="mt-1"
                            >
                              {company.creditCheck.riskLevel.replace("_", " ")}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                    {company.creditCheck?.status === "pending" && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Running credit check...
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <svg className="h-4 w-4 text-success shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-xs font-medium text-success">
                        {dataSource === "creditsafe"
                          ? "Verified via Creditsafe"
                          : "Verified via Companies House"}
                      </span>
                      {company.creditCheck?.status === "completed" && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          Credit data by {company.creditCheck.provider}
                        </span>
                      )}
                    </div>
                    {dataSource === "creditsafe" &&
                      (!company.sicCodes?.length ||
                        people.filter((p) => p.source === "companies_house")
                          .length === 0) && (
                        <div className="mt-2 rounded-md bg-warning-light/40 border border-warning/30 px-3 py-2 text-xs text-warning">
                          Limited data available from Creditsafe. AI has
                          estimated some fields; you&rsquo;ll need to enter
                          directors / PSCs manually on the next step.
                        </div>
                      )}
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI autofill indicator */}
            {hasCompany && !isLoading && (
              <AIAutofillIndicator
                status={aiStatus}
                filledFields={aiFilledFields}
                onDismiss={aiDismiss}
              />
            )}

            {/* People summary */}
            <AnimatePresence>
              {hasCompany && !isLoading && lookupData && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {(() => {
                    const chPeople = people.filter(
                      (p) => p.source === "companies_house",
                    );
                    if (chPeople.length === 0) return null;

                    const directors = chPeople.filter(
                      (p) =>
                        p.role === "director" || p.role === "director_and_psc",
                    );
                    const pscOnly = chPeople.filter((p) => p.role === "psc");

                    return (
                      <Card className="space-y-3">
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4 text-info shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
                          </svg>
                          <p className="text-sm font-medium text-foreground">
                            People found
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          We found{" "}
                          <span className="font-medium text-foreground">
                            {directors.length} director
                            {directors.length !== 1 ? "s" : ""}
                          </span>
                          {pscOnly.length > 0 && (
                            <>
                              {" "}and{" "}
                              <span className="font-medium text-foreground">
                                {pscOnly.length} person
                                {pscOnly.length !== 1 ? "s" : ""} with
                                significant control
                              </span>
                            </>
                          )}{" "}
                          from{" "}
                          {dataSource === "creditsafe"
                            ? "Creditsafe"
                            : "Companies House"}{" "}
                          records. You can review and complete their details in
                          the next steps.
                        </p>
                      </Card>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SOLE TRADER FLOW
            ══════════════════════════════════════════════════════════════════ */}
        {entityType === "sole_trader" && (
          <motion.div
            key="sole-trader-flow"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            <Card className="space-y-5">
              <div>
                <h3 className="text-base font-medium text-foreground">
                  Sole trader details
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your trading name and HMRC details
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Trading name (DBA)"
                  placeholder="e.g. Acme Beauty Studio"
                  value={company.tradingName || ""}
                  onChange={(e) =>
                    handleSoleTraderUpdate("tradingName", e.target.value)
                  }
                />
                <Input
                  label="UTR number"
                  placeholder="10-digit HMRC reference"
                  value={company.utrNumber || ""}
                  onChange={(e) => {
                    // Only allow digits, max 10
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    handleSoleTraderUpdate("utrNumber", val);
                  }}
                  inputMode="numeric"
                />
              </div>

              {/* Trading address */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Trading address
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <Input
                    label="Address line 1"
                    placeholder="Street address"
                    value={company.registeredAddress?.addressLine1 || ""}
                    onChange={(e) =>
                      handleSoleTraderAddressUpdate({
                        addressLine1: e.target.value,
                      })
                    }
                  />
                  <Input
                    label="Address line 2"
                    placeholder="Optional"
                    value={company.registeredAddress?.addressLine2 || ""}
                    onChange={(e) =>
                      handleSoleTraderAddressUpdate({
                        addressLine2: e.target.value,
                      })
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="City"
                      placeholder="City or town"
                      value={company.registeredAddress?.city || ""}
                      onChange={(e) =>
                        handleSoleTraderAddressUpdate({ city: e.target.value })
                      }
                    />
                    <Input
                      label="Postcode"
                      placeholder="e.g. SW1A 1AA"
                      value={company.registeredAddress?.postcode || ""}
                      onChange={(e) =>
                        handleSoleTraderAddressUpdate({
                          postcode: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Confirmation card for sole trader */}
            <AnimatePresence>
              {hasSoleTrader && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="space-y-3 bg-success-light/30 border-success/20">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-success shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm font-medium text-foreground">
                        Sole trader details captured
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {company.tradingName}
                      </span>{" "}
                      &middot; UTR: {company.utrNumber}
                      {company.registeredAddress?.postcode && (
                        <> &middot; {company.registeredAddress.postcode}</>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      As a sole trader, you&apos;ll be added as the business owner in the next step.
                      Your ID verification will be required.
                    </p>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI autofill indicator for sole trader */}
            {hasSoleTrader && (
              <AIAutofillIndicator
                status={aiStatus}
                filledFields={aiFilledFields}
                onDismiss={aiDismiss}
              />
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* ────────── Contact info (shown for all entity types) ────────── */}
      <AnimatePresence>
        {((hasCompany && !isLoading && !isInactive) || hasSoleTrader) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-5"
          >
            <div>
              <h3 className="text-base font-medium text-foreground">
                Contact details
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                How should we reach you about this application?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email address"
                type="email"
                placeholder="you@business.co.uk"
                value={contactEmail}
                onChange={(e) =>
                  setContactInfo(e.target.value, contactPhone)
                }
              />
              <PhoneInput
                label="Phone number"
                value={contactPhone}
                onChange={(value) => setContactInfo(contactEmail, value)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
