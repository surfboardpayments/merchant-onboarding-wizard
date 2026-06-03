import { cn } from "@/lib/utils/cn";

const variantStyles = {
  default:
    "bg-muted text-muted-foreground",
  success:
    "bg-success-light text-success",
  warning:
    "bg-warning-light text-warning",
  error:
    "bg-error-light text-error",
  info:
    "bg-info-light text-info",
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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

Badge.displayName = "Badge";

export { Badge };
