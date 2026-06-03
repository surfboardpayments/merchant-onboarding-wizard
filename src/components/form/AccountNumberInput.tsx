"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

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
    { label, error, isValidated, className, onChange, value, ...props },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
      onChange?.(raw);
    };

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="text-error ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            value={value}
            onChange={handleChange}
            placeholder="12345678"
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
          {isValidated && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg
                className="w-4 h-4 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </span>
          )}
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    );
  }
);

AccountNumberInput.displayName = "AccountNumberInput";
