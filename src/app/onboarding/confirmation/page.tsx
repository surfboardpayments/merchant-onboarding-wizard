"use client";

import { Suspense, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Disclosure } from "@/components/ui/Disclosure";
import { PoweredBySurfboard } from "@/components/ui/SurfboardLogo";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { ROLE_LABEL, fullName } from "@/lib/utils/prose";
import { cn } from "@/lib/utils/cn";

const IS_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

interface SentEmail {
  personName: string;
  personEmail: string;
  html: string;
  sentAt: string;
}

interface StoredPerson {
  id: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  role?: keyof typeof ROLE_LABEL;
  email?: string;
  isSelf?: boolean;
  invite?: {
    email?: string;
    token?: string;
    sentAt?: string;
    expiresAt?: string;
    completedAt?: string;
  };
}

const NEXT_STEPS = [
  {
    title: "We check your application",
    detail:
      "Our acquiring bank reviews what you sent and runs the sanctions and credit checks. Usually two working days.",
  },
  {
    title: "Anyone outstanding confirms their details",
    detail:
      "Directors and owners you invited finish their part from the link we emailed them. You don't need to chase them.",
  },
  {
    title: "Your account opens",
    detail:
      "We set up your merchant account, send your Merchant Portal login, and ship any card machines you asked for.",
  },
  {
    title: "You take your first payment",
    detail: "Our fastest partner went from signup to a live transaction in five hours.",
  },
];

interface DemoSnapshot {
  confirmationEmail: string | null;
  people: StoredPerson[];
  emailsByAddress: Record<string, SentEmail>;
}

const EMPTY_DEMO: DemoSnapshot = {
  confirmationEmail: null,
  people: [],
  emailsByAddress: {},
};

/**
 * Browser storage is an external store, read once. Caching the parse keeps the
 * snapshot referentially stable, which `useSyncExternalStore` requires, and
 * lets the confirmation email be consumed exactly once.
 */
let demoCache: DemoSnapshot | undefined;

function readDemoData(): DemoSnapshot {
  if (demoCache) return demoCache;
  if (!IS_TEST_MODE || typeof window === "undefined") return EMPTY_DEMO;

  const snapshot: DemoSnapshot = {
    confirmationEmail: null,
    people: [],
    emailsByAddress: {},
  };

  try {
    const html = sessionStorage.getItem("confirmationEmailHtml");
    if (html) {
      snapshot.confirmationEmail = html;
      sessionStorage.removeItem("confirmationEmailHtml");
    }
  } catch {
    /* private browsing blocks sessionStorage; the page copes without it */
  }

  try {
    const raw = localStorage.getItem("surfboard-onboarding");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.state?.people)) snapshot.people = parsed.state.people;
      if (Array.isArray(parsed?.state?.sentEmails)) {
        for (const email of parsed.state.sentEmails) {
          snapshot.emailsByAddress[email.personEmail] = email;
        }
      }
    }
  } catch {
    /* corrupt draft; the page works without it */
  }

  demoCache = snapshot;
  return snapshot;
}

const subscribeToNothing = () => () => {};
const serverDemoSnapshot = () => EMPTY_DEMO;

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("ref") || "SB-000000";

  const { confirmationEmail, people, emailsByAddress } = useSyncExternalStore(
    subscribeToNothing,
    readDemoData,
    serverDemoSnapshot,
  );

  const invited = people.filter((p) => !p.isSelf && p.invite?.token);
  const waitingOn = invited.filter((p) => !p.invite?.completedAt);

  return (
    <div className="frame-ground flex min-h-dvh flex-col">
      <DemoBanner>Demo mode: nothing was submitted and no emails were sent</DemoBanner>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-12 sm:px-8">
        <header className="pb-9 text-center">
          <span
            aria-hidden="true"
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mint"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 text-frame"
            >
              <path d="m3 8.5 3.2 3.2L13 4.8" />
            </svg>
          </span>

          <h1 className="tracking-display mt-6 font-display text-2xl font-semibold text-on-frame sm:text-3xl">
            That&apos;s your application in
          </h1>
          <p className="mx-auto mt-4 max-w-[48ch] text-md leading-relaxed text-on-frame-muted">
            {waitingOn.length > 0
              ? `We're waiting on ${waitingOn.length} ${waitingOn.length === 1 ? "person" : "people"} to confirm their details, and then it goes to our acquiring bank.`
              : "It's with our acquiring bank now. We'll email you the moment there's a decision."}
          </p>

          <p className="mt-8 font-mono text-2xs uppercase tracking-[0.12em] text-on-frame-faint">
            Your reference
          </p>
          <p className="tabular mt-2 select-all font-mono text-xl font-bold tracking-[0.1em] text-mint">
            {reference}
          </p>
        </header>

        <main className="flex flex-col gap-6 rounded-[var(--radius-xl)] bg-surface p-6 shadow-[var(--shadow-card)] sm:p-9">
          <section>
            <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
              What happens next
            </h2>
            <ol className="mt-5 flex flex-col">
              {NEXT_STEPS.map((item, index) => (
                <li key={item.title} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < NEXT_STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute left-[0.9375rem] top-8 bottom-0 w-px bg-line"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "tabular relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      index === 0
                        ? "bg-accent text-white"
                        : "bg-surface-sunk text-ink-muted",
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-base font-medium text-ink">{item.title}</p>
                    <p className="mt-1 max-w-[62ch] text-base leading-relaxed text-ink-muted">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {!IS_TEST_MODE && (
            <p className="rounded-[var(--radius-md)] border border-accent-edge bg-accent-wash px-4 py-3.5 text-base leading-relaxed text-ink">
              We&apos;ve emailed a copy of everything you sent to your contact
              address. Keep reference{" "}
              <span className="font-mono font-semibold">{reference}</span> to hand
              if you get in touch.
            </p>
          )}

          {/* Demo affordances: only ever rendered in test mode. */}
          {IS_TEST_MODE && (confirmationEmail || invited.length > 0) && (
            <section className="flex flex-col gap-3 border-t border-line pt-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
                  Walk through the demo
                </h2>
                <Badge variant="warning">Demo only</Badge>
              </div>
              <p className="max-w-[62ch] text-base leading-relaxed text-ink-muted">
                In demo mode nothing leaves the machine. Here are the emails that
                would have gone out, and the links each person would have opened.
              </p>

              {confirmationEmail && (
                <Disclosure summary="Your confirmation email" tone="panel">
                  <div
                    className="max-h-96 overflow-y-auto rounded-[var(--radius-sm)] border border-line bg-surface p-4"
                    dangerouslySetInnerHTML={{ __html: confirmationEmail }}
                  />
                </Disclosure>
              )}

              {invited.map((person) => {
                const email =
                  emailsByAddress[person.email || person.invite?.email || ""];
                const name = fullName(person) || "Invited person";
                return (
                  <Disclosure
                    key={person.id}
                    tone="panel"
                    summary={name}
                    meta={
                      person.invite?.completedAt
                        ? "Replied"
                        : person.role
                          ? ROLE_LABEL[person.role]
                          : undefined
                    }
                  >
                    <div className="flex flex-col gap-4">
                      {email ? (
                        <div
                          className="max-h-80 overflow-y-auto rounded-[var(--radius-sm)] border border-line bg-surface p-4"
                          dangerouslySetInnerHTML={{ __html: email.html }}
                        />
                      ) : (
                        <p className="text-base text-ink-muted">
                          No email was captured for {name}.
                        </p>
                      )}
                      {person.invite?.token && (
                        <Button
                          variant="outline"
                          size="md"
                          className="self-start"
                          onClick={() =>
                            window.open(`/verify/${person.invite?.token}`, "_blank")
                          }
                        >
                          Open their link
                          <svg
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          >
                            <path d="M6.5 3H3v10h10V9.5M9.5 2.5h4v4M13 3 7.5 8.5" />
                          </svg>
                        </Button>
                      )}
                    </div>
                  </Disclosure>
                );
              })}
            </section>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <a
              href="https://www.surfboardpayments.com"
              className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-5 font-display text-base font-medium text-white transition-colors duration-[var(--dur-tap)] hover:bg-accent-hover"
            >
              Back to Surfboard
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M2.5 8h11M9.5 4l4 4-4 4" />
              </svg>
            </a>
            <a
              href="mailto:support@surfboardpayments.com"
              className="inline-flex h-11 items-center rounded-[var(--radius-sm)] px-3 text-base text-accent underline decoration-accent/35 underline-offset-4 transition-colors hover:decoration-accent/70"
            >
              Ask us something
            </a>
          </div>
        </main>

        <div className="mt-auto">
          <PoweredBySurfboard />
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="frame-ground min-h-dvh">
          <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
            <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-on-frame/10" />
            <div className="mx-auto mt-6 h-8 w-2/3 animate-pulse rounded bg-on-frame/10" />
            <div className="mt-10 h-80 rounded-[var(--radius-xl)] bg-surface shadow-[var(--shadow-card)]" />
          </div>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
