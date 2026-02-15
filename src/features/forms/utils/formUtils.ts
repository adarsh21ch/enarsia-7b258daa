import type { NevoraFormField, ConditionalLogic, FieldValidation } from '../types';

export function extractUTMParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  keys.forEach(k => {
    const v = params.get(k);
    if (v) utm[k] = v;
  });
  return utm;
}

export function isFieldVisible(
  field: NevoraFormField,
  allAnswers: Record<string, string | string[]>
): boolean {
  const logic = field.conditional_logic as ConditionalLogic | null;
  if (!logic?.show_if) return true;

  const { field_key, operator, value } = logic.show_if;
  const answer = allAnswers[field_key];
  const answerStr = Array.isArray(answer) ? answer.join(',') : (answer || '');

  switch (operator) {
    case 'equals':
      return answerStr === (value || '');
    case 'not_equals':
      return answerStr !== (value || '');
    case 'contains':
      return answerStr.toLowerCase().includes((value || '').toLowerCase());
    case 'not_empty':
      return answerStr.length > 0;
    default:
      return true;
  }
}

export function validateField(
  field: NevoraFormField,
  value: string | string[] | undefined
): string | null {
  const val = Array.isArray(value) ? value.join(',') : (value || '');

  if (field.required && val.trim() === '') {
    return `${field.label} is required`;
  }

  if (!val.trim()) return null;

  const validation = field.validation as FieldValidation | null;

  if (field.field_type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) return 'Please enter a valid email';
  }

  if (field.field_type === 'phone') {
    const digits = val.replace(/\D/g, '');
    if (digits.length < 7) return 'Please enter a valid phone number';
  }

  if (validation) {
    if (validation.min_length && val.length < validation.min_length) {
      return `Minimum ${validation.min_length} characters required`;
    }
    if (validation.max_length && val.length > validation.max_length) {
      return `Maximum ${validation.max_length} characters allowed`;
    }
    if (field.field_type === 'number') {
      const num = parseFloat(val);
      if (isNaN(num)) return 'Please enter a valid number';
      if (validation.min !== undefined && num < validation.min) {
        return `Minimum value is ${validation.min}`;
      }
      if (validation.max !== undefined && num > validation.max) {
        return `Maximum value is ${validation.max}`;
      }
    }
    if (validation.pattern) {
      try {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(val)) {
          return validation.pattern_message || 'Invalid format';
        }
      } catch {
        // invalid regex, skip
      }
    }
  }

  return null;
}

export function validateAllFields(
  fields: NevoraFormField[],
  answers: Record<string, string | string[]>,
  allAnswers: Record<string, string | string[]>
): Record<string, string> {
  const errors: Record<string, string> = {};
  fields.forEach(field => {
    if (!isFieldVisible(field, allAnswers)) return;
    const error = validateField(field, answers[field.field_key]);
    if (error) errors[field.field_key] = error;
  });
  return errors;
}

export function generateFieldKey(label: string, index: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
  return slug || `field_${index}`;
}
