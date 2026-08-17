"use client";

import type { AutofillStatus } from "@/hooks/useAIAutofill";
import { cn } from "@/lib/utils/cn";

interface AIAutofillIndicatorProps {
  status: AutofillStatus;
  filledFields: number;
  onDismiss: () => void;
  className?: string;
}

/**
 * The moment the whole redesign hangs on: the merchant watches fields fill
 * themselves. It is worth showing, and worth being honest about, so the
 * success state says the numbers are estimates rather than implying we know.
 */
export function AIAutofillIndicator({
  status,
  filledFields,
  onDismiss,
  className,
}: AIAutofillIndicatorProps) {
  if (status === "idle" || status === "error") return null;
  if (status === "success" && filledFields === 0) return null;

  const working = status === "loading";

  return (
    <div
      aria-live="polite"
      className={cn(
        "animate-fade flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3.5",
        working
          ? "is-working border-accent-edge bg-accent-wash"
          : "border-ok-edge bg-ok-wash",
        className,
      )}
    >
      {working ? (
        <span
          aria-hidden="true"
          className="mt-1.5 flex h-3 w-3 shrink-0 items-center justify-center"
        >
          <span className="h-2 w-2 rounded-full bg-accent" />
        </span>
      ) : (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 h-4 w-4 shrink-0 text-ok"
          aria-hidden="true"
        >
          <path d="m3 8.5 3.2 3.2L13 4.8" />
        </svg>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-ink">
          {working
            ? "Looking up the rest of your details"
            : `We filled in ${filledFields} ${filledFields === 1 ? "answer" : "answers"} for you`}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
          {working
            ? "Checking public records so you have less to type. Carry on, this runs in the background."
            : "Some are looked up, some are our best guess. Change anything that's wrong as you go."}
        </p>
      </div>

      {!working && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-xs)] text-ink-subtle transition-colors duration-[var(--dur-tap)] hover:bg-surface-sunk hover:text-ink"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="m4 4 8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
    </div>
  );
}
