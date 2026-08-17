"use client";

import { useEffect } from "react";
import { useOnboardingStore } from "@/store/onboardingStore";
import { ConfirmedFact, Val } from "@/components/wizard/ConfirmedFact";
import { AddressInput } from "@/components/form/AddressInput";
import { TransactionDescriptorInput } from "@/components/form/TransactionDescriptorInput";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { Disclosure } from "@/components/ui/Disclosure";
import {
  AVG_TRANSACTION_PHRASE,
  BUSINESS_TYPE_PHRASE,
  MONTHLY_VOLUME_PHRASE,
  REFUND_POLICY_LABEL,
  REFUND_POLICY_PHRASE,
  mccLabel,
  prettyUrl,
  shortAddress,
} from "@/lib/utils/prose";

// ---------------------------------------------------------------------------
// Option sets
// ---------------------------------------------------------------------------

const BUSINESS_TYPE_OPTIONS = [
  { value: "in_store_only" as const, label: "In person", description: "A shop, salon, market stall or van" },
  { value: "online_only" as const, label: "Online", description: "A website, app or marketplace" },
  { value: "both" as const, label: "Both", description: "You sell in person and online" },
];

const TRADING_HISTORY_OPTIONS = [
  { value: "already_trading" as const, label: "We're already trading" },
  { value: "new_business" as const, label: "We're just starting" },
];

const MONTHLY_VOLUME_OPTIONS = [
  { value: "under_10k", label: "Under £10,000" },
  { value: "10k_50k", label: "£10,000 to £50,000" },
  { value: "50k_100k", label: "£50,000 to £100,000" },
  { value: "100k_plus", label: "Over £100,000" },
];

const AVERAGE_TRANSACTION_OPTIONS = [
  { value: "under_25", label: "Under £25" },
  { value: "25_50", label: "£25 to £50" },
  { value: "50_100", label: "£50 to £100" },
  { value: "100_250", label: "£100 to £250" },
  { value: "250_plus", label: "Over £250" },
];

const REFUND_POLICY_OPTIONS = [
  { value: "full_refund", label: REFUND_POLICY_LABEL.full_refund },
  { value: "partial_refund", label: REFUND_POLICY_LABEL.partial_refund },
  { value: "no_refunds", label: REFUND_POLICY_LABEL.no_refunds },
  { value: "custom", label: REFUND_POLICY_LABEL.custom },
];

const DAYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isValidUrl(value: string): boolean {
  if (!value) return true;
  try {
    new URL(value.match(/^https?:\/\//) ? value : `https://${value}`);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepBusiness() {
  const company = useOnboardingStore((s) => s.company);
  const business = useOnboardingStore((s) => s.business);
  const transactions = useOnboardingStore((s) => s.transactions);
  const autofillStatus = useOnboardingStore((s) => s.autofillStatus);
  const updateBusiness = useOnboardingStore((s) => s.updateBusiness);
  const updateTransactions = useOnboardingStore((s) => s.updateTransactions);

  const legalName = company.companyName || "your business";
  const tradingName = business.merchantDba || legalName;
  const isLookingUp = autofillStatus === "loading";

  // Default the trading name to the legal name; most merchants trade as
  // themselves and would otherwise retype what we already know.
  useEffect(() => {
    if (!business.merchantDba && company.companyName) {
      updateBusiness({ merchantDba: company.companyName });
    }
  }, [business.merchantDba, company.companyName, updateBusiness]);

  useEffect(() => {
    if (
      business.dbaAddressSameAsRegistered &&
      company.registeredAddress &&
      !business.dbaAddress?.addressLine1
    ) {
      updateBusiness({ dbaAddress: { ...company.registeredAddress } });
    }
  }, [
    business.dbaAddressSameAsRegistered,
    company.registeredAddress,
    business.dbaAddress?.addressLine1,
    updateBusiness,
  ]);

  const sellsInStore =
    business.businessType === "in_store_only" || business.businessType === "both";
  const sellsOnline =
    business.businessType === "online_only" || business.businessType === "both";

  const openingHours = business.inStoreDetails?.openingHours || {};
  const seasonalMonths = business.inStoreDetails?.seasonalMonths || [];

  const patchInStore = (patch: Partial<NonNullable<typeof business.inStoreDetails>>) =>
    updateBusiness({ inStoreDetails: { ...business.inStoreDetails, ...patch } });

  const setAllHours = (field: "open" | "close", value: string) => {
    const hours: Record<string, { open?: string; close?: string; closed?: boolean }> = {};
    for (const day of DAYS) {
      hours[day] = { ...(openingHours[day] || {}), [field]: value };
    }
    patchInStore({ openingHours: hours });
  };

  const setDayHours = (
    day: string,
    field: "open" | "close" | "closed",
    value: string | boolean,
  ) =>
    patchInStore({
      openingHours: { ...openingHours, [day]: { ...openingHours[day], [field]: value } },
    });

  const toggleMonth = (month: number) => {
    const next = seasonalMonths.includes(month)
      ? seasonalMonths.filter((m) => m !== month)
      : [...seasonalMonths, month].sort((a, b) => a - b);
    patchInStore({ seasonalMonths: next });
  };

  const tradingAddress = business.dbaAddressSameAsRegistered
    ? company.registeredAddress
    : business.dbaAddress;

  const productLabel = mccLabel(business.mcc);

  return (
    <>
      {isLookingUp && (
        <p
          aria-live="polite"
          className="is-working rounded-[var(--radius-md)] border border-accent-edge bg-accent-wash px-4 py-3.5 text-base text-ink"
        >
          Still checking public records for {legalName}. Anything we find will
          appear below, so give it a moment before you start typing.
        </p>
      )}

      {/* ── Where and how they trade ────────────────────────────────────── */}
      {/* The address may be the registered one, but the trading name and the
          sales channels are inferred, so the card is tagged by its weakest
          source. A tag exists to say "check this harder", not to take credit. */}
      <ConfirmedFact
        question={`Where does ${legalName} trade?`}
        source="estimated"
        unanswered={!business.businessType}
        unansweredHint="We couldn't work this out from public records, so we need you to tell us."
        fields={
          <>
            <Input
              label="Trading name"
              value={business.merchantDba || ""}
              onChange={(e) => updateBusiness({ merchantDba: e.target.value })}
              helperText="The name customers know you by, if it differs from your registered name"
            />
            <ChoiceChips
              label="How do you sell?"
              layout="stack"
              options={BUSINESS_TYPE_OPTIONS}
              value={business.businessType}
              onChange={(value) => updateBusiness({ businessType: value })}
            />
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-ink">Trading address</p>
              <AddressInput
                autoCompleteSection="trading"
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
                sameAsLabel="Same as our registered address"
                isSameAs={business.dbaAddressSameAsRegistered || false}
                onSameAsChange={(same) => {
                  updateBusiness({ dbaAddressSameAsRegistered: same });
                  if (same && company.registeredAddress) {
                    updateBusiness({ dbaAddress: { ...company.registeredAddress } });
                  }
                }}
              />
            </div>
          </>
        }
      >
        You trade as <Val>{tradingName}</Val>, selling{" "}
        <Val>
          {business.businessType
            ? BUSINESS_TYPE_PHRASE[business.businessType]
            : "in person"}
        </Val>
        {tradingAddress?.addressLine1 && (
          <>
            {" "}from <Val>{shortAddress(tradingAddress)}</Val>
          </>
        )}
        .
      </ConfirmedFact>

      {/* ── What they sell ──────────────────────────────────────────────── */}
      <ConfirmedFact
        question={`What does ${tradingName} sell?`}
        source="estimated"
        unanswered={!business.productsDescription}
        unansweredHint="Describe what a customer actually buys from you. This decides how your payments are categorised."
        fields={
          <>
            <TextArea
              label="What you sell"
              placeholder="Outdoor clothing, camping equipment and cycling accessories, sold from our shop and online."
              maxLength={500}
              value={business.productsDescription || ""}
              onChange={(e) => updateBusiness({ productsDescription: e.target.value })}
              helperText="One or two sentences is plenty"
            />
            <Input
              label="Merchant category code"
              value={business.mcc || ""}
              onChange={(e) =>
                updateBusiness({ mcc: e.target.value.replace(/\D/g, "").slice(0, 4) })
              }
              inputMode="numeric"
              className="max-w-32 font-mono"
              helperText={
                productLabel
                  ? `Card networks read this as "${productLabel}". Leave it unless you know it's wrong.`
                  : "The four-digit code card networks use to classify your trade. Leave it unless you know it's wrong."
              }
            />
          </>
        }
      >
        {productLabel ? (
          <>
            You sell <Val>{productLabel}</Val>
            {business.productsDescription && (
              <>
                , described as <Val>{business.productsDescription}</Val>
              </>
            )}
            .
          </>
        ) : (
          <>
            You describe your business as <Val>{business.productsDescription}</Val>.
          </>
        )}
      </ConfirmedFact>

      {/* ── Websites ────────────────────────────────────────────────────── */}
      {(sellsOnline || business.companyUrl) && (
        <ConfirmedFact
          question="Where do customers find you online?"
          source="estimated"
          unanswered={!business.companyUrl}
          unansweredHint="Your website helps us verify what you sell. If you don't have one, leave it blank."
          fields={
            <>
              <Input
                label="Website"
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://acmesports.co.uk"
                value={business.companyUrl || ""}
                onChange={(e) => updateBusiness({ companyUrl: e.target.value })}
                error={
                  business.companyUrl && !isValidUrl(business.companyUrl)
                    ? "That doesn't look like a web address. It should start with https://"
                    : undefined
                }
              />
              <Input
                label="Where customers pay"
                type="url"
                inputMode="url"
                placeholder="https://shop.acmesports.co.uk"
                value={business.salesUrl || ""}
                onChange={(e) => updateBusiness({ salesUrl: e.target.value })}
                disabled={business.salesUrl === business.companyUrl && !!business.companyUrl}
                error={
                  business.salesUrl && !isValidUrl(business.salesUrl)
                    ? "That doesn't look like a web address. It should start with https://"
                    : undefined
                }
              />
              <Checkbox
                label="Customers pay on the same site"
                checked={
                  !!business.companyUrl && business.salesUrl === business.companyUrl
                }
                onChange={(e) =>
                  updateBusiness({
                    salesUrl: e.target.checked ? business.companyUrl || "" : "",
                  })
                }
              />
            </>
          }
        >
          Customers find you at <Val>{prettyUrl(business.companyUrl)}</Val>
          {business.salesUrl && business.salesUrl !== business.companyUrl && (
            <>
              {" "}and pay at <Val>{prettyUrl(business.salesUrl)}</Val>
            </>
          )}
          .
        </ConfirmedFact>
      )}

      {/* ── Shops, terminals and hours ──────────────────────────────────── */}
      {sellsInStore && (
        <ConfirmedFact
          question="Your shops and opening hours"
          source="estimated"
          unanswered={!business.inStoreDetails?.numberOfLocations}
          unansweredHint="Tell us how many places you trade from and how many card machines you'll need."
          fields={
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Number of locations"
                  type="number"
                  min={1}
                  placeholder="1"
                  value={business.inStoreDetails?.numberOfLocations ?? ""}
                  onChange={(e) =>
                    patchInStore({
                      numberOfLocations: e.target.value
                        ? parseInt(e.target.value, 10)
                        : undefined,
                    })
                  }
                />
                <Input
                  label="Card machines at each one"
                  type="number"
                  min={1}
                  placeholder="1"
                  value={business.inStoreDetails?.terminalsPerLocation ?? ""}
                  onChange={(e) =>
                    patchInStore({
                      terminalsPerLocation: e.target.value
                        ? parseInt(e.target.value, 10)
                        : undefined,
                    })
                  }
                />
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-ink">Opening hours</p>
                <div className="grid max-w-sm grid-cols-2 gap-4">
                  <Input
                    label="Opens"
                    type="time"
                    value={openingHours.monday?.open || "09:00"}
                    onChange={(e) => setAllHours("open", e.target.value)}
                  />
                  <Input
                    label="Closes"
                    type="time"
                    value={openingHours.monday?.close || "17:00"}
                    onChange={(e) => setAllHours("close", e.target.value)}
                  />
                </div>

                <Disclosure summary="My hours differ by day">
                  <div className="flex flex-col gap-2">
                    {DAYS.map((day) => (
                      // Four columns will not fit a 390px viewport, so the day
                      // label takes its own row below sm and the times share one.
                      <div
                        key={day}
                        className="grid grid-cols-[1fr_1fr_auto] items-center gap-x-3 gap-y-1 border-b border-line pb-3 last:border-0 sm:grid-cols-[5.5rem_1fr_1fr_auto] sm:border-0 sm:pb-0"
                      >
                        <span className="col-span-full text-sm font-medium capitalize text-ink sm:col-span-1 sm:font-normal">
                          {day}
                        </span>
                        <input
                          type="time"
                          aria-label={`${day} opening time`}
                          value={openingHours[day]?.open || "09:00"}
                          onChange={(e) => setDayHours(day, "open", e.target.value)}
                          disabled={openingHours[day]?.closed || false}
                          className="h-10 rounded-[var(--radius-sm)] border border-field-line bg-surface px-2.5 text-sm text-ink disabled:bg-surface-sunk disabled:text-ink-subtle"
                        />
                        <input
                          type="time"
                          aria-label={`${day} closing time`}
                          value={openingHours[day]?.close || "17:00"}
                          onChange={(e) => setDayHours(day, "close", e.target.value)}
                          disabled={openingHours[day]?.closed || false}
                          className="h-10 rounded-[var(--radius-sm)] border border-field-line bg-surface px-2.5 text-sm text-ink disabled:bg-surface-sunk disabled:text-ink-subtle"
                        />
                        <Checkbox
                          label="Closed"
                          checked={openingHours[day]?.closed || false}
                          onChange={(e) => setDayHours(day, "closed", e.target.checked)}
                        />
                      </div>
                    ))}
                  </div>
                </Disclosure>

                <Disclosure summary="We only trade certain months of the year">
                  <div className="flex flex-col gap-3">
                    <Checkbox
                      label="This is a seasonal business"
                      checked={business.inStoreDetails?.isSeasonal || false}
                      onChange={(e) =>
                        patchInStore({
                          isSeasonal: e.target.checked,
                          seasonalMonths: e.target.checked ? seasonalMonths : [],
                        })
                      }
                    />
                    {business.inStoreDetails?.isSeasonal && (
                      <fieldset>
                        <legend className="mb-2 text-sm font-medium text-ink">
                          Months you trade
                        </legend>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                          {MONTHS.map((month, index) => {
                            const value = index + 1;
                            const on = seasonalMonths.includes(value);
                            return (
                              <label
                                key={month}
                                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-xs)] border text-sm font-medium transition-colors duration-[var(--dur-tap)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                                  on
                                    ? "border-accent bg-accent text-white"
                                    : "border-line-strong bg-surface text-ink-muted hover:border-accent hover:bg-accent-wash"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={() => toggleMonth(value)}
                                  className="absolute h-0 w-0 opacity-0"
                                />
                                {month.slice(0, 3)}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    )}
                  </div>
                </Disclosure>
              </div>
            </>
          }
        >
          You trade from{" "}
          <Val>
            {business.inStoreDetails?.numberOfLocations ?? 1}{" "}
            {(business.inStoreDetails?.numberOfLocations ?? 1) === 1
              ? "location"
              : "locations"}
          </Val>
          {business.inStoreDetails?.terminalsPerLocation && (
            <>
              {" "}with{" "}
              <Val>
                {business.inStoreDetails.terminalsPerLocation} card{" "}
                {business.inStoreDetails.terminalsPerLocation === 1
                  ? "machine"
                  : "machines"}
              </Val>{" "}
              at each
            </>
          )}
          , open <Val>{openingHours.monday?.open || "09:00"}</Val> to{" "}
          <Val>{openingHours.monday?.close || "17:00"}</Val>
          {business.inStoreDetails?.isSeasonal && seasonalMonths.length > 0 && (
            <>
              {" "}for <Val>{seasonalMonths.length} months of the year</Val>
            </>
          )}
          .
        </ConfirmedFact>
      )}

      {/* ── Expected takings ────────────────────────────────────────────── */}
      <ConfirmedFact
        question="How much do you expect to take on cards?"
        source="estimated"
        unanswered={
          !business.expectedMonthlyVolume &&
          !business.averageTransactionValue &&
          !business.monthlyVolumeLast3Months
        }
        incomplete={!business.expectedMonthlyVolume}
        unansweredHint="A rough range is fine. We use it to size your account, not to hold you to it."
        fields={
          <>
            <ChoiceChips
              label="Have you traded before?"
              options={TRADING_HISTORY_OPTIONS}
              value={business.tradingHistory}
              onChange={(value) => updateBusiness({ tradingHistory: value })}
            />
            {business.tradingHistory === "already_trading" && (
              <Input
                label="Roughly what you've taken monthly on cards"
                placeholder="25000"
                inputMode="numeric"
                leading="£"
                value={business.monthlyVolumeLast3Months || ""}
                onChange={(e) =>
                  updateBusiness({ monthlyVolumeLast3Months: e.target.value })
                }
                helperText="An average over the last three months"
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Expected card takings each month"
                placeholder="Choose a range"
                options={MONTHLY_VOLUME_OPTIONS}
                value={business.expectedMonthlyVolume || ""}
                onChange={(e) =>
                  updateBusiness({
                    expectedMonthlyVolume: e.target
                      .value as typeof business.expectedMonthlyVolume,
                  })
                }
              />
              <Select
                label="Typical sale"
                placeholder="Choose a range"
                options={AVERAGE_TRANSACTION_OPTIONS}
                value={business.averageTransactionValue || ""}
                onChange={(e) =>
                  updateBusiness({
                    averageTransactionValue: e.target
                      .value as typeof business.averageTransactionValue,
                  })
                }
              />
            </div>
          </>
        }
      >
        {business.tradingHistory === "new_business"
          ? "You're just starting out"
          : "You're already trading"}
        {business.expectedMonthlyVolume ? (
          <>
            {" "}and expect{" "}
            <Val>{MONTHLY_VOLUME_PHRASE[business.expectedMonthlyVolume]}</Val>
          </>
        ) : business.monthlyVolumeLast3Months ? (
          <>
            {" "}and take around{" "}
            <Val>£{business.monthlyVolumeLast3Months}</Val> a month on cards
          </>
        ) : null}
        {business.averageTransactionValue && (
          <>
            , with a typical sale{" "}
            <Val>{AVG_TRANSACTION_PHRASE[business.averageTransactionValue]}</Val>
          </>
        )}
        .
      </ConfirmedFact>

      {/* ── Statement descriptor ────────────────────────────────────────── */}
      <ConfirmedFact
        question="What will customers see on their statement?"
        source="estimated"
        unanswered={!transactions.transactionDescriptor}
        unansweredHint="Pick something customers will recognise. Unfamiliar descriptors are the single biggest cause of chargebacks."
        fields={
          <TransactionDescriptorInput
            label="Statement descriptor"
            value={transactions.transactionDescriptor ?? ""}
            onChange={(value) => updateTransactions({ transactionDescriptor: value })}
          />
        }
      >
        Card statements will show{" "}
        <Val>
          <span className="font-mono">{transactions.transactionDescriptor}</span>
        </Val>
        , so your customers know the payment is from you.
      </ConfirmedFact>

      {/* ── Refunds ─────────────────────────────────────────────────────── */}
      <ConfirmedFact
        question="What's your refund policy?"
        source="estimated"
        unanswered={!transactions.refundPolicy}
        unansweredHint="Whatever you already tell customers. We pass this to the acquirer if a payment is ever disputed."
        fields={
          <>
            <Select
              label="Refund policy"
              placeholder="Choose a policy"
              options={REFUND_POLICY_OPTIONS}
              value={transactions.refundPolicy ?? ""}
              onChange={(e) => {
                const value = e.target.value as typeof transactions.refundPolicy;
                updateTransactions({
                  refundPolicy: value,
                  ...(value !== "custom" ? { refundPolicyCustom: "" } : {}),
                });
              }}
            />
            {transactions.refundPolicy === "custom" && (
              <TextArea
                label="Your refund terms"
                placeholder="Unworn items can be returned within 60 days with a receipt. Sale items are exchange only."
                maxLength={500}
                value={transactions.refundPolicyCustom ?? ""}
                onChange={(e) =>
                  updateTransactions({ refundPolicyCustom: e.target.value })
                }
              />
            )}
          </>
        }
      >
        You offer{" "}
        <Val>
          {transactions.refundPolicy === "custom"
            ? transactions.refundPolicyCustom || "your own refund terms"
            : transactions.refundPolicy
              ? REFUND_POLICY_PHRASE[transactions.refundPolicy]
              : ""}
        </Val>
        .
      </ConfirmedFact>

    </>
  );
}
