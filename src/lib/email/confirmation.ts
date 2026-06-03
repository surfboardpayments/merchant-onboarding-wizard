interface ConfirmationEmailData {
  companyName?: string;
  referenceNumber: string;
  contactEmail?: string;
  contactPhone?: string;
  submittedAt: string;
  baseUrl?: string;
}

/** Escape user-supplied values before interpolating into email HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderConfirmationEmail(data: ConfirmationEmailData): string {
  const submittedDate = new Date(data.submittedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const companyName = data.companyName ? escapeHtml(data.companyName) : "";
  const referenceNumber = escapeHtml(data.referenceNumber);

  return `
    <div style="font-family: 'Fira Sans', Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <div style="padding: 32px 0; border-bottom: 1px solid #e5e5e5;">
        <strong style="font-size: 18px;">Surfboard Payments</strong>
      </div>
      <div style="padding: 32px 0;">
        <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 12px;">
          Application Received
        </h1>
        <p style="color: #737373; font-size: 15px; line-height: 1.6;">
          Thank you for submitting your merchant application${companyName ? ` for <strong>${companyName}</strong>` : ""}.
          We've received your application and our team will begin reviewing it shortly.
        </p>

        <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="color: #737373; font-size: 13px; margin: 0 0 4px;">Reference number</p>
          <p style="font-family: monospace; font-size: 20px; font-weight: 600; margin: 0; letter-spacing: 1px;">
            ${referenceNumber}
          </p>
          <p style="color: #a3a3a3; font-size: 12px; margin: 8px 0 0;">
            Submitted on ${submittedDate}
          </p>
        </div>

        <h2 style="font-size: 16px; font-weight: 600; margin: 24px 0 12px;">What happens next?</h2>
        <ol style="color: #737373; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li>Our team reviews your application (1-3 business days)</li>
          <li>We complete any remaining identity checks</li>
          <li>Once approved, we set up your merchant account</li>
          <li>You start accepting payments through Surfboard</li>
        </ol>

        <p style="color: #a3a3a3; font-size: 13px; margin-top: 24px;">
          If you have any questions, reply to this email or contact our support team.
        </p>
      </div>${data.baseUrl ? `
      <div style="border-top: 1px solid #e5e5e5; padding: 24px 0; text-align: center;">
        <a href="${data.baseUrl}/onboarding/confirmation?ref=${data.referenceNumber}"
           style="display: inline-block; background: #f5f5f5; color: #0a0a0a;
                  padding: 10px 24px; border-radius: 8px; text-decoration: none;
                  font-weight: 500; font-size: 14px;">
          Check application status &rarr;
        </a>
      </div>` : ""}
    </div>
  `;
}
