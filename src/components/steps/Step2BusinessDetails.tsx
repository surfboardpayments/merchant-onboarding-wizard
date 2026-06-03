"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnboardingStore } from "@/store/onboardingStore";
import { AddressInput } from "@/components/form/AddressInput";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUSINESS_TYPE_OPTIONS = [
  { value: "online_only", label: "Online only", description: "E-commerce, SaaS, digital services" },
  { value: "in_store_only", label: "In-store only", description: "Brick and mortar, physical retail" },
  { value: "both", label: "Both online and in-store", description: "Omnichannel business" },
];

const TRADING_HISTORY_OPTIONS = [
  { value: "already_trading", label: "Already trading" },
  { value: "new_business", label: "New business" },
];

const MONTHLY_VOLUME_OPTIONS = [
  { value: "under_10k", label: "Under £10,000" },
  { value: "10k_50k", label: "£10,000 – £50,000" },
  { value: "50k_100k", label: "£50,000 – £100,000" },
  { value: "100k_plus", label: "Over £100,000" },
];

const AVERAGE_TRANSACTION_OPTIONS = [
  { value: "under_25", label: "Under £25" },
  { value: "25_50", label: "£25 – £50" },
  { value: "50_100", label: "£50 – £100" },
  { value: "100_250", label: "£100 – £250" },
  { value: "250_plus", label: "Over £250" },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

const sectionVariants = {
  hidden: { opacity: 0, height: 0, overflow: "hidden" as const },
  visible: {
    opacity: 1,
    height: "auto",
    overflow: "visible" as const,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    height: 0,
    overflow: "hidden" as const,
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
};

// ---------------------------------------------------------------------------
// URL validation helper
// ---------------------------------------------------------------------------

function isValidUrl(value: string): boolean {
  if (!value) return true; // empty is fine (not required at this level)
  try {
    const urlToTest = value.match(/^https?:\/\//) ? value : `https://${value}`;
    new URL(urlToTest);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Step2BusinessDetails() {
  const { company, business, updateBusiness } = useOnboardingStore();

  // Local state for "same as" toggles and URL validation
  const [salesUrlSameAsCompany, setSalesUrlSameAsCompany] = useState(
    business.salesUrl === business.companyUrl && !!business.companyUrl,
  );
  const [sameHoursEveryDay, setSameHoursEveryDay] = useState(true);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [salesUrlError, setSalesUrlError] = useState<string | null>(null);

  // Initialise trading name from company name if empty
  useEffect(() => {
    if (!business.merchantDba && company.companyName) {
      updateBusiness({ merchantDba: company.companyName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-copy registered address to DBA address when toggle is true
  useEffect(() => {
    if (
      business.dbaAddressSameAsRegistered &&
      company.registeredAddress &&
      !business.dbaAddress?.addressLine1
    ) {
      updateBusiness({ dbaAddress: { ...company.registeredAddress } });
    }
  }, [business.dbaAddressSameAsRegistered, company.registeredAddress, business.dbaAddress?.addressLine1, updateBusiness]);

  // Keep salesUrl in sync when "same as company URL" is checked
  useEffect(() => {
    if (salesUrlSameAsCompany && business.companyUrl) {
      updateBusiness({ salesUrl: business.companyUrl });
    }
  }, [salesUrlSameAsCompany, business.companyUrl, updateBusiness]);

  const showInStore =
    business.businessType === "in_store_only" || business.businessType === "both";
  const showOnline =
    business.businessType === "online_only" || business.businessType === "both";

  // ---------------------------------------------------------------------------
  // Opening hours helpers
  // ---------------------------------------------------------------------------

  const openingHours = business.inStoreDetails?.openingHours || {};

  function updateOpeningHour(
    day: string,
    field: "open" | "close" | "closed",
    value: string | boolean,
  ) {
    const current = business.inStoreDetails || {};
    const hours = { ...(current.openingHours || {}) };
    hours[day] = { ...hours[day], [field]: value };
    updateBusiness({
      inStoreDetails: { ...current, openingHours: hours },
    });
  }

  function updateAllHours(field: "open" | "close", value: string) {
    const current = business.inStoreDetails || {};
    const hours: Record<string, { open?: string; close?: string; closed?: boolean }> = {};
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    for (const day of days) {
      hours[day] = { ...(current.openingHours?.[day] || {}), [field]: value };
    }
    updateBusiness({
      inStoreDetails: { ...current, openingHours: hours },
    });
  }

  // Seasonal months helper
  const seasonalMonths = business.inStoreDetails?.seasonalMonths || [];

  function toggleSeasonalMonth(monthIndex: number) {
    const current = business.inStoreDetails || {};
    const months = [...(current.seasonalMonths || [])];
    const idx = months.indexOf(monthIndex);
    if (idx >= 0) {
      months.splice(idx, 1);
    } else {
      months.push(monthIndex);
      months.sort((a, b) => a - b);
    }
    updateBusiness({
      inStoreDetails: { ...current, seasonalMonths: months },
    });
  }

  return (
    <div className="space-y-8">
      {/* ---------- Trading name ---------- */}
      <Input
        label="Trading name / DBA"
        placeholder="Your trading name"
        value={business.merchantDba || ""}
        onChange={(e) => updateBusiness({ merchantDba: e.target.value })}
        helperText="The name your customers see on receipts and statements"
      />

      {/* ---------- Trading address ---------- */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Trading address
        </label>
        <AddressInput
          value={{
            addressLine1: business.dbaAddress?.addressLine1 || "",
            addressLine2: business.dbaAddress?.addressLine2 || "",
            locality: business.dbaAddress?.city || "",
            region: business.dbaAddress?.county || "",
            postalCode: business.dbaAddress?.postcode || "",
            country: business.dbaAddress?.country || "United Kingdom",
          }}
          onChange={(addr) =>
            updateBusiness({
              dbaAddress: {
                addressLine1: addr.addressLine1,
                addressLine2: addr.addressLine2,
                city: addr.locality,
                county: addr.region,
                postcode: addr.postalCode,
                country: addr.country,
              },
              dbaAddressSameAsRegistered: false,
            })
          }
          showSameAsToggle
          sameAsLabel="Same as registered address"
          isSameAs={business.dbaAddressSameAsRegistered || false}
          onSameAsChange={(same) => {
            updateBusiness({ dbaAddressSameAsRegistered: same });
            if (same && company.registeredAddress) {
              updateBusiness({ dbaAddress: { ...company.registeredAddress } });
            }
          }}
          disabled={business.dbaAddressSameAsRegistered || false}
        />
      </div>

      {/* ---------- Company URL ---------- */}
      <Input
        label="Company website"
        type="url"
        placeholder="https://www.example.co.uk"
        value={business.companyUrl || ""}
        onChange={(e) => {
          updateBusiness({ companyUrl: e.target.value });
          setUrlError(
            e.target.value && !isValidUrl(e.target.value)
              ? "Please enter a valid URL"
              : null,
          );
        }}
        error={urlError || undefined}
      />

      {/* ---------- Sales URL ---------- */}
      <div className="space-y-2">
        <Input
          label="Sales URL"
          type="url"
          placeholder="https://shop.example.co.uk"
          value={business.salesUrl || ""}
          onChange={(e) => {
            updateBusiness({ salesUrl: e.target.value });
            setSalesUrlSameAsCompany(false);
            setSalesUrlError(
              e.target.value && !isValidUrl(e.target.value)
                ? "Please enter a valid URL"
                : null,
            );
          }}
          disabled={salesUrlSameAsCompany}
          error={salesUrlError || undefined}
        />
        <Checkbox
          label="Same as company website"
          checked={salesUrlSameAsCompany}
          onChange={(e) => {
            const checked = e.target.checked;
            setSalesUrlSameAsCompany(checked);
            if (checked) {
              updateBusiness({ salesUrl: business.companyUrl || "" });
              setSalesUrlError(null);
            }
          }}
        />
      </div>

      {/* ---------- Business type ---------- */}
      <RadioGroup
        label="Business type"
        layout="horizontal"
        options={BUSINESS_TYPE_OPTIONS}
        value={business.businessType || ""}
        onChange={(value) =>
          updateBusiness({
            businessType: value as "online_only" | "in_store_only" | "both",
          })
        }
      />

      {/* ---------- Products / services ---------- */}
      <TextArea
        label="Products and services"
        placeholder="Describe what your business sells or the services you provide..."
        maxLength={500}
        value={business.productsDescription || ""}
        onChange={(e) =>
          updateBusiness({ productsDescription: e.target.value })
        }
        helperText="Help us understand what your customers are buying"
      />

      {/* ---------- In-store conditional fields ---------- */}
      <AnimatePresence>
        {showInStore && (
          <motion.div
            key="in-store-section"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6 rounded-[var(--radius)] border border-border p-5"
          >
            <div>
              <h3 className="text-base font-medium text-foreground">
                In-store details
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tell us about your physical locations
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Number of locations"
                type="number"
                min={1}
                placeholder="1"
                value={business.inStoreDetails?.numberOfLocations ?? ""}
                onChange={(e) =>
                  updateBusiness({
                    inStoreDetails: {
                      ...business.inStoreDetails,
                      numberOfLocations: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    },
                  })
                }
              />
              <Input
                label="Terminals per location"
                type="number"
                min={1}
                placeholder="1"
                value={business.inStoreDetails?.terminalsPerLocation ?? ""}
                onChange={(e) =>
                  updateBusiness({
                    inStoreDetails: {
                      ...business.inStoreDetails,
                      terminalsPerLocation: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    },
                  })
                }
              />
            </div>

            {/* Opening hours */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Opening hours
              </label>
              <Toggle
                label="Same hours every day"
                checked={sameHoursEveryDay}
                onChange={setSameHoursEveryDay}
              />

              {sameHoursEveryDay ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Opens
                    </label>
                    <input
                      type="time"
                      value={openingHours.monday?.open || "09:00"}
                      onChange={(e) => updateAllHours("open", e.target.value)}
                      className={cn(
                        "w-full px-3 py-2.5 text-sm border rounded-lg bg-white transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground",
                        "border-border",
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Closes
                    </label>
                    <input
                      type="time"
                      value={openingHours.monday?.close || "17:00"}
                      onChange={(e) => updateAllHours("close", e.target.value)}
                      className={cn(
                        "w-full px-3 py-2.5 text-sm border rounded-lg bg-white transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground",
                        "border-border",
                      )}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday",
                  ].map((day) => (
                    <div
                      key={day}
                      className="grid grid-cols-[100px_1fr_1fr_auto] gap-2 items-center"
                    >
                      <span className="text-sm text-foreground capitalize">
                        {day}
                      </span>
                      <input
                        type="time"
                        value={openingHours[day]?.open || "09:00"}
                        onChange={(e) =>
                          updateOpeningHour(day, "open", e.target.value)
                        }
                        disabled={openingHours[day]?.closed || false}
                        className={cn(
                          "w-full px-2 py-1.5 text-sm border rounded-lg bg-white transition-colors",
                          "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground",
                          "border-border",
                          openingHours[day]?.closed &&
                            "bg-muted text-muted-foreground cursor-not-allowed",
                        )}
                      />
                      <input
                        type="time"
                        value={openingHours[day]?.close || "17:00"}
                        onChange={(e) =>
                          updateOpeningHour(day, "close", e.target.value)
                        }
                        disabled={openingHours[day]?.closed || false}
                        className={cn(
                          "w-full px-2 py-1.5 text-sm border rounded-lg bg-white transition-colors",
                          "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground",
                          "border-border",
                          openingHours[day]?.closed &&
                            "bg-muted text-muted-foreground cursor-not-allowed",
                        )}
                      />
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={openingHours[day]?.closed || false}
                          onChange={(e) =>
                            updateOpeningHour(day, "closed", e.target.checked)
                          }
                          className="w-3.5 h-3.5 rounded border-border"
                        />
                        Closed
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Seasonal toggle */}
            <div className="space-y-3">
              <Toggle
                label="Seasonal business"
                description="Does your business only operate during certain months?"
                checked={business.inStoreDetails?.isSeasonal || false}
                onChange={(checked) =>
                  updateBusiness({
                    inStoreDetails: {
                      ...business.inStoreDetails,
                      isSeasonal: checked,
                      seasonalMonths: checked
                        ? business.inStoreDetails?.seasonalMonths || []
                        : [],
                    },
                  })
                }
              />

              <AnimatePresence>
                {business.inStoreDetails?.isSeasonal && (
                  <motion.div
                    variants={sectionVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Trading months
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {MONTH_NAMES.map((month, idx) => {
                        const monthNum = idx + 1;
                        const isSelected = seasonalMonths.includes(monthNum);
                        return (
                          <button
                            key={month}
                            type="button"
                            onClick={() => toggleSeasonalMonth(monthNum)}
                            className={cn(
                              "px-3 py-2 text-sm rounded-lg border transition-all duration-150",
                              "cursor-pointer",
                              isSelected
                                ? "border-primary bg-primary/[0.05] text-primary font-medium ring-1 ring-primary"
                                : "border-border text-muted-foreground hover:border-muted-foreground/30 hover:bg-muted/50",
                            )}
                          >
                            {month.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Online conditional fields ---------- */}
      <AnimatePresence>
        {showOnline && (
          <motion.div
            key="online-section"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4 rounded-[var(--radius)] border border-border p-5"
          >
            <div>
              <h3 className="text-base font-medium text-foreground">
                Online sales details
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Help us understand your expected online transaction volumes
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Expected monthly volume"
                placeholder="Select a range"
                options={MONTHLY_VOLUME_OPTIONS}
                value={business.expectedMonthlyVolume || ""}
                onChange={(e) =>
                  updateBusiness({
                    expectedMonthlyVolume: e.target.value as
                      | "under_10k"
                      | "10k_50k"
                      | "50k_100k"
                      | "100k_plus",
                  })
                }
              />
              <Select
                label="Average transaction value"
                placeholder="Select a range"
                options={AVERAGE_TRANSACTION_OPTIONS}
                value={business.averageTransactionValue || ""}
                onChange={(e) =>
                  updateBusiness({
                    averageTransactionValue: e.target.value as
                      | "under_25"
                      | "25_50"
                      | "50_100"
                      | "100_250"
                      | "250_plus",
                  })
                }
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Trading history (always shown) ---------- */}
      <div className="space-y-4">
        <RadioGroup
          label="Trading history"
          options={TRADING_HISTORY_OPTIONS}
          value={business.tradingHistory || ""}
          onChange={(value) =>
            updateBusiness({
              tradingHistory: value as "already_trading" | "new_business",
            })
          }
        />

        <AnimatePresence>
          {business.tradingHistory === "already_trading" && (
            <motion.div
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Input
                label="Approximate monthly card volume (last 3 months)"
                placeholder="£ e.g. 25000"
                value={business.monthlyVolumeLast3Months || ""}
                onChange={(e) =>
                  updateBusiness({
                    monthlyVolumeLast3Months: e.target.value,
                  })
                }
                helperText="An average across the last 3 months is fine"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
