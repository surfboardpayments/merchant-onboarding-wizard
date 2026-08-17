# PRODUCT.md

Context for design work on the Surfboard Payments merchant onboarding wizard.
Sourced from https://www.surfboardpayments.com/brand.md and the project CLAUDE.md.

## Register

`product`

Design serves the task. This is an authenticated-adjacent application surface, not a
marketing page. The one deliberate exception: the wizard frame is brand-forward
(Deep Sea Blue ground) because it is the first product surface a new merchant ever
touches and it has to feel like Surfboard, not like a generic KYC form.

## Product purpose

A guided wizard that collects UK merchant onboarding (KYB) data and submits it to the
acquirer, which performs the actual onboarding, ID checks and KYC downstream.

The wizard does not decide anything. It *collects*, and the quality bar is measured in
completion rate: every abandoned application is a merchant who never processes a
payment through Surfboard.

## Users

**Primary: the UK business owner or director signing up.**

- A shop owner, salon owner, restaurateur, small e-commerce operator, or the finance
  lead at a small software company.
- Fills this in once, ever. Zero learned familiarity with the interface.
- Not a compliance professional. Does not know what a PSC, UBO, MCC, or transaction
  descriptor is, and should not have to.
- Sat at a back-office laptop between other work. Interrupted, impatient, and mildly
  wary about handing over bank details and directors' dates of birth to a payments
  company they only just signed with.
- Reads the *shape* of the form before reading a single label. A wall of empty inputs
  and a six-dot progress bar reads as "this will take an hour" and they close the tab.

**Secondary: an invited co-owner or UBO.**

- Arrives cold via an emailed link, with no context beyond "someone at your company
  asked you to confirm your details."
- Needs the shortest possible path and a clear reason to trust the page.

## Product principles

1. **Ask nothing we can already look up.** Companies House, Creditsafe and the AI
   autofill already know the company name, registered address, SIC codes, directors,
   PSCs, incorporation date, website, and a plausible description of what the business
   sells. Every one of those rendered as an empty input is a self-inflicted wound.
2. **Show retrieved data as prose, not as form state.** A sentence the user reads and
   corrects ("Acme Ltd sells sporting goods from 4 High Street") costs a glance. The
   same data in eleven labelled inputs costs a form-filling session. Same fields, same
   payload, a fraction of the perceived work.
3. **Perceived length is the conversion lever.** Fewer, fatter steps beat many thin
   ones. Never show a step counter that implies more work than remains.
4. **Confidence is the emotional target.** The merchant should finish thinking "they
   already knew who I was", not "I survived that".
5. **Regulatory completeness is non-negotiable.** Shortening the flow means changing
   how data is presented and confirmed, never which data is collected. The submitted
   payload does not shrink.
6. **Editable always.** Nothing prefilled is ever locked. Every retrieved value has a
   visible, one-click path to correction, and correcting it is a first-class action,
   not an escape hatch.

## Brand

**Surfboard Payments** (legal entity Surfboard Payments AB). Second reference:
"Surfboard". Never "SurfBoard", "Surf Board", or lowercase outside URLs.

Swedish payment institution, founded 2019, Stockholm, licensed by Finansinspektionen.
White-label payment infrastructure for software companies: one API for in-store
terminals, Tap to Pay, and online checkout.

### Palette

| Name | Hex | Role |
|---|---|---|
| Deep Sea Blue | `#010927` | Primary ground, dark surfaces, body text on light |
| Ocean Blue | `#0E44E1` | Brand blue, links, primary actions on light |
| Coral Green | `#00FFA7` | Accent, primary buttons on dark, success. Never as text on white |
| Light Blue | `#D5DFF7` | Secondary prose on dark, pale ground |
| White | `#FFFFFF` | Light ground, primary text on dark |
| Deep Blue Sea | `#092793` | Gradients, layered dark surfaces |
| Signal Yellow | `#FFD93B` | Warnings only |
| Signal Red | `#F01C55` | Errors and declines only |
| Signal Orange | `#FF965F` | Editorial accent, never status |

Balance roughly 70% ground / 20% type / 10% accent.

Banned: Coral Green text on white (1.3:1), Ocean Blue text on Deep Sea Blue (2.7:1),
yellow/red/orange as decoration, neon glow, purple gradient bleed, crypto aesthetics.

### Typography

- Display and headings: **Space Grotesk** (400/500/600/700). Also buttons and large type.
- Body, UI labels, tables, captions: **Inter** (400/500/600/700).
- Code, API payloads, metadata labels in caps: **Space Mono** (400/700).
- Letter-spacing ~-0.02em at heading sizes, ~-0.045em at display sizes.
- Sentence case for headlines. Title Case for product names only.

### Logo

Fetch supplied SVGs; never redraw the surfer mark. Reversed lockup on dark grounds.
Clear space equal to the height of the surfer mark. Minimum 120px lockup / 24px mark.

## Voice and tone

- Plain and specific. Name the thing, give the number, move on.
- Confident without superlatives. Proof is in detail, not adjective.
- Short sentences, one idea each.
- Address the merchant directly and use their actual company name in questions. "Are
  you authorised to sign agreements for Acme Ltd?" beats "Signatory authority".
- Translate compliance jargon inline. "Ultimate beneficial owner" gets a plain-English
  gloss the first time it appears; it never appears bare.
- Avoid: "revolutionary", "seamless", "game-changing", "cutting-edge",
  "next-generation", "solutions" as a noun, exclamation marks.

## Anti-references

- **Generic KYC portals.** Dense grey forms, section numbers, "Applicant Information",
  fields named after the database column.
- **The six-dot stepper.** A progress indicator whose main effect is telling the user
  how much is left.
- **Enterprise onboarding SaaS.** Sidebar tree of 20 sub-sections, save-and-resume
  banners, "1 of 47 fields complete".
- **Navy-and-gold fintech.** The trust-by-mahogany reflex.
- **Chat-driven forms.** One question per screen with a fake typing indicator. Slower,
  not faster, and it hides the shape of the task.

## Biggest risk

Making the flow *look* shorter while the merchant still has to type everything, or
shortening it by quietly dropping fields the acquirer requires. Both fail. The win is
the same payload, retrieved and confirmed rather than typed.
