import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getRepository } from "@/lib/db";
import { isTestMode } from "@/lib/utils/testMode";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, personId, personName, personEmail, companyName } =
      body;

    if (!personEmail || !personName) {
      return NextResponse.json(
        { error: "Person email and name are required" },
        { status: 400 },
      );
    }

    // Generate a secure token
    const token = crypto.randomUUID();
    const hmac = crypto
      .createHmac("sha256", process.env.INVITE_SIGNING_SECRET || "default-secret")
      .update(`${token}:${applicationId}:${personId}`)
      .digest("hex")
      .slice(0, 12);

    const inviteToken = `${token}-${hmac}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.origin}`;
    const inviteUrl = `${baseUrl}/verify/${inviteToken}`;

    // Escape user-supplied values before interpolating into the email HTML.
    const escapeHtml = (v: string) =>
      v
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const firstName = escapeHtml(String(personName).split(" ")[0] || "");
    const safeCompanyName = escapeHtml(String(companyName || ""));

    // Render the email HTML
    const emailHtml = `
      <div style="font-family: 'Fira Sans', Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="padding: 32px 0; border-bottom: 1px solid #e5e5e5;">
          <strong style="font-size: 18px;">Surfboard Payments</strong>
        </div>
        <div style="padding: 32px 0;">
          <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 12px;">
            Hi ${firstName},
          </h1>
          <p style="color: #737373; font-size: 15px; line-height: 1.6;">
            <strong>${safeCompanyName}</strong> is setting up payments with Surfboard.
            As a director or beneficial owner, we need a few details from you to
            complete the application. This takes about 2-3 minutes.
          </p>
          <div style="padding: 24px 0;">
            <a href="${inviteUrl}"
               style="display: inline-block; background: #0a0a0a; color: #ffffff;
                      padding: 12px 28px; border-radius: 8px; text-decoration: none;
                      font-weight: 500; font-size: 15px;">
              Complete My Details
            </a>
          </div>
          <p style="color: #a3a3a3; font-size: 13px;">
            This link expires on ${expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
            If you have any questions, contact the person who invited you.
          </p>
        </div>
        <div style="border-top: 1px solid #e5e5e5; padding: 24px 0; text-align: center;">
          <a href="${baseUrl}/onboarding/confirmation?ref=${applicationId}"
             style="color: #737373; font-size: 13px; text-decoration: none;">
            Check application status &rarr;
          </a>
        </div>
      </div>
    `;

    // Build person data for the invite (used when the UBO opens the link)
    const personData = JSON.stringify({
      firstName: personName.split(" ")[0] || "",
      lastName: personName.split(" ").slice(1).join(" ") || "",
      companyName: companyName || "",
    });

    // Persist the invite to the database
    const repo = getRepository();
    repo.createInvite({
      token: inviteToken,
      applicationId: applicationId || "",
      personId: personId || "",
      personName,
      personEmail,
      companyName: companyName || "",
      personData,
      emailHtml,
      expiresAt: expiresAt.toISOString(),
    });

    // Send email via Resend (if configured and not in test mode)
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey && !isTestMode()) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Surfboard Payments <onboarding@surfboardpayments.com>",
          to: [personEmail],
          subject: `${companyName} - Identity Verification Required`,
          html: emailHtml,
        }),
      });
    } else {
      console.log(`[INVITE] Invite URL: ${inviteUrl}`);
    }

    return NextResponse.json({
      success: true,
      token: inviteToken,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
      ...(isTestMode() ? { emailHtml, testMode: true } : {}),
    });
  } catch (error) {
    console.error("Invite send error:", error);
    return NextResponse.json(
      { error: "Failed to send invite" },
      { status: 500 },
    );
  }
}
