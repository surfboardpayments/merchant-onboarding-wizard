import { z } from 'zod';

export const transactionDetailsSchema = z.object({
  transactionDescriptor: z
    .string()
    .min(1, 'Transaction descriptor is required')
    .max(22, 'Max 22 characters for card statement'),
  refundPolicy: z.enum(['full_refund', 'partial_refund', 'no_refunds', 'custom'], {
    error: 'Select a refund policy',
  }),
  refundPolicyCustom: z.string().optional(),
  tradingHistory: z.enum(['already_trading', 'new_business'], {
    error: 'Select your trading history',
  }),
  monthlyVolumeLast3Months: z.string().optional(),
  projectedMonthlyVolume: z.string().optional(),
  pepSanctionsConsent: z.boolean({
    error: 'PEP and sanctions consent is required',
  }),
});

export type TransactionDetails = z.infer<typeof transactionDetailsSchema>;
