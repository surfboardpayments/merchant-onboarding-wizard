"use client";

import { cn } from "@/lib/utils/cn";

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
  disabledFields?: ("day" | "month" | "year")[];
}

export function DateOfBirthInput({
  value,
  onChange,
  error,
  label = "Date of birth",
  disabledFields = [],
}: DateOfBirthInputProps) {
  const inputClass = cn(
    "w-full px-3 py-2.5 text-sm border rounded-lg bg-white transition-colors text-center",
    "placeholder:text-muted-foreground/60",
    "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground",
    error
      ? "border-error focus:ring-error/20 focus:border-error"
      : "border-border"
  );

  const disabledClass = "bg-muted text-muted-foreground cursor-not-allowed";

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <input
            type="number"
            min={1}
            max={31}
            value={value.day || ""}
            onChange={(e) =>
              onChange({
                ...value,
                day: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder="DD"
            className={cn(
              inputClass,
              disabledFields.includes("day") && disabledClass
            )}
            disabled={disabledFields.includes("day")}
          />
          <span className="text-xs text-muted-foreground mt-0.5 block text-center">
            Day
          </span>
        </div>
        <div>
          <input
            type="number"
            min={1}
            max={12}
            value={value.month || ""}
            onChange={(e) =>
              onChange({
                ...value,
                month: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder="MM"
            className={cn(
              inputClass,
              disabledFields.includes("month") && disabledClass
            )}
            disabled={disabledFields.includes("month")}
          />
          <span className="text-xs text-muted-foreground mt-0.5 block text-center">
            Month
          </span>
        </div>
        <div>
          <input
            type="number"
            min={1900}
            max={2010}
            value={value.year || ""}
            onChange={(e) =>
              onChange({
                ...value,
                year: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder="YYYY"
            className={cn(
              inputClass,
              disabledFields.includes("year") && disabledClass
            )}
            disabled={disabledFields.includes("year")}
          />
          <span className="text-xs text-muted-foreground mt-0.5 block text-center">
            Year
          </span>
        </div>
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
