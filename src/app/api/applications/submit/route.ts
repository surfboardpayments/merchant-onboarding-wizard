import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getRepository } from "@/lib/db";
import { renderConfirmationEmail } from "@/lib/email/confirmation";
import { isTestMode } from "@/lib/utils/testMode";
import {
  buildAcquirerPayload,
  submitToAcquirer,
  getAcquirerConfig,
} from "@/lib/acquirer/client";
import type { OnboardingState } from "@/store/onboardingStore";

export async function POST(request: NextRequest) {
  try {
    const application = (await request.json()) as OnboardingState & {
      contactEmail?: string;
      contactPhone?: string;
    };

    if (
      !application.company?.companyNumber ||
      !application.people?.length ||
      !application.settlement?.sortCode
    ) {
      return NextResponse.json(
        { error: "Incomplete application data" },
        { status: 400 },
      );
    }

    const repo = getRepository();
    const applicationId = application.id || crypto.randomUUID();
    const referenceNumber = generateReferenceNumber();
    const submittedAt = new Date().toISOString();

    // Render confirmation email
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.origin}`;
    const confirmationEmailHtml = renderConfirmationEmail({
      companyName: application.company?.companyName,
      referenceNumber,
      contactEmail: application.contactEmail,
      contactPhone: application.contactPhone,
      submittedAt,
      baseUrl,
    });

    // Persist the application locally
    repo.createApplication({
      id: applicationId,
      referenceNumber,
      data: JSON.stringify(application),
      status: "submitted",
      confirmationEmailHtml,
      submittedAt,
    });

    // Build the Acquirer payload and submit (or simulate)
    const payload = buildAcquirerPayload(application, {
      referenceNumber,
      submittedAt,
    });
    const result = await submitToAcquirer(payload, {
      simulate: isTestMode(),
    });

    repo.appendAuditLog({
      id: crypto.randomUUID(),
      applicationId,
      actor: "system",
      action: "submit",
      details: JSON.stringify({
        referenceNumber,
        simulated: result.simulated,
        httpStatus: result.httpStatus,
        ok: result.ok,
        acquirerReference: result.acquirerReference,
      }),
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          referenceNumber,
          error: result.error || "Acquirer rejected the application",
          raw: result.raw,
        },
        { status: 400 },
      );
    }

    // Send confirmation email (no-op in test mode / without an email key)
    await sendConfirmationEmail(
      application.contactEmail,
      application.company?.companyName,
      confirmationEmailHtml,
    );

    const liveConfigured = getAcquirerConfig().configured;
    return NextResponse.json({
      success: true,
      referenceNumber,
      acquirerReference: result.acquirerReference,
      message: result.simulated
        ? "Application accepted (simulation mode)"
        : "Application submitted to the acquirer",
      submittedToAcquirer: liveConfigured && !result.simulated,
      ...(isTestMode() ? { confirmationEmailHtml, testMode: true } : {}),
    });
  } catch (error) {
    console.error("Application submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 },
    );
  }
}

async function sendConfirmationEmail(
  to: string | undefined,
  companyName: string | undefined,
  html: string,
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey || !to || isTestMode()) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Surfboard Payments <onboarding@surfboardpayments.com>",
        to: [to],
        subject: `Application Received${companyName ? ` - ${companyName}` : ""}`,
        html,
      }),
    });
  } catch (err) {
    console.error("Failed to send confirmation email:", err);
  }
}

function generateReferenceNumber(): string {
  const prefix = "SB";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
