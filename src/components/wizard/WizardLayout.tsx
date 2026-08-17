"use client";

import { useState, type ReactNode } from "react";
import { ProgressSegments } from "./ProgressSegments";
import { WizardNavigation } from "./WizardNavigation";
import { SaveIndicator } from "./SaveIndicator";
import { PoweredBySurfboard } from "@/components/ui/SurfboardLogo";
import { Modal } from "@/components/ui/Modal";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Button } from "@/components/ui/Button";
import { WIZARD_STEPS, LAST_STEP } from "@/lib/constants/wizardSteps";

interface WizardLayoutProps {
  currentStep: number;
  children: ReactNode;
  onNext: () => void;
  onPrev: () => void;
  onStepClick?: (step: number) => void;
  onStartOver?: () => void;
  blockedReason?: string | null;
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
  blockedReason = null,
  canGoPrev,
  isSubmitting = false,
  isSaving = false,
  lastSaved = null,
}: WizardLayoutProps) {
  const [showStartOver, setShowStartOver] = useState(false);
  const step = WIZARD_STEPS[currentStep - 1] ?? WIZARD_STEPS[0];
  const isLastStep = currentStep === LAST_STEP;

  return (
    <div className="frame-ground min-h-dvh">
      <DemoBanner>Demo mode: emails appear on screen, nothing is sent</DemoBanner>

      <Modal
        open={showStartOver}
        onClose={() => setShowStartOver(false)}
        title="Start over?"
        description="This clears everything you've entered so far, including details we looked up for you. It can't be undone."
      >
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" size="md" onClick={() => setShowStartOver(false)}>
            Keep my progress
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={() => {
              setShowStartOver(false);
              onStartOver?.();
            }}
          >
            Clear everything
          </Button>
        </div>
      </Modal>

      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 sm:px-8">
        {/* Utility row. Deliberately quiet: it is reassurance, not navigation. */}
        <div data-on-frame className="flex min-h-14 items-center justify-between gap-4 pt-3">
          <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
          <button
            type="button"
            onClick={() => setShowStartOver(true)}
            className="-mr-2 cursor-pointer rounded-[var(--radius-xs)] px-2 py-2.5 text-xs text-on-frame-faint underline decoration-transparent underline-offset-4 transition-colors duration-[var(--dur-tap)] ease-[var(--ease-out)] hover:text-on-frame-muted hover:decoration-current"
          >
            Start over
          </button>
        </div>

        <header data-on-frame className="pb-8 pt-6 sm:pt-10">
          <h1 className="tracking-display font-display text-2xl font-semibold text-on-frame sm:text-3xl">
            {step.title}
          </h1>
          <p className="mt-4 max-w-[54ch] text-md leading-relaxed text-on-frame-muted">
            {step.blurb}
          </p>
          <ProgressSegments
            currentStep={currentStep}
            onStepClick={onStepClick}
            className="mt-8"
          />
        </header>

        <main className="rounded-[var(--radius-xl)] bg-surface p-6 shadow-[var(--shadow-card)] sm:p-9">
          <div className="flex flex-col gap-9">
            {children}
            <WizardNavigation
              onNext={onNext}
              onPrev={onPrev}
              canGoPrev={canGoPrev}
              isLastStep={isLastStep}
              isSubmitting={isSubmitting}
              blockedReason={blockedReason}
            />
          </div>
        </main>

        <div className="mt-auto">
          <PoweredBySurfboard />
        </div>
      </div>
    </div>
  );
}
