"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** `md` for confirmations, `lg` for previews and long content. */
  size?: "md" | "lg";
  className?: string;
}

/**
 * Native <dialog>, so focus trapping, Escape, inert background and the top
 * layer all come from the platform rather than from JavaScript we'd have to
 * keep correct ourselves.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  className,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Escape and the backdrop both fire `close`; keep React state in step.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby={description ? "modal-description" : undefined}
      onClick={(event) => {
        // Clicks that land on the dialog element itself are backdrop clicks.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] rounded-[var(--radius-lg)] bg-surface p-0 text-ink",
        "shadow-[var(--shadow-card)] backdrop:bg-frame/70 backdrop:backdrop-blur-[2px]",
        "open:animate-fade",
        size === "lg" ? "max-w-2xl" : "max-w-md",
        className,
      )}
    >
      <div className="flex max-h-[85vh] flex-col">
        {(title || description) && (
          <div className="flex items-start gap-4 border-b border-line px-6 pb-4 pt-5">
            <div className="min-w-0 flex-1">
              {title && (
                <h2
                  id="modal-title"
                  className="font-display text-lg font-semibold tracking-[-0.02em] text-ink"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="modal-description"
                  className="mt-1 text-sm leading-relaxed text-ink-muted"
                >
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "-mr-2 -mt-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center",
                "rounded-[var(--radius-xs)] text-ink-muted",
                "transition-colors duration-[var(--dur-tap)] ease-[var(--ease-out)]",
                "hover:bg-surface-sunk hover:text-ink",
              )}
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <path d="m4 4 8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </dialog>
  );
}

export default Modal;
