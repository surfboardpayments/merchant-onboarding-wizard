import { cn } from "@/lib/utils/cn";

const variantStyles = {
  default: "bg-surface-sunk text-ink-muted",
  success: "bg-ok-wash text-ok",
  warning: "bg-warn-wash text-warn",
  error: "bg-danger-wash text-danger",
  info: "bg-accent-wash text-accent",
  /** For counts and roles that should not compete with status. */
  outline: "border border-line-strong text-ink-muted",
} as const;

type BadgeVariant = keyof typeof variantStyles;

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
        "text-xs font-medium leading-5 whitespace-nowrap",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

Badge.displayName = "Badge";

export { Badge };
