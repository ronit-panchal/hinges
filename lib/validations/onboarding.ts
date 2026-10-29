import { z } from 'zod';

export const basicInfoSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters')
    .trim(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .refine((val) => {
      const dob = new Date(val);
      if (isNaN(dob.getTime())) return false;
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age >= 18;
    }, 'You must be at least 18 years old to join Hinges'),
  genderIdentity: z.string().min(1, 'Please select your gender identity'),
  heightCm: z.coerce
    .number()
    .min(90, 'Height must be at least 90 cm')
    .max(250, 'Height must be at most 250 cm')
    .optional()
    .nullable(),
});

export const institutionAffiliationSchema = z.object({
  institutionId: z.string().uuid('Please select an institution'),
  affiliationType: z.enum(['student', 'faculty', 'staff', 'alumni', 'other'], {
    errorMap: () => ({ message: 'Please select an affiliation type' }),
  }),
  department: z.string().max(100).optional().nullable(),
  graduationYear: z.coerce
    .number()
    .min(1950)
    .max(2100)
    .optional()
    .nullable(),
  city: z.string().max(100).optional().nullable(),
});

export const profileDetailsSchema = z.object({
  bio: z.string().max(500, 'Bio must be under 500 characters').optional().nullable(),
  relationshipIntentions: z
    .array(z.string())
    .min(1, 'Please select at least one relationship intention'),
  interestIds: z.array(z.string().uuid()).min(2, 'Select at least 2 interests'),
});

export const preferencesSchema = z.object({
  minAge: z.coerce.number().min(18).max(99).default(18),
  maxAge: z.coerce.number().min(18).max(99).default(45),
  preferredGenders: z.array(z.string()).default([]),
  isDiscoverable: z.boolean().default(true),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and guidelines to continue' }),
  }),
});

export const reportSchema = z.object({
  reportedUserId: z.string().uuid(),
  reason: z.enum(['harassment', 'impersonation', 'inappropriate_content', 'spam', 'underage', 'other']),
  details: z.string().max(1000).optional(),
});

