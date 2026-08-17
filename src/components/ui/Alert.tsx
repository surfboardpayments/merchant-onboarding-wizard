import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/* Alerts carry meaning, so they carry signal colour. Full borders only:
   a coloured edge on one side is decoration pretending to be structure. */

const variantConfig = {
  success: {
    container: "bg-ok-wash border-ok-edge text-ink",
    accent: "text-ok",
    path: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.81a.75.75 0 0 0-1.22-.88l-3.48 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.14-.09l4-5.5Z",
  },
  warning: {
    container: "bg-warn-wash border-warn-edge text-ink",
    accent: "text-warn",
    path: "M8.49 2.5c.67-1.17 2.35-1.17 3.03 0l6.28 10.87c.67 1.17-.17 2.63-1.52 2.63H3.72c-1.35 0-2.19-1.46-1.52-2.63L8.49 2.5ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  },
  error: {
    container: "bg-danger-wash border-danger-edge text-ink",
    accent: "text-danger",
    path: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z",
  },
  info: {
    container: "bg-accent-wash border-accent-edge text-ink",
    accent: "text-accent",
    path: "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.25a.25.25 0 0 1 .25.3l-.46 2.07A1.75 1.75 0 0 0 10.75 15H11a.75.75 0 0 0 0-1.5h-.25a.25.25 0 0 1-.25-.3l.46-2.07A1.75 1.75 0 0 0 9.25 9H9Z",
  },
} as const;

type AlertVariant = keyof typeof variantConfig;

export interface AlertProps {
  variant: AlertVariant;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

function Alert({ variant, title, description, action, className }: AlertProps) {
  const config = variantConfig[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-[var(--radius-md)] border px-4 py-3.5",
        config.container,
        className,
      )}
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className={cn("mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0", config.accent)}
        aria-hidden="true"
      >
        <path fillRule="evenodd" clipRule="evenodd" d={config.path} />
      </svg>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-base font-medium leading-snug">{title}</p>
        {description && (
          <div className="text-sm leading-relaxed text-ink-muted">{description}</div>
        )}
        {action && <div className="mt-1.5">{action}</div>}
      </div>
    </div>
  );
}

Alert.displayName = "Alert";

export { Alert };
