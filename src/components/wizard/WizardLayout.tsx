"use client";

import { ReactNode, useState } from "react";
import { WizardStepper } from "./WizardStepper";
import { WizardNavigation } from "./WizardNavigation";
import { TimeEstimate } from "./TimeEstimate";
import { SaveIndicator } from "./SaveIndicator";
import { SurfboardLogo } from "@/components/ui/SurfboardLogo";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { WIZARD_STEPS } from "@/lib/constants/wizardSteps";

interface WizardLayoutProps {
  currentStep: number;
  children: ReactNode;
  onNext: () => void;
  onPrev: () => void;
  onStepClick?: (step: number) => void;
  onStartOver?: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  isSubmitting?: boolean;
  isSaving?: boolean;
  lastSaved?: Date | null;
}

export function WizardLayout({
  currentStep,
  children,
  onNext,
  onPrev,
  onStepClick,
  onStartOver,
  canGoNext,
  canGoPrev,
  isSubmitting = false,
  isSaving = false,
  lastSaved = null,
}: WizardLayoutProps) {
  const isLastStep = currentStep === WIZARD_STEPS.length;
  const [showStartOverModal, setShowStartOverModal] = useState(false);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Test mode banner */}
      {process.env.NEXT_PUBLIC_TEST_MODE === "true" && (
        <div className="bg-amber-500 text-white text-xs text-center py-1.5 font-medium tracking-wide">
          DEMO MODE — Emails displayed on screen instead of being sent
        </div>
      )}

      {/* Start Over confirmation modal */}
      <Modal
        open={showStartOverModal}
        onClose={() => setShowStartOverModal(false)}
        title="Start over?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will clear all your progress and data. You&apos;ll need to start the application from scratch. This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStartOverModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowStartOverModal(false);
                onStartOver?.();
              }}
              className="bg-error hover:bg-error/90 active:bg-error/80"
            >
              Clear everything
            </Button>
          </div>
        </div>
      </Modal>

      {/* Header - dark Surfboard branded */}
      <header className="bg-header-bg sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <SurfboardLogo variant="white" size={28} />

            <div className="flex items-center gap-4">
              <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} variant="dark" />
              <TimeEstimate currentStep={currentStep} variant="dark" />
              <button
                type="button"
                onClick={() => setShowStartOverModal(true)}
                className="text-xs font-medium text-white/70 hover:text-white transition-colors cursor-pointer border border-white/20 rounded px-2.5 py-1 hover:border-white/40"
              >
                Clear everything
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="bg-white border-b border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-4">
          <WizardStepper
            steps={WIZARD_STEPS}
            currentStep={currentStep}
            onStepClick={onStepClick}
          />
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-border p-6 sm:p-8">
          {children}
        </div>
      </main>

      {/* Navigation */}
      <div className="sticky bottom-0 border-t border-border bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-4">
          <WizardNavigation
            onNext={onNext}
            onPrev={onPrev}
            canGoNext={canGoNext}
            canGoPrev={canGoPrev}
            isLastStep={isLastStep}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
