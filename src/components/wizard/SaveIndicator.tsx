"use client";

import { cn } from "@/lib/utils/cn";

interface SaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  className?: string;
}

/**
 * Sits on the dark frame. Its whole job is to remove the fear that closing the
 * tab loses the work, which is the main reason people push through a long form
 * in one sitting when they'd rather not.
 */
export function SaveIndicator({
  isSaving,
  lastSaved,
  className,
}: SaveIndicatorProps) {
  if (!isSaving && !lastSaved) return null;

  return (
    <p
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 text-xs text-on-frame-faint",
        className,
      )}
    >
      {isSaving ? (
        <>
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-on-frame-muted/60"
          />
          Saving
        </>
      ) : (
        <>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 text-mint"
            aria-hidden="true"
          >
            <path d="m3 8.5 3.2 3.2L13 4.8" />
          </svg>
          Saved on this device
        </>
      )}
    </p>
  );
}
