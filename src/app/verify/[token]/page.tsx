"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { PhoneInput } from "@/components/form/PhoneInput";
import { DateOfBirthInput } from "@/components/form/DateOfBirthInput";
import { AddressInput } from "@/components/form/AddressInput";
import { SurfboardLogo } from "@/components/ui/SurfboardLogo";

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

type VerifyStep = "loading" | "form" | "submitting" | "complete" | "expired" | "error";

export default function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [step, setStep] = useState<VerifyStep>("loading");
  const [personData, setPersonData] = useState<PersonData | null>(null);
  const [formData, setFormData] = useState({
    dayOfBirth: undefined as number | undefined,
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

  // Load invite data
  useEffect(() => {
    async function loadInvite() {
      try {
        const response = await fetch(`/api/invite/${token}`);
        if (!response.ok) {
          if (response.status === 410) {
            setStep("expired");
            return;
          }
          throw new Error("Failed to load invite");
        }
        const data = await response.json();
        setPersonData(data.person);
        if (data.person.address) {
          setFormData((prev) => ({
            ...prev,
            address: data.person.address,
          }));
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
          dayOfBirth: formData.dayOfBirth,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
        }),
      });

      if (!response.ok) {
        if (response.status === 410) {
          setStep("expired");
          return;
        }
        throw new Error("Failed to submit details");
      }

      setStep("complete");
    } catch {
      setStep("error");
    }
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-muted rounded-xl" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (step === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-warning-light rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" d="M12 6v6l4 2" />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-semibold mb-2">Link Expired</h1>
          <p className="text-muted-foreground">
            This invite link has expired. Please ask the person who sent
            it to resend a new invite.
          </p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <Alert
            variant="error"
            title="Something went wrong"
            description="We couldn't load this invite. Please try again or contact support."
          />
        </div>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="mx-auto w-16 h-16 bg-success-light rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-semibold mb-2">
            Details Submitted
          </h1>
          <p className="text-muted-foreground">
            Thank you, {personData?.firstName}. Your details have been submitted.
            You can close this page.
          </p>
        </motion.div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-background">
      {/* Simple header */}
      <header className="bg-header-bg">
        <div className="mx-auto max-w-lg px-4 py-4">
          <SurfboardLogo variant="white" size={24} />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Greeting */}
          <div className="mb-8">
            <h1 className="font-heading text-2xl font-semibold tracking-tight mb-2">
              Hi {personData?.firstName}, complete your details
            </h1>
            <p className="text-muted-foreground">
              <strong>{personData?.companyName}</strong> is onboarding with
              Surfboard Payments. As a director or beneficial owner, we need a
              few of your personal details.
            </p>
            <div className="mt-3">
              <Badge variant="info">Takes about 2-3 minutes</Badge>
            </div>
          </div>

          {/* Pre-filled info */}
          <div className="bg-muted/50 rounded-xl p-4 mb-6 border border-border/50">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
              Information we have
            </p>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {personData?.firstName} {personData?.middleName}{" "}
                {personData?.lastName}
              </p>
              {personData?.dateOfBirth && (
                <p className="text-sm text-muted-foreground">
                  Born: {personData.dateOfBirth.month}/{personData.dateOfBirth.year}
                </p>
              )}
              {personData?.nationality && (
                <p className="text-sm text-muted-foreground">
                  Nationality: {personData.nationality}
                </p>
              )}
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-6">
            <DateOfBirthInput
              label="Confirm your date of birth"
              value={{
                day: formData.dayOfBirth,
                month: personData?.dateOfBirth?.month,
                year: personData?.dateOfBirth?.year,
              }}
              onChange={(dob) =>
                setFormData((prev) => ({ ...prev, dayOfBirth: dob.day }))
              }
              disabledFields={["month", "year"]}
            />

            <PhoneInput
              label="Phone number"
              value={formData.phone}
              onChange={(v) => setFormData((prev) => ({ ...prev, phone: v }))}
              required
            />

            <Input
              label="Email address"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="your@email.com"
              required
            />

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Residential address
              </label>
              <AddressInput
                value={formData.address}
                onChange={(addr) =>
                  setFormData((prev) => ({ ...prev, address: addr }))
                }
              />
            </div>

            {/* Submit */}
            <div className="pt-4">
              <Button
                onClick={handleSubmit}
                loading={step === "submitting"}
                disabled={
                  step === "submitting" ||
                  !formData.dayOfBirth ||
                  !formData.phone ||
                  !formData.email ||
                  !formData.address.addressLine1
                }
                className="w-full"
                size="lg"
              >
                {step === "submitting" ? "Submitting…" : "Submit my details"}
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
