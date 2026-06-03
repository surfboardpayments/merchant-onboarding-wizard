import { z } from 'zod';
import { companyInfoSchema } from './company';
import { businessDetailsSchema } from './business';
import { personSchema } from './person';
import { transactionDetailsSchema } from './transactions';
import { settlementSchema } from './settlement';
import { consentSchema } from './consent';

export const applicationSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected'], {
    error: 'Application status is required',
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  currentStep: z.number().int().min(1).max(6),
  contactEmail: z.string().email('Enter a valid email address'),
  contactPhone: z.string().min(1, 'Contact phone number is required'),
  company: companyInfoSchema,
  business: businessDetailsSchema,
  people: z.array(personSchema).min(1, 'At least one person is required'),
  transactions: transactionDetailsSchema,
  settlement: settlementSchema,
  consent: consentSchema.optional(),
});

export type Application = z.infer<typeof applicationSchema>;
