# DESIGN.md

The design system as built. Tokens live in `src/app/globals.css`; this file
explains the decisions behind them so future work extends the system instead of
inventing next to it. See [PRODUCT.md](PRODUCT.md) for users, brand and voice.

## The idea the design serves

Companies House, Creditsafe and the Gemini autofill already know most of what
the acquirer needs. Rendered as labelled inputs, that knowledge reads as work
the merchant still has to do. Rendered as a sentence, it reads as work already
done. Every layout decision below follows from that.

## Two grounds

| Ground | Where | Rule |
|---|---|---|
| **Frame** — Deep Sea Blue | Page background, page title, progress, footer | Brand-forward. White, Light Blue and Coral Green only. Ocean Blue text here is 2.7:1 and is banned. |
| **Surface** — near-white | The card: every form, fact and control | Reads as a trustworthy document in daylight, which is where merchants fill this in. |

Colour strategy is **Committed**, a deliberate per-surface override of the
product register's Restrained default: this is the first Surfboard surface a
merchant ever touches.

Apply `.frame-ground` for the dark field. Mark regions that sit directly on it
with `data-on-frame` so their focus ring switches to mint.

## Colour

OKLCH throughout, every neutral tinted to the brand hue (264). Named by role,
never by value.

- **Frame**: `--frame`, `--frame-deep`, `--frame-lift`, `--on-frame`, `--on-frame-muted`, `--on-frame-faint`, `--on-frame-line`
- **Surface**: `--surface`, `--surface-sunk`, `--surface-veil`
- **Ink**: `--ink` (19.3:1), `--ink-muted` (7.0:1), `--ink-subtle` (4.6:1)
- **Lines**: `--line` decorative, `--line-strong` card edges, `--field-line` control edges (3.2:1, the WCAG 1.4.11 floor)
- **Accent**: `--accent` Ocean Blue (7.0:1 on surface), `--accent-hover`, `--accent-active`, `--accent-wash`, `--accent-edge`, `--accent-on-dark` (4.4:1 on frame, graphics only)
- **Coral Green**: `--mint` on dark only; `--ok` is a darkened derivative for legible ink on light
- **Signals**: `--warn`, `--danger` plus `-wash` and `-edge` pairs. Meaning only, never decoration.

Every text pair is verified ≥4.5:1 and every control edge ≥3:1. When adding a
colour, verify it rather than eyeballing it.

## Typography

Brand stack, per the Surfboard guidelines:

- **Space Grotesk** — headings, page titles, buttons (`font-display`)
- **Inter** — body, labels, inputs, tables (`font-sans`, the default)
- **Space Mono** — reference numbers, statement descriptors, source tags, sort codes (`font-mono`)

Fixed rem scale, not fluid: this is product UI. `--text-2xs` (11px) through
`--text-3xl` (42px). Tight in the UI range, with a hard jump for the page title
on the frame. Headings track `-0.02em`; add `.tracking-display` for `-0.045em`
at display sizes. Prose caps at `max-w-[62ch]`.

Use `.tabular` for numbers that sit in columns or get compared.

## Components

Three patterns carry the flow. Reach for them before writing new markup.

### ConfirmedFact (`components/wizard/ConfirmedFact.tsx`)

The load-bearing one. A question, a prose answer with retrieved values in
`<Val>`, a source tag, and one link that reveals the real fields inline. Three
states:

- **default** — the sentence, on a tinted band
- **`incomplete`** — the sentence, with the fields open beneath so the gap is visible rather than hidden behind a link
- **`unanswered`** — no band, fields only. Nothing to confirm, only to answer.

Source tags are honest and conservative: a fact mixing registry data with
inferred data is tagged by its weakest source. A tag says "check this harder",
it does not take credit.

### ChoiceChips (`components/ui/ChoiceChips.tsx`)

Segmented answers on native radio inputs, so arrow keys, form semantics and
grouping come from the platform. `chips` for short answers, `stack` when
options need describing.

### Disclosure (`components/ui/Disclosure.tsx`)

Inline progressive disclosure. Everything a merchant might want but most won't
need lives behind one, which is how a long form stops looking long without
anything being removed from it.

Both reveals animate `grid-template-rows` (`0fr` → `1fr`), never `height`, and
set `inert` when closed so collapsed content leaves the tab order.

### Field vocabulary

`Input`, `Select`, `TextArea`, `Checkbox` and every specialised field
(`PhoneInput`, `SortCodeInput`, `AccountNumberInput`, `DateOfBirthInput`,
`AddressInput`, `TransactionDescriptorInput`) share `fieldClasses()`,
`FieldLabel` and `FieldMessage` from `components/ui/Input.tsx`. Do not
hand-roll a field. If the "save" control looks different in two places, one is
wrong.

## Space, radius, elevation

4pt base, named by relationship: `--space-3xs` (4px) to `--space-2xl` (64px).
Vary it; uniform padding is monotony. Radius runs `--radius-xs` (6px) for
chips and inline controls to `--radius-xl` (24px) for the main card.

Two shadows only: `--shadow-card` (the card lifting off the dark frame) and
`--shadow-pop` (primary buttons). Shadows should be barely visible.

`z-index` comes from a semantic scale: dropdown 100 → sticky 200 → scrim 300 →
dialog 400. Dropdowns use `position: fixed`-free absolute positioning inside
non-clipping parents; modals use native `<dialog>` for a platform focus trap.

## Motion

150–250ms on most transitions, from `--dur-tap` (120ms), `--dur-state` (200ms)
and `--dur-reveal` (320ms). Exponential ease-out only: `--ease-out` (quart) and
`--ease-out-soft` (quint). No bounce, no elastic, no orchestrated page-load
sequences.

Motion conveys state, never decoration. `.animate-rise` for content arriving,
`.is-working` for a travelling highlight while real work is in flight.
`prefers-reduced-motion` collapses everything to a crossfade and turns the
sweep into a static tint, keeping the signal and dropping the travel.

## Accessibility floor

- One focus ring: 2px `--accent`, offset 2px, switching to `--mint` inside `data-on-frame`. Defined in `@layer base` so a utility can still override it.
- Standalone controls meet 24×24 minimum; links inline in a sentence are exempt.
- Steps move focus to the new content rather than leaving it at the top of the document.
- Loading uses skeletons that preview the shape of what's coming, not spinners in the middle of content.
- Blocking states explain themselves: the primary action stays clickable and says what's missing instead of going grey with no way to find out why.

## Logo

Never redraw the surfer mark. `SurfboardLockup` and `SurfboardMark` render the
supplied SVGs from `public/brand/`. Lockup minimum 120px, mark minimum 24px.
Never place a mark and a lockup in the same composition.

## The bar

Would a merchant fluent in Stripe, Monzo or GoCardless trust this and finish
it? Failure here is not flatness, it is strangeness without purpose. Familiarity
is a feature; the distinctive move is the prose-first form, not the chrome
around it.
