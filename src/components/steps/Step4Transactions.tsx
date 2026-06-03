"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { useOnboardingStore } from "@/store/onboardingStore";
import { TransactionDescriptorInput } from "@/components/form/TransactionDescriptorInput";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils/cn";

const refundPolicyOptions = [
  { value: "full_refund", label: "Full refund within 30 days" },
  { value: "partial_refund", label: "Partial refund" },
  { value: "no_refunds", label: "No refunds" },
  { value: "custom", label: "Custom" },
];

export default function Step4Transactions() {
  const transactions = useOnboardingStore((s) => s.transactions);
  const updateTransactions = useOnboardingStore((s) => s.updateTransactions);

  const handleDescriptorChange = useCallback(
    (value: string) => {
      updateTransactions({ transactionDescriptor: value });
    },
    [updateTransactions]
  );

  const handleRefundPolicyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as
        | "full_refund"
        | "partial_refund"
        | "no_refunds"
        | "custom";
      updateTransactions({
        refundPolicy: value,
        // Clear custom description when switching away from custom
        ...(value !== "custom" ? { refundPolicyCustom: "" } : {}),
      });
    },
    [updateTransactions]
  );

  const handleCustomRefundChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateTransactions({ refundPolicyCustom: e.target.value });
    },
    [updateTransactions]
  );

  const handlePepConsentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateTransactions({ pepSanctionsConsent: e.target.checked });
    },
    [updateTransactions]
  );

  return (
    <div className="space-y-8">
      {/* Transaction descriptor */}
      <section className="space-y-1">
        <TransactionDescriptorInput
          label="Transaction descriptor"
          value={transactions.transactionDescriptor ?? ""}
          onChange={handleDescriptorChange}
          required
        />
        <p className="text-xs text-muted-foreground">
          This is how your business name will appear on your customers&apos; bank
          statements. Maximum 22 characters.
        </p>
      </section>

      {/* Refund policy */}
      <section className="space-y-4">
        <Select
          label="Refund policy"
          options={refundPolicyOptions}
          placeholder="Select a refund policy"
          value={transactions.refundPolicy ?? ""}
          onChange={handleRefundPolicyChange}
          required
        />

        {transactions.refundPolicy === "custom" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <TextArea
              label="Custom refund policy"
              placeholder="Describe your refund policy in detail..."
              value={transactions.refundPolicyCustom ?? ""}
              onChange={handleCustomRefundChange}
              maxLength={500}
              required
            />
          </motion.div>
        )}
      </section>

      {/* PEP & Sanctions consent */}
      <section>
        <div
          className={cn(
            "rounded-[var(--radius)] border p-5 space-y-4",
            "bg-muted/30 border-border"
          )}
        >
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Compliance screening
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              As part of the onboarding process, Surfboard is required to carry out
              Politically Exposed Person (PEP) and sanctions screening checks on all
              directors and beneficial owners associated with this application. These
              checks help us meet our regulatory obligations and ensure the safety of
              our payment platform.
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <Checkbox
              label="I consent to PEP and sanctions screening for all directors and beneficial owners"
              checked={transactions.pepSanctionsConsent ?? false}
              onChange={handlePepConsentChange}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
