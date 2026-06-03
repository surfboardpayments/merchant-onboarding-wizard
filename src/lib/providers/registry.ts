import type {
  DataProvider,
  ProviderConfig,
  CompanyVerificationResult,
  BankValidationResult,
  PepSanctionsResult,
  PersonEnrichmentResult,
  AddressVerificationResult,
} from "./types";
import { CreditsafeProvider } from "./creditsafe";

/**
 * Provider Registry - manages all data enrichment providers.
 *
 * Use this as the single entry point. It routes requests to the
 * configured providers based on your ProviderConfig.
 *
 * To add a new provider:
 * 1. Create a new file implementing DataProvider
 * 2. Register it in the `providers` map below
 * 3. Add its ID to the relevant config arrays
 */

// ─── All available providers (register new ones here) ───
const providers = new Map<string, DataProvider>();

function initProviders() {
  if (providers.size > 0) return;

  const creditsafe = new CreditsafeProvider();

  providers.set(creditsafe.id, creditsafe);
}

// ─── Default config (change this to control which services are used) ───
// Defaults to EMPTY arrays so the app works with zero providers out of the box.
// Set PROVIDER_* env vars to enable providers (e.g. PROVIDER_COMPANY_VERIFICATION=creditsafe).
const DEFAULT_CONFIG: ProviderConfig = {
  companyVerification: getConfiguredProviders("PROVIDER_COMPANY_VERIFICATION", []),
  bankValidation: getConfiguredProviders("PROVIDER_BANK_VALIDATION", []),
  pepSanctions: getConfiguredProviders("PROVIDER_PEP_SANCTIONS", []),
  personEnrichment: getConfiguredProviders("PROVIDER_PERSON_ENRICHMENT", []),
  addressVerification: getConfiguredProviders("PROVIDER_ADDRESS_VERIFICATION", []),
  mergeStrategy: (process.env.PROVIDER_MERGE_STRATEGY as ProviderConfig["mergeStrategy"]) || "first_success",
};

/**
 * Read provider config from environment variables.
 * Format: PROVIDER_COMPANY_VERIFICATION=creditsafe
 */
function getConfiguredProviders(envKey: string, defaults: string[]): string[] {
  const envValue = process.env[envKey];
  if (!envValue) return defaults;
  return envValue.split(",").map((s) => s.trim().toLowerCase());
}

/**
 * Get configured providers for a capability, filtering to only those
 * that are actually configured (have API keys etc.).
 */
function getActiveProviders(
  providerIds: string[],
  capability: keyof DataProvider
): DataProvider[] {
  initProviders();
  return providerIds
    .map((id) => providers.get(id))
    .filter((p): p is DataProvider =>
      p !== undefined &&
      p.isConfigured() &&
      typeof p[capability] === "function"
    );
}

// ─── Public API ───

export async function verifyCompany(
  companyNumber: string,
  config: ProviderConfig = DEFAULT_CONFIG
): Promise<CompanyVerificationResult[]> {
  const active = getActiveProviders(config.companyVerification, "verifyCompany");

  if (active.length === 0) {
    return [{ verified: false, provider: "none" }];
  }

  if (config.mergeStrategy === "first_success") {
    for (const provider of active) {
      const result = await provider.verifyCompany!(companyNumber);
      if (result.verified) return [result];
    }
    // All failed - return the last result
    const last = await active[active.length - 1].verifyCompany!(companyNumber);
    return [last];
  }

  // merge_all - run all in parallel
  const results = await Promise.all(
    active.map((p) => p.verifyCompany!(companyNumber))
  );
  return results;
}

export async function validateBankAccount(
  sortCode: string,
  accountNumber: string,
  accountName?: string,
  config: ProviderConfig = DEFAULT_CONFIG
): Promise<BankValidationResult[]> {
  const active = getActiveProviders(config.bankValidation, "validateBankAccount");

  if (active.length === 0) {
    return [{ valid: false, provider: "none" }];
  }

  if (config.mergeStrategy === "first_success") {
    for (const provider of active) {
      const result = await provider.validateBankAccount!(
        sortCode,
        accountNumber,
        accountName
      );
      if (result.valid) return [result];
    }
    const last = await active[active.length - 1].validateBankAccount!(
      sortCode,
      accountNumber,
      accountName
    );
    return [last];
  }

  const results = await Promise.all(
    active.map((p) => p.validateBankAccount!(sortCode, accountNumber, accountName))
  );
  return results;
}

export async function screenPepSanctions(
  firstName: string,
  lastName: string,
  dateOfBirth?: string,
  nationality?: string,
  config: ProviderConfig = DEFAULT_CONFIG
): Promise<PepSanctionsResult[]> {
  const active = getActiveProviders(config.pepSanctions, "screenPepSanctions");

  if (active.length === 0) {
    return [{ pepMatch: false, sanctionsMatch: false, overallRisk: "error", provider: "none" }];
  }

  // For compliance, always run ALL configured providers (safety first)
  const results = await Promise.all(
    active.map((p) =>
      p.screenPepSanctions!(firstName, lastName, dateOfBirth, nationality)
    )
  );
  return results;
}

export async function enrichPerson(
  firstName: string,
  lastName: string,
  dateOfBirth?: string,
  config: ProviderConfig = DEFAULT_CONFIG
): Promise<PersonEnrichmentResult[]> {
  const active = getActiveProviders(config.personEnrichment, "enrichPerson");

  if (active.length === 0) {
    return [{ found: false, provider: "none" }];
  }

  if (config.mergeStrategy === "first_success") {
    for (const provider of active) {
      const result = await provider.enrichPerson!(firstName, lastName, dateOfBirth);
      if (result.found) return [result];
    }
    return [{ found: false, provider: active[active.length - 1].id }];
  }

  const results = await Promise.all(
    active.map((p) => p.enrichPerson!(firstName, lastName, dateOfBirth))
  );
  return results;
}

export async function verifyAddress(
  addressLine1: string,
  postcode: string,
  country?: string,
  config: ProviderConfig = DEFAULT_CONFIG
): Promise<AddressVerificationResult[]> {
  const active = getActiveProviders(config.addressVerification, "verifyAddress");

  if (active.length === 0) {
    return [{ verified: false, provider: "none" }];
  }

  if (config.mergeStrategy === "first_success") {
    for (const provider of active) {
      const result = await provider.verifyAddress!(addressLine1, postcode, country);
      if (result.verified) return [result];
    }
    return [{ verified: false, provider: active[active.length - 1].id }];
  }

  const results = await Promise.all(
    active.map((p) => p.verifyAddress!(addressLine1, postcode, country))
  );
  return results;
}

/**
 * Get all registered providers and their configuration status.
 * Useful for admin/debug UI.
 */
export function getProviderStatus(): Array<{
  id: string;
  name: string;
  configured: boolean;
  capabilities: string[];
}> {
  initProviders();
  return Array.from(providers.values()).map((p) => ({
    id: p.id,
    name: p.name,
    configured: p.isConfigured(),
    capabilities: [
      p.verifyCompany && "companyVerification",
      p.validateBankAccount && "bankValidation",
      p.screenPepSanctions && "pepSanctions",
      p.enrichPerson && "personEnrichment",
      p.verifyAddress && "addressVerification",
    ].filter(Boolean) as string[],
  }));
}
