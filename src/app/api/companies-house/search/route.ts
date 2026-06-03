import { NextRequest, NextResponse } from "next/server";
import { CreditsafeProvider } from "@/lib/providers/creditsafe";

const CH_API_KEY = process.env.COMPANIES_HOUSE_API_KEY;
const CH_BASE_URL = "https://api.company-information.service.gov.uk";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 }
    );
  }

  // ── Companies House (primary when available) ───────────────────────────
  if (CH_API_KEY) {
    try {
      const response = await fetch(
        `${CH_BASE_URL}/search/companies?q=${encodeURIComponent(query)}&items_per_page=10`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${CH_API_KEY}:`).toString("base64")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Companies House API error: ${response.status}`);
      }

      const data = await response.json();

      const results = (data.items || []).map(
        (item: {
          company_number: string;
          title: string;
          company_status: string;
          company_type: string;
          address_snippet: string;
          date_of_creation: string;
        }) => ({
          companyNumber: item.company_number,
          companyName: item.title,
          companyStatus: item.company_status,
          companyType: item.company_type,
          addressSnippet: item.address_snippet,
          dateOfCreation: item.date_of_creation,
        })
      );

      return NextResponse.json({ results, source: "companies_house" });
    } catch (error) {
      console.error("Companies House search error:", error);
      // Fall through to Creditsafe
    }
  }

  // ── Creditsafe fallback ────────────────────────────────────────────────
  const creditsafe = new CreditsafeProvider();
  if (creditsafe.isConfigured()) {
    try {
      const results = await creditsafe.searchCompanies(query);
      return NextResponse.json({ results, source: "creditsafe" });
    } catch (error) {
      console.error("Creditsafe search error:", error);
      return NextResponse.json(
        { error: "Company search failed" },
        { status: 500 }
      );
    }
  }

  // ── No provider available ──────────────────────────────────────────────
  return NextResponse.json(
    {
      error:
        "No company search provider configured. Set COMPANIES_HOUSE_API_KEY or CREDITSAFE credentials.",
    },
    { status: 503 }
  );
}
