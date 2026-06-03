"use client";

import { useCallback, useState } from "react";
import { useOnboardingStore } from "@/store/onboardingStore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAddress(address?: {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
}): string {
  if (!address) return "Not provided";
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.county,
    address.postcode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function maskSortCode(sortCode?: string): string {
  if (!sortCode) return "Not provided";
  const raw = sortCode.replace(/\D/g, "");
  if (raw.length < 6) return sortCode;
  return `${raw.slice(0, 2)}-${raw.slice(2, 4)}-**`;
}

function maskAccountNumber(accountNumber?: string): string {
  if (!accountNumber) return "Not provided";
  if (accountNumber.length < 4) return "****";
  return "****" + accountNumber.slice(-4);
}

function formatDob(dob?: { day?: number; month?: number; year?: number }): string {
  if (!dob || !dob.day || !dob.month || !dob.year) return "Not provided";
  return `${String(dob.day).padStart(2, "0")}/${String(dob.month).padStart(2, "0")}/${dob.year}`;
}

const companyStatusVariant = (
  status?: string
): "success" | "warning" | "error" | "default" => {
  if (status === "active") return "success";
  if (status === "dissolved" || status === "liquidation") return "error";
  if (status) return "warning";
  return "default";
};

const roleLabels: Record<string, string> = {
  director: "Director",
  psc: "PSC",
  ubo: "UBO",
  director_and_psc: "Director & PSC",
};

const refundPolicyLabels: Record<string, string> = {
  full_refund: "Full refund within 30 days",
  partial_refund: "Partial refund",
  no_refunds: "No refunds",
  custom: "Custom",
};

const businessTypeLabels: Record<string, string> = {
  online_only: "Online only",
  in_store_only: "In-store only",
  both: "Online & in-store",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  stepNumber,
  onEdit,
}: {
  title: string;
  stepNumber: number;
  onEdit: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(stepNumber)}
        type="button"
      >
        Edit
      </Button>
    </div>
  );
}

function DataRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b border-border/50 last:border-b-0">
      <dt className="text-sm text-muted-foreground sm:w-44 shrink-0">{label}</dt>
      <dd
        className={cn(
          "text-sm text-foreground break-words",
          mono && "font-mono tracking-wide"
        )}
      >
        {value || <span className="text-muted-foreground italic">Not provided</span>}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Step6ReviewProps {
  onEditStep: (step: number) => void;
}

export default function Step6Review({ onEditStep }: Step6ReviewProps) {
  const company = useOnboardingStore((s) => s.company);
  const business = useOnboardingStore((s) => s.business);
  const people = useOnboardingStore((s) => s.people);
  const transactions = useOnboardingStore((s) => s.transactions);
  const settlement = useOnboardingStore((s) => s.settlement);
  const consent = useOnboardingStore((s) => s.consent);
  const contactEmail = useOnboardingStore((s) => s.contactEmail);
  const contactPhone = useOnboardingStore((s) => s.contactPhone);
  const updateConsent = useOnboardingStore((s) => s.updateConsent);

  const [termsAccepted, setTermsAccepted] = useState(
    consent.termsAccepted ?? false
  );
  const [privacyAccepted, setPrivacyAccepted] = useState(
    consent.privacyPolicyAccepted ?? false
  );

  const handleTermsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTermsAccepted(e.target.checked);
      updateConsent({ termsAccepted: e.target.checked });
    },
    [updateConsent]
  );

  const handlePrivacyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPrivacyAccepted(e.target.checked);
      updateConsent({ privacyPolicyAccepted: e.target.checked });
    },
    [updateConsent]
  );

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">
          Review your application
        </h2>
        <p className="text-sm text-muted-foreground">
          Please review all information before submitting. Click &lsquo;Edit&rsquo; on
          any section to make changes.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. Company Information                                              */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <SectionHeader title="Company Information" stepNumber={1} onEdit={onEditStep} />
        <dl className="space-y-0">
          <DataRow label="Company name" value={company.companyName} />
          <DataRow label="Company number" value={company.companyNumber} mono />
          <DataRow
            label="Status"
            value={
              company.companyStatus ? (
                <Badge variant={companyStatusVariant(company.companyStatus)}>
                  {company.companyStatus.replace(/-/g, " ")}
                </Badge>
              ) : undefined
            }
          />
          <DataRow
            label="Registered address"
            value={formatAddress(company.registeredAddress)}
          />
          <DataRow label="Contact email" value={contactEmail || undefined} />
          <DataRow label="Contact phone" value={contactPhone || undefined} />
        </dl>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Business Details                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <SectionHeader title="Business Details" stepNumber={2} onEdit={onEditStep} />
        <dl className="space-y-0">
          <DataRow label="Trading name (DBA)" value={business.merchantDba} />
          <DataRow
            label="Trading address"
            value={
              business.dbaAddressSameAsRegistered
                ? "Same as registered address"
                : formatAddress(business.dbaAddress)
            }
          />
          <DataRow label="Website" value={business.companyUrl} />
          <DataRow label="Sales URL" value={business.salesUrl} />
          <DataRow
            label="Business type"
            value={
              business.businessType ? (
                <Badge variant="info">
                  {businessTypeLabels[business.businessType] ?? business.businessType}
                </Badge>
              ) : undefined
            }
          />
          <DataRow label="Products / services" value={business.productsDescription} />
          <DataRow label="MCC" value={business.mcc} mono />

          {/* In-store details */}
          {(business.businessType === "in_store_only" ||
            business.businessType === "both") &&
            business.inStoreDetails && (
              <>
                <DataRow
                  label="Opening hours"
                  value={
                    business.inStoreDetails.openingHours
                      ? "Configured"
                      : "Not provided"
                  }
                />
                <DataRow
                  label="Seasonal business"
                  value={business.inStoreDetails.isSeasonal ? "Yes" : "No"}
                />
                <DataRow
                  label="Terminals per location"
                  value={
                    business.inStoreDetails.terminalsPerLocation != null
                      ? String(business.inStoreDetails.terminalsPerLocation)
                      : undefined
                  }
                />
              </>
            )}
        </dl>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Directors & Beneficial Owners                                    */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <SectionHeader
          title="Directors & Beneficial Owners"
          stepNumber={3}
          onEdit={onEditStep}
        />
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No directors or beneficial owners added yet.
          </p>
        ) : (
          <div className="space-y-4">
            {people.map((person) => (
              <div
                key={person.id}
                className="rounded-[var(--radius)] border border-border/50 bg-muted/20 p-4 space-y-2"
              >
                {/* Name & role */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    {[person.firstName, person.middleName, person.lastName]
                      .filter(Boolean)
                      .join(" ") || "Unnamed"}
                  </span>
                  {person.role && (
                    <Badge variant="default">
                      {roleLabels[person.role] ?? person.role}
                    </Badge>
                  )}
                </div>

                <dl className="space-y-0">
                  <DataRow label="Date of birth" value={formatDob(person.dateOfBirth)} />
                  <DataRow label="Nationality" value={person.nationality} />
                  <DataRow label="Email" value={person.email} />
                  <DataRow label="Phone" value={person.phoneNumber} />
                </dl>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Transaction Details                                              */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <SectionHeader
          title="Transaction Details"
          stepNumber={4}
          onEdit={onEditStep}
        />
        <dl className="space-y-0">
          <DataRow
            label="Descriptor"
            value={transactions.transactionDescriptor}
            mono
          />
          <DataRow
            label="Refund policy"
            value={
              transactions.refundPolicy
                ? transactions.refundPolicy === "custom"
                  ? transactions.refundPolicyCustom || "Custom (not specified)"
                  : refundPolicyLabels[transactions.refundPolicy]
                : undefined
            }
          />
          <DataRow
            label="PEP / sanctions consent"
            value={
              transactions.pepSanctionsConsent ? (
                <Badge variant="success">Consented</Badge>
              ) : (
                <Badge variant="warning">Not yet consented</Badge>
              )
            }
          />
        </dl>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Settlement Details                                               */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <SectionHeader
          title="Settlement Details"
          stepNumber={5}
          onEdit={onEditStep}
        />
        <dl className="space-y-0">
          <DataRow label="Name on account" value={settlement.nameOnAccount} />
          <DataRow
            label="Sort code"
            value={maskSortCode(settlement.sortCode)}
            mono
          />
          <DataRow
            label="Account number"
            value={maskAccountNumber(settlement.accountNumber)}
            mono
          />
          {settlement.bankName && (
            <DataRow label="Bank" value={settlement.bankName} />
          )}
        </dl>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Consent checkboxes                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-3 pt-2">
        <label className="flex cursor-pointer items-start gap-2.5">
          <div className="relative mt-0.5 flex shrink-0 items-center justify-center">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={handleTermsChange}
              className={cn(
                "peer h-4 w-4 cursor-pointer appearance-none rounded-[var(--radius-sm)] border-2 transition-colors duration-150",
                "checked:border-primary checked:bg-primary",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "border-border"
              )}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="pointer-events-none absolute h-3 w-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.739a.75.75 0 011.04-.208z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-sm text-foreground select-none">
            I accept the{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Terms and Conditions
            </a>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5">
          <div className="relative mt-0.5 flex shrink-0 items-center justify-center">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={handlePrivacyChange}
              className={cn(
                "peer h-4 w-4 cursor-pointer appearance-none rounded-[var(--radius-sm)] border-2 transition-colors duration-150",
                "checked:border-primary checked:bg-primary",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "border-border"
              )}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="pointer-events-none absolute h-3 w-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.739a.75.75 0 011.04-.208z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-sm text-foreground select-none">
            I acknowledge the{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Privacy Policy
            </a>
          </span>
        </label>
      </div>
    </div>
  );
}
