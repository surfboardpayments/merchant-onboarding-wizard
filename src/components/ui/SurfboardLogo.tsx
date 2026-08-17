import { cn } from "@/lib/utils/cn";

/**
 * The brand guidelines are explicit: never redraw, retrace or regenerate the
 * surfer mark. These components render the supplied SVGs from `public/brand/`,
 * downloaded from content.surfboardpayments.com.
 *
 * Minimum sizes on screen: 120px for the lockup, 24px for the mark alone.
 * Never place a mark and a lockup in the same composition.
 */

const LOCKUP_ASPECT = 882.4 / 225.1;

const LOCKUP_SRC = {
  reversed: "/brand/surboard-payments_white.svg",
  primary: "/brand/surboard-payments.svg",
} as const;

const MARK_SRC = {
  reversed: "/brand/surboard-payments-white-icon.svg",
  primary: "/brand/surfboard-payments-simplified_surfer.svg",
} as const;

interface LockupProps {
  /** `reversed` for dark grounds, `primary` for light. */
  tone?: keyof typeof LOCKUP_SRC;
  /** Rendered width in px. Never below 120 (brand minimum). */
  width?: number;
  className?: string;
  /** Set when adjacent text already names Surfboard, so SRs don't hear it twice. */
  decorative?: boolean;
}

export function SurfboardLockup({
  tone = "reversed",
  width = 132,
  className,
  decorative = false,
}: LockupProps) {
  const w = Math.max(width, 120);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOCKUP_SRC[tone]}
      alt={decorative ? "" : "Surfboard Payments"}
      aria-hidden={decorative || undefined}
      width={w}
      height={Math.round(w / LOCKUP_ASPECT)}
      className={cn("block h-auto", className)}
      style={{ width: w }}
    />
  );
}

interface MarkProps {
  tone?: keyof typeof MARK_SRC;
  /** Rendered width in px. Never below 24 (brand minimum). */
  size?: number;
  className?: string;
  decorative?: boolean;
}

export function SurfboardMark({
  tone = "reversed",
  size = 32,
  className,
  decorative = true,
}: MarkProps) {
  const s = Math.max(size, 24);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={MARK_SRC[tone]}
      alt={decorative ? "" : "Surfboard Payments"}
      aria-hidden={decorative || undefined}
      width={s}
      height={s}
      className={cn("block", className)}
      style={{ width: s, height: s }}
    />
  );
}

/**
 * The "Powered by Surfboard" endorsement that closes every onboarding screen.
 * Clear space around the lockup is at least the height of the surfer mark.
 */
export function PoweredBySurfboard({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 py-8", className)}>
      <span className="text-2xs font-medium uppercase tracking-[0.14em] text-on-frame-faint">
        Powered by
      </span>
      <SurfboardLockup tone="reversed" width={120} />
    </div>
  );
}
