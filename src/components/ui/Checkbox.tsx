"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { FieldMessage } from "./Input";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size" | "children"> {
  label?: ReactNode;
  description?: ReactNode;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id ?? generatedId;
    const errorId = error ? `${checkboxId}-error` : undefined;
    const descId = description ? `${checkboxId}-desc` : undefined;
    const describedBy = [errorId, descId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="flex flex-col gap-1">
        <div className="group flex items-start gap-3">
          <span className="relative flex shrink-0 items-center justify-center">
            <input
              ref={ref}
              type="checkbox"
              id={checkboxId}
              className={cn(
                "peer h-5 w-5 cursor-pointer appearance-none rounded-[var(--radius-xs)] border",
                "bg-surface transition-[background-color,border-color] duration-[var(--dur-tap)] ease-[var(--ease-out)]",
                "hover:border-accent",
                "checked:border-accent checked:bg-accent",
                "disabled:cursor-not-allowed disabled:opacity-45",
                error ? "border-danger" : "border-field-line",
                className,
              )}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              {...props}
            />
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute h-3.5 w-3.5 scale-75 opacity-0 transition-[opacity,transform] duration-[var(--dur-tap)] ease-[var(--ease-out)] peer-checked:scale-100 peer-checked:opacity-100"
              aria-hidden="true"
            >
              <path d="m3 8.5 3.2 3.2L13 4.8" />
            </svg>
          </span>
          {(label || description) && (
            <span className="min-w-0 flex-1">
              {label && (
                <label
                  htmlFor={checkboxId}
                  className="block cursor-pointer text-base leading-snug text-ink"
                >
                  {label}
                </label>
              )}
              {description && (
                <p id={descId} className="mt-1 text-sm leading-snug text-ink-muted">
                  {description}
                </p>
              )}
            </span>
          )}
        </div>
        {error && (
          <FieldMessage id={errorId} tone="error">
            {error}
          </FieldMessage>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
