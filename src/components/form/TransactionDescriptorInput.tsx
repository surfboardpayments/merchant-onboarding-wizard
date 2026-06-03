"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface TransactionDescriptorInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  error?: string;
  onChange?: (value: string) => void;
}

export const TransactionDescriptorInput = forwardRef<
  HTMLInputElement,
  TransactionDescriptorInputProps
>(({ label, error, className, onChange, value, ...props }, ref) => {
  const strValue = (value as string) || "";
  const charCount = strValue.length;
  const maxChars = 22;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => {
          const v = e.target.value.slice(0, maxChars).toUpperCase();
          onChange?.(v);
        }}
        maxLength={maxChars}
        className={cn(
          "w-full px-3 py-2.5 text-sm border rounded-lg bg-white transition-colors font-mono uppercase tracking-wide",
          "placeholder:text-muted-foreground/60 placeholder:normal-case placeholder:tracking-normal placeholder:font-sans",
          "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground",
          error
            ? "border-error focus:ring-error/20 focus:border-error"
            : "border-border",
          className
        )}
        placeholder="e.g. SURFBOARD*ACME"
        {...props}
      />

      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs",
            charCount > maxChars ? "text-error" : "text-muted-foreground"
          )}
        >
          {charCount}/{maxChars} characters
        </span>
      </div>

      {/* Statement preview */}
      {strValue.length > 0 && (
        <div className="mt-3 bg-muted rounded-lg p-4 border border-border/50">
          <p className="text-xs text-muted-foreground mb-1.5">
            How this appears on your customer&apos;s bank statement:
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-medium text-foreground">
              {strValue || "SURFBOARD*MERCHANT"}
            </span>
            <span className="text-sm font-mono text-muted-foreground">
              -£XX.XX
            </span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
});

TransactionDescriptorInput.displayName = "TransactionDescriptorInput";
