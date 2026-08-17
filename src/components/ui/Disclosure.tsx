"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface DisclosureProps {
  summary: ReactNode;
  /** Right-aligned counter or status, e.g. "12 sections" or "Optional". */
  meta?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** `plain` sits inline in a form; `panel` gets a border and its own ground. */
  tone?: "plain" | "panel";
  className?: string;
}

/**
 * Inline progressive disclosure. Everything a merchant might want but most
 * won't need lives behind one of these, which is how a long form stops looking
 * long without anything being removed from it.
 */
export function Disclosure({
  summary,
  meta,
  children,
  defaultOpen = false,
  tone = "plain",
  className,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();

  return (
    <div
      className={cn(
        tone === "panel" &&
          "overflow-hidden rounded-[var(--radius-md)] border border-line",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={regionId}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 text-left",
          "transition-colors duration-[var(--dur-tap)] ease-[var(--ease-out)]",
          tone === "panel"
            ? "bg-surface-sunk px-4 py-3.5 hover:bg-surface-veil"
            : "-mx-1 rounded-[var(--radius-xs)] px-1 py-1.5 hover:text-accent",
        )}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-ink-muted",
            "transition-transform duration-[var(--dur-state)] ease-[var(--ease-out)]",
            open && "rotate-90",
          )}
          aria-hidden="true"
        >
          <path d="m6 3.5 4.5 4.5L6 12.5" />
        </svg>
        <span className="min-w-0 flex-1 text-base font-medium text-ink">
          {summary}
        </span>
        {meta && (
          <span className="shrink-0 text-sm text-ink-subtle">{meta}</span>
        )}
      </button>

      <div
        id={regionId}
        className={cn(
          "grid transition-[grid-template-rows] duration-[var(--dur-reveal)] ease-[var(--ease-out)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className={cn("min-h-0", open ? "overflow-visible" : "overflow-hidden")}>
          <div
            className={cn(tone === "panel" ? "px-4 pb-4 pt-4" : "pt-3")}
            inert={!open}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
