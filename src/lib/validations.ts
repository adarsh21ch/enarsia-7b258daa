import { z } from 'zod';

// Prospect validation schemas
export const prospectNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters');

export const prospectPhoneSchema = z
  .string()
  .trim()
  .min(7, 'Phone number must be at least 7 characters')
  .max(20, 'Phone number must be less than 20 characters')
  .regex(/^[\d\s\-+()]+$/, 'Phone number can only contain digits, spaces, and +()-');

export const prospectEmailSchema = z
  .string()
  .trim()
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters')
  .optional()
  .or(z.literal(''))
  .transform(val => val || null);

export const addProspectSchema = z.object({
  name: prospectNameSchema,
  phone: prospectPhoneSchema,
  email: prospectEmailSchema,
});

// Auth validation schemas
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be less than 72 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Import validation helpers
export function sanitizeImportString(value: unknown, maxLength = 500): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  return str.slice(0, maxLength);
}

export function validateImportedProspect(row: Record<string, unknown>, nameCol: string, phoneCol: string): { 
  valid: boolean; 
  name: string; 
  phone: string; 
  errors: string[];
} {
  const name = sanitizeImportString(row[nameCol], 100);
  const phone = sanitizeImportString(row[phoneCol], 20);
  const errors: string[] = [];

  if (!name || name.length < 1) {
    errors.push('Name is required');
  }
  
  if (!phone || phone.length < 7) {
    errors.push('Valid phone number is required');
  }

  // Clean phone number to only valid characters
  const cleanedPhone = phone.replace(/[^\d\s\-+()]/g, '');

  return {
    valid: errors.length === 0,
    name,
    phone: cleanedPhone,
    errors,
  };
}

export type AddProspectFormData = z.infer<typeof addProspectSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
