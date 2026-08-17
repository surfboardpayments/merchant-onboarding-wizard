"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Rendered inside the field on the right: a unit, a tick, a spinner. */
  adornment?: ReactNode;
  /** Rendered inside the field on the left. Currency symbols belong here,
      before the number, the way they are written and read. */
  leading?: ReactNode;
}

/**
 * Shared field chrome, so inputs, selects and textareas cannot drift apart.
 *
 * `focus` is the default. Pass `"within"` for a composite control where the
 * border belongs to a wrapper but the focus lives on a child, such as the
 * dialling code and number that together make up the phone field.
 */
export const fieldClasses = (
  hasError?: boolean,
  focus: "self" | "within" = "self",
) =>
  cn(
    "w-full rounded-[var(--radius-sm)] border bg-surface text-base text-ink",
    "placeholder:text-ink-subtle",
    "transition-[border-color,box-shadow] duration-[var(--dur-tap)] ease-[var(--ease-out)]",
    "hover:border-ink-subtle",
    focus === "self"
      ? "focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-wash)]"
      : "focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-wash)]",
    "disabled:cursor-not-allowed disabled:bg-surface-sunk disabled:text-ink-subtle disabled:hover:border-field-line",
    hasError
      ? focus === "self"
        ? "border-danger focus:border-danger focus:shadow-[0_0_0_3px_var(--danger-wash)]"
        : "border-danger focus-within:border-danger focus-within:shadow-[0_0_0_3px_var(--danger-wash)]"
      : "border-field-line",
  );

export function FieldLabel({
  htmlFor,
  children,
  className,
}: {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("text-sm font-medium leading-snug text-ink", className)}
    >
      {children}
    </label>
  );
}

export function FieldMessage({
  id,
  tone = "muted",
  children,
}: {
  id?: string;
  tone?: "muted" | "error";
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "text-xs leading-snug",
        tone === "error" ? "text-danger" : "text-ink-muted",
      )}
    >
      {children}
    </p>
  );
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, helperText, adornment, leading, id, type = "text", ...props },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
        <div className="relative">
          {leading && (
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-base text-ink-muted">
              {leading}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              fieldClasses(!!error),
              "h-11 px-3.5",
              leading && "pl-8",
              adornment && "pr-11",
              className,
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            {...props}
          />
          {adornment && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-muted">
              {adornment}
            </span>
          )}
        </div>
        {error && (
          <FieldMessage id={errorId} tone="error">
            {error}
          </FieldMessage>
        )}
        {helperText && !error && (
          <FieldMessage id={helperId}>{helperText}</FieldMessage>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
