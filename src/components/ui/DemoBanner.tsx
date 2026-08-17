/**
 * Demo mode is a fact about the environment, not an alarm. It gets a mint dot
 * and a quiet line rather than a full-bleed accent bar: Coral Green is a
 * highlight colour, and the loudest thing on a page should never be the least
 * important thing on it.
 */
export function DemoBanner({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_TEST_MODE !== "true") return null;

  return (
    <p className="flex items-center justify-center gap-2 border-b border-on-frame-line px-4 py-2 text-center font-mono text-2xs uppercase tracking-[0.12em] text-on-frame-faint">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-mint" />
      {children}
    </p>
  );
}
