"use client";

import { cn } from "@/lib/utils/cn";

export interface StepperStep {
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={className}>
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isFuture = index > currentStep;
          const isClickable = onStepClick && isCompleted;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.label}
              className={cn(
                "flex items-center",
                !isLast && "flex-1"
              )}
            >
              <div className="flex flex-col items-center gap-1.5">
                {/* Step circle */}
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(index)}
                  disabled={!isClickable}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all duration-200",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isCompleted &&
                      "bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90",
                    isCurrent &&
                      "border-2 border-primary bg-background text-primary",
                    isFuture &&
                      "border-2 border-border bg-background text-muted-foreground",
                    !isClickable && "cursor-default"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`${step.label}${isCompleted ? " (completed)" : isCurrent ? " (current)" : ""}`}
                >
                  {isCompleted ? <CheckIcon /> : index + 1}
                </button>
                {/* Step label */}
                <div className="flex flex-col items-center text-center">
                  <span
                    className={cn(
                      "text-xs font-medium whitespace-nowrap",
                      isCurrent
                        ? "text-foreground"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                  {step.description && (
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "mx-2 mt-[-1.5rem] h-0.5 flex-1 transition-colors duration-200",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

Stepper.displayName = "Stepper";

export { Stepper };
