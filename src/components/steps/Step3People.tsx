"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { Person } from "@/store/onboardingStore";
import { DateOfBirthInput } from "@/components/form/DateOfBirthInput";
import { AddressInput } from "@/components/form/AddressInput";
import { PhoneInput } from "@/components/form/PhoneInput";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { NATIONALITIES } from "@/lib/constants/nationalities";
import { cn } from "@/lib/utils/cn";

const IS_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NATIONALITY_OPTIONS = NATIONALITIES.map((n) => ({
  value: n,
  label: n,
}));

type InviteUiStatus = "not_started" | "invite_sent" | "completed";

const INVITE_STATUS_CONFIG: Record<
  InviteUiStatus,
  { label: string; variant: "default" | "warning" | "info" | "success" | "error" }
> = {
  not_started: { label: "Details needed", variant: "default" },
  invite_sent: { label: "Invite sent", variant: "warning" },
  completed: { label: "Details received", variant: "success" },
};

function getRoleBadge(role: Person["role"]): {
  label: string;
  variant: "default" | "info" | "success";
} {
  switch (role) {
    case "director":
      return { label: "Director", variant: "info" };
    case "psc":
      return { label: "PSC", variant: "default" };
    case "director_and_psc":
      return { label: "Director & PSC", variant: "info" };
    case "ubo":
      return { label: "UBO", variant: "default" };
    case "sole_trader":
      return { label: "Sole Trader", variant: "success" };
    default:
      return { label: "Person", variant: "default" };
  }
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  }),
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.15 } },
};

const expandVariants = {
  collapsed: { height: 0, opacity: 0, overflow: "hidden" as const },
  expanded: {
    height: "auto",
    opacity: 1,
    overflow: "visible" as const,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
};

// ---------------------------------------------------------------------------
// Chevron icon
// ---------------------------------------------------------------------------

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn(
        "h-5 w-5 text-muted-foreground transition-transform duration-200",
        isOpen && "rotate-180",
      )}
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// PersonCard sub-component
// ---------------------------------------------------------------------------

interface PersonCardProps {
  person: Person;
  index: number;
}

function PersonCard({ person, index }: PersonCardProps) {
  const { updatePerson, removePerson, people, company, id: applicationId } = useOnboardingStore();
  const [isExpanded, setIsExpanded] = useState(
    // Auto-expand: new manual people, sole traders, or anyone without a last name
    (person.source === "manual" && !person.lastName) || person.role === "sole_trader",
  );
  const [inviteEmail, setInviteEmail] = useState(person.invite?.email || "");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState("");

  const isFromCH = person.source === "companies_house";
  const roleBadge = getRoleBadge(person.role);

  // Invite (data-collection) status — derived from the stored invite, not ID verification.
  const inviteStatus: InviteUiStatus = person.invite?.completedAt
    ? "completed"
    : person.invite?.sentAt
      ? "invite_sent"
      : "not_started";
  const statusConfig = INVITE_STATUS_CONFIG[inviteStatus];

  const fullName = [person.title, person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(" ") || "New person";

  // Handler to mark this person as "self", clearing it from others
  const handleSetSelf = useCallback(() => {
    // Clear isSelf on all other people
    for (const p of people) {
      if (p.id !== person.id && p.isSelf) {
        updatePerson(p.id, { isSelf: false });
      }
    }
    updatePerson(person.id, { isSelf: !person.isSelf });
  }, [people, person.id, person.isSelf, updatePerson]);

  // Send invite handler — calls the real API to generate a token and send an email
  const handleSendInvite = useCallback(async () => {
    if (!inviteEmail) return;

    setIsSendingInvite(true);
    setInviteError(null);

    try {
      const personName = [person.firstName, person.lastName].filter(Boolean).join(" ") || "Person";
      const companyName = company?.companyName || "your company";

      const res = await fetch("/api/invite/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          personId: person.id,
          personName,
          personEmail: inviteEmail,
          companyName,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send invite");
      }

      const responseData = await res.json();
      const { token, expiresAt, inviteUrl: returnedUrl, emailHtml, testMode } = responseData;
      setInviteUrl(returnedUrl || null);

      // In test mode, show the email content in a modal and persist for confirmation page
      if (testMode && emailHtml) {
        setEmailPreviewHtml(emailHtml);
        setShowEmailModal(true);
        const personName = [person.firstName, person.lastName].filter(Boolean).join(" ") || "Person";
        useOnboardingStore.getState().addSentEmail({
          personName,
          personEmail: inviteEmail,
          html: emailHtml,
          sentAt: new Date().toISOString(),
        });
      }

      updatePerson(person.id, {
        email: inviteEmail,
        invite: {
          email: inviteEmail,
          token,
          sentAt: new Date().toISOString(),
          expiresAt,
          remindersSent: (person.invite?.remindersSent ?? 0) + (person.invite?.sentAt ? 1 : 0),
        },
      });
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSendingInvite(false);
    }
  }, [inviteEmail, person, applicationId, company?.companyName, updatePerson]);

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      <Card className="overflow-hidden">
        {/* ------- Header (always visible) ------- */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar circle */}
            <div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-medium",
                person.isSelf
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {(person.firstName?.[0] || "?").toUpperCase()}
              {(person.lastName?.[0] || "").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {fullName}
                {person.isSelf && (
                  <span className="ml-2 text-xs font-normal text-primary">
                    (You)
                  </span>
                )}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                {isFromCH && (
                  <Badge variant="success">Companies House</Badge>
                )}
                {!person.isSelf && (
                  <Badge variant={statusConfig.variant}>
                    {statusConfig.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <ChevronIcon isOpen={isExpanded} />
        </button>

        {/* ------- Expandable body ------- */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="body"
              variants={expandVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
            >
              <div className="pt-5 mt-5 border-t border-border space-y-5">
                {/* Name fields (for manual people) */}
                {!isFromCH && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="First name"
                      value={person.firstName || ""}
                      onChange={(e) =>
                        updatePerson(person.id, {
                          firstName: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Middle name"
                      value={person.middleName || ""}
                      onChange={(e) =>
                        updatePerson(person.id, {
                          middleName: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Last name"
                      value={person.lastName || ""}
                      onChange={(e) =>
                        updatePerson(person.id, {
                          lastName: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                {/* Name display for CH people */}
                {isFromCH && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">
                        First name
                      </label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-foreground">
                          {person.firstName || "\u2014"}
                        </p>
                        <Badge variant="default" className="text-[10px]">
                          Auto
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">
                        Middle name
                      </label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-foreground">
                          {person.middleName || "\u2014"}
                        </p>
                        <Badge variant="default" className="text-[10px]">
                          Auto
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">
                        Last name
                      </label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-foreground">
                          {person.lastName || "\u2014"}
                        </p>
                        <Badge variant="default" className="text-[10px]">
                          Auto
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Date of birth */}
                <DateOfBirthInput
                  value={person.dateOfBirth || {}}
                  onChange={(dob) =>
                    updatePerson(person.id, { dateOfBirth: dob })
                  }
                  disabledFields={
                    isFromCH ? ["month", "year"] : []
                  }
                />

                {/* Residential address */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Residential address
                  </label>
                  <AddressInput
                    value={{
                      addressLine1:
                        person.residentialAddress?.addressLine1 || "",
                      addressLine2:
                        person.residentialAddress?.addressLine2 || "",
                      locality: person.residentialAddress?.city || "",
                      region: person.residentialAddress?.county || "",
                      postalCode: person.residentialAddress?.postcode || "",
                      country:
                        person.residentialAddress?.country ||
                        "United Kingdom",
                    }}
                    onChange={(addr) =>
                      updatePerson(person.id, {
                        residentialAddress: {
                          addressLine1: addr.addressLine1,
                          addressLine2: addr.addressLine2,
                          city: addr.locality,
                          county: addr.region,
                          postcode: addr.postalCode,
                          country: addr.country,
                        },
                      })
                    }
                  />
                </div>

                {/* Phone, email, nationality row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <PhoneInput
                    label="Phone number"
                    value={person.phoneNumber || ""}
                    onChange={(value) =>
                      updatePerson(person.id, { phoneNumber: value })
                    }
                  />
                  <Input
                    label="Email address"
                    type="email"
                    placeholder="name@example.com"
                    value={person.email || ""}
                    onChange={(e) =>
                      updatePerson(person.id, { email: e.target.value })
                    }
                  />
                </div>

                <Select
                  label="Nationality"
                  placeholder="Select nationality"
                  options={NATIONALITY_OPTIONS}
                  value={person.nationality || ""}
                  onChange={(e) =>
                    updatePerson(person.id, {
                      nationality: e.target.value,
                    })
                  }
                />

                {/* "This is me" toggle */}
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={handleSetSelf}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-150",
                      "cursor-pointer",
                      person.isSelf
                        ? "border-primary bg-primary/[0.05] text-primary ring-1 ring-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground/30 hover:bg-muted/50",
                    )}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                    </svg>
                    {person.isSelf ? "This is me" : "This is me"}
                  </button>
                </div>

                {/* ---------- Invite (data collection) section ---------- */}
                {!person.isSelf && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-foreground">
                        Personal details
                      </h4>
                      <Badge variant={statusConfig.variant}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Send this person a secure link so they can complete their
                      own personal details.
                    </p>

                    <div className="space-y-3">
                      {inviteError && (
                        <Alert
                          variant="error"
                          title="Could not send invite"
                          description={inviteError}
                        />
                      )}
                      {inviteStatus === "not_started" && (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter their email address"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => {
                              setInviteEmail(e.target.value);
                              setInviteError(null);
                            }}
                            className="flex-1"
                            disabled={isSendingInvite}
                          />
                          <Button
                            variant="secondary"
                            size="md"
                            onClick={handleSendInvite}
                            disabled={!inviteEmail || isSendingInvite}
                            loading={isSendingInvite}
                            className="shrink-0"
                          >
                            {isSendingInvite ? "Sending…" : "Send invite"}
                          </Button>
                        </div>
                      )}
                      {inviteStatus === "invite_sent" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              Invite sent to{" "}
                              <span className="font-medium text-foreground">
                                {person.invite?.email}
                              </span>
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSendInvite}
                              disabled={isSendingInvite}
                              loading={isSendingInvite}
                            >
                              {isSendingInvite ? "Sending…" : "Resend"}
                            </Button>
                          </div>
                          {/* Copyable invite link for manual sharing / testing */}
                          {inviteUrl && (
                            <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-3 py-2">
                              <code className="flex-1 text-xs text-muted-foreground truncate select-all">
                                {inviteUrl}
                              </code>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(inviteUrl);
                                  setLinkCopied(true);
                                  setTimeout(() => setLinkCopied(false), 2000);
                                }}
                                className="shrink-0 text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
                              >
                                {linkCopied ? "Copied!" : "Copy link"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {inviteStatus === "completed" && (
                        <p className="text-sm text-success">
                          Personal details received from{" "}
                          {person.invite?.email || "invitee"}.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Ownership & signatory metadata */}
                <div className="pt-3 border-t border-border space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Ownership &amp; signatory
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-xs">
                      <span className="block mb-1 text-muted-foreground">
                        Signatory type
                      </span>
                      <select
                        className="w-full rounded border border-border px-2 py-1.5 text-sm"
                        value={person.signatoryType || ""}
                        onChange={(e) =>
                          updatePerson(person.id, {
                            signatoryType:
                              (e.target.value as
                                | "SINGLE_SIGNATORY"
                                | "CO_SIGNATORY"
                                | "NONE") || undefined,
                          })
                        }
                      >
                        <option value="">Select…</option>
                        <option value="SINGLE_SIGNATORY">Single signatory</option>
                        <option value="CO_SIGNATORY">Co-signatory</option>
                        <option value="NONE">Not a signatory</option>
                      </select>
                    </label>
                    <label className="text-xs">
                      <span className="block mb-1 text-muted-foreground">
                        Ownership %
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        inputMode="numeric"
                        placeholder="25"
                        className="w-full rounded border border-border px-2 py-1.5 text-sm"
                        value={person.ownershipPercentage ?? ""}
                        onChange={(e) =>
                          updatePerson(person.id, {
                            ownershipPercentage: e.target.value
                              ? Math.max(
                                  0,
                                  Math.min(100, Number(e.target.value)),
                                )
                              : undefined,
                          })
                        }
                      />
                    </label>
                  </div>
                </div>

                {/* Remove button for manual people (but never for sole traders) */}
                {!isFromCH && person.role !== "sole_trader" && (
                  <div className="pt-3 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePerson(person.id)}
                      className="text-error hover:text-error hover:bg-error-light"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Remove person
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Test mode: email preview modal */}
        {IS_TEST_MODE && (
          <Modal
            open={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            title="Invite Email Preview (Test Mode)"
          >
            <div
              className="max-h-96 overflow-y-auto rounded-lg border border-border bg-white p-4"
              dangerouslySetInnerHTML={{ __html: emailPreviewHtml }}
            />
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setShowEmailModal(false)}>
                Close
              </Button>
            </div>
          </Modal>
        )}
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function Step3People() {
  const { people, addPerson, company } = useOnboardingStore();

  const isSoleTrader = company.entityType === "sole_trader";

  const handleAddPerson = useCallback(() => {
    addPerson({
      id: uuidv4(),
      source: "manual",
      isSelf: false,
      firstName: "",
      lastName: "",
      role: "director",
    });
  }, [addPerson]);

  // Data-collection progress: people whose details are accounted for —
  // either themselves (filled in directly) or an invitee who has completed it.
  const totalPeople = people.length;
  const completedCount = people.filter(
    (p) => p.isSelf || Boolean(p.invite?.completedAt),
  ).length;

  return (
    <div className="space-y-6">
      {/* ---------- Header / summary ---------- */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-medium text-foreground">
            {isSoleTrader
              ? "Your details"
              : "Directors and people with significant control"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isSoleTrader
              ? "As a sole trader, you are the business owner. Please complete your personal details."
              : "Review and complete details for each person. You can invite others to fill in their own details."}
          </p>
        </div>
      </div>

      {/* Sole trader helper */}
      {isSoleTrader && people.length > 0 && (
        <Alert
          variant="info"
          title="Pre-filled from Step 1"
          description="We've copied your contact details and address. Please add your full name and date of birth."
        />
      )}

      {/* Data-collection progress */}
      {totalPeople > 0 && (
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-success rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${totalPeople > 0 ? (completedCount / totalPeople) * 100 : 0}%`,
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground shrink-0">
            {completedCount} of {totalPeople} complete
          </span>
        </div>
      )}

      {/* ---------- People cards ---------- */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {people.map((person, idx) => (
            <PersonCard key={person.id} person={person} index={idx} />
          ))}
        </AnimatePresence>
      </div>

      {/* ---------- Empty state ---------- */}
      {totalPeople === 0 && (
        <Card className="text-center py-10">
          <svg
            className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
          </svg>
          <p className="text-sm text-muted-foreground">
            {isSoleTrader
              ? "Your details will appear here once you complete Step 1."
              : "No people added yet. Search for a company in Step 1 to auto-populate directors and PSCs, or add someone manually."}
          </p>
        </Card>
      )}

      {/* ---------- Add person button (not shown for sole traders) ---------- */}
      {!isSoleTrader && (
        <Button variant="outline" size="md" onClick={handleAddPerson}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Add another person
        </Button>
      )}
    </div>
  );
}
