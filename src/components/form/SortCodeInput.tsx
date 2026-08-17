"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";
import { FieldLabel, FieldMessage, fieldClasses } from "@/components/ui/Input";

interface SortCodeInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  error?: string;
  /** Resolved bank, or "Checking" while the lookup is in flight. */
  bankName?: string | null;
  isChecking?: boolean;
  onChange?: (value: string) => void;
}

export const SortCodeInput = forwardRef<HTMLInputElement, SortCodeInputProps>(
  (
    { label, error, bankName, isChecking, className, onChange, value, id, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const statusId = `${inputId}-status`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "").slice(0, 6);
      const formatted =
        raw.length > 4
          ? `${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4)}`
          : raw.length > 2
            ? `${raw.slice(0, 2)}-${raw.slice(2)}`
            : raw;
      onChange?.(formatted);
    };

    return (
      <div className="flex flex-col gap-1.5">
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
        <input
          ref={ref}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={handleChange}
          placeholder="00-00-00"
          maxLength={8}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, statusId].filter(Boolean).join(" ")}
          className={cn(
            fieldClasses(!!error),
            "h-11 px-3.5 font-mono tracking-[0.06em]",
            className,
          )}
          {...props}
        />
        <p id={statusId} aria-live="polite" className="min-h-4">
          {isChecking && (
            <span className="text-xs text-ink-muted">Checking this sort code</span>
          )}
          {!isChecking && bankName && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-ok">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path d="m3 8.5 3.2 3.2L13 4.8" />
              </svg>
              {bankName}
            </span>
          )}
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

SortCodeInput.displayName = "SortCodeInput";
