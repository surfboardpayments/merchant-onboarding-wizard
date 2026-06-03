import type { OnboardingState } from "@/store/onboardingStore";

/**
 * Acquirer submission client.
 *
 * This wizard COLLECTS merchant onboarding data; the completed application is
 * handed off to the acquirer via API, and the acquirer performs the actual
 * onboarding, identity checks and KYC downstream.
 *
 * Configure with environment variables:
 *   ACQUIRER_API_URL   — the boarding endpoint to POST applications to
 *   ACQUIRER_API_KEY   — bearer token / API key issued by the acquirer
 *
 * When those are not set (or in test mode) the submission is SIMULATED so the
 * wizard can be demoed end-to-end without live credentials. Replace the
 * `buildAcquirerPayload` mapping and request shape with Acquirer's actual
 * boarding contract when integrating for real.
 */

export interface AcquirerSubmissionResult {
  ok: boolean;
  simulated: boolean;
  httpStatus: number;
  /** Reference returned by the acquirer for the boarding request, if any. */
  acquirerReference?: string;
  /** Parsed error details when the submission was rejected. */
  error?: string;
  raw?: unknown;
}

export interface AcquirerConfig {
  apiUrl: string;
  apiKey: string;
  configured: boolean;
}

export function getAcquirerConfig(): AcquirerConfig {
  const apiUrl = process.env.ACQUIRER_API_URL || "";
  const apiKey = process.env.ACQUIRER_API_KEY || "";
  return { apiUrl, apiKey, configured: Boolean(apiUrl && apiKey) };
}

/**
 * Map the collected application into the payload sent to the acquirer.
 *
 * This is intentionally a faithful, vendor-neutral projection of the data we
 * collected. Adjust field names/structure to match Acquirer's boarding API
 * once their specification is available.
 */
export function buildAcquirerPayload(
  application: OnboardingState & { contactEmail?: string; contactPhone?: string },
  meta: { referenceNumber: string; submittedAt: string },
) {
  return {
    reference: meta.referenceNumber,
    submittedAt: meta.submittedAt,
    contact: {
      email: application.contactEmail,
      phone: application.contactPhone,
    },
    company: application.company,
    business: application.business,
    people: application.people,
    corporateShareholders: application.corporateShareholders,
    transactions: application.transactions,
    settlement: application.settlement,
    outletSales: application.outletSales,
    outletDelivery: application.outletDelivery,
    consent: application.consent,
  };
}

/**
 * Submit a built payload to the acquirer. Simulates success when not configured.
 */
export async function submitToAcquirer(
  payload: ReturnType<typeof buildAcquirerPayload>,
  options: { simulate?: boolean } = {},
): Promise<AcquirerSubmissionResult> {
  const cfg = getAcquirerConfig();

  // Simulate when explicitly requested, or when no live credentials exist.
  if (options.simulate || !cfg.configured) {
    return {
      ok: true,
      simulated: true,
      httpStatus: 200,
      acquirerReference: `SIM-${payload.reference}`,
    };
  }

  try {
    const response = await fetch(cfg.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      /* leave parsed as raw text */
    }

    if (!response.ok) {
      return {
        ok: false,
        simulated: false,
        httpStatus: response.status,
        error: `Acquirer rejected the application (HTTP ${response.status})`,
        raw: parsed,
      };
    }

    const ref =
      (parsed as { reference?: string; id?: string } | undefined)?.reference ??
      (parsed as { id?: string } | undefined)?.id;

    return {
      ok: true,
      simulated: false,
      httpStatus: response.status,
      acquirerReference: ref,
      raw: parsed,
    };
  } catch (err) {
    return {
      ok: false,
      simulated: false,
      httpStatus: 0,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
