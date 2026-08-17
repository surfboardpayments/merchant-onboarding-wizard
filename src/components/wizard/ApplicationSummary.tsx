"use client";

import type { ReactNode } from "react";
import { useOnboardingStore } from "@/store/onboardingStore";
import {
  AVG_TRANSACTION_PHRASE,
  BUSINESS_TYPE_LABEL,
  MONTHLY_VOLUME_PHRASE,
  REFUND_POLICY_LABEL,
  ROLE_LABEL,
  addressLine,
  birthPhrase,
  fullName,
  mccLabel,
  prettyUrl,
} from "@/lib/utils/prose";
import { cn } from "@/lib/utils/cn";

function Row({ label, value }: { label: string; value?: ReactNode }) {
  const empty =
    value === undefined || value === null || value === "" || value === false;
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[13rem_1fr] sm:gap-4">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className={cn("text-base", empty ? "text-ink-subtle" : "text-ink")}>
        {empty ? "Not given" : value}
      </dd>
    </div>
  );
}

function Group({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-line py-4 first:pt-0 last:border-0 last:pb-0">
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <h4 className="font-display text-base font-semibold text-ink">{title}</h4>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="-my-1 shrink-0 cursor-pointer rounded-[var(--radius-xs)] px-1.5 py-2 text-sm text-accent underline decoration-accent/35 underline-offset-4 transition-colors duration-[var(--dur-tap)] hover:text-accent-hover hover:decoration-accent/70"
        >
          Change
        </button>
      </div>
      <dl className="divide-y divide-line/60">{children}</dl>
    </section>
  );
}

function maskSortCode(value?: string): string {
  const raw = (value || "").replace(/\D/g, "");
  if (raw.length < 6) return "";
  return `${raw.slice(0, 2)}-${raw.slice(2, 4)}-••`;
}

function maskAccount(value?: string): string {
  if (!value) return "";
  return value.length < 4 ? "••••" : `••••${value.slice(-4)}`;
}

/**
 * The review step, folded into the end of step three. Everything that will be
 * sent, in the order it was collected, with a way back to each part of it.
 */
export function ApplicationSummary({
  onEditStep,
}: {
  onEditStep: (step: number) => void;
}) {
  const {
    company,
    business,
    people,
    transactions,
    settlement,
    contactEmail,
    contactPhone,
  } = useOnboardingStore();

  const tradingAddress = business.dbaAddressSameAsRegistered
    ? company.registeredAddress
    : business.dbaAddress;

  return (
    <div className="rounded-[var(--radius-md)] bg-surface-sunk px-5 py-4">
      <Group title="Your company" step={1} onEdit={onEditStep}>
        <Row label="Registered name" value={company.companyName} />
        <Row
          label={company.entityType === "sole_trader" ? "UTR number" : "Company number"}
          value={
            company.companyNumber && (
              <span className="font-mono">{company.companyNumber}</span>
            )
          }
        />
        <Row label="Registered address" value={addressLine(company.registeredAddress)} />
        <Row label="Contact email" value={contactEmail} />
        <Row label="Contact phone" value={contactPhone} />
      </Group>

      <Group title="Your business" step={2} onEdit={onEditStep}>
        <Row label="Trading name" value={business.merchantDba} />
        <Row
          label="Trading address"
          value={
            business.dbaAddressSameAsRegistered
              ? "Same as registered address"
              : addressLine(tradingAddress)
          }
        />
        <Row
          label="How you sell"
          value={business.businessType && BUSINESS_TYPE_LABEL[business.businessType]}
        />
        <Row label="What you sell" value={business.productsDescription} />
        <Row
          label="Category"
          value={
            business.mcc && (
              <>
                <span className="font-mono">{business.mcc}</span>
                {mccLabel(business.mcc) ? ` · ${mccLabel(business.mcc)}` : ""}
              </>
            )
          }
        />
        <Row label="Website" value={prettyUrl(business.companyUrl)} />
        {business.salesUrl && business.salesUrl !== business.companyUrl && (
          <Row label="Where customers pay" value={prettyUrl(business.salesUrl)} />
        )}
        <Row
          label="Expected monthly takings"
          value={
            business.expectedMonthlyVolume &&
            MONTHLY_VOLUME_PHRASE[business.expectedMonthlyVolume]
          }
        />
        <Row
          label="Typical sale"
          value={
            business.averageTransactionValue &&
            AVG_TRANSACTION_PHRASE[business.averageTransactionValue]
          }
        />
        {business.inStoreDetails?.numberOfLocations != null && (
          <Row
            label="Locations"
            value={`${business.inStoreDetails.numberOfLocations}${
              business.inStoreDetails.terminalsPerLocation
                ? `, ${business.inStoreDetails.terminalsPerLocation} card machines each`
                : ""
            }`}
          />
        )}
        <Row
          label="On card statements"
          value={
            transactions.transactionDescriptor && (
              <span className="font-mono">{transactions.transactionDescriptor}</span>
            )
          }
        />
        <Row
          label="Refund policy"
          value={
            transactions.refundPolicy === "custom"
              ? transactions.refundPolicyCustom
              : transactions.refundPolicy &&
                REFUND_POLICY_LABEL[transactions.refundPolicy]
          }
        />
      </Group>

      <Group title="Directors and owners" step={3} onEdit={onEditStep}>
        {people.length === 0 ? (
          <Row label="People" value={undefined} />
        ) : (
          people.map((person) => (
            <Row
              key={person.id}
              label={fullName(person) || "Unnamed person"}
              value={
                [
                  person.role ? ROLE_LABEL[person.role] : null,
                  person.isSelf ? "you" : null,
                  birthPhrase(person.dateOfBirth) ? `born ${birthPhrase(person.dateOfBirth)}` : null,
                  person.ownershipPercentage != null
                    ? `${person.ownershipPercentage}% owner`
                    : null,
                  person.invite?.completedAt
                    ? "details received"
                    : person.invite?.sentAt
                      ? "invited"
                      : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
            />
          ))
        )}
        <Row
          label="Screening consent"
          value={transactions.pepSanctionsConsent ? "Given" : undefined}
        />
      </Group>

      <Group title="Where we pay you" step={3} onEdit={onEditStep}>
        <Row label="Account name" value={settlement.nameOnAccount} />
        <Row
          label="Sort code"
          value={
            maskSortCode(settlement.sortCode) && (
              <span className="font-mono">{maskSortCode(settlement.sortCode)}</span>
            )
          }
        />
        <Row
          label="Account number"
          value={
            maskAccount(settlement.accountNumber) && (
              <span className="font-mono">{maskAccount(settlement.accountNumber)}</span>
            )
          }
        />
        <Row label="Bank" value={settlement.bankName} />
      </Group>
    </div>
  );
}
