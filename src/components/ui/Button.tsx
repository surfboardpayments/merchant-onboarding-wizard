"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const variantStyles = {
  /** Ocean Blue. One per view: the thing that moves the merchant forward. */
  primary:
    "bg-accent text-white shadow-[var(--shadow-pop)] hover:bg-accent-hover active:bg-accent-active active:shadow-none",
  /** Coral Green on Deep Sea Blue. The brand's primary action on dark grounds. */
  mint:
    "bg-mint text-frame hover:brightness-[1.06] active:brightness-95",
  secondary:
    "bg-surface-sunk text-ink hover:bg-surface-veil active:bg-surface-veil",
  outline:
    "border border-field-line bg-transparent text-ink hover:border-accent hover:bg-accent-wash active:bg-accent-wash",
  ghost:
    "bg-transparent text-ink-muted hover:bg-surface-sunk hover:text-ink active:bg-surface-veil",
  danger:
    "bg-transparent text-danger hover:bg-danger-wash active:bg-danger-wash",
  /** Deep Sea Blue fill, for actions sitting on a light surface that must outrank Ocean Blue. */
  dark:
    "bg-ink text-white hover:brightness-125 active:brightness-110",
} as const;

const sizeStyles = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-[var(--radius-xs)]",
  md: "h-11 px-5 text-base gap-2 rounded-[var(--radius-sm)]",
  lg: "h-13 px-7 text-md gap-2.5 rounded-[var(--radius-sm)]",
} as const;

type ButtonVariant = keyof typeof variantStyles;
type ButtonSize = keyof typeof sizeStyles;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-30"
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center whitespace-nowrap",
          "font-display font-medium tracking-[-0.01em]",
          "transition-[background-color,color,border-color,box-shadow,filter] duration-[var(--dur-tap)] ease-[var(--ease-out)]",
          "disabled:pointer-events-none disabled:opacity-45",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <Spinner className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
