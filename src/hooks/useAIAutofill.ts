"use client";

import { useState, useRef, useCallback } from "react";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { AutofillResult } from "@/lib/ai/gemini";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AutofillStatus = "idle" | "loading" | "success" | "error";

export interface UseAIAutofillReturn {
  /** Fire the AI autofill (non-blocking, safe to call from event handlers). */
  triggerAutofill: (context: {
    companyName: string;
    companyNumber?: string;
    sicCodes?: string[];
    entityType: "limited_company" | "sole_trader" | "partnership";
    companyType?: string;
    registeredAddress?: {
      addressLine1?: string;
      city?: string;
      postcode?: string;
      country?: string;
    };
    dateOfCreation?: string;
    people?: Array<{
      firstName?: string;
      lastName?: string;
      role?: string;
      naturesOfControl?: string[];
    }>;
    useWebSearch?: boolean;
  }) => void;
  /** Current status of the autofill request. */
  status: AutofillStatus;
  /** Number of fields that were pre-filled. */
  filledFields: number;
  /** Dismiss the success/error indicator. */
  dismiss: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAIAutofill(): UseAIAutofillReturn {
  const [status, setStatus] = useState<AutofillStatus>("idle");
  const [filledFields, setFilledFields] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const dismiss = useCallback(() => {
    setStatus("idle");
    setFilledFields(0);
    useOnboardingStore.getState().setAutofillStatus("idle");
  }, []);

  /** Mirror status into the store so later steps can read it too. */
  const publish = useCallback((next: AutofillStatus) => {
    setStatus(next);
    useOnboardingStore.getState().setAutofillStatus(next);
  }, []);

  const triggerAutofill: UseAIAutofillReturn["triggerAutofill"] = useCallback(
    (context) => {
      // Cancel any in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      publish("loading");
      setFilledFields(0);

      // Fire-and-forget async
      (async () => {
        try {
          const res = await fetch("/api/ai/autofill", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(context),
            signal: controller.signal,
          });

          // 204 = no content, 503 = not configured — both are silent
          if (res.status === 204 || res.status === 503) {
            publish("idle");
            return;
          }

          if (!res.ok) {
            console.warn(`[AI Autofill] API returned ${res.status}`);
            publish("error");
            return;
          }

          const result: AutofillResult = await res.json();

          // Apply to store — only fill EMPTY fields
          const store = useOnboardingStore.getState();
          let count = 0;

          // -- Step 1 extras: Company fields --
          if (result.company) {
            const currentCo = store.company;
            const updates: Record<string, unknown> = {};
            if (result.company.vatNumber && !currentCo.vatNumber) {
              updates.vatNumber = result.company.vatNumber;
              count++;
            }
            if (result.company.charityNumber && !currentCo.charityNumber) {
              updates.charityNumber = result.company.charityNumber;
              count++;
            }
            if (Object.keys(updates).length > 0) {
              store.updateCompany(
                updates as Parameters<typeof store.updateCompany>[0],
              );
            }
          }

          // -- Step 2: Business Details --
          if (result.business) {
            const currentBiz = store.business;
            const updates: Record<string, unknown> = {};

            if (result.business.merchantDba && !currentBiz.merchantDba) {
              updates.merchantDba = result.business.merchantDba;
              count++;
            }
            if (result.business.dbaAddressSameAsRegistered !== undefined && currentBiz.dbaAddressSameAsRegistered === undefined) {
              updates.dbaAddressSameAsRegistered = result.business.dbaAddressSameAsRegistered;
              count++;
            }
            if (result.business.companyUrl && !currentBiz.companyUrl) {
              updates.companyUrl = result.business.companyUrl;
              count++;
            }
            if (result.business.salesUrl && !currentBiz.salesUrl) {
              updates.salesUrl = result.business.salesUrl;
              count++;
            }
            if (result.business.businessType && !currentBiz.businessType) {
              updates.businessType = result.business.businessType;
              count++;
            }
            if (result.business.productsDescription && !currentBiz.productsDescription) {
              updates.productsDescription = result.business.productsDescription;
              count++;
            }
            if (result.business.mcc && !currentBiz.mcc) {
              updates.mcc = result.business.mcc;
              count++;
            }
            if (result.business.tradingHistory && !currentBiz.tradingHistory) {
              updates.tradingHistory = result.business.tradingHistory;
              count++;
            }
            if (result.business.expectedMonthlyVolume && !currentBiz.expectedMonthlyVolume) {
              updates.expectedMonthlyVolume = result.business.expectedMonthlyVolume;
              count++;
            }
            if (result.business.averageTransactionValue && !currentBiz.averageTransactionValue) {
              updates.averageTransactionValue = result.business.averageTransactionValue;
              count++;
            }
            if (result.business.inStoreDetails && !currentBiz.inStoreDetails) {
              updates.inStoreDetails = result.business.inStoreDetails;
              count += Object.keys(result.business.inStoreDetails).length;
            }
            if (
              typeof result.business.annualTurnover === "number" &&
              currentBiz.annualTurnover === undefined
            ) {
              updates.annualTurnover = result.business.annualTurnover;
              count++;
            }
            if (
              typeof result.business.annualCardTurnover === "number" &&
              currentBiz.annualCardTurnover === undefined
            ) {
              updates.annualCardTurnover = result.business.annualCardTurnover;
              count++;
            }
            if (
              typeof result.business.estAvgTicket === "number" &&
              currentBiz.estAvgTicket === undefined
            ) {
              updates.estAvgTicket = result.business.estAvgTicket;
              count++;
            }

            if (Object.keys(updates).length > 0) {
              store.updateBusiness(updates as Parameters<typeof store.updateBusiness>[0]);
            }
          }

          // -- Outlet sales split --
          const existingSales = store.outletSales;
          const salesEmpty =
            !existingSales ||
            (existingSales.ftf === 0 &&
              existingSales.internet === 0 &&
              existingSales.moto === 0);
          if (result.outletSales && salesEmpty) {
            store.updateOutletSales(result.outletSales);
            count += 3;
          }

          // -- Outlet delivery split --
          const existingDelivery = store.outletDelivery;
          const deliveryEmpty =
            !existingDelivery ||
            (existingDelivery.d0 === 0 &&
              existingDelivery.d1to7 === 0 &&
              existingDelivery.d8to14 === 0 &&
              existingDelivery.d15to30 === 0 &&
              existingDelivery.dOver30 === 0);
          if (result.outletDelivery && deliveryEmpty) {
            store.updateOutletDelivery(result.outletDelivery);
            count += 5;
          }

          // -- Per-person signing/ownership fields --
          if (result.people?.length) {
            for (const aiPerson of result.people) {
              const needle = normalizeName(aiPerson.firstName, aiPerson.lastName);
              if (!needle) continue;
              const match = store.people.find(
                (p) => normalizeName(p.firstName, p.lastName) === needle,
              );
              if (!match) continue;
              const patch: Record<string, unknown> = {};
              if (aiPerson.signatoryType && !match.signatoryType) {
                patch.signatoryType = aiPerson.signatoryType;
                count++;
              }
              if (
                typeof aiPerson.ownershipPercentage === "number" &&
                match.ownershipPercentage === undefined
              ) {
                patch.ownershipPercentage = aiPerson.ownershipPercentage;
                count++;
              }
              if (Object.keys(patch).length) {
                store.updatePerson(match.id, patch);
              }
            }
          }

          // -- Step 4: Transactions --
          if (result.transactions) {
            const currentTxn = store.transactions;
            const updates: Record<string, unknown> = {};

            if (result.transactions.transactionDescriptor && !currentTxn.transactionDescriptor) {
              updates.transactionDescriptor = result.transactions.transactionDescriptor;
              count++;
            }
            if (result.transactions.refundPolicy && !currentTxn.refundPolicy) {
              updates.refundPolicy = result.transactions.refundPolicy;
              count++;
            }

            if (Object.keys(updates).length > 0) {
              store.updateTransactions(updates as Parameters<typeof store.updateTransactions>[0]);
            }
          }

          // -- Step 5: Settlement --
          if (result.settlement) {
            const currentStl = store.settlement;
            const updates: Record<string, unknown> = {};

            if (result.settlement.nameOnAccount && !currentStl.nameOnAccount) {
              updates.nameOnAccount = result.settlement.nameOnAccount;
              count++;
            }
            if (result.settlement.bankCity && !currentStl.bankCity) {
              updates.bankCity = result.settlement.bankCity;
              count++;
            }
            if (
              result.settlement.bankAccountType &&
              !currentStl.bankAccountType
            ) {
              updates.bankAccountType = result.settlement.bankAccountType;
              count++;
            }

            if (Object.keys(updates).length > 0) {
              store.updateSettlement(updates as Parameters<typeof store.updateSettlement>[0]);
            }
          }

          setFilledFields(count);
          publish(count > 0 ? "success" : "idle");
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            // Cancelled — new request incoming, stay quiet
            return;
          }
          console.warn("[AI Autofill] Client error:", err);
          publish("error");
        }
      })();
    },
    [publish],
  );

  return { triggerAutofill, status, filledFields, dismiss };
}

function normalizeName(
  first?: string,
  last?: string,
): string | null {
  const f = (first || "").trim().toLowerCase();
  const l = (last || "").trim().toLowerCase();
  if (!f && !l) return null;
  return `${f}|${l}`;
}
