"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  direction?: "left" | "right";
  /** Unique key to trigger re-animation when the content changes (e.g. step index). */
  motionKey?: string | number;
}

const slideOffset = 40;

function AnimatedContainer({
  children,
  className,
  direction = "right",
  motionKey,
}: AnimatedContainerProps) {
  const xEnter = direction === "right" ? slideOffset : -slideOffset;
  const xExit = direction === "right" ? -slideOffset : slideOffset;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={motionKey}
        initial={{ opacity: 0, x: xEnter }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: xExit }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.8,
        }}
        className={cn(className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

AnimatedContainer.displayName = "AnimatedContainer";

export { AnimatedContainer };
