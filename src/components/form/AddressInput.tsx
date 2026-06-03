"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

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
}: AddressInputProps) {
  const [postcodeLookupValue, setPostcodeLookupValue] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleFieldChange = (field: keyof Address, fieldValue: string) => {
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

  const handlePostcodeLookup = async () => {
    if (!postcodeLookupValue.trim()) return;

    setIsLookingUp(true);
    setLookupError(null);

    try {
      const response = await fetch(
        `/api/postcode/lookup?postcode=${encodeURIComponent(postcodeLookupValue)}`
      );
      if (response.ok) {
        const data = await response.json();
        onChange({
          addressLine1: value.addressLine1 || "",
          addressLine2: value.addressLine2 || "",
          locality: data.address.adminDistrict || "",
          region: data.address.region || "",
          postalCode: data.address.postcode || postcodeLookupValue.toUpperCase(),
          country: "United Kingdom",
        });
      } else {
        setLookupError("Postcode not found");
      }
    } catch {
      setLookupError("Failed to look up postcode");
    } finally {
      setIsLookingUp(false);
    }
  };

  const inputClass = cn(
    "w-full px-3 py-2.5 text-sm border rounded-lg bg-white transition-colors",
    "placeholder:text-muted-foreground/60",
    "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground",
    "border-border",
    disabled && "bg-muted text-muted-foreground cursor-not-allowed"
  );

  return (
    <div className="space-y-3">
      {showSameAsToggle && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isSameAs}
            onChange={(e) => onSameAsChange?.(e.target.checked)}
            className="w-4 h-4 rounded border-border text-foreground focus:ring-ring/20"
          />
          <span className="text-sm text-muted-foreground">{sameAsLabel}</span>
        </label>
      )}

      {!isSameAs && (
        <>
          {/* Postcode lookup */}
          <div className="flex gap-2">
            <input
              type="text"
              value={postcodeLookupValue}
              onChange={(e) =>
                setPostcodeLookupValue(e.target.value.toUpperCase())
              }
              placeholder="Enter postcode to find address"
              className={cn(inputClass, "flex-1")}
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handlePostcodeLookup();
                }
              }}
            />
            <button
              type="button"
              onClick={handlePostcodeLookup}
              disabled={disabled || isLookingUp || !postcodeLookupValue.trim()}
              className={cn(
                "px-4 py-2.5 text-sm font-medium rounded-lg transition-colors shrink-0",
                "bg-foreground text-primary-foreground hover:bg-foreground/90",
                "disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
              )}
            >
              {isLookingUp ? "Looking up..." : "Find"}
            </button>
          </div>
          {lookupError && (
            <p className="text-sm text-error">{lookupError}</p>
          )}

          {/* Address fields */}
          <div className="space-y-3">
            <input
              type="text"
              value={value.addressLine1 || ""}
              onChange={(e) => handleFieldChange("addressLine1", e.target.value)}
              placeholder="Address line 1"
              className={inputClass}
              disabled={disabled}
            />
            <input
              type="text"
              value={value.addressLine2 || ""}
              onChange={(e) => handleFieldChange("addressLine2", e.target.value)}
              placeholder="Address line 2 (optional)"
              className={inputClass}
              disabled={disabled}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={value.locality || ""}
                onChange={(e) => handleFieldChange("locality", e.target.value)}
                placeholder="Town / City"
                className={inputClass}
                disabled={disabled}
              />
              <input
                type="text"
                value={value.region || ""}
                onChange={(e) => handleFieldChange("region", e.target.value)}
                placeholder="County (optional)"
                className={inputClass}
                disabled={disabled}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={value.postalCode || ""}
                onChange={(e) => handleFieldChange("postalCode", e.target.value.toUpperCase())}
                placeholder="Postcode"
                className={inputClass}
                disabled={disabled}
              />
              <input
                type="text"
                value={value.country || "United Kingdom"}
                onChange={(e) => handleFieldChange("country", e.target.value)}
                placeholder="Country"
                className={inputClass}
                disabled={disabled}
              />
            </div>
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
    </div>
  );
}
