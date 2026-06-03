import { cn } from "@/lib/utils/cn";

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius)] bg-muted",
        className
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  );
}

Skeleton.displayName = "Skeleton";

export { Skeleton };
