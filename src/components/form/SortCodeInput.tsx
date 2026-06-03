"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface SortCodeInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  error?: string;
  bankName?: string | null;
  onChange?: (value: string) => void;
}

export const SortCodeInput = forwardRef<HTMLInputElement, SortCodeInputProps>(
  ({ label, error, bankName, className, onChange, value, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "").slice(0, 6);

      // Auto-format as XX-XX-XX
      let formatted = raw;
      if (raw.length > 4) {
        formatted = `${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4)}`;
      } else if (raw.length > 2) {
        formatted = `${raw.slice(0, 2)}-${raw.slice(2)}`;
      }

      onChange?.(formatted);
    };

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
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          placeholder="00-00-00"
          maxLength={8}
          className={cn(
            "w-full px-3 py-2.5 text-sm border rounded-lg bg-white transition-colors font-mono tracking-wider",
            "placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground",
            error
              ? "border-error focus:ring-error/20 focus:border-error"
              : "border-border",
            className
          )}
          {...props}
        />
        {bankName && (
          <p className="text-sm text-success flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {bankName}
          </p>
        )}
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    );
  }
);

SortCodeInput.displayName = "SortCodeInput";
