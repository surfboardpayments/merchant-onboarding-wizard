"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/cn";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface RadioGroupProps {
  label?: string;
  error?: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  layout?: "horizontal" | "vertical";
  name?: string;
  className?: string;
}

function RadioGroup({
  label,
  error,
  options,
  value,
  onChange,
  layout = "vertical",
  name,
  className,
}: RadioGroupProps) {
  const generatedId = useId();
  const groupName = name ?? generatedId;
  const errorId = error ? `${groupName}-error` : undefined;

  return (
    <fieldset
      className={cn("flex flex-col gap-2", className)}
      aria-describedby={errorId}
    >
      {label && (
        <legend className="text-sm font-medium text-foreground pb-1">
          {label}
        </legend>
      )}
      <div
        className={cn(
          "flex gap-3",
          layout === "vertical" ? "flex-col" : "flex-row flex-wrap"
        )}
        role="radiogroup"
      >
        {options.map((option) => {
          const optionId = `${groupName}-${option.value}`;
          const isSelected = value === option.value;

          if (layout === "horizontal") {
            return (
              <label
                key={option.value}
                htmlFor={optionId}
                className={cn(
                  "flex flex-1 cursor-pointer flex-col gap-0.5 rounded-[var(--radius)] border p-4 transition-all duration-150",
                  isSelected
                    ? "border-primary bg-primary/[0.03] ring-2 ring-primary"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                )}
              >
                <input
                  type="radio"
                  id={optionId}
                  name={groupName}
                  value={option.value}
                  checked={isSelected}
                  onChange={() => onChange?.(option.value)}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-foreground">
                  {option.label}
                </span>
                {option.description && (
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                )}
              </label>
            );
          }

          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className="flex cursor-pointer items-start gap-2.5"
            >
              <input
                type="radio"
                id={optionId}
                name={groupName}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange?.(option.value)}
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-full border-2 transition-colors duration-150",
                  isSelected
                    ? "border-primary bg-primary shadow-[inset_0_0_0_2.5px_white]"
                    : "border-border bg-background"
                )}
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  {option.label}
                </span>
                {option.description && (
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

RadioGroup.displayName = "RadioGroup";

export { RadioGroup };
