"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";

interface Address {
  addressLine1: string;
  addressLine2: string;
  locality: string;
  region: string;
  postalCode: string;
  country: string;
}

interface AddressInputProps {
  value: Partial<Address>;
  onChange: (address: Address) => void;
  error?: string;
  showSameAsToggle?: boolean;
  sameAsLabel?: string;
  onSameAsChange?: (same: boolean) => void;
  isSameAs?: boolean;
  disabled?: boolean;
  /** Maps to the autocomplete section token, e.g. "billing" or "shipping". */
  autoCompleteSection?: string;
}

export function AddressInput({
  value,
  onChange,
  error,
  showSameAsToggle = false,
  sameAsLabel = "Same as registered address",
  onSameAsChange,
  isSameAs = false,
  disabled = false,
  autoCompleteSection,
}: AddressInputProps) {
  const groupId = useId();
  const [postcodeQuery, setPostcodeQuery] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  const ac = (token: string) =>
    autoCompleteSection ? `section-${autoCompleteSection} ${token}` : token;

  const set = (field: keyof Address, fieldValue: string) => {
    onChange({
      addressLine1: value.addressLine1 || "",
      addressLine2: value.addressLine2 || "",
      locality: value.locality || "",
      region: value.region || "",
      postalCode: value.postalCode || "",
      country: value.country || "United Kingdom",
      [field]: fieldValue,
    });
  };

  const handleLookup = async () => {
    const query = postcodeQuery.trim();
    if (!query) return;

    setIsLookingUp(true);
    setLookupMessage(null);

    try {
      const response = await fetch(
        `/api/postcode/lookup?postcode=${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        setLookupMessage({
          tone: "error",
          text:
            response.status === 404
              ? "We couldn't find that postcode. Check it and try again, or fill the address in below."
              : "The postcode lookup isn't responding. Fill the address in below instead.",
        });
        return;
      }

      const data = await response.json();
      onChange({
        addressLine1: value.addressLine1 || "",
        addressLine2: value.addressLine2 || "",
        locality: data.address.adminDistrict || data.address.locality || "",
        region: data.address.region || "",
        postalCode: data.address.postcode || query.toUpperCase(),
        country: "United Kingdom",
      });
      setLookupMessage({
        tone: "ok",
        text: "Town and county filled in. Add your street address below.",
      });
    } catch {
      setLookupMessage({
        tone: "error",
        text: "We couldn't reach the postcode service. Fill the address in below instead.",
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {showSameAsToggle && (
        <Checkbox
          label={sameAsLabel}
          checked={isSameAs}
          onChange={(e) => onSameAsChange?.(e.target.checked)}
        />
      )}

      {!isSameAs && (
        <>
          <div className="rounded-[var(--radius-md)] bg-surface-sunk p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Input
                label="Look up by postcode"
                value={postcodeQuery}
                onChange={(e) => setPostcodeQuery(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLookup();
                  }
                }}
                placeholder="SW1A 1AA"
                autoComplete="off"
                disabled={disabled}
                className="font-mono uppercase placeholder:font-sans placeholder:normal-case"
                id={`${groupId}-postcode-lookup`}
              />
              <Button
                variant="secondary"
                size="md"
                onClick={handleLookup}
                loading={isLookingUp}
                disabled={disabled || isLookingUp || !postcodeQuery.trim()}
                className="shrink-0 sm:mb-0"
              >
                Fill in
              </Button>
            </div>
            <p
              aria-live="polite"
              className={cn(
                "mt-2 text-xs",
                lookupMessage?.tone === "error" ? "text-danger" : "text-ok",
              )}
            >
              {lookupMessage?.text}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Input
              label="Address line 1"
              value={value.addressLine1 || ""}
              onChange={(e) => set("addressLine1", e.target.value)}
              placeholder="12 High Street"
              autoComplete={ac("address-line1")}
              disabled={disabled}
            />
            <Input
              label="Address line 2"
              value={value.addressLine2 || ""}
              onChange={(e) => set("addressLine2", e.target.value)}
              placeholder="Optional"
              autoComplete={ac("address-line2")}
              disabled={disabled}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Town or city"
                value={value.locality || ""}
                onChange={(e) => set("locality", e.target.value)}
                autoComplete={ac("address-level2")}
                disabled={disabled}
              />
              <Input
                label="County"
                value={value.region || ""}
                onChange={(e) => set("region", e.target.value)}
                placeholder="Optional"
                autoComplete={ac("address-level1")}
                disabled={disabled}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Postcode"
                value={value.postalCode || ""}
                onChange={(e) => set("postalCode", e.target.value.toUpperCase())}
                autoComplete={ac("postal-code")}
                disabled={disabled}
                className="font-mono uppercase"
              />
              <Input
                label="Country"
                value={value.country || "United Kingdom"}
                onChange={(e) => set("country", e.target.value)}
                autoComplete={ac("country-name")}
                disabled={disabled}
              />
            </div>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
