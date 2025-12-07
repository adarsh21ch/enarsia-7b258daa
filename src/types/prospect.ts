export type FunnelStage = 'Day 1' | 'Day 2' | 'Day 3' | 'Minimum Bill' | 'Level Up' | '2CC';
export type ActionTaken = 'Video Sent' | 'Called' | 'Not Picked' | 'Busy' | 'Follow Up Scheduled';
export type ExtendedActionTaken = ActionTaken | 'Enrollment';
export type ProspectStatus = 'Good' | 'Medium' | 'Bad';
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
  action_taken?: ActionTaken | null;
  prospect_status?: ProspectStatus | null;
  priority?: PriorityLevel | null;
  date_added: string;
  last_contact_date?: string | null;
  updated_at: string;
  // Database fields
  sheet_id?: string | null;
  batch_date?: string | null;
  address?: string | null;
  age_or_dob?: string | null;
  gender?: string | null;
  why_need?: string | null;
  currently_doing?: string | null;
  enrollment_status?: EnrollmentStatus | null;
  instagram?: string | null;
  profession?: string | null;
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

export const FUNNEL_STAGES: FunnelStage[] = ['Day 1', 'Day 2', 'Day 3', 'Minimum Bill', 'Level Up', '2CC'];
export const CALLING_STAGES: FunnelStage[] = [];
export const FUNNEL_TAB_STAGES: FunnelStage[] = ['Day 1', 'Day 2', 'Day 3', 'Minimum Bill', 'Level Up', '2CC'];
export const ACTIONS: ActionTaken[] = ['Video Sent', 'Called', 'Not Picked', 'Busy', 'Follow Up Scheduled'];
export const EXTENDED_ACTIONS: ExtendedActionTaken[] = ['Video Sent', 'Called', 'Not Picked', 'Busy', 'Follow Up Scheduled', 'Enrollment'];
export const STATUSES: ProspectStatus[] = ['Good', 'Medium', 'Bad'];
export const QUALITIES: ProspectQuality[] = ['Good', 'Medium', 'Bad'];
export const PRIORITIES: PriorityLevel[] = ['High', 'Medium', 'Low'];
export const ENROLLMENT_STATUSES: EnrollmentStatus[] = ['Enrolled', 'Not Enrolled'];

// Helper to map old status values to new ones
export const mapOldStatusToNew = (oldStatus: string | null | undefined): ProspectStatus | null => {
  if (!oldStatus) return null;
  const mapping: Record<string, ProspectStatus> = {
    '+VE': 'Good',
    'Good': 'Good',
    '-VE': 'Bad',
    'Bad': 'Bad',
    '50-50': 'Medium',
    '30-70': 'Medium',
    'Medium': 'Medium',
  };
  return mapping[oldStatus] || null;
};

export const FUNNEL_STAGE_ORDER: Record<FunnelStage, number> = {
  'Day 1': 0,
  'Day 2': 1,
  'Day 3': 2,
  'Minimum Bill': 3,
  'Level Up': 4,
  '2CC': 5,
};
