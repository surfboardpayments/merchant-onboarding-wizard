"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { AutofillStatus } from "@/hooks/useAIAutofill";

interface AIAutofillIndicatorProps {
  status: AutofillStatus;
  filledFields: number;
  onDismiss: () => void;
}

export function AIAutofillIndicator({
  status,
  filledFields,
  onDismiss,
}: AIAutofillIndicatorProps) {
  if (status === "idle" || status === "error") return null;

  return (
    <AnimatePresence>
      {status === "loading" && (
        <motion.div
          key="ai-loading"
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
            {/* Animated sparkle icon */}
            <div className="relative shrink-0">
              <motion.svg
                className="h-5 w-5 text-brand"
                viewBox="0 0 20 20"
                fill="currentColor"
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                <path d="M10 1l2.39 5.36L18 7.27l-4.12 3.56L15 16.67 10 13.77l-5 2.9 1.12-5.84L2 7.27l5.61-.91L10 1z" />
              </motion.svg>
              <motion.div
                className="absolute inset-0 rounded-full bg-brand/20"
                animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand">
                AI is pre-filling your details...
              </p>
              <p className="text-xs text-brand/70">
                Researching your business to save you time
              </p>
            </div>
            {/* Subtle loading dots */}
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-brand/50"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {status === "success" && filledFields > 0 && (
        <motion.div
          key="ai-success"
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 px-4 py-3">
            {/* Checkmark icon */}
            <motion.svg
              className="h-5 w-5 text-success shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.1 }}
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </motion.svg>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-success">
                {filledFields} field{filledFields !== 1 ? "s" : ""} pre-filled by AI
              </p>
              <p className="text-xs text-success/70">
                Review as you go — edit anything that needs changing
              </p>
            </div>
            {/* Dismiss button */}
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-md p-1 text-success/50 hover:text-success/80 hover:bg-success/10 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
