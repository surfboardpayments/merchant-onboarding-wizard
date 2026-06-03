/**
 * Provider abstraction layer - configurable data enrichment services.
 *
 * Supports Creditsafe or any combination of providers. The system can use
 * one or more providers simultaneously. Each provider implements
 * the same interface so they're interchangeable.
 */

export interface CompanyVerificationResult {
  verified: boolean;
  creditScore?: number;
  creditRating?: string;
  riskLevel?: "low" | "medium" | "high" | "very_high";
  companyStatus?: string;
  registrationDate?: string;
  lastAccountsDate?: string;
  sicCodes?: string[];
  employeeCount?: number;
  turnover?: number;
  rawData?: Record<string, unknown>;
  provider: string;
}

export interface BankValidationResult {
  valid: boolean;
  bankName?: string;
  branchName?: string;
  accountMatch?: boolean;
  sortCodeValid?: boolean;
  accountNumberValid?: boolean;
  rawData?: Record<string, unknown>;
  provider: string;
}

export interface PepSanctionsResult {
  pepMatch: boolean;
  sanctionsMatch: boolean;
  pepDetails?: string[];
  sanctionsDetails?: string[];
  overallRisk: "clear" | "match" | "possible_match" | "error";
  rawData?: Record<string, unknown>;
  provider: string;
}

export interface PersonEnrichmentResult {
  found: boolean;
  directorships?: Array<{
    companyName: string;
    companyNumber: string;
    role: string;
    appointedDate?: string;
  }>;
  rawData?: Record<string, unknown>;
  provider: string;
}

export interface AddressVerificationResult {
  verified: boolean;
  formattedAddress?: string;
  confidence?: number;
  rawData?: Record<string, unknown>;
  provider: string;
}

/**
 * Common interface that all data enrichment providers must implement.
 * Not all methods are required - providers can implement a subset.
 */
export interface DataProvider {
  readonly name: string;
  readonly id: string;

  /** Check if this provider is configured and ready to use */
  isConfigured(): boolean;

  /** Verify and enrich company data */
  verifyCompany?(companyNumber: string): Promise<CompanyVerificationResult>;

  /** Validate bank account details */
  validateBankAccount?(
    sortCode: string,
    accountNumber: string,
    accountName?: string
  ): Promise<BankValidationResult>;

  /** Screen a person against PEP and sanctions lists */
  screenPepSanctions?(
    firstName: string,
    lastName: string,
    dateOfBirth?: string,
    nationality?: string
  ): Promise<PepSanctionsResult>;

  /** Enrich person data (directorships, etc.) */
  enrichPerson?(
    firstName: string,
    lastName: string,
    dateOfBirth?: string
  ): Promise<PersonEnrichmentResult>;

  /** Verify an address */
  verifyAddress?(
    addressLine1: string,
    postcode: string,
    country?: string
  ): Promise<AddressVerificationResult>;
}

/**
 * Configuration for which providers to use for each capability.
 * Multiple providers can be listed - they'll be tried in order,
 * or results merged depending on the mergeStrategy.
 */
export interface ProviderConfig {
  companyVerification: string[];    // Provider IDs in priority order
  bankValidation: string[];
  pepSanctions: string[];
  personEnrichment: string[];
  addressVerification: string[];
  mergeStrategy: "first_success" | "merge_all";
}
