"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";
import { FieldLabel, FieldMessage, fieldClasses } from "@/components/ui/Input";

const MAX_CHARS = 22;

interface TransactionDescriptorInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  error?: string;
  onChange?: (value: string) => void;
}

/**
 * The statement preview is not decoration. "Transaction descriptor" means
 * nothing to a shop owner; a line that looks like their customer's banking app
 * explains the field faster than any helper text could.
 */
export const TransactionDescriptorInput = forwardRef<
  HTMLInputElement,
  TransactionDescriptorInputProps
>(({ label, error, className, onChange, value, id, ...props }, ref) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const previewId = `${inputId}-preview`;

  const text = ((value as string) || "").toUpperCase();
  const remaining = MAX_CHARS - text.length;

  return (
    <div className="flex flex-col gap-1.5">
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <input
        ref={ref}
        id={inputId}
        type="text"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange?.(e.target.value.slice(0, MAX_CHARS).toUpperCase())}
        maxLength={MAX_CHARS}
        placeholder="ACME SPORTS LONDON"
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, previewId].filter(Boolean).join(" ")}
        className={cn(
          fieldClasses(!!error),
          "h-11 px-3.5 font-mono uppercase tracking-[0.04em]",
          "placeholder:font-sans placeholder:normal-case placeholder:tracking-normal",
          className,
        )}
        {...props}
      />

      <div className="flex justify-end">
        <span
          className={cn(
            "tabular text-xs",
            remaining < 0 ? "text-danger" : remaining <= 4 ? "text-warn" : "text-ink-subtle",
          )}
        >
          {remaining} character{remaining === 1 ? "" : "s"} left
        </span>
      </div>

      <figure
        id={previewId}
        className="mt-1 overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface-sunk"
      >
        <figcaption className="border-b border-line px-4 py-2 font-mono text-2xs uppercase tracking-[0.1em] text-ink-subtle">
          Your customer&apos;s bank statement
        </figcaption>
        <div className="flex items-baseline justify-between gap-4 px-4 py-3.5">
          <span
            className={cn(
              "truncate font-mono text-base font-bold tracking-[0.02em]",
              text ? "text-ink" : "text-ink-subtle",
            )}
          >
            {text || "ACME SPORTS LONDON"}
          </span>
          <span className="tabular shrink-0 font-mono text-base text-ink-muted">
            &minus;£42.00
          </span>
        </div>
      </figure>

      {error && (
        <FieldMessage id={errorId} tone="error">
          {error}
        </FieldMessage>
      )}
    </div>
  );
});

TransactionDescriptorInput.displayName = "TransactionDescriptorInput";
