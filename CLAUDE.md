# Project: Merchant Onboarding Wizard

A guided wizard that collects UK merchant onboarding data and submits it to the
acquirer, which performs the actual onboarding, ID checks and KYC
downstream. All external integrations are optional and key-gated; with no keys
the app runs in a full simulation/demo mode.

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- Zustand with localStorage persistence for wizard state
- SQLite via better-sqlite3, accessed through a repository pattern (`src/lib/db/`)
- React Hook Form + Zod for forms and validation (`src/lib/schemas/`)

## Demo / test mode

- `NEXT_PUBLIC_TEST_MODE=true` enables demo mode: outbound emails are shown on
  screen instead of sent, and the acquirer submission is simulated.
- Any optional integration whose keys are unset falls back to sample/simulated
  data, so the full flow works with no third-party accounts.
- The Zustand session can always be cleared from the UI. The test-only DB clear
  endpoint lives at `/api/test/clear`.

## Optional, key-gated integrations

- **Companies House** (`COMPANIES_HOUSE_API_KEY`) — UK company search and
  officer/PSC data.
- **Creditsafe** (`CREDITSAFE_API_KEY`, `CREDITSAFE_API_SECRET`,
  `CREDITSAFE_BASE_URL`) — credit check, bank validation, PEP/sanctions.
  Routed via `PROVIDER_*` vars (`PROVIDER_COMPANY_VERIFICATION`,
  `PROVIDER_BANK_VALIDATION`, `PROVIDER_PEP_SANCTIONS`,
  `PROVIDER_MERGE_STRATEGY`).
- **Resend** (`RESEND_API_KEY`) — transactional email for UBO invites and
  confirmations.
- **Google AI** (`GOOGLE_AI_API_KEY`) — optional AI-assisted form autofill,
  server-side only.
- **Acquirer** (`ACQUIRER_API_URL`, `ACQUIRER_API_KEY`) — downstream
  submission target. Simulated when unset or in test mode; the submission
  client is a stub the integrator completes.

See `.env.example` for the full list and defaults.

## Patterns

- **Repository pattern** (`src/lib/db/`): all SQLite access goes through
  repository functions rather than ad-hoc queries.
- **Provider registry** (`src/lib/providers/`): data providers (e.g.
  Creditsafe) implement a shared interface and are selected per capability via
  the `PROVIDER_*` environment variables, so new providers can be added without
  touching call sites.

## Conventions

- Always fix errors you encounter in server logs, console output or network
  requests rather than dismissing them.
- After changing code, verify there are no build/runtime errors and no client
  console errors.
- Keep secrets out of the repo — only `.env.example` (with empty values) is
  committed; real configuration lives in `.env.local`.
