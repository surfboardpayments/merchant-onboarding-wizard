"use client";

import { forwardRef, useId, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { FieldLabel, FieldMessage, fieldClasses } from "@/components/ui/Input";
import {
  DEFAULT_DIALLING_CODE,
  DIALLING_CODES,
  joinPhone,
  nationalPlaceholder,
  splitPhone,
} from "@/lib/constants/diallingCodes";

interface PhoneInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value" | "type"
  > {
  label?: string;
  error?: string;
  helperText?: string;
  /** Full number including the dialling code, e.g. "+46 70 123 45 67". */
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Phone number with a selectable country code.
 *
 * The code is part of the stored value, not decoration in front of it: a
 * Swedish director's number has to reach the acquirer as +46, and the previous
 * hard-coded +44 label meant the country was never recorded at all.
 *
 * Defaults to the UK because almost every merchant here is. A number typed or
 * pasted with its own country code (+46…, 0046…) is accepted as-is and splits
 * itself into the two halves when the field loses focus.
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    { label, error, helperText, className, onChange, value, id, disabled, onBlur, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

    // Remembers the chosen country while the number itself is empty, which is
    // the whole gap between picking Sweden and typing the first digit.
    const [pendingCode, setPendingCode] = useState(DEFAULT_DIALLING_CODE);

    /**
     * Set while the merchant is typing or has pasted a number that carries its
     * own country code. Splitting on every keystroke would guess wrong on the
     * way through: +971 passes through +91 before it reaches the UAE. So the
     * text is held verbatim and resolved when the field loses focus.
     */
    const [typedInternational, setTypedInternational] = useState<string | null>(null);

    const derived = splitPhone(value, pendingCode);
    const code = typedInternational === null ? derived.code : pendingCode;
    const numberValue = typedInternational ?? derived.national;

    const emit = (nextCode: string, nextNational: string) => {
      setPendingCode(nextCode);
      onChange?.(joinPhone(nextCode, nextNational));
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      if (/^\s*(\+|00)/.test(raw)) {
        setTypedInternational(raw);
        // Stored as-is: still a valid international number, just not split yet.
        onChange?.(raw.trim());
        return;
      }

      setTypedInternational(null);
      emit(code, raw.replace(/[^\d\s\-()]/g, ""));
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (typedInternational !== null) {
        // Split what was actually typed rather than the value prop: the prop
        // round-trips through the store, and resolving from local state cannot
        // be caught out by anything else writing to it in between.
        const parsed = splitPhone(typedInternational, pendingCode);
        setTypedInternational(null);
        emit(parsed.code, parsed.national);
      }
      onBlur?.(e);
    };

    return (
      <div className="flex flex-col gap-1.5">
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}

        <div
          className={cn(
            fieldClasses(!!error, "within"),
            "flex h-11 items-stretch overflow-hidden",
            disabled && "cursor-not-allowed bg-surface-sunk",
          )}
        >
          {/* The closed control shows only the code, so the number keeps the
              room it needs. The select itself sits invisibly on top, so the
              picker still lists full country names and the control stays a
              real <select> for keyboard and screen-reader users. */}
          <div
            className={cn(
              "relative shrink-0 transition-colors duration-[var(--dur-tap)]",
              "has-[select:focus-visible]:bg-accent-wash",
            )}
          >
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none flex h-full items-center gap-1.5 pl-3.5 pr-2.5",
                "font-mono text-base tabular",
                disabled ? "text-ink-subtle" : "text-ink",
              )}
            >
              {code}
              <svg
                className="h-3.5 w-3.5 text-ink-muted"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m4 6.5 4 4 4-4" />
              </svg>
            </div>
            <select
              aria-label="Country dialling code"
              autoComplete="tel-country-code"
              disabled={disabled}
              value={code}
              onChange={(e) => {
                setTypedInternational(null);
                emit(e.target.value, numberValue);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
            >
              {DIALLING_CODES.map((entry) => (
                <option key={entry.country} value={entry.code}>
                  {entry.country} ({entry.code})
                </option>
              ))}
            </select>
          </div>

          <span aria-hidden="true" className="my-2 w-px shrink-0 bg-line" />

          <input
            ref={ref}
            id={inputId}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={numberValue}
            onChange={handleNumberChange}
            onBlur={handleBlur}
            placeholder={nationalPlaceholder(code)}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            {...props}
            className={cn(
              "min-w-0 flex-1 bg-transparent px-3 text-base text-ink",
              "placeholder:text-ink-subtle focus:outline-none",
              "disabled:cursor-not-allowed disabled:text-ink-subtle",
              className,
            )}
          />
        </div>

        {error && (
          <FieldMessage id={errorId} tone="error">
            {error}
          </FieldMessage>
        )}
        {helperText && !error && <FieldMessage id={helperId}>{helperText}</FieldMessage>}
      </div>
    );
  },
);

PhoneInput.displayName = "PhoneInput";
