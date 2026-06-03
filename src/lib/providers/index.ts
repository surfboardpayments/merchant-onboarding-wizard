/**
 * Provider abstraction - configurable data enrichment services.
 *
 * Usage in API routes:
 *   import { verifyCompany, validateBankAccount, screenPepSanctions } from "@/lib/providers";
 *
 * Configuration via environment variables:
 *   PROVIDER_COMPANY_VERIFICATION=creditsafe         (comma-separated provider IDs)
 *   PROVIDER_BANK_VALIDATION=creditsafe
 *   PROVIDER_PEP_SANCTIONS=creditsafe
 *   PROVIDER_PERSON_ENRICHMENT=creditsafe
 *   PROVIDER_ADDRESS_VERIFICATION=creditsafe
 *   PROVIDER_MERGE_STRATEGY=first_success           (or "merge_all")
 *
 * Adding a new provider:
 *   1. Create a new file implementing the DataProvider interface
 *   2. Register it in registry.ts
 *   3. Add its ID to the relevant PROVIDER_* env vars
 */

export {
  verifyCompany,
  validateBankAccount,
  screenPepSanctions,
  enrichPerson,
  verifyAddress,
  getProviderStatus,
} from "./registry";

export type {
  DataProvider,
  ProviderConfig,
  CompanyVerificationResult,
  BankValidationResult,
  PepSanctionsResult,
  PersonEnrichmentResult,
  AddressVerificationResult,
} from "./types";
