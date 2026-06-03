"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/cn";

export interface ToggleProps {
  label: string;
  description?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

function Toggle({
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  className,
  id,
}: ToggleProps) {
  const generatedId = useId();
  const toggleId = id ?? generatedId;

  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex flex-col gap-0.5">
        <label
          htmlFor={toggleId}
          className={cn(
            "text-sm font-medium text-foreground",
            disabled ? "opacity-50" : "cursor-pointer"
          )}
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        id={toggleId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "cursor-pointer",
          checked ? "bg-primary" : "bg-border"
        )}
      >
        <span
          className={cn(
            "inline-block h-4.5 w-4.5 rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-[3px]"
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

Toggle.displayName = "Toggle";

export { Toggle };
