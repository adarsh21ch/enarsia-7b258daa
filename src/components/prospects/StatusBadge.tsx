import { cn } from '@/lib/utils';
import { getTagStyle } from '@/lib/tagColors';
import { ProspectStatus, PriorityLevel, FunnelStage, EnrollmentStatus, ActionTaken } from '@/types/prospect';

// Shared badge class for consistent SaaS-style tags
const BADGE_BASE = "inline-flex items-center justify-center px-3 h-7 rounded-md text-xs font-semibold border whitespace-nowrap min-w-[48px]";

interface StatusBadgeProps {
  status: ProspectStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = getTagStyle(status, 'quality');
  
  return (
    <span className={BADGE_BASE} style={style}>
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
    <span className={cn(BADGE_BASE, colorClasses[priority])}>
      {priority}
    </span>
  );
}

interface StageBadgeProps {
  stage: FunnelStage;
}

export function StageBadge({ stage }: StageBadgeProps) {
  const style = getTagStyle(stage, 'stage');
  
  return (
    <span className={BADGE_BASE} style={style}>
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
    <span className={cn(BADGE_BASE, colorClasses[status])}>
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
  
  const style = getTagStyle(action, 'response');

  return (
    <span className={BADGE_BASE} style={style}>
      {action}
    </span>
  );
}

// Generic tag badge for any custom tags
interface GenericTagBadgeProps {
  value: string;
  type: 'response' | 'stage' | 'quality' | 'default';
  customColor?: string | null;
}

export function GenericTagBadge({ value, type, customColor }: GenericTagBadgeProps) {
  const style = getTagStyle(value, type, customColor);
  
  return (
    <span className={BADGE_BASE} style={style}>
      {value}
    </span>
  );
}
