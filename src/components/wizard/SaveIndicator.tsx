"use client";

import { cn } from "@/lib/utils/cn";

interface SaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  variant?: "light" | "dark";
}

export function SaveIndicator({ isSaving, lastSaved, variant = "light" }: SaveIndicatorProps) {
  if (!lastSaved && !isSaving) return null;

  const timeAgo = lastSaved
    ? formatTimeAgo(lastSaved)
    : null;

  const isDark = variant === "dark";

  return (
    <span
      className={cn(
        "text-xs transition-opacity duration-300 inline-flex items-center gap-1.5",
        isDark
          ? isSaving ? "text-white/60" : "text-white/40"
          : isSaving ? "text-muted-foreground" : "text-muted-foreground/60"
      )}
    >
      {isSaving ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
          Saving...
        </>
      ) : (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          Saved {timeAgo}
        </>
      )}
    </span>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}
