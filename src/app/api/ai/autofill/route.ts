import { NextRequest, NextResponse } from "next/server";
import { autofillWithGemini, type CompanyContext } from "@/lib/ai/gemini";

/**
 * POST /api/ai/autofill
 *
 * Receives company context and returns AI-generated autofill data
 * for the onboarding wizard (Steps 2-5).
 *
 * Returns:
 *  200 — structured autofill data
 *  204 — no useful data returned (AI had nothing to add)
 *  400 — missing required fields
 *  503 — no API key configured
 *  500 — unexpected error
 */
export async function POST(request: NextRequest) {
  // Check API key is configured
  if (!process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json(
      { error: "AI autofill not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.companyName || typeof body.companyName !== "string") {
      return NextResponse.json(
        { error: "companyName is required" },
        { status: 400 },
      );
    }

    const context: CompanyContext = {
      companyName: body.companyName,
      companyNumber: body.companyNumber || undefined,
      sicCodes: Array.isArray(body.sicCodes) ? body.sicCodes : undefined,
      entityType: body.entityType || "limited_company",
      companyType: body.companyType || undefined,
      registeredAddress: body.registeredAddress || undefined,
      dateOfCreation: body.dateOfCreation || undefined,
      people: Array.isArray(body.people) ? body.people : undefined,
      useWebSearch: Boolean(body.useWebSearch),
    };

    const result = await autofillWithGemini(context);

    if (!result) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[AI Autofill] Route error:", err);
    return NextResponse.json(
      { error: "AI autofill failed" },
      { status: 500 },
    );
  }
}
