/**
 * Weekly Performance Report Card
 * Shows summary of weekly stats with AI coaching note
 * Displayed in TrackUp → "Weekly Reports" section
 */
import { Calendar, TrendingUp, TrendingDown, Minus, Star, ChevronRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

interface WeeklyReportCardProps {
  weekStart: Date;
  weekEnd: Date;
  totalLeads: number;
  responsePercent: number;
  enrollments: number;
  bestFunnel: string | null;
  weakestFunnel: string | null;
  trend: 'up' | 'down' | 'stable';
  vsLastWeek: number; // percentage change
  aiNote: string;
  onPress?: () => void;
  isCompact?: boolean;
}

export function WeeklyReportCard({
  weekStart,
  weekEnd,
  totalLeads,
  responsePercent,
  enrollments,
  bestFunnel,
  weakestFunnel,
  trend,
  vsLastWeek,
  aiNote,
  onPress,
  isCompact = false,
}: WeeklyReportCardProps) {
  const dateRange = `${format(weekStart, 'd MMM')} - ${format(weekEnd, 'd MMM')}`;

  const TrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-emerald-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  if (isCompact) {
    return (
      <button
        onClick={onPress}
        className="w-full bg-card rounded-xl border border-border/50 p-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <FileText className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium">{dateRange}</p>
              <p className="text-[10px] text-muted-foreground">
                {totalLeads} leads • {responsePercent.toFixed(0)}% response
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <TrendIcon />
              <span className={cn(
                "text-xs font-medium",
                trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
              )}>
                {vsLastWeek > 0 ? '+' : ''}{vsLastWeek.toFixed(0)}%
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Weekly Report</span>
          </div>
          <span className="text-xs text-muted-foreground">{dateRange}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-500/10 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-blue-600">{totalLeads}</p>
            <p className="text-[10px] text-muted-foreground">Leads</p>
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-emerald-600">{responsePercent.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground">Response</p>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-amber-600">{enrollments}</p>
            <p className="text-[10px] text-muted-foreground">Enrolled</p>
          </div>
        </div>

        {/* Key Insights */}
        <div className="space-y-1.5 pt-2 border-t border-border/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">vs Last Week</span>
            <div className="flex items-center gap-1">
              <TrendIcon />
              <span className={cn(
                "font-medium",
                trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
              )}>
                {vsLastWeek > 0 ? '+' : ''}{vsLastWeek.toFixed(0)}%
              </span>
            </div>
          </div>
          
          {bestFunnel && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Best Funnel</span>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                <span className="font-medium">{bestFunnel}</span>
              </div>
            </div>
          )}
          
          {weakestFunnel && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Needs Attention</span>
              <span className="font-medium text-red-600">{weakestFunnel}</span>
            </div>
          )}
        </div>

        {/* AI Note */}
        <div className="mt-3 p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <div className="flex items-start gap-2">
            <Star className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
            <p className="text-xs text-violet-700 font-medium leading-relaxed">
              {aiNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Weekly Reports List - Shows last 4 weekly reports
 */
interface WeeklyReportsListProps {
  reports: Array<{
    weekStart: Date;
    weekEnd: Date;
    totalLeads: number;
    responsePercent: number;
    enrollments: number;
    trend: 'up' | 'down' | 'stable';
    vsLastWeek: number;
  }>;
  onViewReport?: (index: number) => void;
}

export function WeeklyReportsList({ reports, onViewReport }: WeeklyReportsListProps) {
  if (reports.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border/50 p-6 text-center">
        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No weekly reports yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Reports are generated every Sunday
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Weekly Reports</h3>
      </div>
      {reports.slice(0, 4).map((report, idx) => (
        <WeeklyReportCard
          key={idx}
          {...report}
          bestFunnel={null}
          weakestFunnel={null}
          aiNote=""
          isCompact
          onPress={() => onViewReport?.(idx)}
        />
      ))}
    </div>
  );
}
