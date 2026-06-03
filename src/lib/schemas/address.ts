import { z } from 'zod';

export const addressSchema = z.object({
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  county: z.string().optional(),
  postcode: z
    .string()
    .min(1, 'Postcode is required')
    .regex(
      /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
      'Enter a valid UK postcode',
    ),
  country: z.string().default('GB'),
});

export type Address = z.infer<typeof addressSchema>;
