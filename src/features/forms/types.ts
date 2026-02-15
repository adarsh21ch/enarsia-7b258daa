export type FormFieldType =
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'time'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'multiselect'
  | 'linear_scale'
  | 'file'
  | 'audio';

export interface FieldOptions {
  choices?: string[];
  min?: number;
  max?: number;
  min_label?: string;
  max_label?: string;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  pattern_message?: string;
}

export interface ConditionalLogic {
  show_if?: {
    field_key: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_empty';
    value?: string;
  };
}

export interface LeadMapping {
  name_field_key?: string;
  phone_field_key?: string;
  email_field_key?: string;
}

export interface NevoraForm {
  id: string;
  owner_user_id: string;
  title: string;
  description: string | null;
  access_mode: string;
  is_public: boolean;
  is_accepting: boolean;
  close_date: string | null;
  collect_utm: boolean;
  allow_multiple_submissions: boolean;
  max_submissions: number | null;
  confirmation_message: string | null;
  embed_enabled: boolean;
  form_type: string | null;
  lead_mapping: LeadMapping | null;
  created_at: string;
  updated_at: string;
}

export interface NevoraFormField {
  id: string;
  form_id: string;
  field_key: string;
  field_type: FormFieldType;
  label: string;
  description: string | null;
  placeholder: string | null;
  required: boolean;
  position: number;
  options: FieldOptions | null;
  validation: FieldValidation | null;
  conditional_logic: ConditionalLogic | null;
  created_at: string;
}

export interface NevoraFormWithFields extends NevoraForm {
  fields: NevoraFormField[];
}

export interface NevoraFormSubmission {
  id: string;
  form_id: string;
  share_id: string | null;
  submitter_user_id: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
  source: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  lead_created: boolean;
  lead_id: string | null;
  created_at: string;
}

export interface NevoraSubmissionAnswer {
  id: string;
  submission_id: string;
  field_id: string | null;
  field_key: string;
  value: string | null;
  value_json: Record<string, unknown> | null;
  created_at: string;
}

export interface NevoraSubmissionAttachment {
  id: string;
  submission_id: string;
  field_id: string | null;
  storage_path: string;
  content_type: string | null;
  size: number | null;
  created_at: string;
}

export interface NevoraFormShare {
  id: string;
  form_id: string;
  token: string;
  created_by: string;
  expires_at: string | null;
  created_at: string;
}

export interface SubmissionWithAnswers extends NevoraFormSubmission {
  answers: NevoraSubmissionAnswer[];
  attachments?: NevoraSubmissionAttachment[];
}

export interface CreateFormInput {
  title: string;
  description?: string;
  access_mode?: string;
  is_public?: boolean;
  collect_utm?: boolean;
  allow_multiple_submissions?: boolean;
  max_submissions?: number | null;
  confirmation_message?: string;
  embed_enabled?: boolean;
  lead_mapping?: LeadMapping | null;
  fields: Omit<NevoraFormField, 'id' | 'form_id' | 'created_at'>[];
}

export interface UpdateFormInput {
  title?: string;
  description?: string | null;
  access_mode?: string;
  is_public?: boolean;
  is_accepting?: boolean;
  close_date?: string | null;
  collect_utm?: boolean;
  allow_multiple_submissions?: boolean;
  max_submissions?: number | null;
  confirmation_message?: string | null;
  embed_enabled?: boolean;
  lead_mapping?: LeadMapping | null;
}
