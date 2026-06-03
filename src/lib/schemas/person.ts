import { z } from 'zod';
import { addressSchema } from './address';

const dateOfBirthSchema = z.object({
  day: z.number().int().min(1).max(31),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
});

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  token: z.string(),
  sentAt: z.string(),
  expiresAt: z.string(),
  remindersSent: z.number().int().min(0),
  completedAt: z.string().optional(),
});

const screeningSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'clear', 'flagged', 'failed']),
  checkedAt: z.string().optional(),
});

export const personSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(['companies_house', 'manual']),
  isSelf: z.boolean(),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  title: z.string().optional(),
  dateOfBirth: dateOfBirthSchema,
  residentialAddress: addressSchema,
  nationality: z.string().min(1, 'Nationality is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Enter a valid email address'),
  role: z.enum(['director', 'psc', 'ubo', 'director_and_psc'], {
    error: 'Select a role',
  }),
  naturesOfControl: z.array(z.string()).optional(),
  invite: inviteSchema.optional(),
  pepScreening: screeningSchema.optional(),
  sanctionsScreening: screeningSchema.optional(),
});

export type Person = z.infer<typeof personSchema>;
export type DateOfBirth = z.infer<typeof dateOfBirthSchema>;
export type Invite = z.infer<typeof inviteSchema>;
export type Screening = z.infer<typeof screeningSchema>;
