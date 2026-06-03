# Merchant Onboarding Wizard

A web application for collecting UK merchant onboarding data through a guided,
multi-step wizard and submitting it to an acquiring bank or processor via API.
The acquirer performs the actual merchant onboarding, identity checks and KYC
downstream — this app focuses on gathering accurate, structured data and
handing it off cleanly.

Every external integration is optional and key-gated. With no API keys
configured, the app runs fully in a simulation/demo mode, so you can clone it
and explore the entire flow end to end in minutes.

## Features

- Guided six-step onboarding wizard with validation and progress persistence.
- Local progress saved to the browser (Zustand + localStorage) so applicants
  can resume where they left off.
- UK company lookup and officer/PSC data via Companies House (optional).
- Credit check, bank account validation and PEP/sanctions screening via
  Creditsafe (optional).
- Beneficial-owner (UBO) email invites and confirmation emails via Resend
  (optional).
- Optional AI-assisted form autofill via Google AI (server-side only).
- Submission of the completed application to the acquirer (simulated until live
  credentials are provided).
- Demo / test mode that simulates every external dependency for local
  development and demos.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) and [React 19](https://react.dev/)
- TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Zustand](https://zustand-demo.pmnd.rs/) with localStorage persistence
- SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3),
  accessed through a repository pattern
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
  for forms and validation

## Getting started

```bash
git clone https://github.com/surfboardpayments/<repo>.git
cd <repo>
npm install
cp .env.example .env.local
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

No API keys are required to run locally — the app starts in demo mode by
default (see below).

## Demo / test mode

With `NEXT_PUBLIC_TEST_MODE=true` (the default in `.env.example`):

- Outbound emails are displayed on screen instead of being sent.
- The acquirer submission is simulated rather than dispatched to a live
  endpoint.
- Optional data providers fall back to sample data when their keys are unset.

This makes it possible to walk through the complete onboarding flow without any
third-party accounts. Set `NEXT_PUBLIC_TEST_MODE=false` and provide the
relevant credentials to exercise live integrations.

## Configuration

All configuration is via environment variables in `.env.local`. Every
integration is optional; the app simulates anything that is not configured.

| Integration | Purpose | Environment variables |
| --- | --- | --- |
| Core | App behaviour and storage | `NEXT_PUBLIC_TEST_MODE`, `NEXT_PUBLIC_APP_URL`, `DATABASE_PATH` |
| Companies House | UK company search + officer/PSC data | `COMPANIES_HOUSE_API_KEY` |
| Creditsafe | Credit check, bank validation, PEP/sanctions | `CREDITSAFE_API_KEY`, `CREDITSAFE_API_SECRET`, `CREDITSAFE_BASE_URL`, `PROVIDER_COMPANY_VERIFICATION`, `PROVIDER_BANK_VALIDATION`, `PROVIDER_PEP_SANCTIONS`, `PROVIDER_MERGE_STRATEGY` |
| Resend | Transactional email (UBO invites, confirmations) | `RESEND_API_KEY` |
| Google AI | Optional AI-assisted form autofill (server-side) | `GOOGLE_AI_API_KEY` |
| Acquirer | Downstream submission of onboarding data | `ACQUIRER_API_URL`, `ACQUIRER_API_KEY` |

See [`.env.example`](./.env.example) for full descriptions and defaults.

## How it works

The applicant moves through a six-step wizard, then the completed application is
submitted to the acquirer:

1. **Company** — look up the business in Companies House and confirm its
   registered details.
2. **Business** — capture trading details, addresses and business profile.
3. **People** — record directors, owners and beneficial owners (UBOs), with
   optional email invites for owners to provide their own details.
4. **Transactions** — describe expected transaction volumes and profile.
5. **Settlement** — provide bank account details for settlement (with optional
   validation).
6. **Review** — review and confirm the full application.

On submission the structured application is sent to the acquirer, which carries
out the actual onboarding, identity verification and KYC.

## Project structure

```
src/
  app/                Next.js App Router pages and API routes
    api/              Server routes (companies-house, creditsafe, invites, ...)
    onboarding/       The wizard flow
    verify/           UBO self-service detail pages
  components/         UI, wizard steps, forms and review components
    steps/            Step1Company ... Step6Review
  hooks/              Client hooks (autofill, etc.)
  lib/
    db/               SQLite access via a repository pattern
    providers/        Pluggable data-provider registry (e.g. Creditsafe)
    acquirer/        Acquirer submission client
    ai/               Optional AI autofill
    email/            Transactional email
    schemas/          Zod validation schemas
  store/              Zustand store (localStorage persistence)
  types/              Shared TypeScript types
```

## Docker

A `Dockerfile` and `docker-compose.yml` are included. To build and run the app
in a container:

```bash
docker-compose up --build
```

The container persists its SQLite database to a mounted `./data` volume and
reads configuration from `.env.local`.

## Security & deployment notes

This is a reference/demo application. Before exposing it on a public network
with **live** API keys, please note:

- **No built-in authentication or rate limiting.** All API routes are open by
  design for local/demo use. Add authentication and per-IP rate limiting (e.g.
  in `middleware.ts` or at your edge/proxy) before any public deployment,
  especially because the key-gated lookup endpoints can incur third-party API
  costs.
- **Keep secrets out of the repo.** Configuration lives in `.env.local`, which
  is git-ignored. Never commit real keys. `.env.example` ships with empty
  values only.
- **Beneficial-owner invite links** are signed and expire after 7 days; set a
  strong `INVITE_SIGNING_SECRET` in any real deployment.
- Identity verification and KYC are performed **downstream by the acquirer**, not
  by this app.

## License

Released under the [MIT License](./LICENSE). Copyright (c) 2026 Surfboard
Payments.
