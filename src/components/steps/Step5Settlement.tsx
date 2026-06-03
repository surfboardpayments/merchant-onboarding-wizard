"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOnboardingStore } from "@/store/onboardingStore";
import { Input } from "@/components/ui/Input";
import { SortCodeInput } from "@/components/form/SortCodeInput";
import { AccountNumberInput } from "@/components/form/AccountNumberInput";
import { Alert } from "@/components/ui/Alert";

export default function Step5Settlement() {
  const settlement = useOnboardingStore((s) => s.settlement);
  const company = useOnboardingStore((s) => s.company);
  const updateSettlement = useOnboardingStore((s) => s.updateSettlement);

  const [bankName, setBankName] = useState<string | null>(
    settlement.bankName ?? null
  );
  const [isValidating, setIsValidating] = useState(false);

  // Debounce timer ref for bank lookup
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Default account name to company legal name if not yet set
  useEffect(() => {
    if (!settlement.nameOnAccount && company.companyName) {
      updateSettlement({ nameOnAccount: company.companyName });
    }
  }, [settlement.nameOnAccount, company.companyName, updateSettlement]);

  // Bank name lookup when sort code is valid (6 digits)
  const lookupBankName = useCallback(
    async (sortCode: string, accountNumber: string, accountName: string) => {
      const rawDigits = sortCode.replace(/\D/g, "");
      if (rawDigits.length !== 6) {
        setBankName(null);
        updateSettlement({ bankName: undefined, bankAccountValidated: false });
        return;
      }

      setIsValidating(true);
      try {
        const response = await fetch("/api/creditsafe/validate-bank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sortCode: rawDigits,
            accountNumber,
            accountName,
          }),
        });

        if (!response.ok) {
          setBankName(null);
          updateSettlement({ bankName: undefined, bankAccountValidated: false });
          return;
        }

        const data = await response.json();

        if (data.status === "skipped") {
          // No provider configured -- that is fine, just don't show bank name
          setBankName(null);
          updateSettlement({ bankName: undefined, bankAccountValidated: false });
          return;
        }

        if (data.bankName) {
          setBankName(data.bankName);
          updateSettlement({
            bankName: data.bankName,
            bankAccountValidated: data.valid === true,
          });
        } else {
          setBankName(null);
          updateSettlement({ bankName: undefined, bankAccountValidated: false });
        }
      } catch {
        // Network error -- don't block the user, just skip bank name display
        setBankName(null);
        updateSettlement({ bankName: undefined, bankAccountValidated: false });
      } finally {
        setIsValidating(false);
      }
    },
    [updateSettlement]
  );

  // Debounced trigger for bank lookup
  const scheduleLookup = useCallback(
    (sortCode: string, accountNumber: string, accountName: string) => {
      if (lookupTimerRef.current) {
        clearTimeout(lookupTimerRef.current);
      }
      lookupTimerRef.current = setTimeout(() => {
        lookupBankName(sortCode, accountNumber, accountName);
      }, 500);
    },
    [lookupBankName]
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateSettlement({ nameOnAccount: e.target.value });
    },
    [updateSettlement]
  );

  const handleSortCodeChange = useCallback(
    (value: string) => {
      updateSettlement({ sortCode: value });
      scheduleLookup(
        value,
        settlement.accountNumber ?? "",
        settlement.nameOnAccount ?? ""
      );
    },
    [updateSettlement, scheduleLookup, settlement.accountNumber, settlement.nameOnAccount]
  );

  const handleAccountNumberChange = useCallback(
    (value: string) => {
      updateSettlement({ accountNumber: value });
      // Re-trigger lookup if sort code is already filled
      const rawSortDigits = (settlement.sortCode ?? "").replace(/\D/g, "");
      if (rawSortDigits.length === 6 && value.length === 8) {
        scheduleLookup(
          settlement.sortCode ?? "",
          value,
          settlement.nameOnAccount ?? ""
        );
      }
    },
    [updateSettlement, scheduleLookup, settlement.sortCode, settlement.nameOnAccount]
  );

  return (
    <div className="space-y-6">
      {/* Account name */}
      <Input
        label="Name on bank account"
        placeholder="e.g. Acme Trading Ltd"
        value={settlement.nameOnAccount ?? ""}
        onChange={handleNameChange}
        required
      />

      {/* Sort code */}
      <SortCodeInput
        label="Sort code"
        value={settlement.sortCode ?? ""}
        onChange={handleSortCodeChange}
        bankName={isValidating ? "Validating..." : bankName}
        required
      />

      {/* Account number */}
      <AccountNumberInput
        label="Account number"
        value={settlement.accountNumber ?? ""}
        onChange={handleAccountNumberChange}
        isValidated={settlement.bankAccountValidated === true}
        required
      />

      {/* International / additional banking details */}
      <div className="space-y-4 rounded-[var(--radius)] border border-border p-5">
        <div>
          <h3 className="text-base font-medium text-foreground">
            International banking details
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Optional, alongside sort code + account number.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="IBAN (optional)"
            placeholder="GB29 NWBK 6016 1331 9268 19"
            value={settlement.iban ?? ""}
            onChange={(e) =>
              updateSettlement({
                iban: e.target.value.replace(/\s+/g, "").toUpperCase(),
              })
            }
          />
          <Input
            label="BIC / SWIFT (optional)"
            placeholder="NWBKGB2L"
            value={settlement.bic ?? ""}
            onChange={(e) =>
              updateSettlement({ bic: e.target.value.toUpperCase() })
            }
          />
          <Input
            label="Bank city"
            placeholder="London"
            value={settlement.bankCity ?? ""}
            onChange={(e) => updateSettlement({ bankCity: e.target.value })}
          />
          <label className="text-sm">
            <span className="block mb-1 text-foreground font-medium">
              Account type (AML)
            </span>
            <select
              className="w-full rounded border border-border px-3 py-2 text-sm"
              value={settlement.bankAccountType ?? "BUSINESS"}
              onChange={(e) =>
                updateSettlement({
                  bankAccountType: e.target.value as "BUSINESS" | "PERSONAL",
                })
              }
            >
              <option value="BUSINESS">Business</option>
              <option value="PERSONAL">Personal</option>
            </select>
          </label>
        </div>
      </div>

      {/* Info note */}
      <Alert
        variant="info"
        title="UK bank account required"
        description="Your settlement account must be a UK bank account in the name of the registered business."
      />
    </div>
  );
}
