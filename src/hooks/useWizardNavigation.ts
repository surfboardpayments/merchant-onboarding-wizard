'use client';

import { useCallback, useMemo } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { WIZARD_STEPS } from '@/lib/constants/wizardSteps';

const TOTAL_STEPS = WIZARD_STEPS.length; // 6

/**
 * Hook that exposes step-navigation helpers for the onboarding wizard.
 *
 * @param validateCurrentStep – optional async validator that returns `true`
 * when the current step's form data is valid. If omitted `canGoNext` defaults
 * to `true` so the caller controls gating elsewhere.
 */
export function useWizardNavigation(
  validateCurrentStep?: () => boolean | Promise<boolean>,
) {
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const setCurrentStep = useOnboardingStore((s) => s.setCurrentStep);

  // ── Derived values ──────────────────────────────────────────────────────

  const canGoPrev = currentStep > 1;

  const canGoNext = useMemo(() => {
    // If no external validator is provided we default to allowing forward
    // navigation — each step form should gate submission independently.
    return currentStep < TOTAL_STEPS;
  }, [currentStep]);

  const stepProgress = useMemo(
    () => Math.round((currentStep / TOTAL_STEPS) * 100),
    [currentStep],
  );

  // ── Navigation actions ──────────────────────────────────────────────────

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= TOTAL_STEPS) {
        setCurrentStep(step);
      }
    },
    [setCurrentStep],
  );

  const nextStep = useCallback(async () => {
    if (currentStep >= TOTAL_STEPS) return;

    // If a validator was provided, await its result before proceeding.
    if (validateCurrentStep) {
      const isValid = await validateCurrentStep();
      if (!isValid) return;
    }

    setCurrentStep(currentStep + 1);
  }, [currentStep, setCurrentStep, validateCurrentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, setCurrentStep]);

  return {
    currentStep,
    totalSteps: TOTAL_STEPS,
    goToStep,
    nextStep,
    prevStep,
    canGoNext,
    canGoPrev,
    stepProgress,
  };
}
