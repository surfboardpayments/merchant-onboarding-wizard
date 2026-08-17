"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { Person } from "@/store/onboardingStore";
import { PersonRow, isPersonComplete } from "./PersonRow";
import { ApplicationSummary } from "@/components/wizard/ApplicationSummary";
import { SortCodeInput } from "@/components/form/SortCodeInput";
import { AccountNumberInput } from "@/components/form/AccountNumberInput";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { Disclosure } from "@/components/ui/Disclosure";
import { Alert } from "@/components/ui/Alert";
import { sentenceList } from "@/lib/utils/prose";

interface StepPeopleAndPayoutsProps {
  onEditStep: (step: number) => void;
}

export function StepPeopleAndPayouts({ onEditStep }: StepPeopleAndPayoutsProps) {
  const {
    company,
    people,
    transactions,
    settlement,
    consent,
    addPerson,
    updatePerson,
    updateTransactions,
    updateSettlement,
    updateConsent,
  } = useOnboardingStore();

  const [bankName, setBankName] = useState<string | null>(settlement.bankName ?? null);
  const [isCheckingBank, setIsCheckingBank] = useState(false);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSoleTrader = company.entityType === "sole_trader";
  const legalName = company.companyName || "your business";
  const self = people.find((p) => p.isSelf);

  // ── Settlement ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!settlement.nameOnAccount && company.companyName) {
      updateSettlement({ nameOnAccount: company.companyName });
    }
  }, [settlement.nameOnAccount, company.companyName, updateSettlement]);

  const lookupBank = useCallback(
    async (sortCode: string, accountNumber: string, accountName: string) => {
      const digits = sortCode.replace(/\D/g, "");
      if (digits.length !== 6) {
        setBankName(null);
        updateSettlement({ bankName: undefined, bankAccountValidated: false });
        return;
      }

      setIsCheckingBank(true);
      try {
        const response = await fetch("/api/creditsafe/validate-bank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortCode: digits, accountNumber, accountName }),
        });

        if (!response.ok) {
          setBankName(null);
          updateSettlement({ bankName: undefined, bankAccountValidated: false });
          return;
        }

        const data = await response.json();
        if (data.status === "skipped" || !data.bankName) {
          setBankName(null);
          updateSettlement({ bankName: undefined, bankAccountValidated: false });
          return;
        }

        setBankName(data.bankName);
        updateSettlement({
          bankName: data.bankName,
          bankAccountValidated: data.valid === true,
        });
      } catch {
        // A failed lookup must never block the merchant; the acquirer re-checks.
        setBankName(null);
        updateSettlement({ bankName: undefined, bankAccountValidated: false });
      } finally {
        setIsCheckingBank(false);
      }
    },
    [updateSettlement],
  );

  const scheduleLookup = useCallback(
    (sortCode: string, accountNumber: string, accountName: string) => {
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
      lookupTimer.current = setTimeout(
        () => lookupBank(sortCode, accountNumber, accountName),
        500,
      );
    },
    [lookupBank],
  );

  useEffect(() => {
    return () => {
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
  }, []);

  // ── People ─────────────────────────────────────────────────────────────

  const claimSelf = (id: string) => {
    for (const p of people) {
      if (p.id !== id && p.isSelf) updatePerson(p.id, { isSelf: false });
    }
    updatePerson(id, { isSelf: true });
  };

  const addOwner = () =>
    addPerson({
      id: uuidv4(),
      source: "manual",
      isSelf: false,
      firstName: "",
      lastName: "",
      role: "ubo",
      naturesOfControl: [],
    });

  const outstanding = people.filter((p) => !isPersonComplete(p) && !p.invite?.completedAt);
  const done = people.length - outstanding.length;

  // Signatory answer, derived from and written back to the person record.
  const selfSignatory: "yes" | "no" | undefined = self?.signatoryType
    ? self.signatoryType === "NONE"
      ? "no"
      : "yes"
    : undefined;

  const ownsQuarter: "yes" | "no" | undefined =
    self?.ownershipPercentage == null
      ? undefined
      : self.ownershipPercentage >= 25
        ? "yes"
        : "no";

  return (
    <>
      {/* ── Who's filling this in ───────────────────────────────────────── */}
      {!isSoleTrader && (
        <section className="flex flex-col gap-5">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
              Ownership
            </h2>
            <p className="mt-1.5 max-w-[62ch] text-base leading-relaxed text-ink-muted">
              Card schemes require us to know who runs {legalName} and who
              ultimately profits from it. Most of this is already filled in below.
            </p>
          </div>

          {!self && people.length > 0 && (
            <Alert
              variant="info"
              title="Which one of these is you?"
              description={`Open whoever you are in the list below and choose "This is me". We'll ask the others to fill in their own details.`}
            />
          )}

          {self && (
            <>
              <ChoiceChips
                label={`Are you authorised to sign agreements for ${legalName}?`}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                value={selfSignatory}
                onChange={(value) =>
                  updatePerson(self.id, {
                    signatoryType: value === "yes" ? "SINGLE_SIGNATORY" : "NONE",
                  })
                }
                hint="You're signing on behalf of the business, so we need to know you can."
              />

              {selfSignatory === "yes" && (
                <ChoiceChips
                  label="Does anyone else have to sign alongside you?"
                  options={[
                    { value: "no", label: "No, I can sign alone" },
                    { value: "yes", label: "Yes, we sign jointly" },
                  ]}
                  value={self.signatoryType === "CO_SIGNATORY" ? "yes" : "no"}
                  onChange={(value) =>
                    updatePerson(self.id, {
                      signatoryType:
                        value === "yes" ? "CO_SIGNATORY" : "SINGLE_SIGNATORY",
                    })
                  }
                  hint="If you sign jointly, mark the other signatories in the list below."
                />
              )}

              <ChoiceChips
                label={`Do you own 25% or more of ${legalName}?`}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                value={ownsQuarter}
                onChange={(value) =>
                  updatePerson(self.id, {
                    ownershipPercentage: value === "yes" ? (self.ownershipPercentage ?? 100) : 0,
                  })
                }
                hint="Anyone holding a quarter or more is a beneficial owner, and the acquirer has to verify them by law. Add them below if they're missing."
              />
            </>
          )}
        </section>
      )}

      {/* ── People ──────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
              {isSoleTrader ? "Your details" : "Directors and owners"}
            </h2>
            {people.length > 1 && (
              <p className="tabular shrink-0 text-sm text-ink-muted">
                {done} of {people.length} done
              </p>
            )}
          </div>
          <p className="mt-1.5 max-w-[62ch] text-base leading-relaxed text-ink-muted">
            {isSoleTrader
              ? "As a sole trader you are the business, so we need your personal details rather than a company's."
              : "Pulled from Companies House. Each person needs a date of birth and home address, which you can fill in or ask them for."}
          </p>
        </div>

        {people.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-line-strong px-5 py-8 text-center">
            <p className="text-base font-medium text-ink">No one added yet</p>
            <p className="mx-auto mt-1 max-w-[46ch] text-sm leading-relaxed text-ink-muted">
              Companies House didn&apos;t return any directors for this company.
              Add whoever runs the business and we&apos;ll take it from there.
            </p>
            <Button variant="outline" size="md" onClick={addOwner} className="mt-4">
              Add a director or owner
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {people.map((person: Person, index) => (
              <PersonRow
                key={person.id}
                person={person}
                index={index}
                isSelf={!!person.isSelf}
                autoExpand={people.length === 1}
                onClaimSelf={() => claimSelf(person.id)}
              />
            ))}
          </ul>
        )}

        {!isSoleTrader && people.length > 0 && (
          <Button variant="outline" size="md" onClick={addOwner} className="self-start">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M8 3.5v9M3.5 8h9" />
            </svg>
            Add another owner
          </Button>
        )}
      </section>

      {/* ── Screening consent ───────────────────────────────────────────── */}
      <section className="rounded-[var(--radius-md)] border border-line bg-surface-sunk px-5 py-4">
        <Checkbox
          checked={transactions.pepSanctionsConsent ?? false}
          onChange={(e) => updateTransactions({ pepSanctionsConsent: e.target.checked })}
          label={`I agree to background screening for everyone listed above`}
          description="UK law requires the acquirer to check directors and owners against sanctions lists and lists of politically exposed people. It's a records check, not a credit search, and it doesn't affect anyone's credit score."
        />
      </section>

      {/* ── Settlement ──────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-5 border-t border-line pt-8">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
            Where should we send your money?
          </h2>
          <p className="mt-1.5 max-w-[62ch] text-base leading-relaxed text-ink-muted">
            A UK business account in the name of {legalName}. We pay your card
            takings into it, minus fees.
          </p>
        </div>

        <Input
          label="Name on the account"
          autoComplete="off"
          placeholder="Acme Sports Limited"
          value={settlement.nameOnAccount ?? ""}
          onChange={(e) => updateSettlement({ nameOnAccount: e.target.value })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SortCodeInput
            label="Sort code"
            value={settlement.sortCode ?? ""}
            onChange={(value) => {
              updateSettlement({ sortCode: value });
              scheduleLookup(
                value,
                settlement.accountNumber ?? "",
                settlement.nameOnAccount ?? "",
              );
            }}
            bankName={bankName}
            isChecking={isCheckingBank}
          />
          <AccountNumberInput
            label="Account number"
            value={settlement.accountNumber ?? ""}
            onChange={(value) => {
              updateSettlement({ accountNumber: value });
              if ((settlement.sortCode ?? "").replace(/\D/g, "").length === 6 && value.length === 8) {
                scheduleLookup(
                  settlement.sortCode ?? "",
                  value,
                  settlement.nameOnAccount ?? "",
                );
              }
            }}
            isValidated={settlement.bankAccountValidated === true}
          />
        </div>

        <Disclosure summary="Add IBAN, BIC or a personal account" tone="panel">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="IBAN"
              placeholder="GB29 NWBK 6016 1331 9268 19"
              className="font-mono"
              value={settlement.iban ?? ""}
              onChange={(e) =>
                updateSettlement({
                  iban: e.target.value.replace(/\s+/g, "").toUpperCase(),
                })
              }
            />
            <Input
              label="BIC or SWIFT"
              placeholder="NWBKGB2L"
              className="font-mono"
              value={settlement.bic ?? ""}
              onChange={(e) => updateSettlement({ bic: e.target.value.toUpperCase() })}
            />
            <Input
              label="Bank city"
              placeholder="London"
              value={settlement.bankCity ?? ""}
              onChange={(e) => updateSettlement({ bankCity: e.target.value })}
            />
            <Select
              label="Account type"
              options={[
                { value: "BUSINESS", label: "Business account" },
                { value: "PERSONAL", label: "Personal account" },
              ]}
              value={settlement.bankAccountType ?? "BUSINESS"}
              onChange={(e) =>
                updateSettlement({
                  bankAccountType: e.target.value as "BUSINESS" | "PERSONAL",
                })
              }
            />
          </div>
        </Disclosure>
      </section>

      {/* ── Review and consent ──────────────────────────────────────────── */}
      <section className="flex flex-col gap-5 border-t border-line pt-8">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
            Ready to send
          </h2>
          <p className="mt-1.5 max-w-[62ch] text-base leading-relaxed text-ink-muted">
            We pass this to our acquiring bank, who run the checks and open your
            account. Most applications are decided within two working days.
          </p>
        </div>

        <Disclosure
          summary="Everything you're sending us"
          meta="4 sections"
          tone="panel"
        >
          <ApplicationSummary onEditStep={onEditStep} />
        </Disclosure>

        <div className="flex flex-col gap-3">
          <Checkbox
            checked={consent.termsAccepted ?? false}
            onChange={(e) => updateConsent({ termsAccepted: e.target.checked })}
            label={
              <>
                I accept the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline decoration-accent/35 underline-offset-4 hover:decoration-accent/70"
                >
                  terms and conditions
                </a>
              </>
            }
          />
          <Checkbox
            checked={consent.privacyPolicyAccepted ?? false}
            onChange={(e) => updateConsent({ privacyPolicyAccepted: e.target.checked })}
            label={
              <>
                I&apos;ve read the{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline decoration-accent/35 underline-offset-4 hover:decoration-accent/70"
                >
                  privacy policy
                </a>
              </>
            }
          />
        </div>

        {outstanding.length > 0 && (
          <Alert
            variant="warning"
            title={`${outstanding.length} ${outstanding.length === 1 ? "person still needs" : "people still need"} details`}
            description={(() => {
              const named = outstanding
                .map((p) => p.firstName)
                .filter(Boolean)
                .slice(0, 3) as string[];
              const who = named.length > 0 ? sentenceList(named) : "they";
              return `You can send this now, and ${who} can fill in the rest from the invite you send. The acquirer won't finish its checks until everyone has replied.`;
            })()}
          />
        )}

        <p className="text-sm leading-relaxed text-ink-subtle">
          Surfboard Payments AB is a payment institution licensed by
          Finansinspektionen, the Swedish Financial Supervisory Authority.
        </p>
      </section>
    </>
  );
}
