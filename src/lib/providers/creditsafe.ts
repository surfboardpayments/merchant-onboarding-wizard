import type {
  DataProvider,
  CompanyVerificationResult,
  BankValidationResult,
  PepSanctionsResult,
} from "./types";

/**
 * Creditsafe provider implementation.
 * https://www.creditsafe.com/
 *
 * Authentication: username (email) + password -> JWT token
 * Endpoints:
 *   POST /authenticate
 *   GET  /companies?countries=GB&...
 *   GET  /companies/{id}
 *   POST /bankVerification
 *   POST /compliance/search
 */
export class CreditsafeProvider implements DataProvider {
  readonly name = "Creditsafe";
  readonly id = "creditsafe";

  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.apiKey = process.env.CREDITSAFE_API_KEY || "";
    this.apiSecret = process.env.CREDITSAFE_API_SECRET || "";
    this.baseUrl =
      process.env.CREDITSAFE_BASE_URL || "https://connect.creditsafe.com/v1";
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }

  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(`${this.baseUrl}/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.apiKey,
        password: this.apiSecret,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Creditsafe auth failed: ${response.status} ${text}`
      );
    }

    const data = await response.json();
    this.accessToken = data.token;
    // Token typically valid for 1 hour, refresh at 50 mins
    this.tokenExpiry = Date.now() + 50 * 60 * 1000;
    return this.accessToken!;
  }

  private async fetchWithAuth(path: string, options?: RequestInit) {
    const token = await this.authenticate();
    return fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  // ─── Company Search (name or number) ───────────────────────────────────

  async searchCompanies(
    query: string
  ): Promise<
    Array<{
      companyNumber: string;
      companyName: string;
      companyStatus: string;
      companyType: string;
      addressSnippet: string;
      dateOfCreation: string;
      creditsafeId: string;
    }>
  > {
    // Detect if query looks like a company number (all digits, 6-8 chars)
    const isNumber = /^\d{6,8}$/.test(query.trim());

    const params = new URLSearchParams({
      countries: "GB",
      pageSize: "10",
    });

    if (isNumber) {
      params.set("regNo", query.trim());
    } else {
      params.set("name", query.trim());
    }

    const response = await this.fetchWithAuth(`/companies?${params}`);

    if (!response.ok) {
      throw new Error(`Creditsafe search failed: ${response.status}`);
    }

    const data = await response.json();
    const companies = data.companies || [];

    return companies.map(
      (c: {
        id: string;
        regNo?: string;
        name?: string;
        status?: string;
        type?: string;
        officeType?: string;
        address?: {
          simpleValue?: string;
          street?: string;
          city?: string;
          postCode?: string;
        };
        dateOfLatestChange?: string;
        dateOfIncorporation?: string;
      }) => ({
        companyNumber: c.regNo || "",
        companyName: c.name || "",
        companyStatus: (c.status || "").toLowerCase().includes("active")
          ? "active"
          : (c.status || "unknown").toLowerCase(),
        companyType: c.type || c.officeType || "ltd",
        addressSnippet:
          c.address?.simpleValue ||
          [c.address?.street, c.address?.city, c.address?.postCode]
            .filter(Boolean)
            .join(", "),
        dateOfCreation: c.dateOfIncorporation || "",
        creditsafeId: c.id,
      })
    );
  }

  // ─── Full Company Report (with directors) ──────────────────────────────

  async getCompanyReport(companyIdOrNumber: string): Promise<{
    company: {
      companyNumber: string;
      companyName: string;
      companyStatus: string;
      registeredAddress: {
        addressLine1: string;
        addressLine2: string;
        locality: string;
        region: string;
        postalCode: string;
        country: string;
      } | null;
      sicCodes: string[];
      dateOfCreation: string;
      companyType: string;
      jurisdiction: string;
    };
    officers: Array<{
      name: string;
      nameElements: {
        title?: string;
        forename?: string;
        otherForenames?: string;
        surname?: string;
      };
      role: string;
      dateOfBirth: { month: number; year: number } | null;
      nationality: string | null;
      appointedOn: string | null;
      address: {
        addressLine1: string;
        addressLine2: string;
        locality: string;
        region: string;
        postalCode: string;
        country: string;
      } | null;
    }>;
    pscs: Array<{
      name: string;
      nameElements: {
        title?: string;
        forename?: string;
        middleName?: string;
        surname?: string;
      };
      dateOfBirth: { month: number; year: number } | null;
      nationality: string | null;
      countryOfResidence: string | null;
      naturesOfControl: string[];
      notifiedOn: string | null;
      address: {
        addressLine1: string;
        addressLine2: string;
        locality: string;
        region: string;
        postalCode: string;
        country: string;
      } | null;
    }>;
    creditCheck: {
      creditScore?: number;
      creditRating?: string;
      riskLevel?: "low" | "medium" | "high" | "very_high";
    };
  }> {
    // First search by regNo to get Creditsafe internal ID
    const searchResponse = await this.fetchWithAuth(
      `/companies?countries=GB&regNo=${encodeURIComponent(companyIdOrNumber)}&pageSize=1`
    );

    if (!searchResponse.ok) {
      const body = await searchResponse.text().catch(() => "");
      console.error(`Creditsafe search error body:`, body);
      throw new Error(`Creditsafe search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const companies = searchData.companies || [];

    if (companies.length === 0) {
      throw new Error(`Company ${companyIdOrNumber} not found in Creditsafe`);
    }

    const csId = companies[0].id;
    const searchCompany = companies[0];

    // Try to get full company report (may fail with 403 on some plans)
    let r: Record<string, unknown> | null = null;
    try {
      const reportResponse = await this.fetchWithAuth(`/companies/${csId}`);
      if (reportResponse.ok) {
        const report = await reportResponse.json();
        r = report.report || report;
      } else {
        console.warn(
          `Creditsafe full report returned ${reportResponse.status} for ${csId} — using search data`
        );
      }
    } catch (err) {
      console.warn("Creditsafe full report fetch error:", err);
    }

    // Use a safe accessor helper to avoid null crashes when report is unavailable (403)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpt = (r || {}) as Record<string, any>;

    // Extract company info - use report if available, otherwise fall back to search data
    const companyInfo = rpt.companySummary || rpt.companyIdentification || {};
    const contactInfo = rpt.contactInformation;
    const addr = companyInfo.mainAddress || contactInfo?.mainAddress || searchCompany.address || {};

    // Extract directors (only available when full report succeeds)
    const rawDirectors = rpt.directors?.currentDirectors || [];
    const directors = rawDirectors.map(
      (d: {
        name?: string;
        firstName?: string;
        surname?: string;
        title?: string;
        directorType?: string;
        dateOfBirth?: string;
        nationality?: string;
        address?: {
          simpleValue?: string;
          street?: string;
          city?: string;
          postCode?: string;
          country?: string;
        };
        positionDateAppointed?: string;
      }) => {
        // Parse name parts
        const firstName = d.firstName || "";
        const surname = d.surname || d.name?.split(",")[0]?.trim() || "";

        // Parse date of birth
        let dob: { month: number; year: number } | null = null;
        if (d.dateOfBirth) {
          const parts = d.dateOfBirth.split("-");
          if (parts.length >= 2) {
            dob = {
              year: parseInt(parts[0]),
              month: parseInt(parts[1]),
            };
          }
        }

        return {
          name: d.name || `${surname}, ${firstName}`,
          nameElements: {
            title: d.title,
            forename: firstName,
            surname: surname,
          },
          role: (d.directorType || "director").toLowerCase(),
          dateOfBirth: dob,
          nationality: d.nationality || null,
          appointedOn: d.positionDateAppointed || null,
          address: d.address
            ? {
                addressLine1: d.address.street || d.address.simpleValue || "",
                addressLine2: "",
                locality: d.address.city || "",
                region: "",
                postalCode: d.address.postCode || "",
                country: d.address.country || "United Kingdom",
              }
            : null,
        };
      }
    );

    // Extract shareholding / PSCs (only available when full report succeeds)
    const rawShareholders = rpt.shareCapitalStructure?.shareholders || [];
    const shareholders = rawShareholders.map(
      (s: {
        name?: string;
        firstName?: string;
        surname?: string;
        title?: string;
        shareType?: string;
        percentSharesHeld?: number;
        currency?: string;
      }) => {
        const firstName = s.firstName || "";
        const surname = s.surname || s.name || "";

        // Map share percentage to CH-style nature of control
        const pct = s.percentSharesHeld || 0;
        let naturesOfControl: string[] = [];
        if (pct >= 75) naturesOfControl = ["ownership-of-shares-75-to-100-percent"];
        else if (pct >= 50) naturesOfControl = ["ownership-of-shares-50-to-75-percent"];
        else if (pct >= 25) naturesOfControl = ["ownership-of-shares-25-to-50-percent"];

        return {
          name: `${firstName} ${surname}`.trim(),
          nameElements: {
            title: s.title,
            forename: firstName,
            surname: surname,
          },
          dateOfBirth: null,
          nationality: null,
          countryOfResidence: null,
          naturesOfControl,
          notifiedOn: null,
          address: null,
        };
      }
    );

    // Extract credit info (only available when full report succeeds)
    const creditRating = rpt.creditScore?.currentCreditRating;

    return {
      company: {
        companyNumber: companyInfo.companyRegistrationNumber || searchCompany.regNo || companyIdOrNumber,
        companyName: companyInfo.businessName || searchCompany.name || "",
        companyStatus: (companyInfo.companyStatus?.status || searchCompany.status || "active").toLowerCase(),
        registeredAddress: {
          addressLine1: addr.street || addr.simpleValue || "",
          addressLine2: "",
          locality: addr.city || "",
          region: addr.province || "",
          postalCode: addr.postCode || "",
          country: addr.country || "United Kingdom",
        },
        sicCodes: (rpt.companySummary?.principalActivity?.industryClassifications || [])
          .map((ic: { code?: string }) => ic.code)
          .filter(Boolean) as string[],
        dateOfCreation: companyInfo.companyRegistrationDate || searchCompany.dateOfIncorporation || "",
        companyType: companyInfo.legalForm || searchCompany.type || "ltd",
        jurisdiction: "england-wales",
      },
      officers: directors,
      pscs: shareholders.filter(
        (s: { naturesOfControl: string[] }) => s.naturesOfControl.length > 0
      ),
      creditCheck: {
        creditScore: creditRating?.score,
        creditRating: creditRating?.description,
        riskLevel: mapCreditScoreToRisk(creditRating?.score),
      },
    };
  }

  // ─── Company Verification ──────────────────────────────────────────────

  async verifyCompany(
    companyNumber: string
  ): Promise<CompanyVerificationResult> {
    try {
      const searchResponse = await this.fetchWithAuth(
        `/companies?countries=GB&regNo=${encodeURIComponent(companyNumber)}&pageSize=1`
      );

      if (!searchResponse.ok) {
        throw new Error(`Creditsafe search failed: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      const companies = searchData.companies || [];

      if (companies.length === 0) {
        return { verified: false, provider: this.id };
      }

      const csCompanyId = companies[0].id;
      const searchCompany = companies[0];

      // Try full report — may return 403 on some plans
      let company: Record<string, unknown> | null = null;
      try {
        const reportResponse = await this.fetchWithAuth(
          `/companies/${csCompanyId}`
        );
        if (reportResponse.ok) {
          const report = await reportResponse.json();
          company = report.report || report;
        } else {
          console.warn(
            `Creditsafe report returned ${reportResponse.status} for ${csCompanyId} — using search data for verification`
          );
        }
      } catch (err) {
        console.warn("Creditsafe report fetch error during verification:", err);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rpt = (company || {}) as Record<string, any>;

      return {
        verified: true,
        creditScore: rpt.creditScore?.currentCreditRating?.score,
        creditRating: rpt.creditScore?.currentCreditRating?.description,
        riskLevel: mapCreditScoreToRisk(
          rpt.creditScore?.currentCreditRating?.score
        ),
        companyStatus: rpt.companySummary?.companyStatus?.status || searchCompany.status,
        registrationDate:
          rpt.companySummary?.companyRegistrationDate || searchCompany.dateOfIncorporation,
        lastAccountsDate: rpt.companySummary?.lastAccountsDate,
        employeeCount: rpt.companySummary?.numberOfEmployees,
        rawData: company || searchCompany,
        provider: this.id,
      };
    } catch (error) {
      console.error("Creditsafe verifyCompany error:", error);
      return { verified: false, provider: this.id };
    }
  }

  // ─── Bank Validation ───────────────────────────────────────────────────

  async validateBankAccount(
    sortCode: string,
    accountNumber: string,
    accountName?: string
  ): Promise<BankValidationResult> {
    try {
      const cleanSortCode = sortCode.replace(/-/g, "");

      const response = await this.fetchWithAuth("/bankVerification", {
        method: "POST",
        body: JSON.stringify({
          sortCode: cleanSortCode,
          accountNumber,
          accountName: accountName || undefined,
          country: "GB",
        }),
      });

      if (!response.ok) {
        throw new Error(`Creditsafe bank validation failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        valid: data.valid || data.isValid || false,
        bankName: data.bankName || data.institutionName,
        branchName: data.branchName,
        accountMatch: data.nameMatch || undefined,
        sortCodeValid: data.sortCodeValid || true,
        accountNumberValid: data.accountNumberValid || data.valid,
        rawData: data,
        provider: this.id,
      };
    } catch (error) {
      console.error("Creditsafe validateBankAccount error:", error);
      return { valid: false, provider: this.id };
    }
  }

  // ─── PEP / Sanctions Screening ─────────────────────────────────────────

  async screenPepSanctions(
    firstName: string,
    lastName: string,
    dateOfBirth?: string,
    nationality?: string
  ): Promise<PepSanctionsResult> {
    try {
      const response = await this.fetchWithAuth("/compliance/search", {
        method: "POST",
        body: JSON.stringify({
          firstName,
          lastName,
          dateOfBirth: dateOfBirth || undefined,
          nationality: nationality || undefined,
          datasets: ["PEP", "SAN"],
          country: "GB",
        }),
      });

      if (!response.ok) {
        throw new Error(`Creditsafe PEP/sanctions failed: ${response.status}`);
      }

      const data = await response.json();
      const hits = data.hits || data.results || [];

      const pepHits = hits.filter(
        (h: { dataset?: string }) => h.dataset === "PEP"
      );
      const sanctionHits = hits.filter(
        (h: { dataset?: string }) => h.dataset === "SAN"
      );

      return {
        pepMatch: pepHits.length > 0,
        sanctionsMatch: sanctionHits.length > 0,
        pepDetails: pepHits.map(
          (h: { name?: string; position?: string }) =>
            `${h.name} - ${h.position}`
        ),
        sanctionsDetails: sanctionHits.map(
          (h: { name?: string; list?: string }) =>
            `${h.name} - ${h.list}`
        ),
        overallRisk:
          sanctionHits.length > 0
            ? "match"
            : pepHits.length > 0
              ? "possible_match"
              : "clear",
        rawData: data,
        provider: this.id,
      };
    } catch (error) {
      console.error("Creditsafe screenPepSanctions error:", error);
      return {
        pepMatch: false,
        sanctionsMatch: false,
        overallRisk: "error",
        provider: this.id,
      };
    }
  }
}

function mapCreditScoreToRisk(
  score?: number
): "low" | "medium" | "high" | "very_high" {
  if (!score) return "medium";
  if (score >= 71) return "low";
  if (score >= 41) return "medium";
  if (score >= 21) return "high";
  return "very_high";
}
