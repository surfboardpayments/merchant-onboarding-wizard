"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface WizardNavigationProps {
  onNext: () => void;
  onPrev: () => void;
  canGoPrev: boolean;
  isLastStep: boolean;
  isSubmitting?: boolean;
  /**
   * What is still missing, phrased for the merchant. When set, the primary
   * action stays clickable and explains itself instead of sitting greyed out
   * with no way to find out why.
   */
  blockedReason?: string | null;
}

export function WizardNavigation({
  onNext,
  onPrev,
  canGoPrev,
  isLastStep,
  isSubmitting = false,
  blockedReason = null,
}: WizardNavigationProps) {
  const [asked, setAsked] = useState(false);
  const reasonRef = useRef<HTMLParagraphElement>(null);

  // Derived, not stored: the moment they fix the problem the nag disappears on
  // its own, with no effect needed to chase the change.
  const showReason = asked && !!blockedReason;

  const handleNext = () => {
    if (blockedReason) {
      setAsked(true);
      reasonRef.current?.scrollIntoView({ block: "nearest" });
      return;
    }
    onNext();
  };

  return (
    <div className="mt-2 flex flex-col gap-4 border-t border-line pt-6">
      {/* Stacks below sm: the primary action is wide enough on its own that a
          side-by-side row overflows a 390px viewport. Reversed so the forward
          action sits on top, in thumb reach, above the way back. */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {canGoPrev ? (
          <Button
            variant="ghost"
            size="md"
            onClick={onPrev}
            className="w-full sm:w-auto"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M13.5 8h-11M6.5 4l-4 4 4 4" />
            </svg>
            Back
          </Button>
        ) : (
          <span />
        )}

        <Button
          size="lg"
          onClick={handleNext}
          loading={isSubmitting}
          disabled={isSubmitting}
          aria-describedby={showReason ? "wizard-blocked" : undefined}
          className="w-full sm:w-auto"
        >
          {isSubmitting
            ? "Sending your application"
            : isLastStep
              ? "Submit application"
              : "Next step"}
          {!isSubmitting && (
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M2.5 8h11M9.5 4l4 4-4 4" />
            </svg>
          )}
        </Button>
      </div>

      <p
        id="wizard-blocked"
        ref={reasonRef}
        aria-live="polite"
        className={cn(
          "text-sm text-danger sm:text-right",
          showReason ? "block" : "hidden",
        )}
      >
        {blockedReason}
      </p>
    </div>
  );
}
