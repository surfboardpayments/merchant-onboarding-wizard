export interface WizardStep {
  number: number;
  label: string;
  description: string;
  icon: string;
  estimatedMinutes: number;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    number: 1,
    label: 'Company',
    description: 'Your business identity',
    icon: 'building',
    estimatedMinutes: 0.5,
  },
  {
    number: 2,
    label: 'Business',
    description: 'Tell us about your business',
    icon: 'store',
    estimatedMinutes: 2,
  },
  {
    number: 3,
    label: 'People',
    description: 'Directors & owners',
    icon: 'users',
    estimatedMinutes: 3,
  },
  {
    number: 4,
    label: 'Transactions',
    description: 'Payment details',
    icon: 'credit-card',
    estimatedMinutes: 1,
  },
  {
    number: 5,
    label: 'Settlement',
    description: 'Bank account',
    icon: 'bank',
    estimatedMinutes: 1,
  },
  {
    number: 6,
    label: 'Review',
    description: 'Review & submit',
    icon: 'check',
    estimatedMinutes: 2,
  },
];

/** Total estimated time across all wizard steps (in minutes). */
export const TOTAL_ESTIMATED_MINUTES = WIZARD_STEPS.reduce(
  (sum, step) => sum + step.estimatedMinutes,
  0,
);
