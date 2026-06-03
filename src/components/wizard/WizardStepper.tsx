"use client";

import { cn } from "@/lib/utils/cn";

interface Step {
  number: number;
  label: string;
  description?: string;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function WizardStepper({
  steps,
  currentStep,
  onStepClick,
}: WizardStepperProps) {
  return (
    <nav aria-label="Onboarding progress">
      {/* Desktop stepper */}
      <ol className="hidden sm:flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isClickable = onStepClick && step.number < currentStep;

          return (
            <li
              key={step.number}
              className={cn("flex items-center", index < steps.length - 1 && "flex-1")}
            >
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                className={cn(
                  "flex items-center gap-2 group",
                  isClickable && "cursor-pointer"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {/* Circle */}
                <span
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0 transition-all duration-300",
                    isCompleted &&
                      "bg-brand text-white",
                    isCurrent &&
                      "bg-brand text-white ring-4 ring-brand/15",
                    !isCompleted &&
                      !isCurrent &&
                      "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </span>

                {/* Label */}
                <span
                  className={cn(
                    "text-sm font-medium hidden lg:block transition-colors",
                    isCurrent && "text-foreground",
                    isCompleted && "text-foreground group-hover:text-brand",
                    !isCompleted && !isCurrent && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-3">
                  <div
                    className={cn(
                      "h-0.5 rounded-full transition-colors duration-500",
                      step.number < currentStep
                        ? "bg-brand"
                        : "bg-border"
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile stepper - simplified */}
      <div className="flex sm:hidden items-center justify-between relative">
        <span className="text-sm font-medium text-foreground">
          Step {currentStep} of {steps.length}
        </span>
        <span className="text-sm text-muted-foreground">
          {steps[currentStep - 1]?.label}
        </span>
        {/* Progress bar */}
        <div className="absolute -bottom-4 left-0 right-0 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-500 ease-out rounded-full"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </nav>
  );
}
