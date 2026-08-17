"use client";

import { use, useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PhoneInput } from "@/components/form/PhoneInput";
import { DateOfBirthInput } from "@/components/form/DateOfBirthInput";
import { AddressInput } from "@/components/form/AddressInput";
import { PoweredBySurfboard } from "@/components/ui/SurfboardLogo";
import { birthPhrase } from "@/lib/utils/prose";

interface PersonData {
  firstName: string;
  lastName: string;
  middleName?: string;
  companyName: string;
  dateOfBirth: { month?: number; year?: number; day?: number };
  nationality?: string;
  address?: {
    addressLine1: string;
    addressLine2: string;
    locality: string;
    region: string;
    postalCode: string;
    country: string;
  };
}

type VerifyStep =
  | "loading"
  | "form"
  | "submitting"
  | "complete"
  | "expired"
  | "error";

/**
 * What an invited director or owner sees. They arrive cold from an email with
 * no idea who Surfboard is, so the page leads with who is asking, why, and how
 * long it takes, before it asks for a date of birth.
 */
export default function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [step, setStep] = useState<VerifyStep>("loading");
  const [person, setPerson] = useState<PersonData | null>(null);
  const [form, setForm] = useState({
    dayOfBirth: undefined as number | undefined,
    monthOfBirth: undefined as number | undefined,
    yearOfBirth: undefined as number | undefined,
    phone: "",
    email: "",
    address: {
      addressLine1: "",
      addressLine2: "",
      locality: "",
      region: "",
      postalCode: "",
      country: "United Kingdom",
    },
  });

  useEffect(() => {
    async function loadInvite() {
      try {
        const response = await fetch(`/api/invite/${token}`);
        if (!response.ok) {
          setStep(response.status === 410 ? "expired" : "error");
          return;
        }
        const data = await response.json();
        setPerson(data.person);
        if (data.person.address) {
          setForm((prev) => ({ ...prev, address: data.person.address }));
        }
        setStep("form");
      } catch {
        setStep("error");
      }
    }
    loadInvite();
  }, [token]);

  const handleSubmit = async () => {
    setStep("submitting");
    try {
      const response = await fetch(`/api/invite/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfBirth: form.dayOfBirth,
          monthOfBirth: person?.dateOfBirth?.month ?? form.monthOfBirth,
          yearOfBirth: person?.dateOfBirth?.year ?? form.yearOfBirth,
          phone: form.phone,
          email: form.email,
          address: form.address,
        }),
      });

      if (!response.ok) {
        setStep(response.status === 410 ? "expired" : "error");
        return;
      }
      setStep("complete");
    } catch {
      setStep("error");
    }
  };

  /** True when the public register already told us the month and year. */
  const knownBirthMonthYear = Boolean(
    person?.dateOfBirth?.month && person?.dateOfBirth?.year,
  );

  const missing =
    !form.dayOfBirth ||
    (!knownBirthMonthYear && (!form.monthOfBirth || !form.yearOfBirth)) ||
    !form.phone ||
    !form.email ||
    !form.address.addressLine1;

  return (
    <div className="frame-ground flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-10 sm:px-8">
        {step === "loading" && (
          <div className="flex flex-1 flex-col justify-center gap-6">
            <div className="h-8 w-3/4 animate-pulse rounded bg-on-frame/10" />
            <div className="h-64 animate-pulse rounded-[var(--radius-xl)] bg-surface/90" />
          </div>
        )}

        {step === "expired" && (
          <Outcome
            tone="warn"
            title="This link has expired"
            body="Invite links last seven days. Ask whoever sent it to send you a fresh one and it'll work straight away."
          />
        )}

        {step === "error" && (
          <Outcome
            tone="danger"
            title="We couldn't open this invite"
            body={
              <>
                Try the link again in a minute. If it still doesn&apos;t work,
                email{" "}
                <a
                  href="mailto:support@surfboardpayments.com"
                  className="text-accent underline decoration-accent/35 underline-offset-4 hover:decoration-accent/70"
                >
                  support@surfboardpayments.com
                </a>{" "}
                and we&apos;ll sort it out.
              </>
            }
          />
        )}

        {step === "complete" && (
          <Outcome
            tone="ok"
            title={`Thanks${person?.firstName ? `, ${person.firstName}` : ""}`}
            body={`Your details are with ${person?.companyName || "the business"}'s application. Nothing else is needed from you, and you can close this page.`}
          />
        )}

        {(step === "form" || step === "submitting") && (
          <>
            <header className="pb-8">
              <h1 className="tracking-display font-display text-2xl font-semibold text-on-frame sm:text-3xl">
                {person?.firstName ? `Hi ${person.firstName},` : "Hello,"} we need
                three things from you
              </h1>
              <p className="mt-4 max-w-[54ch] text-md leading-relaxed text-on-frame-muted">
                <strong className="font-semibold text-on-frame">
                  {person?.companyName}
                </strong>{" "}
                is setting up card payments with Surfboard. You&apos;re listed as
                a director or owner, so the law requires us to confirm who you
                are. It takes about two minutes.
              </p>
            </header>

            <main className="rounded-[var(--radius-xl)] bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
              <div className="flex flex-col gap-7">
                <section className="rounded-[var(--radius-md)] border border-ok-edge bg-ok-wash px-4 py-3.5">
                  <p className="font-mono text-2xs uppercase tracking-[0.1em] text-ok">
                    What we already have
                  </p>
                  <p className="mt-2 text-md text-ink">
                    {[person?.firstName, person?.middleName, person?.lastName]
                      .filter(Boolean)
                      .join(" ")}
                    {person?.dateOfBirth?.month && person?.dateOfBirth?.year && (
                      <>
                        , born{" "}
                        {birthPhrase({
                          month: person.dateOfBirth.month,
                          year: person.dateOfBirth.year,
                        })}
                      </>
                    )}
                    {person?.nationality && <>, {person.nationality}</>}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    From the Companies House public register.
                  </p>
                </section>

                {/* Lock only what the register actually gave us. Disabling an
                    empty month and year would leave the invitee unable to
                    finish, with no way to say so. */}
                <DateOfBirthInput
                  label="Your full date of birth"
                  value={{
                    day: form.dayOfBirth,
                    month: person?.dateOfBirth?.month ?? form.monthOfBirth,
                    year: person?.dateOfBirth?.year ?? form.yearOfBirth,
                  }}
                  onChange={(dob) =>
                    setForm((prev) => ({
                      ...prev,
                      dayOfBirth: dob.day,
                      monthOfBirth: dob.month,
                      yearOfBirth: dob.year,
                    }))
                  }
                  disabledFields={
                    knownBirthMonthYear ? ["month", "year"] : []
                  }
                  helperText={
                    knownBirthMonthYear
                      ? "Companies House only publishes the month and year, so we need the day."
                      : undefined
                  }
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                  />
                  <PhoneInput
                    label="Phone number"
                    value={form.phone}
                    onChange={(v) => setForm((prev) => ({ ...prev, phone: v }))}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium text-ink">Your home address</p>
                  <AddressInput
                    autoCompleteSection="invitee"
                    value={form.address}
                    onChange={(addr) => setForm((prev) => ({ ...prev, address: addr }))}
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-line pt-6">
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    loading={step === "submitting"}
                    disabled={step === "submitting" || missing}
                    className="w-full"
                  >
                    {step === "submitting" ? "Sending your details" : "Send my details"}
                  </Button>
                  <p className="text-sm leading-relaxed text-ink-subtle">
                    These details go to {person?.companyName || "the business"}
                    &apos;s payment application and the acquiring bank that runs
                    the checks. Nothing is shared with anyone else.
                  </p>
                </div>
              </div>
            </main>
          </>
        )}

        <div className="mt-auto">
          <PoweredBySurfboard />
        </div>
      </div>
    </div>
  );
}

function Outcome({
  tone,
  title,
  body,
}: {
  tone: "ok" | "warn" | "danger";
  title: string;
  body: React.ReactNode;
}) {
  const marks = {
    ok: { ring: "border-ok-edge bg-ok-wash", ink: "text-ok", path: "m3 8.5 3.2 3.2L13 4.8" },
    warn: {
      ring: "border-warn-edge bg-warn-wash",
      ink: "text-warn",
      path: "M8 2.5v6M8 12.5v.5",
    },
    danger: {
      ring: "border-danger-edge bg-danger-wash",
      ink: "text-danger",
      path: "m4 4 8 8M12 4l-8 8",
    },
  }[tone];

  return (
    <div className="flex flex-1 flex-col justify-center">
      <div className="rounded-[var(--radius-xl)] bg-surface p-8 text-center shadow-[var(--shadow-card)]">
        <span
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border ${marks.ring}`}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-6 w-6 ${marks.ink}`}
          >
            <path d={marks.path} />
          </svg>
        </span>
        <h1 className="mt-5 font-display text-xl font-semibold tracking-[-0.02em] text-ink">
          {title}
        </h1>
        <p className="mx-auto mt-2 max-w-[48ch] text-base leading-relaxed text-ink-muted">
          {body}
        </p>
      </div>
    </div>
  );
}
