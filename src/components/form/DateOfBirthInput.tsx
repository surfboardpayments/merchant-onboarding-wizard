"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/cn";
import { FieldMessage, fieldClasses } from "@/components/ui/Input";

interface DateOfBirth {
  day?: number;
  month?: number;
  year?: number;
}

interface DateOfBirthInputProps {
  value: DateOfBirth;
  onChange: (dob: DateOfBirth) => void;
  error?: string;
  label?: string;
  helperText?: string;
  /** Companies House publishes month and year only; those arrive locked. */
  disabledFields?: ("day" | "month" | "year")[];
}

const PARTS = [
  { key: "day", label: "Day", placeholder: "DD", min: 1, max: 31, width: "w-full" },
  { key: "month", label: "Month", placeholder: "MM", min: 1, max: 12, width: "w-full" },
  { key: "year", label: "Year", placeholder: "YYYY", min: 1900, max: 2015, width: "w-full" },
] as const;

export function DateOfBirthInput({
  value,
  onChange,
  error,
  label = "Date of birth",
  helperText,
  disabledFields = [],
}: DateOfBirthInputProps) {
  const groupId = useId();
  const errorId = error ? `${groupId}-error` : undefined;
  const helperId = helperText ? `${groupId}-helper` : undefined;

  return (
    <fieldset
      className="flex flex-col gap-1.5"
      aria-describedby={[errorId, helperId].filter(Boolean).join(" ") || undefined}
    >
      <legend className="mb-1.5 text-sm font-medium leading-snug text-ink">
        {label}
      </legend>
      <div className="grid max-w-sm grid-cols-[1fr_1fr_1.4fr] gap-2">
        {PARTS.map((part) => {
          const disabled = disabledFields.includes(part.key);
          const fieldId = `${groupId}-${part.key}`;
          return (
            <div key={part.key} className="flex flex-col gap-1">
              <label
                htmlFor={fieldId}
                className="text-xs font-medium text-ink-muted"
              >
                {part.label}
              </label>
              <input
                id={fieldId}
                type="number"
                inputMode="numeric"
                min={part.min}
                max={part.max}
                value={value[part.key] ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    [part.key]: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                placeholder={part.placeholder}
                disabled={disabled}
                aria-invalid={error ? true : undefined}
                className={cn(fieldClasses(!!error), "h-11 px-3 text-center font-mono")}
              />
            </div>
          );
        })}
      </div>
      {error && (
        <FieldMessage id={errorId} tone="error">
          {error}
        </FieldMessage>
      )}
      {helperText && !error && <FieldMessage id={helperId}>{helperText}</FieldMessage>}
    </fieldset>
  );
}
