import { z } from 'zod';
import { addressSchema } from './address';

const openingHoursEntrySchema = z.object({
  open: z.string(),
  close: z.string(),
  closed: z.boolean(),
});

const inStoreDetailsSchema = z.object({
  numberOfLocations: z.number().int().min(1, 'At least one location is required'),
  openingHours: z.record(z.string(), openingHoursEntrySchema),
  isSeasonal: z.boolean(),
  seasonalMonths: z.array(z.number().int().min(1).max(12)).optional(),
  terminalsPerLocation: z.number().int().min(1, 'At least one terminal per location'),
});

export const businessDetailsSchema = z.object({
  merchantDba: z.string().min(1, 'Trading name (DBA) is required'),
  dbaAddress: addressSchema,
  dbaAddressSameAsRegistered: z.boolean(),
  companyUrl: z.string().url('Enter a valid URL'),
  salesUrl: z.string().url('Enter a valid URL').optional(),
  businessType: z.enum(['online_only', 'in_store_only', 'both'], {
    error: 'Select a business type',
  }),
  productsDescription: z
    .string()
    .min(1, 'Products description is required')
    .max(500, 'Products description must be 500 characters or fewer'),
  mcc: z
    .string()
    .regex(/^\d{4}$/, 'MCC must be a 4-digit code'),
  inStoreDetails: inStoreDetailsSchema.optional(),
  expectedMonthlyVolume: z.enum(['under_10k', '10k_50k', '50k_100k', '100k_plus'], {
    error: 'Select expected monthly volume',
  }),
  averageTransactionValue: z.enum(['under_25', '25_50', '50_100', '100_250', '250_plus'], {
    error: 'Select average transaction value',
  }),
  tradingHistory: z.enum(['already_trading', 'new_business'], {
    error: 'Select your trading history',
  }),
  monthlyVolumeLast3Months: z.string().optional(),
});

export type BusinessDetails = z.infer<typeof businessDetailsSchema>;
export type InStoreDetails = z.infer<typeof inStoreDetailsSchema>;
export type OpeningHoursEntry = z.infer<typeof openingHoursEntrySchema>;
