"use client";

import { useCallback, useId, useState } from "react";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { Person } from "@/store/onboardingStore";
import { DateOfBirthInput } from "@/components/form/DateOfBirthInput";
import { AddressInput } from "@/components/form/AddressInput";
import { PhoneInput } from "@/components/form/PhoneInput";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { NATIONALITIES } from "@/lib/constants/nationalities";
import { ROLE_LABEL, birthPhrase, fullName } from "@/lib/utils/prose";
import { cn } from "@/lib/utils/cn";

const IS_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

const NATIONALITY_OPTIONS = NATIONALITIES.map((n) => ({ value: n, label: n }));

/** Everything the acquirer needs from a person before we can submit. */
function isPersonComplete(person: Person): boolean {
  return Boolean(
    person.firstName &&
      person.lastName &&
      person.dateOfBirth?.day &&
      person.dateOfBirth?.month &&
      person.dateOfBirth?.year &&
      person.residentialAddress?.addressLine1 &&
      person.residentialAddress?.postcode &&
      person.nationality,
  );
}

type Status = "complete" | "invited" | "received" | "needed";

function statusOf(person: Person): Status {
  if (person.invite?.completedAt) return "received";
  if (isPersonComplete(person)) return "complete";
  if (person.invite?.sentAt) return "invited";
  return "needed";
}

const STATUS_META: Record<
  Status,
  { label: string; variant: "success" | "warning" | "default" }
> = {
  complete: { label: "Done", variant: "success" },
  received: { label: "They've replied", variant: "success" },
  invited: { label: "Waiting on them", variant: "warning" },
  needed: { label: "Needs details", variant: "default" },
};

interface PersonRowProps {
  person: Person;
  /** True when this is the person filling the form in. */
  isSelf: boolean;
  onClaimSelf: () => void;
  index: number;
  /** Set for the single person on a one-person application, where opening
      straight into the form saves a click and hides nothing. */
  autoExpand?: boolean;
}

export function PersonRow({
  person,
  isSelf,
  onClaimSelf,
  index,
  autoExpand = false,
}: PersonRowProps) {
  const { updatePerson, removePerson, company, id: applicationId } = useOnboardingStore();

  const status = statusOf(person);
  const meta = STATUS_META[status];
  const fromCH = person.source === "companies_house";
  const name = fullName(person) || "Someone new";
  const born = birthPhrase(person.dateOfBirth);
  const regionId = useId();

  const [open, setOpen] = useState(autoExpand && !isPersonComplete(person));
  const [inviteEmail, setInviteEmail] = useState(person.invite?.email || person.email || "");
  const [isSending, setIsSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailPreview, setEmailPreview] = useState<string | null>(null);

  const handleSendInvite = useCallback(async () => {
    if (!inviteEmail) return;
    setIsSending(true);
    setInviteError(null);

    try {
      const personName = fullName(person) || "Person";
      const res = await fetch("/api/invite/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          personId: person.id,
          personName,
          personEmail: inviteEmail,
          companyName: company?.companyName || "your company",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || "We couldn't send that invite. Check the address and try again.",
        );
      }

      const { token, expiresAt, inviteUrl: url, emailHtml, testMode } = await res.json();
      setInviteUrl(url || null);

      if (testMode && emailHtml) {
        setEmailPreview(emailHtml);
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
          remindersSent:
            (person.invite?.remindersSent ?? 0) + (person.invite?.sentAt ? 1 : 0),
        },
      });
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Something went wrong sending that invite.",
      );
    } finally {
      setIsSending(false);
    }
  }, [inviteEmail, person, applicationId, company?.companyName, updatePerson]);

  return (
    <li
      className={cn(
        "animate-rise overflow-hidden rounded-[var(--radius-md)] border",
        isSelf ? "border-accent-edge bg-accent-wash/40" : "border-line",
      )}
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5">
        <span
          aria-hidden="true"
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            isSelf ? "bg-accent text-white" : "bg-surface-veil text-ink-muted",
          )}
        >
          {(person.firstName?.[0] || "?").toUpperCase()}
          {(person.lastName?.[0] || "").toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-ink">
            {name}
            {isSelf && <span className="ml-2 text-sm font-normal text-accent">You</span>}
          </p>
          <p className="mt-0.5 text-sm leading-snug text-ink-muted">
            {person.role ? ROLE_LABEL[person.role] : "Person"}
            {born && ` · born ${born}`}
            {fromCH && " · from Companies House"}
          </p>
        </div>

        <Badge variant={meta.variant}>{meta.label}</Badge>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={regionId}
          className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--radius-xs)] px-2 text-sm font-medium text-accent transition-colors duration-[var(--dur-tap)] hover:bg-accent-wash"
        >
          {open ? "Close" : status === "complete" ? "Review" : "Add details"}
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-[var(--dur-state)] ease-[var(--ease-out)]",
              open && "rotate-180",
            )}
            aria-hidden="true"
          >
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>
      </div>

      <div
        id={regionId}
        className={cn(
          "grid transition-[grid-template-rows] duration-[var(--dur-reveal)] ease-[var(--ease-out)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className={cn("min-h-0", open ? "overflow-visible" : "overflow-hidden")}>
          <div
            className="flex flex-col gap-6 border-t border-line px-4 py-5"
            inert={!open}
          >
            {!isSelf && (
              <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-sm)] bg-surface-sunk px-4 py-3">
                <p className="min-w-0 flex-1 text-sm text-ink-muted">
                  Filling this in on {person.firstName || "their"} behalf?
                </p>
                <Button variant="outline" size="sm" onClick={onClaimSelf}>
                  This is me
                </Button>
              </div>
            )}

            {/* Names. Companies House data is editable: it goes stale. */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="First name"
                autoComplete="given-name"
                value={person.firstName || ""}
                onChange={(e) => updatePerson(person.id, { firstName: e.target.value })}
              />
              <Input
                label="Middle name"
                placeholder="Optional"
                autoComplete="additional-name"
                value={person.middleName || ""}
                onChange={(e) => updatePerson(person.id, { middleName: e.target.value })}
              />
              <Input
                label="Last name"
                autoComplete="family-name"
                value={person.lastName || ""}
                onChange={(e) => updatePerson(person.id, { lastName: e.target.value })}
              />
            </div>

            <DateOfBirthInput
              value={person.dateOfBirth || {}}
              onChange={(dob) => updatePerson(person.id, { dateOfBirth: dob })}
              helperText={
                fromCH
                  ? "Companies House publishes the month and year. We need the day too."
                  : undefined
              }
            />

            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-ink">Home address</p>
              <AddressInput
                autoCompleteSection={`person-${person.id}`}
                value={{
                  addressLine1: person.residentialAddress?.addressLine1 || "",
                  addressLine2: person.residentialAddress?.addressLine2 || "",
                  locality: person.residentialAddress?.city || "",
                  region: person.residentialAddress?.county || "",
                  postalCode: person.residentialAddress?.postcode || "",
                  country: person.residentialAddress?.country || "United Kingdom",
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={person.email || ""}
                onChange={(e) => updatePerson(person.id, { email: e.target.value })}
              />
              <PhoneInput
                label="Phone number"
                value={person.phoneNumber || ""}
                onChange={(value) => updatePerson(person.id, { phoneNumber: value })}
              />
            </div>

            <Select
              label="Nationality"
              placeholder="Choose a nationality"
              options={NATIONALITY_OPTIONS}
              value={person.nationality || ""}
              onChange={(e) => updatePerson(person.id, { nationality: e.target.value })}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Can they sign agreements?"
                placeholder="Choose"
                options={[
                  { value: "SINGLE_SIGNATORY", label: "Yes, on their own" },
                  { value: "CO_SIGNATORY", label: "Yes, with someone else" },
                  { value: "NONE", label: "No" },
                ]}
                value={person.signatoryType || ""}
                onChange={(e) =>
                  updatePerson(person.id, {
                    signatoryType:
                      (e.target.value as Person["signatoryType"]) || undefined,
                  })
                }
              />
              <Input
                label="Share of the business"
                type="number"
                min={0}
                max={100}
                inputMode="numeric"
                placeholder="25"
                adornment={<span className="text-sm">%</span>}
                value={person.ownershipPercentage ?? ""}
                onChange={(e) =>
                  updatePerson(person.id, {
                    ownershipPercentage: e.target.value
                      ? Math.max(0, Math.min(100, Number(e.target.value)))
                      : undefined,
                  })
                }
              />
            </div>

            {/* Invite: let someone else answer for themselves. */}
            {!isSelf && (
              <div className="flex flex-col gap-3 border-t border-line pt-5">
                <div>
                  <h4 className="text-base font-medium text-ink">
                    Or ask {person.firstName || "them"} to fill this in
                  </h4>
                  <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-ink-muted">
                    We&apos;ll email a secure link so they enter their own date of
                    birth and address. You won&apos;t need to chase them for it.
                  </p>
                </div>

                {inviteError && (
                  <Alert
                    variant="error"
                    title="That invite didn't send"
                    description={inviteError}
                  />
                )}

                {status === "received" ? (
                  <p className="text-base text-ok">
                    {person.firstName || "They"} sent their details back.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <Input
                        label="Their email address"
                        type="email"
                        placeholder="name@example.com"
                        value={inviteEmail}
                        onChange={(e) => {
                          setInviteEmail(e.target.value);
                          setInviteError(null);
                        }}
                        disabled={isSending}
                        className="sm:min-w-64"
                      />
                      <Button
                        variant="outline"
                        size="md"
                        onClick={handleSendInvite}
                        disabled={!inviteEmail || isSending}
                        loading={isSending}
                        className="shrink-0"
                      >
                        {person.invite?.sentAt ? "Send again" : "Send invite"}
                      </Button>
                    </div>

                    {person.invite?.sentAt && (
                      <p className="text-sm text-ink-muted">
                        Sent to{" "}
                        <span className="font-medium text-ink">
                          {person.invite.email}
                        </span>
                        . They have seven days to reply.
                      </p>
                    )}

                    {inviteUrl && (
                      <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface-sunk px-3 py-2">
                        <code className="min-w-0 flex-1 select-all truncate font-mono text-xs text-ink-muted">
                          {inviteUrl}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(inviteUrl);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="shrink-0 cursor-pointer rounded-[var(--radius-xs)] px-1 text-xs font-medium text-accent transition-colors hover:text-accent-hover"
                        >
                          {copied ? "Copied" : "Copy link"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!fromCH && person.role !== "sole_trader" && (
              <div className="border-t border-line pt-5">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removePerson(person.id)}
                >
                  Remove {person.firstName || "this person"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {IS_TEST_MODE && (
        <Modal
          open={!!emailPreview}
          onClose={() => setEmailPreview(null)}
          title="The email we would have sent"
          description="Demo mode shows it here instead of sending it."
          size="lg"
        >
          <div
            className="rounded-[var(--radius-sm)] border border-line bg-surface p-4"
            dangerouslySetInnerHTML={{ __html: emailPreview || "" }}
          />
        </Modal>
      )}
    </li>
  );
}

export { isPersonComplete };
