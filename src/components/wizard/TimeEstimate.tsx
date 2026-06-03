"use client";

import { cn } from "@/lib/utils/cn";
import { WIZARD_STEPS } from "@/lib/constants/wizardSteps";

interface TimeEstimateProps {
  currentStep: number;
  variant?: "light" | "dark";
}

export function TimeEstimate({ currentStep, variant = "light" }: TimeEstimateProps) {
  const remainingMinutes = WIZARD_STEPS.filter(
    (s) => s.number >= currentStep
  ).reduce((sum, s) => sum + s.estimatedMinutes, 0);

  if (remainingMinutes <= 0) return null;

  const display =
    remainingMinutes < 1
      ? "Less than 1 min"
      : remainingMinutes === 1
        ? "About 1 min left"
        : `About ${Math.ceil(remainingMinutes)} mins left`;

  const isDark = variant === "dark";

  return (
    <span className={cn(
      "text-xs hidden sm:inline-flex items-center gap-1.5",
      isDark ? "text-white/50" : "text-muted-foreground"
    )}>
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" d="M12 6v6l4 2" />
      </svg>
      {display}
    </span>
  );
}
