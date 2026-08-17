"use client";

import { WIZARD_STEPS } from "@/lib/constants/wizardSteps";
import { cn } from "@/lib/utils/cn";

interface ProgressSegmentsProps {
  currentStep: number;
  /** Completed steps are clickable; upcoming ones are not. */
  onStepClick?: (step: number) => void;
  className?: string;
}

function minutesLeft(currentStep: number): number {
  return WIZARD_STEPS.filter((s) => s.number >= currentStep).reduce(
    (total, s) => total + s.estimatedMinutes,
    0,
  );
}

/**
 * Three bars, not six numbered circles.
 *
 * A stepper's honest job is to say how much is left. Six dots said "this is
 * long". Three bars plus a minutes estimate says "this is nearly over", which
 * happens to be true once the lookups have done their work.
 */
export function ProgressSegments({
  currentStep,
  onStepClick,
  className,
}: ProgressSegmentsProps) {
  const remaining = minutesLeft(currentStep);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="font-mono text-2xs uppercase tracking-[0.12em] text-on-frame-faint">
        Step {currentStep} of {WIZARD_STEPS.length}
        <span aria-hidden="true"> · </span>
        <span>about {remaining} {remaining === 1 ? "minute" : "minutes"} left</span>
      </p>

      <ol className="flex gap-2" aria-label="Onboarding progress">
        {WIZARD_STEPS.map((step) => {
          const done = step.number < currentStep;
          const current = step.number === currentStep;
          const canJump = done && !!onStepClick;

          return (
            <li key={step.number} className="flex-1">
              {canJump ? (
                <button
                  type="button"
                  onClick={() => onStepClick(step.number)}
                  className="group -my-1 block w-full cursor-pointer py-3"
                >
                  <span className="sr-only">
                    Go back to step {step.number}, {step.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block h-1.5 rounded-full bg-accent-on-dark",
                      "transition-[filter] duration-[var(--dur-state)] ease-[var(--ease-out)]",
                      "group-hover:brightness-125",
                    )}
                  />
                </button>
              ) : (
                <div className="-my-1 py-3" aria-current={current ? "step" : undefined}>
                  <span className="sr-only">
                    Step {step.number}, {step.label}
                    {current ? " (current)" : ""}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block h-1.5 rounded-full",
                      "transition-[background-color] duration-[var(--dur-reveal)] ease-[var(--ease-out)]",
                      done || current ? "bg-accent-on-dark" : "bg-on-frame-line",
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
