"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StepContainerProps {
  stepKey: number;
  direction: number; // -1 = going back, 1 = going forward
  children: ReactNode;
  title: string;
  description?: string;
}

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

export function StepContainer({
  stepKey,
  direction,
  children,
  title,
  description,
}: StepContainerProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.25 },
        }}
      >
        {/* Step header */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-muted-foreground text-base">
              {description}
            </p>
          )}
        </div>

        {/* Step content */}
        <div className="space-y-6">{children}</div>
      </motion.div>
    </AnimatePresence>
  );
}
