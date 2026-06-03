import { NextRequest, NextResponse } from "next/server";
import { CreditsafeProvider } from "@/lib/providers/creditsafe";

const CH_API_KEY = process.env.COMPANIES_HOUSE_API_KEY;
const CH_BASE_URL = "https://api.company-information.service.gov.uk";

const authHeader = CH_API_KEY
  ? `Basic ${Buffer.from(`${CH_API_KEY}:`).toString("base64")}`
  : "";

async function fetchFromCH(path: string) {
  const response = await fetch(`${CH_BASE_URL}${path}`, {
    headers: { Authorization: authHeader },
  });
  if (!response.ok) {
    throw new Error(`CH API ${path}: ${response.status}`);
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface CHOfficer {
  name: string;
  name_elements?: {
    title?: string;
    forename?: string;
    other_forenames?: string;
    surname?: string;
  };
  officer_role: string;
  date_of_birth?: { month: number; year: number };
  nationality?: string;
  appointed_on?: string;
  resigned_on?: string;
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
    premises?: string;
  };
}

interface CHPSC {
  name: string;
  name_elements?: {
    title?: string;
    forename?: string;
    middle_name?: string;
    surname?: string;
  };
  kind: string;
  date_of_birth?: { month: number; year: number };
  nationality?: string;
  country_of_residence?: string;
  natures_of_control?: string[];
  notified_on?: string;
  ceased_on?: string;
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
    premises?: string;
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyNumber: string }> }
) {
  const { companyNumber: rawCompanyNumber } = await params;

  // Validate + encode the path segment (defends against path manipulation).
  if (!/^[A-Za-z0-9]{6,8}$/.test(rawCompanyNumber)) {
    return NextResponse.json(
      { error: "Invalid company number" },
      { status: 400 },
    );
  }
  const companyNumber = encodeURIComponent(rawCompanyNumber);

  // ── Companies House (primary when available) ───────────────────────────
  if (CH_API_KEY) {
    try {
      const [profile, officersData, pscsData] = await Promise.all([
        fetchFromCH(`/company/${companyNumber}`),
        fetchFromCH(`/company/${companyNumber}/officers`).catch(() => ({
          items: [],
        })),
        fetchFromCH(
          `/company/${companyNumber}/persons-with-significant-control`
        ).catch(() => ({ items: [] })),
      ]);

      const company = {
        companyNumber: profile.company_number,
        companyName: profile.company_name,
        companyStatus: profile.company_status,
        registeredAddress: normalizeAddress(profile.registered_office_address),
        sicCodes: profile.sic_codes || [],
        dateOfCreation: profile.date_of_creation,
        companyType: profile.type,
        jurisdiction: profile.jurisdiction,
      };

      const officers = (officersData.items || [])
        .filter(
          (o: CHOfficer) =>
            !o.resigned_on &&
            (o.officer_role === "director" || o.officer_role === "secretary")
        )
        .map((o: CHOfficer) => ({
          name: o.name,
          nameElements: {
            title: o.name_elements?.title,
            forename: o.name_elements?.forename,
            otherForenames: o.name_elements?.other_forenames,
            surname: o.name_elements?.surname,
          },
          role: o.officer_role,
          dateOfBirth: o.date_of_birth
            ? { month: o.date_of_birth.month, year: o.date_of_birth.year }
            : null,
          nationality: o.nationality,
          appointedOn: o.appointed_on,
          address: o.address ? normalizeAddress(o.address) : null,
        }));

      const pscs = (pscsData.items || [])
        .filter(
          (p: CHPSC) => !p.ceased_on && p.kind?.includes("individual")
        )
        .map((p: CHPSC) => ({
          name: p.name,
          nameElements: {
            title: p.name_elements?.title,
            forename: p.name_elements?.forename,
            middleName: p.name_elements?.middle_name,
            surname: p.name_elements?.surname,
          },
          dateOfBirth: p.date_of_birth
            ? { month: p.date_of_birth.month, year: p.date_of_birth.year }
            : null,
          nationality: p.nationality,
          countryOfResidence: p.country_of_residence,
          naturesOfControl: p.natures_of_control || [],
          notifiedOn: p.notified_on,
          address: p.address ? normalizeAddress(p.address) : null,
        }));

      return NextResponse.json({ company, officers, pscs, source: "companies_house" });
    } catch (error) {
      console.error("Companies House lookup error:", error);
      // Fall through to Creditsafe
    }
  }

  // ── Creditsafe fallback ────────────────────────────────────────────────
  const creditsafe = new CreditsafeProvider();
  if (creditsafe.isConfigured()) {
    try {
      const report = await creditsafe.getCompanyReport(companyNumber);
      return NextResponse.json({
        ...report,
        source: "creditsafe",
      });
    } catch (error) {
      console.error("Creditsafe company lookup error:", error);
      return NextResponse.json(
        { error: "Failed to lookup company" },
        { status: 500 }
      );
    }
  }

  // ── No provider available ──────────────────────────────────────────────
  return NextResponse.json(
    {
      error:
        "No company lookup provider configured. Set COMPANIES_HOUSE_API_KEY or CREDITSAFE credentials.",
    },
    { status: 503 }
  );
}

function normalizeAddress(addr: {
  address_line_1?: string;
  address_line_2?: string;
  locality?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  premises?: string;
}) {
  if (!addr) return null;
  return {
    addressLine1: [addr.premises, addr.address_line_1]
      .filter(Boolean)
      .join(", "),
    addressLine2: addr.address_line_2 || "",
    locality: addr.locality || "",
    region: addr.region || "",
    postalCode: addr.postal_code || "",
    country: addr.country || "United Kingdom",
  };
}
