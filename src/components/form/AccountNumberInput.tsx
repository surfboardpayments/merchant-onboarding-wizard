"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";
import { FieldLabel, FieldMessage, fieldClasses } from "@/components/ui/Input";

interface AccountNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  error?: string;
  isValidated?: boolean;
  onChange?: (value: string) => void;
}

export const AccountNumberInput = forwardRef<
  HTMLInputElement,
  AccountNumberInputProps
>(
  (
    { label, error, isValidated, className, onChange, value, id, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const statusId = `${inputId}-status`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={value}
            onChange={(e) => onChange?.(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="12345678"
            maxLength={8}
            aria-invalid={error ? true : undefined}
            aria-describedby={[errorId, statusId].filter(Boolean).join(" ")}
            className={cn(
              fieldClasses(!!error),
              "h-11 px-3.5 font-mono tracking-[0.06em]",
              isValidated && "pr-11",
              className,
            )}
            {...props}
          />
          {isValidated && (
            <span
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ok"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="m3 8.5 3.2 3.2L13 4.8" />
              </svg>
            </span>
          )}
        </div>
        <p id={statusId} aria-live="polite" className="sr-only">
          {isValidated ? "Account details verified with your bank" : ""}
        </p>
        {error && (
          <FieldMessage id={errorId} tone="error">
            {error}
          </FieldMessage>
        )}
      </div>
    );
  },
);

AccountNumberInput.displayName = "AccountNumberInput";
