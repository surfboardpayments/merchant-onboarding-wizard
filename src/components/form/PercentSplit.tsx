"use client";

import { cn } from "@/lib/utils/cn";

interface PercentSplitProps<K extends string> {
  label: string;
  helperText?: string;
  buckets: Array<{ key: K; label: string }>;
  values: Record<K, number>;
  onChange: (key: K, value: number) => void;
  className?: string;
}

// A compact N-bucket percentage splitter. Enforces integer input and shows a
// running total so the user can see at a glance whether they're at 100.
export function PercentSplit<K extends string>({
  label,
  helperText,
  buckets,
  values,
  onChange,
  className,
}: PercentSplitProps<K>) {
  const total = buckets.reduce(
    (acc, b) => acc + (Number(values[b.key]) || 0),
    0,
  );
  const balanced = total === 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span
          className={cn(
            "text-xs font-mono",
            balanced ? "text-emerald-600" : "text-amber-600",
          )}
        >
          {total}% / 100%
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {buckets.map((b) => (
          <label key={b.key} className="flex flex-col text-xs">
            <span className="text-muted-foreground mb-1">{b.label}</span>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                inputMode="numeric"
                value={Number.isFinite(values[b.key]) ? values[b.key] : 0}
                onChange={(e) => {
                  const n = Math.max(
                    0,
                    Math.min(100, Math.round(Number(e.target.value) || 0)),
                  );
                  onChange(b.key, n);
                }}
                className="w-full rounded border border-border px-2 py-1.5 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </label>
        ))}
      </div>
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
