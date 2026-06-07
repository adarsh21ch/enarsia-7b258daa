// Prospect types - User-customizable tags system
export type FunnelStage = string; // Now user-defined
export type ActionTaken = string; // Now user-defined
export type ExtendedActionTaken = string;
export type ProspectStatus = string; // Now user-defined
export type PriorityLevel = 'High' | 'Medium' | 'Low';
export type EnrollmentStatus = 'Enrolled' | 'Not Enrolled';

// Quality is the same as ProspectStatus - aliased for UI clarity
export type ProspectQuality = ProspectStatus;

export interface Prospect {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  funnel_stage?: FunnelStage | null;
  funnel_stage_at?: string | null;
  action_taken?: ExtendedActionTaken | null;
  action_taken_at?: string | null;
  prospect_status?: ProspectStatus | null;
  priority?: PriorityLevel | null;
  date_added: string;
  updated_at: string;

  // Stable ordering (drag & drop)
  sort_order?: number | null;

  // Database fields
  sheet_id?: string | null;
  batch_date?: string | null;
  address?: string | null;
  state?: string | null;
  age_or_dob?: string | null;
  gender?: string | null;
  why_need?: string | null;
  currently_doing?: string | null;
  enrollment_status?: EnrollmentStatus | null;
  instagram?: string | null;
  profession?: string | null;
  phone2?: string | null;

  // Personal tags (private to user, NOT for analytics)
  personal_tags?: string[] | null;

  // Flexible per-prospect extras (from Excel import unmapped columns)
  custom_fields?: Record<string, string> | null;


  // Legacy/optional UI fields
  last_contact_date?: string | null;
}

export interface Sheet {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  is_demo?: boolean;
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

// Empty arrays - users create their own tags
export const FUNNEL_STAGES: string[] = [];
export const CALLING_STAGES: string[] = [];
export const FUNNEL_TAB_STAGES: string[] = [];
export const ACTIONS: string[] = [];
export const EXTENDED_ACTIONS: string[] = [];
export const STATUSES: string[] = [];
export const QUALITIES: string[] = [];
export const PRIORITIES: PriorityLevel[] = ['High', 'Medium', 'Low'];
export const ENROLLMENT_STATUSES: EnrollmentStatus[] = ['Enrolled', 'Not Enrolled'];

// Helper to map old status values to new ones (kept for backwards compatibility)
export const mapOldStatusToNew = (oldStatus: string | null | undefined): ProspectStatus | null => {
  if (!oldStatus) return null;
  return oldStatus; // Pass through as-is now
};

// Empty stage order - users define their own
export const FUNNEL_STAGE_ORDER: Record<string, number> = {};
