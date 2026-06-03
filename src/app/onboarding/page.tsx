"use client";

import { useState, useCallback, useEffect } from "react";
import { useOnboardingStore } from "@/store/onboardingStore";
import { WizardLayout } from "@/components/wizard/WizardLayout";
import { StepContainer } from "@/components/wizard/StepContainer";
import { WIZARD_STEPS } from "@/lib/constants/wizardSteps";
import { Step1CompanyLookup } from "@/components/steps/Step1CompanyLookup";
import { Step2BusinessDetails } from "@/components/steps/Step2BusinessDetails";
import { Step3People } from "@/components/steps/Step3People";
import Step4Transactions from "@/components/steps/Step4Transactions";
import Step5Settlement from "@/components/steps/Step5Settlement";
import Step6Review from "@/components/steps/Step6Review";

export default function OnboardingPage() {
  const {
    currentStep,
    setCurrentStep,
    company,
    business,
    people,
    transactions,
    settlement,
    consent,
    updateConsent,
    resetApplication,
  } = useOnboardingStore();

  const [direction, setDirection] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle Zustand hydration from localStorage
  useEffect(() => {
    // Trigger rehydration
    useOnboardingStore.persist.rehydrate();
    setIsHydrated(true);
  }, []);

  // Auto-save indicator
  useEffect(() => {
    if (!isHydrated) return;
    setIsSaving(true);
    const timeout = setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 500);
    return () => clearTimeout(timeout);
  }, [company, business, people, transactions, settlement, isHydrated]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= WIZARD_STEPS.length) {
        setDirection(step > currentStep ? 1 : -1);
        setCurrentStep(step);
      }
    },
    [currentStep, setCurrentStep]
  );

  const nextStep = useCallback(() => {
    goToStep(currentStep + 1);
  }, [currentStep, goToStep]);

  const prevStep = useCallback(() => {
    goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  // Basic validation per step
  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 1:
        // Limited company: need company number + name (from lookup)
        // Sole trader: need trading name + UTR (manual entry)
        return !!(company?.companyNumber && company?.companyName);
      case 2:
        return !!(business?.businessType && business?.merchantDba);
      case 3:
        return people.length > 0;
      case 4:
        return !!(transactions?.transactionDescriptor);
      case 5:
        return !!(
          settlement?.sortCode &&
          settlement?.accountNumber &&
          settlement?.nameOnAccount
        );
      case 6:
        return !!(consent?.termsAccepted && consent?.privacyPolicyAccepted);
      default:
        return false;
    }
  }, [currentStep, company, business, people, transactions, settlement, consent]);

  const handleSubmit = async () => {
    if (currentStep !== WIZARD_STEPS.length) {
      nextStep();
      return;
    }

    setIsSubmitting(true);
    try {
      const applicationData = useOnboardingStore.getState();
      const response = await fetch("/api/applications/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: applicationData.company,
          business: applicationData.business,
          people: applicationData.people,
          transactions: applicationData.transactions,
          settlement: applicationData.settlement,
          consent: applicationData.consent,
          contactEmail: applicationData.contactEmail,
          contactPhone: applicationData.contactPhone,
        }),
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      const result = await response.json();
      // Store reference number and navigate to confirmation
      updateConsent({ submittedAt: new Date().toISOString() });

      // Store confirmation email HTML for test mode display
      if (result.confirmationEmailHtml) {
        try {
          sessionStorage.setItem("confirmationEmailHtml", result.confirmationEmailHtml);
        } catch { /* ignore storage errors */ }
      }

      window.location.href = `/onboarding/confirmation?ref=${result.referenceNumber}`;
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStep = useCallback(
    (step: number) => {
      goToStep(step);
    },
    [goToStep]
  );

  const handleStartOver = useCallback(() => {
    resetApplication();
    setDirection(0);
    setLastSaved(null);
  }, [resetApplication]);

  // Don't render until hydrated (prevents flash of empty state)
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-8 h-8 bg-muted rounded-lg" />
          <div className="h-5 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1CompanyLookup />;
      case 2:
        return <Step2BusinessDetails />;
      case 3:
        return <Step3People />;
      case 4:
        return <Step4Transactions />;
      case 5:
        return <Step5Settlement />;
      case 6:
        return <Step6Review onEditStep={handleEditStep} />;
      default:
        return <Step1CompanyLookup />;
    }
  };

  const stepMeta = WIZARD_STEPS[currentStep - 1];

  return (
    <WizardLayout
      currentStep={currentStep}
      onNext={handleSubmit}
      onPrev={prevStep}
      onStepClick={(step) => {
        if (step < currentStep) goToStep(step);
      }}
      onStartOver={handleStartOver}
      canGoNext={canGoNext()}
      canGoPrev={currentStep > 1}
      isSubmitting={isSubmitting}
      isSaving={isSaving}
      lastSaved={lastSaved}
    >
      <StepContainer
        stepKey={currentStep}
        direction={direction}
        title={stepMeta?.label || ""}
        description={stepMeta?.description || ""}
      >
        {renderStep()}
      </StepContainer>
    </WizardLayout>
  );
}
