import { z } from 'zod';

export const settlementSchema = z.object({
  nameOnAccount: z.string().min(1, 'Account holder name is required'),
  sortCode: z
    .string()
    .min(1, 'Sort code is required')
    .regex(/^\d{2}-?\d{2}-?\d{2}$/, 'Enter a valid sort code (e.g. 12-34-56)'),
  accountNumber: z
    .string()
    .min(1, 'Account number is required')
    .regex(/^\d{7,8}$/, 'Enter a valid 7 or 8 digit account number'),
  bankName: z.string().optional(),
  bankAccountValidated: z.boolean().default(false),
});

export type Settlement = z.infer<typeof settlementSchema>;
