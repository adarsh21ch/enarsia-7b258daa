export interface Prospect {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  age_or_dob?: string | null;
  city?: string | null;
  state?: string | null;
  gender?: string | null;
  sheet_id?: string | null;
  batch_date?: string | null;
  date_added: string;
  updated_at: string;
}

export interface Sheet {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  due_date?: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  prospect_id?: string | null;
  activity_type: string;
  description: string;
  old_value?: string | null;
  new_value?: string | null;
  created_at: string;
}

export const GENDERS = ['Male', 'Female', 'Other'] as const;
export type Gender = typeof GENDERS[number];
