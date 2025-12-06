import { z } from 'zod';

export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .max(100, 'Display name must be less than 100 characters')
    .optional()
    .nullable()
    .transform(val => val || null),
  phone: z
    .string()
    .trim()
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^[\d\s\-+()]*$/, 'Phone number can only contain digits, spaces, and +()-')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform(val => val || null),
  company_name: z
    .string()
    .trim()
    .max(100, 'Company name must be less than 100 characters')
    .optional()
    .nullable()
    .transform(val => val || null),
  city: z
    .string()
    .trim()
    .max(100, 'City must be less than 100 characters')
    .optional()
    .nullable()
    .transform(val => val || null),
  bio: z
    .string()
    .trim()
    .max(500, 'Bio must be less than 500 characters')
    .optional()
    .nullable()
    .transform(val => val || null),
  avatar_url: z
    .string()
    .url('Invalid URL format')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform(val => val || null),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export function validateProfile(data: unknown): { success: true; data: ProfileFormData } | { success: false; errors: Record<string, string> } {
  const result = profileSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach(err => {
    const field = err.path[0] as string;
    errors[field] = err.message;
  });
  
  return { success: false, errors };
}
