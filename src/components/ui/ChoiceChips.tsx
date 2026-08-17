"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface Choice<T extends string> {
  value: T;
  label: string;
  /** Shown under the label when the set needs explaining. Omit for yes/no. */
  description?: string;
}

interface ChoiceChipsProps<T extends string> {
  /** The question, phrased in the merchant's language. */
  label: ReactNode;
  options: Choice<T>[];
  value?: T;
  onChange: (value: T) => void;
  /** `chips` for two or three short answers, `stack` when options need describing. */
  layout?: "chips" | "stack";
  name?: string;
  hint?: ReactNode;
  error?: string;
  className?: string;
}

/**
 * A segmented answer control built on native radio inputs, so arrow-key
 * navigation, form semantics and screen-reader grouping come for free. The
 * visible chip is the label; the input is the control.
 */
export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
  layout = "chips",
  name,
  hint,
  error,
  className,
}: ChoiceChipsProps<T>) {
  const generatedName = useId();
  const groupName = name ?? generatedName;
  const errorId = error ? `${groupName}-error` : undefined;
  const hintId = hint ? `${groupName}-hint` : undefined;

  return (
    <fieldset
      className={cn("flex flex-col gap-2.5", className)}
      aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="mb-0.5 text-base font-medium leading-snug text-ink">
        {label}
      </legend>

      {hint && (
        <p id={hintId} className="max-w-[62ch] text-sm leading-relaxed text-ink-muted">
          {hint}
        </p>
      )}

      <div
        className={cn(
          layout === "chips"
            ? "flex flex-wrap gap-2"
            : "grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]",
        )}
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "group relative cursor-pointer select-none",
                "transition-[background-color,border-color,color] duration-[var(--dur-tap)] ease-[var(--ease-out)]",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                layout === "chips"
                  ? "inline-flex min-h-11 items-center rounded-[var(--radius-xs)] border px-5 text-base font-medium"
                  : "flex min-h-11 flex-col justify-center gap-0.5 rounded-[var(--radius-sm)] border px-4 py-3",
                selected
                  ? "border-accent bg-accent text-white"
                  : "border-line-strong bg-surface text-ink-muted hover:border-accent hover:bg-accent-wash hover:text-ink",
              )}
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="absolute h-0 w-0 opacity-0"
              />
              <span className={cn(layout === "stack" && "font-medium")}>
                {option.label}
              </span>
              {option.description && (
                <span
                  className={cn(
                    "text-sm leading-snug",
                    selected ? "text-white/75" : "text-ink-subtle",
                  )}
                >
                  {option.description}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
