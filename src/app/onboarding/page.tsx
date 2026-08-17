"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useOnboardingStore } from "@/store/onboardingStore";
import { WizardLayout } from "@/components/wizard/WizardLayout";
import { StepContainer } from "@/components/wizard/StepContainer";
import { FIRST_STEP, LAST_STEP } from "@/lib/constants/wizardSteps";
import { StepCompany } from "@/components/steps/StepCompany";
import { StepBusiness } from "@/components/steps/StepBusiness";
import { StepPeopleAndPayouts } from "@/components/steps/StepPeopleAndPayouts";

/** Loading skeleton that matches the real layout, so nothing jumps on hydrate. */
function BootSkeleton() {
  return (
    <div className="frame-ground min-h-dvh">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="h-14" />
        <div className="pb-8 pt-6 sm:pt-10">
          <div className="h-10 w-2/3 animate-pulse rounded bg-on-frame/10" />
          <div className="mt-5 h-4 w-full max-w-lg animate-pulse rounded bg-on-frame/[0.07]" />
          <div className="mt-10 flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full bg-on-frame-line" />
            ))}
          </div>
        </div>
        <div className="h-96 rounded-[var(--radius-xl)] bg-surface shadow-[var(--shadow-card)]" />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const {
    id: applicationId,
    currentStep,
    setCurrentStep,
    company,
    business,
    people,
    transactions,
    settlement,
    consent,
    contactEmail,
    updateConsent,
    resetApplication,
  } = useOnboardingStore();

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    useOnboardingStore.persist.rehydrate();
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    setIsSaving(true);
    const timeout = setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 500);
    return () => clearTimeout(timeout);
  }, [company, business, people, transactions, settlement, consent, isHydrated]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= FIRST_STEP && step <= LAST_STEP) setCurrentStep(step);
    },
    [setCurrentStep],
  );

  /**
   * What is still missing, in the merchant's words. Returning a sentence rather
   * than a boolean lets the Next button say why instead of going grey.
   */
  const blockedReason = useMemo((): string | null => {
    switch (currentStep) {
      case 1: {
        if (!company.companyNumber || !company.companyName) {
          return company.entityType === "sole_trader"
            ? "Add your trading name and UTR number to carry on."
            : "Search for your company and pick it from the list to carry on.";
        }
        if (company.companyStatus && company.companyStatus !== "active") {
          return "We can only onboard companies that are active at Companies House.";
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
          return "Add an email address we can reach you on.";
        }
        return null;
      }
      case 2: {
        if (!business.merchantDba) return "Tell us the name you trade under.";
        if (!business.businessType) return "Tell us whether you sell in person, online, or both.";
        if (!business.productsDescription) return "Tell us what your business sells.";
        if (!transactions.transactionDescriptor) {
          return "Set what your customers will see on their bank statement.";
        }
        return null;
      }
      case 3: {
        if (people.length === 0) return "Add at least one director or owner.";
        if (!transactions.pepSanctionsConsent) {
          return "We need your agreement to screen the people listed above.";
        }
        if (!settlement.nameOnAccount) return "Add the name on your bank account.";
        if ((settlement.sortCode ?? "").replace(/\D/g, "").length !== 6) {
          return "Add a six-digit sort code.";
        }
        if ((settlement.accountNumber ?? "").length !== 8) {
          return "Add an eight-digit account number.";
        }
        if (!consent.termsAccepted || !consent.privacyPolicyAccepted) {
          return "Accept the terms and the privacy policy to send your application.";
        }
        return null;
      }
      default:
        return null;
    }
  }, [currentStep, company, business, people, transactions, settlement, consent, contactEmail]);

  const handleSubmit = async () => {
    if (currentStep !== LAST_STEP) {
      goToStep(currentStep + 1);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const state = useOnboardingStore.getState();
      const response = await fetch("/api/applications/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: state.company,
          business: state.business,
          people: state.people,
          transactions: state.transactions,
          settlement: state.settlement,
          consent: state.consent,
          contactEmail: state.contactEmail,
          contactPhone: state.contactPhone,
        }),
      });

      if (!response.ok) throw new Error("Submission failed");

      const result = await response.json();
      updateConsent({ submittedAt: new Date().toISOString() });

      if (result.confirmationEmailHtml) {
        try {
          sessionStorage.setItem("confirmationEmailHtml", result.confirmationEmailHtml);
        } catch {
          /* private browsing; the confirmation page copes without it */
        }
      }

      window.location.href = `/onboarding/confirmation?ref=${result.referenceNumber}`;
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitError(
        "We couldn't send your application just then. Your answers are saved, so try again in a moment.",
      );
      setIsSubmitting(false);
    }
  };

  if (!isHydrated) return <BootSkeleton />;

  return (
    <WizardLayout
      currentStep={currentStep}
      onNext={handleSubmit}
      onPrev={() => goToStep(currentStep - 1)}
      onStepClick={(step) => step < currentStep && goToStep(step)}
      onStartOver={resetApplication}
      blockedReason={submitError ?? blockedReason}
      canGoPrev={currentStep > FIRST_STEP}
      isSubmitting={isSubmitting}
      isSaving={isSaving}
      lastSaved={lastSaved}
    >
      {/* Keyed on the application id as well as the step: starting over mints a
          new id, which remounts the steps and clears local field state that
          lives outside the store, such as the company search box. */}
      <StepContainer stepKey={`${applicationId}-${currentStep}`}>
        {currentStep === 1 && <StepCompany />}
        {currentStep === 2 && <StepBusiness />}
        {currentStep === 3 && <StepPeopleAndPayouts onEditStep={goToStep} />}
      </StepContainer>
    </WizardLayout>
  );
}
