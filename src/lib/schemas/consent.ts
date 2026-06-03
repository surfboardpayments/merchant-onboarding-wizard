import { z } from 'zod';

export const consentSchema = z.object({
  termsAccepted: z.literal(true, {
    error: 'You must accept the terms and conditions',
  }),
  privacyPolicyAccepted: z.literal(true, {
    error: 'You must accept the privacy policy',
  }),
  submittedAt: z.string().optional(),
});

export type Consent = z.infer<typeof consentSchema>;
