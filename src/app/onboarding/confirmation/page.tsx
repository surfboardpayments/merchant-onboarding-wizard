"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
  role?: string;
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

// Per-person data-collection status (ID checks happen downstream at the acquirer).
const personStatus = (person: StoredPerson): string => {
  if (person.isSelf) return "completed";
  if (person.invite?.completedAt) return "completed";
  if (person.invite?.sentAt) return "invite_sent";
  return "not_started";
};

const roleLabels: Record<string, string> = {
  director: "Director",
  psc: "PSC",
  ubo: "UBO",
  director_and_psc: "Director & PSC",
  sole_trader: "Sole Trader",
};

const statusVariant = (
  status?: string
): "success" | "warning" | "error" | "default" => {
  if (status === "completed") return "success";
  if (status === "expired") return "error";
  if (status === "invite_sent") return "warning";
  return "default";
};

const statusLabel = (status?: string): string => {
  if (status === "completed") return "Completed";
  if (status === "expired") return "Expired";
  if (status === "invite_sent") return "Invite sent";
  return "Not started";
};

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <motion.svg
      animate={{ rotate: expanded ? 180 : 0 }}
      transition={{ duration: 0.2 }}
      className="w-4 h-4 text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </motion.svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

function PersonCard({
  person,
  index,
  isExpanded,
  onToggle,
  matchedEmail,
}: {
  person: StoredPerson;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  matchedEmail?: SentEmail;
}) {
  const name =
    [person.firstName, person.lastName].filter(Boolean).join(" ") || "Unnamed";
  const initials = [person.firstName?.[0], person.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();
  const hasInvite = !person.isSelf && person.invite?.token;
  const isExpandable = !!hasInvite;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.1 }}
    >
      <Card variant="default" className="overflow-hidden !p-0">
        {/* Header */}
        <button
          type="button"
          onClick={isExpandable ? onToggle : undefined}
          className={`w-full flex items-center gap-3 px-5 py-4 text-left ${
            isExpandable
              ? "cursor-pointer hover:bg-muted/30 transition-colors"
              : "cursor-default"
          }`}
          aria-expanded={isExpandable ? isExpanded : undefined}
        >
          {/* Avatar */}
          <span
            className={`flex items-center justify-center w-9 h-9 rounded-full text-xs font-semibold shrink-0 ${
              person.isSelf
                ? "bg-brand/10 text-brand"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {initials || "?"}
          </span>

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">
                {name}
              </span>
              {person.role && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {roleLabels[person.role] ?? person.role}
                </span>
              )}
              {person.isSelf && (
                <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-medium shrink-0">
                  You
                </span>
              )}
            </div>
            {person.isSelf && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Details provided during onboarding
              </p>
            )}
          </div>

          {/* Status badge */}
          <Badge variant={statusVariant(personStatus(person))}>
            {statusLabel(personStatus(person))}
          </Badge>

          {/* Chevron */}
          {isExpandable && <ChevronIcon expanded={isExpanded} />}
        </button>

        {/* Expandable content */}
        <AnimatePresence initial={false}>
          {isExpanded && hasInvite && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-0 space-y-5 border-t border-border">
                {/* Step 1: Email preview */}
                <div className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[10px] font-semibold">
                      1
                    </span>
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Email they received
                    </span>
                  </div>
                  {matchedEmail ? (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">
                        Sent to{" "}
                        <span className="font-medium">
                          {person.invite?.email || person.email}
                        </span>
                      </p>
                      <div
                        className="rounded-lg border border-border bg-white p-4 max-h-60 overflow-y-auto text-sm"
                        dangerouslySetInnerHTML={{ __html: matchedEmail.html }}
                      />
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Email preview unavailable
                    </p>
                  )}
                </div>

                {/* Step 2: Verification link */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[10px] font-semibold">
                      2
                    </span>
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Their verification experience
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Opens what {person.firstName || "they"} see
                    {person.firstName ? "s" : ""} when clicking the email link
                    — pre-filled form, then real ID verification.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(
                        `/verify/${person.invite?.token}`,
                        "_blank"
                      );
                    }}
                  >
                    Open Verification Link
                    <ExternalLinkIcon />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const referenceNumber = searchParams.get("ref") || "SB-XXXXXX";
  const [emailHtml, setEmailHtml] = useState<string | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [people, setPeople] = useState<StoredPerson[]>([]);
  const [emailsByPerson, setEmailsByPerson] = useState<
    Record<string, SentEmail>
  >({});
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);

  // Load confirmation email from sessionStorage + store data from localStorage
  useEffect(() => {
    if (IS_TEST_MODE) {
      try {
        const html = sessionStorage.getItem("confirmationEmailHtml");
        if (html) {
          setEmailHtml(html);
          sessionStorage.removeItem("confirmationEmailHtml");
        }
      } catch {
        /* ignore */
      }

      try {
        const raw = localStorage.getItem("surfboard-onboarding");
        if (raw) {
          const parsed = JSON.parse(raw);
          const peopleData = parsed?.state?.people;
          if (Array.isArray(peopleData)) {
            setPeople(peopleData);
          }
          const emails = parsed?.state?.sentEmails;
          if (Array.isArray(emails) && emails.length > 0) {
            const map: Record<string, SentEmail> = {};
            for (const email of emails) {
              map[email.personEmail] = email;
            }
            setEmailsByPerson(map);
          }
        }
      } catch {
        /* ignore */
      }
    }
  }, []);

  const hasDemoData = IS_TEST_MODE && people.length > 0;

  return (
    <div className={`min-h-screen bg-background flex justify-center p-4 ${hasDemoData ? "items-start pt-12" : "items-center"}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: 0.8,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        className={`w-full text-center ${hasDemoData ? "max-w-2xl" : "max-w-lg"}`}
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="mx-auto w-20 h-20 bg-success-light rounded-full flex items-center justify-center mb-6"
        >
          <svg
            className="w-10 h-10 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </motion.div>

        {/* Heading */}
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground mb-3">
          Application Submitted
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Thank you for choosing Surfboard Payments. We&apos;re reviewing your
          application.
        </p>

        {/* Reference number */}
        <div className="bg-muted rounded-xl p-6 mb-8">
          <p className="text-sm text-muted-foreground mb-1">
            Your reference number
          </p>
          <p className="font-mono text-2xl font-semibold tracking-wider text-foreground">
            {referenceNumber}
          </p>
        </div>

        {/* Demo walkthrough: People & Verification */}
        {hasDemoData && (
          <div className="text-left mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Demo Walkthrough
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Expand each person to see the email they received and walk
                  through their verification
                </p>
              </div>
              <Badge variant="warning">Demo</Badge>
            </div>
            <div className="space-y-3">
              {people.map((person, index) => (
                <PersonCard
                  key={person.id || index}
                  person={person}
                  index={index}
                  isExpanded={expandedPersonId === person.id}
                  onToggle={() =>
                    setExpandedPersonId(
                      expandedPersonId === person.id ? null : person.id
                    )
                  }
                  matchedEmail={
                    emailsByPerson[
                      person.email || person.invite?.email || ""
                    ]
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="text-left space-y-4 mb-8">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            What happens next?
          </h2>
          <div className="space-y-3">
            {[
              {
                step: "1",
                title: "Application review",
                desc: "Our team will review your application within 1-3 business days.",
              },
              {
                step: "2",
                title: "Identity verification",
                desc: "We'll complete any remaining identity checks on directors and beneficial owners.",
              },
              {
                step: "3",
                title: "Account setup",
                desc: "Once approved, we'll set up your merchant account and send you onboarding instructions.",
              },
              {
                step: "4",
                title: "Go live",
                desc: "Start accepting payments through Surfboard.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.15 }}
                className="flex gap-3"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-brand text-white text-xs font-medium shrink-0 mt-0.5">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Confirmation email note — conditional */}
        {IS_TEST_MODE && emailHtml ? (
          <div className="bg-warning-light rounded-lg p-4 text-left mb-4">
            <p className="text-sm text-warning-foreground mb-2">
              <strong>Demo Mode</strong> — confirmation email was not sent.
            </p>
            <button
              type="button"
              onClick={() => setShowEmailPreview(!showEmailPreview)}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              {showEmailPreview ? "Hide email preview" : "View email preview"}
            </button>
            {showEmailPreview && (
              <div
                className="mt-3 rounded-lg border border-border bg-white p-4 max-h-80 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: emailHtml }}
              />
            )}
          </div>
        ) : IS_TEST_MODE ? (
          <div className="bg-warning-light rounded-lg p-4 text-left mb-4">
            <p className="text-sm text-warning-foreground">
              <strong>Demo Mode</strong> — no confirmation email was sent (no
              RESEND_API_KEY configured).
            </p>
          </div>
        ) : (
          <div className="bg-info-light rounded-lg p-4 text-left mb-4">
            <p className="text-sm text-info">
              <strong>Confirmation email sent.</strong> We&apos;ve sent a summary
              of your application to the contact email address you provided.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <a
            href="https://surfboardpayments.com"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors"
          >
            Back to Surfboard
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </div>
      </motion.div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-pulse h-8 w-48 bg-muted rounded" />
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
