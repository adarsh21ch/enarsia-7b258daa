import { cn } from '@/lib/utils';
import { ProspectStatus, PriorityLevel, FunnelStage } from '@/types/prospect';

interface StatusBadgeProps {
  status: ProspectStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusClass = () => {
    switch (status) {
      case '+VE':
        return 'status-positive';
      case '-VE':
        return 'status-negative';
      case '50-50':
        return 'status-neutral';
      case '30-70':
        return 'status-uncertain';
      default:
        return 'status-uncertain';
    }
  };

  return (
    <span className={cn('status-badge', getStatusClass())}>
      {status}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: PriorityLevel;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const getPriorityClass = () => {
    switch (priority) {
      case 'High':
        return 'priority-high';
      case 'Medium':
        return 'priority-medium';
      case 'Low':
        return 'priority-low';
      default:
        return 'priority-medium';
    }
  };

  return (
    <span className={cn('status-badge', getPriorityClass())}>
      {priority}
    </span>
  );
}

interface StageBadgeProps {
  stage: FunnelStage;
}

export function StageBadge({ stage }: StageBadgeProps) {
  const getStageColor = () => {
    switch (stage) {
      case 'Enrollment':
        return 'bg-stage-enrollment/10 text-stage-enrollment';
      case 'Day 1':
        return 'bg-stage-day1/10 text-stage-day1';
      case 'Day 2':
        return 'bg-stage-day2/10 text-stage-day2';
      case 'Day 3':
        return 'bg-stage-day3/10 text-stage-day3';
      case 'Minimum Bill':
        return 'bg-stage-minimum/10 text-stage-minimum';
      case 'Level Up':
        return 'bg-stage-levelup/10 text-stage-levelup';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <span className={cn('status-badge', getStageColor())}>
      {stage}
    </span>
  );
}
