"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id ?? generatedId;
    const errorId = error ? `${checkboxId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={checkboxId}
          className="flex cursor-pointer items-start gap-2.5"
        >
          <div className="relative mt-0.5 flex shrink-0 items-center justify-center">
            <input
              ref={ref}
              type="checkbox"
              id={checkboxId}
              className={cn(
                "peer h-4 w-4 cursor-pointer appearance-none rounded-[var(--radius-sm)] border-2 transition-colors duration-150",
                "checked:border-primary checked:bg-primary",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "disabled:cursor-not-allowed disabled:opacity-50",
                error ? "border-error" : "border-border",
                className
              )}
              aria-invalid={error ? true : undefined}
              aria-describedby={errorId}
              {...props}
            />
            {/* Checkmark icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="pointer-events-none absolute h-3 w-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.739a.75.75 0 011.04-.208z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          {label && (
            <span className="text-sm text-foreground select-none">
              {label}
            </span>
          )}
        </label>
        {error && (
          <p id={errorId} className="ml-6.5 text-xs text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
