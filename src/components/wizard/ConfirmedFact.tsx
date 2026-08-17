"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/* ═══════════════════════════════════════════════════════════════════════════
   ConfirmedFact

   The load-bearing idea of this flow. Companies House, Creditsafe and the
   autofill already know most of what the acquirer needs. Rendered as labelled
   inputs, that knowledge reads as work the merchant still has to do. Rendered
   as a sentence, it reads as work already done.

   Collapsed: one line of prose, values in bold, a source tag, one link to
   correct it. Expanded: the real fields, unchanged, writing to the same store.

   The reveal animates grid-template-rows rather than height, so no layout
   property is animated and the content can be any size.
   ═══════════════════════════════════════════════════════════════════════ */

export type FactSource = "companies-house" | "creditsafe" | "estimated" | "you";

const SOURCE_LABEL: Record<FactSource, string> = {
  "companies-house": "From Companies House",
  creditsafe: "From Creditsafe",
  estimated: "We estimated this",
  you: "You entered this",
};

/**
 * A retrieved value inside a sentence. Bold, and never a different colour: the
 * emphasis is the point, a second hue would just be noise.
 *
 * Trailing punctuation is trimmed. Retrieved descriptions often arrive as
 * complete sentences, and the surrounding prose supplies its own full stop.
 */
export function Val({ children }: { children: ReactNode }) {
  const value =
    typeof children === "string" ? children.trim().replace(/[.,;:]+$/, "") : children;
  return <strong className="font-semibold text-ink">{value}</strong>;
}

export function SourceTag({
  source,
  className,
}: {
  source: FactSource;
  className?: string;
}) {
  const verified = source === "companies-house" || source === "creditsafe";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-[0.08em]",
        verified ? "text-ok" : "text-ink-subtle",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          verified ? "bg-ok" : "bg-ink-subtle/60",
        )}
      />
      {SOURCE_LABEL[source]}
    </span>
  );
}

interface ConfirmedFactProps {
  /** The question this fact answers, in the merchant's language. */
  question: ReactNode;
  /** The prose answer. Wrap retrieved values in <Val>. */
  children?: ReactNode;
  /** Where the answer came from. Omit when the merchant typed it. */
  source?: FactSource;
  /** The fields that let the merchant correct it, revealed inline. */
  fields: ReactNode;
  /**
   * True when nothing was retrieved. The band and the prose are dropped and
   * the fields show immediately: there is nothing to confirm, only to answer.
   */
  unanswered?: boolean;
  /**
   * True when some of it was retrieved but a gap remains. The sentence still
   * leads, and the fields open beneath it so the empty one is visible rather
   * than hidden behind a link the merchant has no reason to click.
   */
  incomplete?: boolean;
  /** Shown above the fields when unanswered. */
  unansweredHint?: ReactNode;
  editLabel?: string;
  className?: string;
}

export function ConfirmedFact({
  question,
  children,
  source,
  fields,
  unanswered = false,
  incomplete = false,
  unansweredHint,
  editLabel = "Edit this information",
  className,
}: ConfirmedFactProps) {
  const [isEditing, setIsEditing] = useState(incomplete);
  const regionId = useId();
  const open = unanswered || isEditing;

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
        {question}
      </h3>

      {!unanswered && (
        <div
          className={cn(
            "rounded-[var(--radius-lg)] border px-5 py-4",
            "transition-[background,border-color] duration-[var(--dur-state)] ease-[var(--ease-out)]",
            open
              ? "border-line bg-surface-sunk"
              : "border-accent-edge bg-[linear-gradient(97deg,var(--accent-wash)_0%,color-mix(in_oklab,var(--accent-wash)_38%,var(--surface))_58%,var(--surface)_100%)]",
          )}
        >
          <p className="max-w-[62ch] text-md leading-relaxed text-ink-muted">
            {children}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => setIsEditing((v) => !v)}
              aria-expanded={isEditing}
              aria-controls={regionId}
              className={cn(
                "group -mx-1.5 -my-1 inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-xs)] px-1.5 py-2",
                "text-base font-medium text-accent",
                "transition-colors duration-[var(--dur-tap)] ease-[var(--ease-out)] hover:text-accent-hover",
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
                  "h-3.5 w-3.5 transition-transform duration-[var(--dur-state)] ease-[var(--ease-out)]",
                  isEditing ? "rotate-90" : "group-hover:translate-x-0.5",
                )}
                aria-hidden="true"
              >
                <path d="M2.5 8h11M9.5 4l4 4-4 4" />
              </svg>
              <span className="underline decoration-accent/35 underline-offset-4 group-hover:decoration-accent/70">
                {isEditing ? "Hide these details" : editLabel}
              </span>
            </button>

            {source && <SourceTag source={source} />}
          </div>
        </div>
      )}

      {unanswered && unansweredHint && (
        <p className="max-w-[62ch] text-base leading-relaxed text-ink-muted">
          {unansweredHint}
        </p>
      )}

      <div
        id={regionId}
        className={cn(
          "grid transition-[grid-template-rows] duration-[var(--dur-reveal)] ease-[var(--ease-out)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className={cn("min-h-0", open ? "overflow-visible" : "overflow-hidden")}>
          <div
            className={cn("flex flex-col gap-5", !unanswered && "pt-1")}
            inert={!open}
          >
            {fields}
            {!unanswered && (
              <div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={cn(
                    "inline-flex h-9 cursor-pointer items-center rounded-[var(--radius-xs)] px-3",
                    "bg-surface-sunk text-sm font-medium text-ink",
                    "transition-colors duration-[var(--dur-tap)] ease-[var(--ease-out)] hover:bg-surface-veil",
                  )}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
