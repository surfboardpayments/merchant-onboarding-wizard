import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const variantStyles = {
  default:
    "bg-background border border-border shadow-[var(--shadow)]",
  elevated:
    "bg-background border border-border shadow-[var(--shadow-lg)]",
  interactive:
    "bg-background border border-border shadow-[var(--shadow)] transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:scale-[1.01] cursor-pointer",
} as const;

type CardVariant = keyof typeof variantStyles;

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[var(--radius)] p-6",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export { Card };
