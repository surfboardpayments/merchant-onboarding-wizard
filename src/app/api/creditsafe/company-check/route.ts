import { NextRequest, NextResponse } from "next/server";
import { verifyCompany } from "@/lib/providers";

export async function GET(request: NextRequest) {
  const companyNumber = request.nextUrl.searchParams.get("companyNumber");

  if (!companyNumber) {
    return NextResponse.json(
      { error: "Company number is required" },
      { status: 400 }
    );
  }

  try {
    const results = await verifyCompany(companyNumber);

    // If no providers were configured, return a "skipped" result
    if (results.length === 1 && results[0].provider === "none") {
      return NextResponse.json({
        status: "skipped",
        message: "No company verification providers configured",
        results: [],
      });
    }

    return NextResponse.json({
      status: "completed",
      results,
    });
  } catch (error) {
    console.error("Company check error:", error);
    return NextResponse.json(
      { error: "Company verification failed" },
      { status: 500 }
    );
  }
}
