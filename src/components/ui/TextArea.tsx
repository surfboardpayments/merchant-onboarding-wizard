"use client";

import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
import { FieldLabel, FieldMessage, fieldClasses } from "./Input";

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    { className, label, error, helperText, id, maxLength, value, defaultValue, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText ? `${textareaId}-helper` : undefined;
    const countId = maxLength ? `${textareaId}-count` : undefined;
    const describedBy =
      [errorId, helperId, countId].filter(Boolean).join(" ") || undefined;

    const currentLength =
      typeof value === "string"
        ? value.length
        : typeof defaultValue === "string"
          ? defaultValue.length
          : 0;

    const nearLimit = maxLength ? currentLength > maxLength * 0.9 : false;

    return (
      <div className="flex flex-col gap-1.5">
        {label && <FieldLabel htmlFor={textareaId}>{label}</FieldLabel>}
        <textarea
          ref={ref}
          id={textareaId}
          rows={4}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          className={cn(
            fieldClasses(!!error),
            "min-h-24 resize-y px-3.5 py-3 leading-relaxed",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {error && (
              <FieldMessage id={errorId} tone="error">
                {error}
              </FieldMessage>
            )}
            {helperText && !error && (
              <FieldMessage id={helperId}>{helperText}</FieldMessage>
            )}
          </div>
          {maxLength && (
            <span
              id={countId}
              className={cn(
                "tabular shrink-0 text-xs",
                nearLimit ? "text-warn" : "text-ink-subtle",
              )}
            >
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  },
);

TextArea.displayName = "TextArea";

export { TextArea };
