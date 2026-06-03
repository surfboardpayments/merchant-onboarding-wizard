"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  error?: string;
  onChange?: (value: string) => void;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, className, onChange, value, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow only digits, spaces, dashes, plus
      const cleaned = e.target.value.replace(/[^\d\s\-+()]/g, "");
      onChange?.(cleaned);
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
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            +44
          </span>
          <input
            ref={ref}
            type="tel"
            value={value}
            onChange={handleChange}
            className={cn(
              "w-full pl-12 pr-3 py-2.5 text-sm border rounded-lg bg-white transition-colors",
              "placeholder:text-muted-foreground/60",
              "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground",
              error
                ? "border-error focus:ring-error/20 focus:border-error"
                : "border-border",
              className
            )}
            placeholder="7700 900000"
            {...props}
          />
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
