import { NextRequest, NextResponse } from "next/server";
import { screenPepSanctions } from "@/lib/providers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, dateOfBirth, nationality } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const results = await screenPepSanctions(
      firstName,
      lastName,
      dateOfBirth,
      nationality
    );

    // If no providers configured, return a "skipped" result
    if (results.length === 1 && results[0].provider === "none") {
      return NextResponse.json({
        status: "skipped",
        message: "No PEP/sanctions screening providers configured",
        overallRisk: null,
      });
    }

    // For compliance: if ANY provider flags a match, report it
    const hasAnyPepMatch = results.some((r) => r.pepMatch);
    const hasSanctionsMatch = results.some((r) => r.sanctionsMatch);
    const worstRisk = hasSanctionsMatch
      ? "match"
      : hasAnyPepMatch
        ? "possible_match"
        : "clear";

    return NextResponse.json({
      status: "completed",
      pepMatch: hasAnyPepMatch,
      sanctionsMatch: hasSanctionsMatch,
      overallRisk: worstRisk,
      providers: results.map((r) => r.provider),
      allResults: results,
    });
  } catch (error) {
    console.error("PEP/sanctions screening error:", error);
    return NextResponse.json(
      { error: "PEP/sanctions screening failed" },
      { status: 500 }
    );
  }
}
