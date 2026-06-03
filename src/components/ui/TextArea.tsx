"use client";

import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      id,
      maxLength,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText ? `${textareaId}-helper` : undefined;
    const describedBy =
      [errorId, helperId].filter(Boolean).join(" ") || undefined;

    const currentLength =
      typeof value === "string"
        ? value.length
        : typeof defaultValue === "string"
          ? defaultValue.length
          : 0;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          className={cn(
            "min-h-[80px] w-full rounded-[var(--radius)] border bg-background px-3 py-2 text-sm text-foreground",
            "placeholder:text-muted-foreground",
            "transition-colors duration-150 resize-y",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-error focus:ring-error" : "border-border",
            className
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        <div className="flex items-center justify-between">
          <div>
            {error && (
              <p id={errorId} className="text-xs text-error" role="alert">
                {error}
              </p>
            )}
            {helperText && !error && (
              <p id={helperId} className="text-xs text-muted-foreground">
                {helperText}
              </p>
            )}
          </div>
          {maxLength != null && (
            <p
              className={cn(
                "ml-auto text-xs",
                currentLength >= maxLength
                  ? "text-error"
                  : "text-muted-foreground"
              )}
              aria-live="polite"
            >
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

TextArea.displayName = "TextArea";

export { TextArea };
