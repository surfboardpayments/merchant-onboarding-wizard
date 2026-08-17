export interface WizardStep {
  number: number;
  /** Short name, used by the progress bar and assistive tech. */
  label: string;
  /** The page title, on the dark frame above the card. */
  title: string;
  /** One or two sentences under the title. Sets expectations, never repeats it. */
  blurb: string;
  estimatedMinutes: number;
}

/**
 * Three steps, not six.
 *
 * Nothing was dropped to get here: company + contact is step one, the old
 * business and transaction steps merged into step two (they are the same
 * subject: what you sell and how it shows up on a statement), and people,
 * settlement and review merged into step three (who we pay and who vouches
 * for it). Most of the fields underneath arrive pre-filled, so the merged
 * steps read shorter than the six they replaced.
 */
export const WIZARD_STEPS: WizardStep[] = [
  {
    number: 1,
    label: "Company",
    title: "Let's find your business",
    blurb:
      "Start typing your company name. We'll pull your details straight from Companies House so you don't have to type them.",
    estimatedMinutes: 1,
  },
  {
    number: 2,
    label: "Business",
    title: "Tell us about your business",
    blurb:
      "We've filled in what we could find. Read it through, and change anything that doesn't sound right.",
    estimatedMinutes: 2,
  },
  {
    number: 3,
    label: "People and payouts",
    title: "Owners and payouts",
    blurb:
      "Who's behind the business, and the account we should settle your money into.",
    estimatedMinutes: 3,
  },
];

export const FIRST_STEP = 1;
export const LAST_STEP = WIZARD_STEPS.length;

/** Total estimated time across all wizard steps (in minutes). */
export const TOTAL_ESTIMATED_MINUTES = WIZARD_STEPS.reduce(
  (sum, step) => sum + step.estimatedMinutes,
  0,
);
