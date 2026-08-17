"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useOnboardingStore } from "@/store/onboardingStore";
import type {
  Address,
  CompanyInfo,
  EntityType,
  Person,
} from "@/store/onboardingStore";
import { CompanySearchInput } from "@/components/form/CompanySearchInput";
import { PhoneInput } from "@/components/form/PhoneInput";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { AIAutofillIndicator } from "@/components/ui/AIAutofillIndicator";
import { useAIAutofill } from "@/hooks/useAIAutofill";
import { addressLine, formatUkDate } from "@/lib/utils/prose";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Companies House / Creditsafe response shapes
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

function normaliseAddress(addr: CHAddress | null): Address | undefined {
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

/** Merge officers and PSCs, matching the same human by surname + month/year of birth. */
function buildPeopleArray(officers: CHOfficer[], pscs: CHPSC[]): Person[] {
  const people: Person[] = officers.map((officer) => ({
    id: uuidv4(),
    source: "companies_house" as const,
    firstName: officer.nameElements?.forename || "",
    middleName: officer.nameElements?.otherForenames || "",
    lastName: officer.nameElements?.surname || "",
    title: officer.nameElements?.title || "",
    dateOfBirth: officer.dateOfBirth
      ? { month: officer.dateOfBirth.month, year: officer.dateOfBirth.year }
      : undefined,
    nationality: officer.nationality || undefined,
    residentialAddress: normaliseAddress(officer.address),
    role: "director" as const,
    naturesOfControl: [],
  }));

  for (const psc of pscs) {
    const surname = (psc.nameElements?.surname || "").toLowerCase().trim();
    const dobMonth = psc.dateOfBirth?.month;
    const dobYear = psc.dateOfBirth?.year;

    const matchIndex = people.findIndex((p) => {
      if (p.role !== "director") return false;
      if ((p.lastName || "").toLowerCase().trim() !== surname) return false;
      if (dobMonth && dobYear && p.dateOfBirth) {
        return p.dateOfBirth.month === dobMonth && p.dateOfBirth.year === dobYear;
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
        residentialAddress: normaliseAddress(psc.address),
        role: "psc",
        naturesOfControl: psc.naturesOfControl || [],
      });
    }
  }

  return people;
}

/**
 * People that belong to the previously chosen company: everything the lookup
 * produced, plus the nameless placeholder we seed when a provider returns no
 * officers. Leaving those behind means blank directors pile up every time the
 * merchant changes their mind about which company they are.
 */
function isDerivedPerson(person: Person): boolean {
  return (
    person.source === "companies_house" ||
    person.role === "sole_trader" ||
    (person.source === "manual" && !person.firstName && !person.lastName)
  );
}

/** Everything downstream that was derived from the previous company. */
function clearDerivedData() {
  const store = useOnboardingStore.getState();
  store.updateBusiness({
    merchantDba: undefined,
    dbaAddress: undefined,
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
  store.updateCompany({ vatNumber: undefined, charityNumber: undefined });
  store.updateOutletSales({ ftf: 0, internet: 0, moto: 0 });
  store.updateOutletDelivery({ d0: 0, d1to7: 0, d8to14: 0, d15to30: 0, dOver30: 0 });
  store.updateTransactions({
    transactionDescriptor: undefined,
    refundPolicy: undefined,
  });
  store.updateSettlement({
    nameOnAccount: undefined,
    bankCity: undefined,
    bankAccountType: undefined,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepCompany() {
  const {
    company,
    people,
    contactEmail,
    contactPhone,
    updateCompany,
    setContactInfo,
    isLoading,
    setLoading,
    setError,
    clearError,
  } = useOnboardingStore();

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>("unknown");
  const [foundPeople, setFoundPeople] = useState<{ directors: number; owners: number } | null>(null);

  const {
    triggerAutofill,
    status: aiStatus,
    filledFields: aiFilled,
    dismiss: aiDismiss,
  } = useAIAutofill();

  const soleTraderDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entityType = company.entityType ?? "limited_company";
  const isSoleTrader = entityType === "sole_trader";
  const hasCompany = !isSoleTrader && !!company.companyNumber;
  const hasSoleTrader =
    isSoleTrader && !!company.tradingName && !!company.utrNumber;
  const isDormant =
    hasCompany && !!company.companyStatus && company.companyStatus !== "active";

  // ── Switching between limited company and sole trader ──────────────────

  const switchEntityType = (type: EntityType) => {
    const store = useOnboardingStore.getState();
    store.updateCompany({
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
    clearDerivedData();
    for (const p of store.people.filter(isDerivedPerson)) {
      store.removePerson(p.id);
    }
    setFoundPeople(null);
    setFetchError(null);
    aiDismiss();
  };

  // ── Company chosen ─────────────────────────────────────────────────────

  const handleCompanySelect = useCallback(
    async (selected: { companyNumber: string; companyName: string }) => {
      setFetchError(null);
      clearError("company");
      setLoading(true);
      aiDismiss();
      clearDerivedData();

      try {
        const response = await fetch(
          `/api/companies-house/company/${encodeURIComponent(selected.companyNumber)}`,
        );
        if (!response.ok) throw new Error("We couldn't load that company's details.");

        const data = await response.json();
        setDataSource(data.source || "unknown");

        updateCompany({
          entityType: "limited_company",
          companyNumber: data.company.companyNumber,
          companyName: data.company.companyName,
          companyStatus: data.company.companyStatus as CompanyInfo["companyStatus"],
          registeredAddress: normaliseAddress(data.company.registeredAddress),
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

        const newPeople = buildPeopleArray(data.officers || [], data.pscs || []);

        // Creditsafe's search tier returns no officers. Seed one blank director
        // so step three has something to open rather than an empty list.
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

        const store = useOnboardingStore.getState();
        for (const p of store.people.filter(isDerivedPerson)) {
          store.removePerson(p.id);
        }
        for (const p of newPeople) store.addPerson(p);

        setFoundPeople({
          directors: newPeople.filter(
            (p) => p.role === "director" || p.role === "director_and_psc",
          ).length,
          owners: newPeople.filter(
            (p) => p.role === "psc" || p.role === "director_and_psc",
          ).length,
        });

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
          registeredAddress: normaliseAddress(data.company.registeredAddress),
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
            `/api/creditsafe/company-check?companyNumber=${encodeURIComponent(
              data.company.companyNumber,
            )}`,
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
            .catch(() => updateCompany({ creditCheck: { status: "failed" } }));
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "We couldn't load that company's details.";
        setFetchError(message);
        setError("company", message);
      } finally {
        setLoading(false);
      }
    },
    [updateCompany, setLoading, setError, clearError, triggerAutofill, aiDismiss],
  );

  // ── Sole trader ────────────────────────────────────────────────────────

  const updateSoleTrader = (field: "tradingName" | "utrNumber", value: string) => {
    updateCompany(
      field === "tradingName"
        ? { tradingName: value, companyName: value }
        : { utrNumber: value, companyNumber: value },
    );
  };

  const updateSoleTraderAddress = (patch: Partial<Address>) => {
    updateCompany({
      registeredAddress: { ...(company.registeredAddress || {}), ...patch },
    });
  };

  useEffect(() => {
    if (!isSoleTrader) return;
    if (!company.tradingName || company.tradingName.length < 3) return;

    if (soleTraderDebounce.current) clearTimeout(soleTraderDebounce.current);
    soleTraderDebounce.current = setTimeout(() => {
      triggerAutofill({
        companyName: company.tradingName!,
        companyNumber: company.utrNumber,
        entityType: "sole_trader",
        registeredAddress: company.registeredAddress,
        useWebSearch: true,
      });
    }, 1500);

    return () => {
      if (soleTraderDebounce.current) clearTimeout(soleTraderDebounce.current);
    };
  }, [
    isSoleTrader,
    company.tradingName,
    company.utrNumber,
    company.registeredAddress,
    triggerAutofill,
  ]);

  useEffect(() => {
    if (!isSoleTrader) return;
    if (!company.tradingName || !company.utrNumber) return;

    const store = useOnboardingStore.getState();
    if (store.people.some((p) => p.role === "sole_trader")) return;

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
  }, [
    isSoleTrader,
    company.tradingName,
    company.utrNumber,
    company.registeredAddress,
    contactEmail,
    contactPhone,
  ]);

  useEffect(() => {
    if (!isSoleTrader) return;
    const store = useOnboardingStore.getState();
    const self = store.people.find((p) => p.role === "sole_trader");
    if (!self) return;

    const patch: Partial<Person> = {};
    if (contactEmail && !self.email) patch.email = contactEmail;
    if (contactPhone && !self.phoneNumber) patch.phoneNumber = contactPhone;
    if (Object.keys(patch).length > 0) store.updatePerson(self.id, patch);
  }, [isSoleTrader, contactEmail, contactPhone]);

  const chCount = people.filter((p) => p.source === "companies_house").length;
  const showContact = (hasCompany && !isLoading) || hasSoleTrader;
  const sparseResult = hasCompany && chCount === 0;

  return (
    <>
      {/* ── Limited company ─────────────────────────────────────────────── */}
      {!isSoleTrader && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
              What&apos;s your company called?
            </h2>
            <p className="mt-1.5 max-w-[62ch] text-base leading-relaxed text-ink-muted">
              We search the Companies House register. Pick yours and we&apos;ll
              bring across your address, directors and owners.
            </p>
          </div>

          {/* Keyed on the chosen company so rejecting it empties the box
              rather than leaving the rejected name sitting in the field. */}
          <CompanySearchInput
            key={company.companyNumber ?? "no-company"}
            onSelect={handleCompanySelect}
            initialQuery={company.companyName || ""}
            error={fetchError ?? undefined}
            disabled={isLoading}
          />

          {isLoading && (
            <div className="is-working flex items-center gap-3 rounded-[var(--radius-md)] border border-accent-edge bg-accent-wash px-4 py-3.5">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-accent" />
              <p aria-live="polite" className="text-base text-ink">
                Fetching your company from Companies House
              </p>
            </div>
          )}

          {!hasCompany && !isLoading && (
            <button
              type="button"
              onClick={() => switchEntityType("sole_trader")}
              className="-mx-1.5 self-start cursor-pointer rounded-[var(--radius-xs)] px-1.5 py-2 text-base text-accent underline decoration-accent/35 underline-offset-4 transition-colors duration-[var(--dur-tap)] hover:text-accent-hover hover:decoration-accent/70"
            >
              I&apos;m a sole trader, not a registered company
            </button>
          )}
        </section>
      )}

      {/* ── Confirmed company ───────────────────────────────────────────── */}
      {hasCompany && !isLoading && (
        <section
          className={cn(
            "animate-rise rounded-[var(--radius-lg)] border px-5 py-5",
            isDormant
              ? "border-warn-edge bg-warn-wash"
              : "border-ok-edge bg-ok-wash",
          )}
        >
          <div className="flex items-start gap-3">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn("mt-1 h-4 w-4 shrink-0", isDormant ? "text-warn" : "text-ok")}
              aria-hidden="true"
            >
              <path d="m3 8.5 3.2 3.2L13 4.8" />
            </svg>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">
                {company.companyName}
              </h3>
              <dl className="mt-3 flex flex-col gap-1.5 text-base leading-relaxed text-ink-muted">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="sr-only">Company number</dt>
                  <dd>
                    Company number{" "}
                    <span className="font-mono text-ink">{company.companyNumber}</span>
                    {company.dateOfCreation && (
                      <>
                        , incorporated{" "}
                        <span className="text-ink">
                          {formatUkDate(company.dateOfCreation)}
                        </span>
                      </>
                    )}
                  </dd>
                </div>
                {company.registeredAddress && (
                  <div>
                    <dt className="sr-only">Registered address</dt>
                    <dd>
                      Registered at{" "}
                      <span className="text-ink">
                        {addressLine(company.registeredAddress)}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>

              <p className="mt-3.5 font-mono text-2xs uppercase tracking-[0.08em] text-ok">
                {/* After a reload the provider is no longer known, so say what
                    is still true rather than naming the wrong one. */}
                {dataSource === "creditsafe"
                  ? "Verified via Creditsafe"
                  : dataSource === "companies_house"
                    ? "Verified via Companies House"
                    : "Verified against public records"}
                {company.creditCheck?.status === "pending" && (
                  <span className="text-ink-subtle"> · checks running</span>
                )}
                {company.creditCheck?.status === "completed" && (
                  <span className="text-ink-subtle"> · checks done</span>
                )}
              </p>

              <button
                type="button"
                onClick={() => switchEntityType("limited_company")}
                className="-mx-1.5 mt-2 cursor-pointer rounded-[var(--radius-xs)] px-1.5 py-2 text-base text-accent underline decoration-accent/35 underline-offset-4 transition-colors duration-[var(--dur-tap)] hover:text-accent-hover hover:decoration-accent/70"
              >
                This isn&apos;t my company
              </button>
            </div>
          </div>

          {/* Creditsafe's search tier answers with a name and an address and
              nothing else. Say so, rather than letting step three surprise
              them with an empty list of directors. */}
          {sparseResult && !isDormant && (
            <p className="mt-4 border-t border-ok-edge pt-4 text-base leading-relaxed text-ink-muted">
              Our records didn&apos;t include your directors this time, so
              you&apos;ll add them yourself on the last step. Everything else we
              could find is already filled in.
            </p>
          )}

          {isDormant && (
            <p className="mt-4 border-t border-warn-edge pt-4 text-base leading-relaxed text-ink">
              Companies House lists this company as{" "}
              <strong className="font-semibold">
                {company.companyStatus?.replace(/-/g, " ")}
              </strong>
              . We can only onboard active companies. Pick a different company, or{" "}
              <a
                href="mailto:support@surfboardpayments.com"
                className="text-accent underline decoration-accent/35 underline-offset-4 hover:decoration-accent/70"
              >
                email us
              </a>{" "}
              and we&apos;ll take a look.
            </p>
          )}
        </section>
      )}

      {/* ── Sole trader ─────────────────────────────────────────────────── */}
      {isSoleTrader && (
        <section className="flex flex-col gap-5">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
              Your sole trader details
            </h2>
            <p className="mt-1.5 max-w-[62ch] text-base leading-relaxed text-ink-muted">
              You aren&apos;t on the Companies House register, so we need these
              three things from you directly.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Trading name"
              placeholder="Acme Beauty Studio"
              autoComplete="organization"
              value={company.tradingName || ""}
              onChange={(e) => updateSoleTrader("tradingName", e.target.value)}
              helperText="The name your customers know you by"
            />
            <Input
              label="UTR number"
              placeholder="1234567890"
              inputMode="numeric"
              autoComplete="off"
              className="font-mono"
              value={company.utrNumber || ""}
              onChange={(e) =>
                updateSoleTrader("utrNumber", e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              helperText="Ten digits, on any letter from HMRC"
            />
          </div>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-sm font-medium text-ink">Trading address</legend>
            <Input
              label="Address line 1"
              placeholder="12 High Street"
              autoComplete="street-address"
              value={company.registeredAddress?.addressLine1 || ""}
              onChange={(e) => updateSoleTraderAddress({ addressLine1: e.target.value })}
            />
            <Input
              label="Address line 2"
              placeholder="Optional"
              value={company.registeredAddress?.addressLine2 || ""}
              onChange={(e) => updateSoleTraderAddress({ addressLine2: e.target.value })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Town or city"
                autoComplete="address-level2"
                value={company.registeredAddress?.city || ""}
                onChange={(e) => updateSoleTraderAddress({ city: e.target.value })}
              />
              <Input
                label="Postcode"
                placeholder="SW1A 1AA"
                autoComplete="postal-code"
                className="font-mono uppercase placeholder:font-sans placeholder:normal-case"
                value={company.registeredAddress?.postcode || ""}
                onChange={(e) =>
                  updateSoleTraderAddress({ postcode: e.target.value.toUpperCase() })
                }
              />
            </div>
          </fieldset>

          <button
            type="button"
            onClick={() => switchEntityType("limited_company")}
            className="-mx-1.5 self-start cursor-pointer rounded-[var(--radius-xs)] px-1.5 py-2 text-base text-accent underline decoration-accent/35 underline-offset-4 transition-colors duration-[var(--dur-tap)] hover:text-accent-hover hover:decoration-accent/70"
          >
            Actually, we&apos;re a registered company
          </button>

          {hasSoleTrader && (
            <Alert
              variant="success"
              title="That's your business recorded"
              description="You'll confirm your own personal details on the last step, since as a sole trader you are the business."
            />
          )}
        </section>
      )}

      {/* ── What the lookups produced ───────────────────────────────────── */}
      {(hasCompany || hasSoleTrader) && !isLoading && (
        <AIAutofillIndicator
          status={aiStatus}
          filledFields={aiFilled}
          onDismiss={aiDismiss}
        />
      )}

      {hasCompany && !isLoading && foundPeople && chCount > 0 && (
        <p className="animate-rise text-base leading-relaxed text-ink-muted">
          We also found{" "}
          <strong className="font-semibold text-ink">
            {foundPeople.directors} director{foundPeople.directors === 1 ? "" : "s"}
          </strong>
          {foundPeople.owners > 0 && (
            <>
              {" "}and{" "}
              <strong className="font-semibold text-ink">
                {foundPeople.owners} owner{foundPeople.owners === 1 ? "" : "s"}
              </strong>
            </>
          )}
          . You&apos;ll check them on the last step.
        </p>
      )}

      {/* ── Contact ─────────────────────────────────────────────────────── */}
      {showContact && (
        <section className="animate-rise flex flex-col gap-4 border-t border-line pt-8">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
              How do we reach you?
            </h2>
            <p className="mt-1.5 max-w-[62ch] text-base leading-relaxed text-ink-muted">
              One person to contact about this application. We only get in touch
              if something needs your attention.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@yourbusiness.co.uk"
              value={contactEmail}
              onChange={(e) => setContactInfo(e.target.value, contactPhone)}
            />
            <PhoneInput
              label="Phone number"
              value={contactPhone}
              onChange={(value) => setContactInfo(contactEmail, value)}
            />
          </div>
        </section>
      )}
    </>
  );
}
