import { NextRequest, NextResponse } from "next/server";
import { validateBankAccount } from "@/lib/providers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sortCode, accountNumber, accountName } = body;

    if (!sortCode || !accountNumber) {
      return NextResponse.json(
        { error: "Sort code and account number are required" },
        { status: 400 }
      );
    }

    const results = await validateBankAccount(
      sortCode,
      accountNumber,
      accountName
    );

    // If no providers configured, return a "skipped" result
    // The UI will still work - it just won't show a verified badge
    if (results.length === 1 && results[0].provider === "none") {
      return NextResponse.json({
        status: "skipped",
        message: "No bank validation providers configured",
        valid: null,
        bankName: null,
      });
    }

    // Use the first successful result
    const primary = results.find((r) => r.valid) || results[0];

    return NextResponse.json({
      status: "completed",
      valid: primary.valid,
      bankName: primary.bankName || null,
      branchName: primary.branchName || null,
      accountMatch: primary.accountMatch ?? null,
      provider: primary.provider,
      allResults: results,
    });
  } catch (error) {
    console.error("Bank validation error:", error);
    return NextResponse.json(
      { error: "Bank validation failed" },
      { status: 500 }
    );
  }
}
