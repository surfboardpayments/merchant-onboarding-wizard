import { z } from 'zod';
import { addressSchema } from './address';

export const companyInfoSchema = z.object({
  companyNumber: z.string().min(1, 'Company number is required'),
  companyName: z.string().min(1, 'Company name is required'),
  companyStatus: z.enum(
    [
      'active',
      'dissolved',
      'liquidation',
      'receivership',
      'administration',
      'voluntary-arrangement',
      'converted-closed',
      'insolvency-proceedings',
    ],
    { error: 'Company status is required' },
  ),
  registeredAddress: addressSchema,
  sicCodes: z.array(z.string()).default([]),
  dateOfCreation: z.string().min(1, 'Date of creation is required'),
  companyType: z.string().min(1, 'Company type is required'),
  jurisdiction: z.string().min(1, 'Jurisdiction is required'),
});

export type CompanyInfo = z.infer<typeof companyInfoSchema>;
