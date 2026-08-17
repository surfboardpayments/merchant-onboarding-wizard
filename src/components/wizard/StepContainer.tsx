"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface StepContainerProps {
  stepKey: string;
  children: ReactNode;
}

/**
 * Steps cross-fade and settle rather than sliding sideways. A horizontal
 * slide reads as "another page of this", which is exactly the feeling this
 * redesign is trying to remove.
 *
 * Focus moves to the step so keyboard and screen-reader users land in the new
 * content instead of at the top of the document.
 */
export function StepContainer({ stepKey, children }: StepContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    ref.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepKey]);

  return (
    <div
      key={stepKey}
      ref={ref}
      tabIndex={-1}
      className="animate-rise flex flex-col gap-9 outline-none"
    >
      {children}
    </div>
  );
}
