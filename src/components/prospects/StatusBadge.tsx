import { cn } from '@/lib/utils';
import { ProspectStatus, PriorityLevel, FunnelStage, EnrollmentStatus, ActionTaken } from '@/types/prospect';

interface StatusBadgeProps {
  status: ProspectStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorClasses: Record<ProspectStatus, string> = {
    'Good': 'bg-status-positive/15 text-status-positive border-status-positive/30',
    'Medium': 'bg-status-neutral/15 text-status-neutral border-status-neutral/30',
    'Bad': 'bg-status-negative/15 text-status-negative border-status-negative/30',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap',
      colorClasses[status]
    )}>
      {status}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: PriorityLevel;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const colorClasses: Record<PriorityLevel, string> = {
    'High': 'bg-status-negative/15 text-status-negative border-status-negative/30',
    'Medium': 'bg-status-neutral/15 text-status-neutral border-status-neutral/30',
    'Low': 'bg-muted text-muted-foreground border-border',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap',
      colorClasses[priority]
    )}>
      {priority}
    </span>
  );
}

interface StageBadgeProps {
  stage: FunnelStage;
}

export function StageBadge({ stage }: StageBadgeProps) {
  const colorClasses: Record<FunnelStage, string> = {
    'Day 1': 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    'Day 2': 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
    'Day 3': 'bg-teal-500/15 text-teal-600 border-teal-500/30',
    'Minimum Bill': 'bg-orange-500/15 text-orange-600 border-orange-500/30',
    'Level Up': 'bg-status-positive/15 text-status-positive border-status-positive/30',
    '2CC': 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap',
      colorClasses[stage]
    )}>
      {stage}
    </span>
  );
}

interface EnrollBadgeProps {
  status: EnrollmentStatus;
}

export function EnrollBadge({ status }: EnrollBadgeProps) {
  const colorClasses: Record<EnrollmentStatus, string> = {
    'Enrolled': 'bg-status-positive/15 text-status-positive border-status-positive/30',
    'Not Enrolled': 'bg-muted text-muted-foreground border-border',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap',
      colorClasses[status]
    )}>
      {status}
    </span>
  );
}

// Extended action type that includes "Enrollment"
export type ExtendedAction = ActionTaken | 'Enrollment';

interface ActionBadgeProps {
  action: ExtendedAction | null | undefined;
}

export function ActionBadge({ action }: ActionBadgeProps) {
  if (!action) return null;

  const colorClasses: Record<ExtendedAction, string> = {
    'Enrollment': 'bg-purple-500/15 text-purple-600 border-purple-500/30',
    'Video Sent': 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    'Called': 'bg-purple-500/15 text-purple-600 border-purple-500/30',
    'Not Picked': 'bg-orange-500/15 text-orange-600 border-orange-500/30',
    'Busy': 'bg-status-neutral/15 text-status-neutral border-status-neutral/30',
    'Follow Up Scheduled': 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap',
      colorClasses[action]
    )}>
      {action}
    </span>
  );
}
