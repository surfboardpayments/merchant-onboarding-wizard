/**
 * Gemini Flash AI client for merchant onboarding auto-fill.
 *
 * This is a cross-cutting AI enrichment layer — NOT a verification provider.
 * It researches a company and returns structured data to pre-fill the
 * onboarding wizard (Steps 2-5).
 *
 * Model: gemini-flash-latest (auto-updating alias)
 * Endpoint: Google AI Generative Language API v1beta
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompanyContext {
  companyName: string;
  companyNumber?: string;
  sicCodes?: string[];
  entityType: "limited_company" | "sole_trader" | "partnership";
  companyType?: string; // CH-reported (e.g. "ltd", "llp", "charitable-incorporated-organisation")
  registeredAddress?: {
    addressLine1?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
  dateOfCreation?: string;
  /** Names + natures of control of PSCs / directors that Companies House returned. */
  people?: Array<{
    firstName?: string;
    lastName?: string;
    role?: string;
    naturesOfControl?: string[];
  }>;
  /** Enable Google Search grounding for richer results (sole traders, unknown companies). */
  useWebSearch?: boolean;
}

export interface AutofillResult {
  // Step 1 extras — Company
  company?: {
    vatNumber?: string;
    charityNumber?: string;
  };
  // Step 2 — Business Details
  business?: {
    merchantDba?: string;
    dbaAddressSameAsRegistered?: boolean;
    companyUrl?: string;
    salesUrl?: string;
    businessType?: "online_only" | "in_store_only" | "both";
    productsDescription?: string;
    mcc?: string;
    tradingHistory?: "already_trading" | "new_business";
    expectedMonthlyVolume?: "under_10k" | "10k_50k" | "50k_100k" | "100k_plus";
    averageTransactionValue?: "under_25" | "25_50" | "50_100" | "100_250" | "250_plus";
    /** Exact annual turnover in GBP (cards + cash). */
    annualTurnover?: number;
    /** Exact annual card turnover in GBP. */
    annualCardTurnover?: number;
    /** Estimated average ticket value in GBP. */
    estAvgTicket?: number;
    inStoreDetails?: {
      numberOfLocations?: number;
      terminalsPerLocation?: number;
      isSeasonal?: boolean;
      seasonalMonths?: number[];
    };
  };
  // Step 2 extras — Outlet splits (must each total 100)
  outletSales?: { ftf: number; internet: number; moto: number };
  outletDelivery?: {
    d0: number;
    d1to7: number;
    d8to14: number;
    d15to30: number;
    dOver30: number;
  };
  // Step 3 extras — per-person signing/ownership fields (keyed by first+last name)
  people?: Array<{
    firstName?: string;
    lastName?: string;
    signatoryType?: "SINGLE_SIGNATORY" | "CO_SIGNATORY" | "NONE";
    ownershipPercentage?: number; // 0..100
  }>;
  // Step 4 — Transactions
  transactions?: {
    transactionDescriptor?: string;
    refundPolicy?: "full_refund" | "partial_refund" | "no_refunds" | "custom";
  };
  // Step 5 — Settlement
  settlement?: {
    nameOnAccount?: string;
    bankCity?: string;
    bankAccountType?: "BUSINESS" | "PERSONAL";
  };
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a data enrichment assistant for a UK merchant payment onboarding system.

Given a UK company's details (name, number, SIC codes, address, incorporation date, optional list of directors/PSCs with natures of control), research the company and return structured data to pre-fill the merchant's onboarding form.

IMPORTANT:
- Fill in AS MANY fields as possible. The merchant will review and edit — a reasonable estimate beats a blank field.
- DO NOT fabricate: VAT numbers, IBANs, BIC codes, charity numbers, personal addresses, or any government-issued ID.
- Only return a VAT number if it can be read off a known public source (company website, Companies House name if suffix contains "VAT Reg"). Otherwise omit.
- URLs must start with https://. Only include if you are confident.

RETURN SHAPE (all fields optional, omit rather than guess blind):
{
  "company": { "vatNumber": ..., "charityNumber": ... },
  "business": { merchantDba, dbaAddressSameAsRegistered, companyUrl, salesUrl, businessType, productsDescription, mcc, tradingHistory, expectedMonthlyVolume, averageTransactionValue, annualTurnover, annualCardTurnover, estAvgTicket, inStoreDetails },
  "outletSales": { ftf, internet, moto },       // each 0..100, must total 100
  "outletDelivery": { d0, d1to7, d8to14, d15to30, dOver30 }, // totals 100; for online businesses
  "people": [ { firstName, lastName, signatoryType, ownershipPercentage } ],
  "transactions": { transactionDescriptor, refundPolicy },
  "settlement": { nameOnAccount, bankCity, bankAccountType }
}

RULES:
1. merchantDba: ALWAYS fill. Strip "Ltd", "Limited", "PLC", "LLP" suffixes. Keep "The" prefix if part of brand.
2. dbaAddressSameAsRegistered: ALWAYS fill. Default true unless you know the trading address differs.
3. companyUrl / salesUrl: only if confident.
4. businessType: ALWAYS fill. Retail/hospitality → "both" or "in_store_only"; SaaS/digital → "online_only"; professional services → "online_only"; uncertain → "both".
5. productsDescription: ALWAYS fill. 1-2 sentences.
6. mcc: ALWAYS fill — 4-digit Mastercard MCC. 62xxx→5734/7372; 56xxx→5812/5814; 47xxx→5411/5311/5999; 96xxx→7299; 86xxx→8099; 74xxx→7392.
7. tradingHistory: ALWAYS fill. dateOfCreation > 6 months → "already_trading", else "new_business". Default "already_trading" if unknown.
8. expectedMonthlyVolume / averageTransactionValue: ALWAYS fill. Conservative estimates. Small/unknown → "under_10k" / "25_50".
9. annualTurnover / annualCardTurnover / estAvgTicket (all GBP integers): ALWAYS fill.
   - annualTurnover must be >=1000 and consistent with expectedMonthlyVolume × 12 (use the MID of the band).
   - annualCardTurnover must be <= annualTurnover and consistent with businessType (online/online-heavy → close to annualTurnover; in-store only → 60-85% of annualTurnover).
   - estAvgTicket in GBP — map from averageTransactionValue band (25_50 → 35, 50_100 → 70, 100_250 → 160, 250_plus → 350, under_25 → 15).
10. outletSales: ALWAYS fill. Must total 100.
   - online_only → { ftf: 0, internet: 100, moto: 0 }
   - in_store_only → { ftf: 100, internet: 0, moto: 0 }
   - both → split based on industry (e.g. retail-with-web { ftf: 70, internet: 25, moto: 5 }; SaaS with phone sales { ftf: 0, internet: 85, moto: 15 })
11. outletDelivery: Only fill if outletSales.internet + outletSales.moto > 0. Must total 100.
   - Digital/SaaS/instant fulfilment → { d0: 100, d1to7: 0, d8to14: 0, d15to30: 0, dOver30: 0 }
   - Physical goods e-commerce → { d0: 10, d1to7: 80, d8to14: 10, d15to30: 0, dOver30: 0 }
   - Made-to-order/furniture → { d0: 0, d1to7: 10, d8to14: 30, d15to30: 40, dOver30: 20 }
12. transactionDescriptor: ALWAYS fill. MAX 22 chars, UPPERCASE, letters/numbers/spaces/asterisks only.
13. refundPolicy: ALWAYS fill. Retail → "full_refund"; services → "partial_refund"; digital/SaaS → "full_refund".
14. nameOnAccount: ALWAYS fill. Full legal company name (sole trader: the trading name).
15. bankCity: Fill only for a clear head-office city already present in the registered address. Otherwise omit.
16. bankAccountType: ALWAYS fill. Limited/LLP/partnership/trust → "BUSINESS"; sole trader → "PERSONAL".
17. inStoreDetails: Only if businessType includes in-store. numberOfLocations defaults 1; terminalsPerLocation 1 (busy retail 2). isSeasonal false unless clearly seasonal.
18. company.charityNumber: fill ONLY for a registered charity AND if you can read the registered charity number off a known source. Otherwise omit.
19. people[]: ALWAYS fill one entry per person in the input, keyed by firstName+lastName.
    - signatoryType: If only one person → "SINGLE_SIGNATORY". If the person has "ownership-of-shares-over-25-percent" or is the sole director → "SINGLE_SIGNATORY". Others in a multi-person company → "CO_SIGNATORY" unless they look like a silent shareholder (naturesOfControl only mentions shares, no voting rights → "NONE").
    - ownershipPercentage: Infer from naturesOfControl.
      * "ownership-of-shares-75-to-100-percent" → 88
      * "ownership-of-shares-50-to-75-percent" → 62
      * "ownership-of-shares-25-to-50-percent" → 37
      * No ownership nature listed → 0
      * Sole director/PSC without natures hint → 100
      * If multiple people and percentages don't sum near 100, scale proportionally so total is <= 100.

Return ONLY valid JSON matching the shape above. No markdown, no commentary.`;

// ---------------------------------------------------------------------------
// Sanitiser — validates enums and truncates strings
// ---------------------------------------------------------------------------

const VALID_BUSINESS_TYPE = new Set(["online_only", "in_store_only", "both"]);
const VALID_TRADING_HISTORY = new Set(["already_trading", "new_business"]);
const VALID_MONTHLY_VOLUME = new Set(["under_10k", "10k_50k", "50k_100k", "100k_plus"]);
const VALID_AVG_TXN_VALUE = new Set(["under_25", "25_50", "50_100", "100_250", "250_plus"]);
const VALID_REFUND_POLICY = new Set(["full_refund", "partial_refund", "no_refunds", "custom"]);
const VALID_SIGNATORY = new Set(["SINGLE_SIGNATORY", "CO_SIGNATORY", "NONE"]);
const VALID_AML_BANK = new Set(["BUSINESS", "PERSONAL"]);

function clampInt(n: unknown, min: number, max: number): number | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function normalizePctSplit<K extends string>(
  raw: unknown,
  keys: readonly K[],
): Record<K, number> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const src = raw as Record<string, unknown>;
  const values: Record<string, number> = {};
  let total = 0;
  for (const k of keys) {
    const v = Number(src[k]);
    const safe = Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
    values[k] = safe;
    total += safe;
  }
  if (total === 0) return undefined;
  // Scale to 100; allocate rounding remainder to the largest bucket
  const scaled: Record<string, number> = {};
  let scaledTotal = 0;
  for (const k of keys) {
    const v = Math.round((values[k] * 100) / total);
    scaled[k] = v;
    scaledTotal += v;
  }
  const diff = 100 - scaledTotal;
  if (diff !== 0) {
    const biggest = keys.reduce((a, b) => (scaled[a] >= scaled[b] ? a : b));
    scaled[biggest] = Math.max(0, scaled[biggest] + diff);
  }
  return scaled as Record<K, number>;
}

function sanitizeResult(raw: Record<string, unknown>): AutofillResult {
  const result: AutofillResult = {};

  // Gemini may return nested { business: {...}, transactions: {...} } or flat
  // Detect flat format and restructure
  const isFlat = !raw.business && (raw.merchantDba || raw.businessType || raw.mcc || raw.productsDescription);
  const biz: Record<string, unknown> | undefined = isFlat
    ? raw  // flat format — treat whole object as business fields
    : (raw.business as Record<string, unknown> | undefined);
  const txnSource: Record<string, unknown> | undefined = isFlat
    ? raw
    : (raw.transactions as Record<string, unknown> | undefined);
  const stlSource: Record<string, unknown> | undefined = isFlat
    ? raw
    : (raw.settlement as Record<string, unknown> | undefined);
  const companySource = raw.company as Record<string, unknown> | undefined;
  const outletSalesSource = raw.outletSales as Record<string, unknown> | undefined;
  const outletDeliverySource = raw.outletDelivery as Record<string, unknown> | undefined;
  const peopleSource = raw.people;

  // -- Company extras --
  if (companySource && typeof companySource === "object") {
    const comp: NonNullable<AutofillResult["company"]> = {};
    if (
      typeof companySource.vatNumber === "string" &&
      /^[A-Z0-9]{4,15}$/.test(companySource.vatNumber.toUpperCase())
    ) {
      comp.vatNumber = companySource.vatNumber.toUpperCase();
    }
    if (
      typeof companySource.charityNumber === "string" &&
      /^[A-Z0-9]{4,15}$/.test(companySource.charityNumber.toUpperCase())
    ) {
      comp.charityNumber = companySource.charityNumber.toUpperCase();
    }
    if (Object.keys(comp).length) result.company = comp;
  }

  // -- Business --
  if (biz && typeof biz === "object") {
    result.business = {};

    if (typeof biz.merchantDba === "string" && biz.merchantDba.trim()) {
      result.business.merchantDba = biz.merchantDba.trim().slice(0, 100);
    }
    if (typeof biz.dbaAddressSameAsRegistered === "boolean") {
      result.business.dbaAddressSameAsRegistered = biz.dbaAddressSameAsRegistered;
    }
    if (typeof biz.companyUrl === "string" && biz.companyUrl.startsWith("http")) {
      result.business.companyUrl = biz.companyUrl.trim().slice(0, 200);
    }
    if (typeof biz.salesUrl === "string" && biz.salesUrl.startsWith("http")) {
      result.business.salesUrl = biz.salesUrl.trim().slice(0, 200);
    }
    if (typeof biz.businessType === "string" && VALID_BUSINESS_TYPE.has(biz.businessType)) {
      result.business.businessType = biz.businessType as AutofillResult["business"] extends undefined ? never : NonNullable<AutofillResult["business"]>["businessType"];
    }
    if (typeof biz.productsDescription === "string" && biz.productsDescription.trim()) {
      result.business.productsDescription = biz.productsDescription.trim().slice(0, 500);
    }
    if (typeof biz.mcc === "string" && /^\d{4}$/.test(biz.mcc)) {
      result.business.mcc = biz.mcc;
    }
    if (typeof biz.tradingHistory === "string" && VALID_TRADING_HISTORY.has(biz.tradingHistory)) {
      result.business.tradingHistory = biz.tradingHistory as "already_trading" | "new_business";
    }
    if (typeof biz.expectedMonthlyVolume === "string" && VALID_MONTHLY_VOLUME.has(biz.expectedMonthlyVolume)) {
      result.business.expectedMonthlyVolume = biz.expectedMonthlyVolume as "under_10k" | "10k_50k" | "50k_100k" | "100k_plus";
    }
    if (typeof biz.averageTransactionValue === "string" && VALID_AVG_TXN_VALUE.has(biz.averageTransactionValue)) {
      result.business.averageTransactionValue = biz.averageTransactionValue as "under_25" | "25_50" | "50_100" | "100_250" | "250_plus";
    }

    // Exact turnover numbers (GBP, integers)
    const annualTurn = clampInt(biz.annualTurnover, 1000, 999_999_999);
    if (annualTurn !== undefined) result.business.annualTurnover = annualTurn;
    const cardTurn = clampInt(biz.annualCardTurnover, 0, 999_999_999);
    if (cardTurn !== undefined) {
      // Ensure card turnover never exceeds total turnover
      const ceiling = result.business.annualTurnover ?? cardTurn;
      result.business.annualCardTurnover = Math.min(cardTurn, ceiling);
    }
    const avgTicket = clampInt(biz.estAvgTicket, 1, 99_999);
    if (avgTicket !== undefined) result.business.estAvgTicket = avgTicket;

    // In-store details
    const inStore = biz.inStoreDetails as Record<string, unknown> | undefined;
    if (inStore && typeof inStore === "object") {
      const details: NonNullable<NonNullable<AutofillResult["business"]>["inStoreDetails"]> = {};
      if (typeof inStore.numberOfLocations === "number" && inStore.numberOfLocations > 0) {
        details.numberOfLocations = Math.round(inStore.numberOfLocations);
      }
      if (typeof inStore.terminalsPerLocation === "number" && inStore.terminalsPerLocation > 0) {
        details.terminalsPerLocation = Math.round(inStore.terminalsPerLocation);
      }
      if (typeof inStore.isSeasonal === "boolean") {
        details.isSeasonal = inStore.isSeasonal;
      }
      if (Array.isArray(inStore.seasonalMonths)) {
        details.seasonalMonths = inStore.seasonalMonths
          .filter((m: unknown) => typeof m === "number" && m >= 1 && m <= 12)
          .map((m: number) => Math.round(m));
      }
      if (Object.keys(details).length > 0) {
        result.business.inStoreDetails = details;
      }
    }

    // Remove empty business object
    if (Object.keys(result.business).length === 0) {
      delete result.business;
    }
  }

  // -- Transactions --
  const txn = txnSource;
  if (txn && typeof txn === "object") {
    result.transactions = {};

    if (typeof txn.transactionDescriptor === "string" && txn.transactionDescriptor.trim()) {
      // Max 22 chars, uppercase, strip non-alphanumeric except spaces and asterisks
      result.transactions.transactionDescriptor = txn.transactionDescriptor
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9 *]/g, "")
        .slice(0, 22);
    }
    if (typeof txn.refundPolicy === "string" && VALID_REFUND_POLICY.has(txn.refundPolicy)) {
      result.transactions.refundPolicy = txn.refundPolicy as "full_refund" | "partial_refund" | "no_refunds" | "custom";
    }

    if (Object.keys(result.transactions).length === 0) {
      delete result.transactions;
    }
  }

  // -- Settlement --
  const stl = stlSource;
  if (stl && typeof stl === "object") {
    result.settlement = {};

    if (typeof stl.nameOnAccount === "string" && stl.nameOnAccount.trim()) {
      result.settlement.nameOnAccount = stl.nameOnAccount.trim().slice(0, 100);
    }
    if (typeof stl.bankCity === "string" && stl.bankCity.trim()) {
      result.settlement.bankCity = stl.bankCity.trim().slice(0, 80);
    }
    if (
      typeof stl.bankAccountType === "string" &&
      VALID_AML_BANK.has(stl.bankAccountType)
    ) {
      result.settlement.bankAccountType =
        stl.bankAccountType as "BUSINESS" | "PERSONAL";
    }

    if (Object.keys(result.settlement).length === 0) {
      delete result.settlement;
    }
  }

  // -- Outlet sales split (must total 100) --
  const sales = normalizePctSplit(outletSalesSource, [
    "ftf",
    "internet",
    "moto",
  ] as const);
  if (sales) result.outletSales = sales;

  // -- Outlet delivery split --
  const delivery = normalizePctSplit(outletDeliverySource, [
    "d0",
    "d1to7",
    "d8to14",
    "d15to30",
    "dOver30",
  ] as const);
  if (delivery) result.outletDelivery = delivery;

  // -- Per-person fields --
  if (Array.isArray(peopleSource)) {
    const cleaned: NonNullable<AutofillResult["people"]> = [];
    for (const p of peopleSource) {
      if (!p || typeof p !== "object") continue;
      const entry = p as Record<string, unknown>;
      const first =
        typeof entry.firstName === "string" ? entry.firstName.trim() : undefined;
      const last =
        typeof entry.lastName === "string" ? entry.lastName.trim() : undefined;
      if (!first && !last) continue;
      const row: NonNullable<AutofillResult["people"]>[number] = {
        firstName: first,
        lastName: last,
      };
      if (
        typeof entry.signatoryType === "string" &&
        VALID_SIGNATORY.has(entry.signatoryType)
      ) {
        row.signatoryType = entry.signatoryType as
          | "SINGLE_SIGNATORY"
          | "CO_SIGNATORY"
          | "NONE";
      }
      const pct = clampInt(entry.ownershipPercentage, 0, 100);
      if (pct !== undefined) row.ownershipPercentage = pct;
      cleaned.push(row);
    }
    if (cleaned.length) result.people = cleaned;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Count filled fields
// ---------------------------------------------------------------------------

export function countFilledFields(result: AutofillResult): number {
  let count = 0;
  if (result.company) {
    count += Object.values(result.company).filter(
      (v) => v !== undefined && v !== null && v !== "",
    ).length;
  }
  if (result.business) {
    for (const [key, val] of Object.entries(result.business)) {
      if (key === "inStoreDetails" && val && typeof val === "object") {
        count += Object.keys(val).length;
      } else if (val !== undefined && val !== null && val !== "") {
        count++;
      }
    }
  }
  if (result.outletSales) count += 3;
  if (result.outletDelivery) count += 5;
  if (result.people) {
    for (const p of result.people) {
      if (p.signatoryType) count++;
      if (typeof p.ownershipPercentage === "number") count++;
    }
  }
  if (result.transactions) {
    count += Object.values(result.transactions).filter((v) => v !== undefined && v !== null && v !== "").length;
  }
  if (result.settlement) {
    count += Object.values(result.settlement).filter((v) => v !== undefined && v !== null && v !== "").length;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function autofillWithGemini(
  context: CompanyContext,
): Promise<AutofillResult | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.warn("[Gemini] No GOOGLE_AI_API_KEY — skipping AI autofill");
    return null;
  }

  const userPromptParts: (string | null)[] = [
    `Company: ${context.companyName}`,
    context.companyNumber
      ? `${context.entityType === "sole_trader" ? "UTR" : "Company Number"}: ${context.companyNumber}`
      : null,
    context.entityType ? `Entity Type: ${context.entityType}` : null,
    context.companyType ? `CH companyType: ${context.companyType}` : null,
    context.sicCodes?.length ? `SIC Codes: ${context.sicCodes.join(", ")}` : null,
    context.registeredAddress
      ? `Address: ${[context.registeredAddress.addressLine1, context.registeredAddress.city, context.registeredAddress.postcode].filter(Boolean).join(", ")}`
      : null,
    context.dateOfCreation ? `Incorporated: ${context.dateOfCreation}` : null,
  ];

  if (context.people?.length) {
    userPromptParts.push(
      "",
      "Directors / PSCs (use these exact names in the people[] response):",
    );
    for (const p of context.people) {
      const nm = [p.firstName, p.lastName].filter(Boolean).join(" ") || "(unnamed)";
      const nc = p.naturesOfControl?.length
        ? ` — natures of control: ${p.naturesOfControl.join("; ")}`
        : "";
      const role = p.role ? ` [${p.role}]` : "";
      userPromptParts.push(`  - ${nm}${role}${nc}`);
    }
  }

  const filtered = userPromptParts.filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );

  // For sole traders, add explicit instruction to search the web
  if (context.entityType === "sole_trader") {
    filtered.push(
      "",
      "This is a SOLE TRADER business. Search the web for this business name to find their website, social media, and what services/products they offer. Use the search results to fill in as many fields as possible, especially companyUrl, productsDescription, businessType, and mcc.",
    );
  } else if (context.useWebSearch) {
    // Limited-data branch (Creditsafe-only, missing SIC/officers/etc.)
    filtered.push(
      "",
      "NOTE: Companies House is not available so we only have partial data (no SIC codes, no officers/PSCs). Use Google Search to look up this company and infer as much as you can from public sources (website, Companies House public profile, news articles). Still follow the RETURN SHAPE exactly.",
    );
  }

  const userPrompt = filtered.join("\n");

  // Determine if we need web search grounding
  // Sole traders and companies with limited data benefit from Google Search
  const needsWebSearch =
    context.useWebSearch ||
    context.entityType === "sole_trader" ||
    (!context.sicCodes?.length && !context.companyNumber);

  // When using Google Search, we can't use responseMimeType (controlled generation).
  // Instead, we rely on the system prompt to get JSON back and extract it manually.
  const generationConfig: Record<string, unknown> = {
    temperature: 0.1,
    maxOutputTokens: 2048,
    // The flash alias now points at a reasoning model, whose thinking tokens
    // count against maxOutputTokens and roughly triple latency. This is a
    // lookup-and-format job, not a reasoning one, so keep thinking minimal.
    thinkingConfig: { thinkingLevel: "low" },
  };

  if (!needsWebSearch) {
    generationConfig.responseMimeType = "application/json";
  }

  const body: Record<string, unknown> = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig,
  };

  // Enable Google Search grounding when we have limited structured data
  if (needsWebSearch) {
    body.tools = [{ googleSearch: {} }];
  }

  // Web-search-grounded calls need time for the search as well as generation.
  // Autofill is fire-and-forget in the background, so a generous ceiling costs
  // the merchant nothing while a tight one throws away the whole result.
  // Declared outside the try so the abort handler can name it.
  const timeoutMs = needsWebSearch ? 30000 : 12000;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(
      // The auto-updating alias, as documented at the top of this file. The
      // pinned gemini-2.0-flash it had drifted to is retired and returns 404,
      // which made autofill fail silently and fill nothing.
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`[Gemini] API returned ${response.status}: ${errText.slice(0, 200)}`);
      return null;
    }

    const data = await response.json();

    // Extract the generated text
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.warn("[Gemini] No text in response");
      return null;
    }

    // When using Google Search (no controlled generation), the response may
    // include markdown fences or extra text. Extract JSON from it.
    let jsonText = text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }

    const parsed = JSON.parse(jsonText);
    const result = sanitizeResult(parsed);

    const fieldCount = countFilledFields(result);
    console.log(`[Gemini] Auto-fill returned ${fieldCount} fields for "${context.companyName}"`);

    return fieldCount > 0 ? result : null;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`[Gemini] Request timed out after ${timeoutMs}ms`);
    } else {
      console.error("[Gemini] Autofill error:", err);
    }
    return null;
  }
}
