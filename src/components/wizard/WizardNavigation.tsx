"use client";

import { cn } from "@/lib/utils/cn";

interface WizardNavigationProps {
  onNext: () => void;
  onPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  isLastStep: boolean;
  isSubmitting?: boolean;
}

export function WizardNavigation({
  onNext,
  onPrev,
  canGoNext,
  canGoPrev,
  isLastStep,
  isSubmitting = false,
}: WizardNavigationProps) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canGoPrev}
        className={cn(
          "inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all",
          canGoPrev
            ? "text-foreground hover:bg-muted active:bg-muted/80"
            : "text-muted-foreground/40 cursor-not-allowed"
        )}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext || isSubmitting}
        className={cn(
          "inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all",
          canGoNext && !isSubmitting
            ? "bg-foreground text-primary-foreground hover:bg-foreground/90 active:bg-foreground/80 shadow-sm"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {isSubmitting ? (
          <>
            <svg
              className="animate-spin w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Submitting...
          </>
        ) : isLastStep ? (
          <>
            Submit Application
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </>
        ) : (
          <>
            Continue
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
