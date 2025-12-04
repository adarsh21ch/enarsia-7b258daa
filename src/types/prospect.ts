export type FunnelStage = 'Enrollment' | 'Day 1' | 'Day 2' | 'Day 3' | 'Minimum Bill' | 'Level Up';
export type ActionTaken = 'Video Sent' | 'Called' | 'Not Picked' | 'Busy' | 'Follow Up Scheduled';
export type ProspectStatus = '+VE' | '-VE' | '50-50' | '30-70';
export type PriorityLevel = 'High' | 'Medium' | 'Low';

export interface Prospect {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  funnel_stage: FunnelStage;
  action_taken?: ActionTaken | null;
  prospect_status?: ProspectStatus | null;
  priority: PriorityLevel;
  date_added: string;
  last_contact_date?: string | null;
  updated_at: string;
}

export const FUNNEL_STAGES: FunnelStage[] = ['Enrollment', 'Day 1', 'Day 2', 'Day 3', 'Minimum Bill', 'Level Up'];
export const ACTIONS: ActionTaken[] = ['Video Sent', 'Called', 'Not Picked', 'Busy', 'Follow Up Scheduled'];
export const STATUSES: ProspectStatus[] = ['+VE', '-VE', '50-50', '30-70'];
export const PRIORITIES: PriorityLevel[] = ['High', 'Medium', 'Low'];

export const FUNNEL_STAGE_ORDER: Record<FunnelStage, number> = {
  'Enrollment': 0,
  'Day 1': 1,
  'Day 2': 2,
  'Day 3': 3,
  'Minimum Bill': 4,
  'Level Up': 5,
};
