/**
 * AI Tip of the Day Card
 * Shows ONE AI-generated coaching tip based on user data
 * Refreshes once per day, not dismissible
 */
import { Sparkles, Lightbulb, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { format } from 'date-fns';

interface AITipCardProps {
  leads: number;
  responses: number;
  enrollments: number;
  videosSent: number;
  notPicked: number;
  funnelDropOffs: number[];
  className?: string;
}

interface Tip {
  message: string;
  type: 'warning' | 'success' | 'insight';
  priority: number;
}

export function AITipCard({
  leads,
  responses,
  enrollments,
  videosSent,
  notPicked,
  funnelDropOffs,
  className,
}: AITipCardProps) {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Generate AI tip based on data patterns
  const tip = useMemo((): Tip => {
    const tips: Tip[] = [];
    
    // Calculate metrics
    const responseRate = leads > 0 ? (responses / leads) * 100 : 0;
    const enrollRate = responses > 0 ? (enrollments / responses) * 100 : 0;
    const videoRate = leads > 0 ? (videosSent / leads) * 100 : 0;
    const notPickedRate = leads > 0 ? (notPicked / leads) * 100 : 0;

    // Low response rate
    if (responseRate < 30 && leads > 5) {
      tips.push({
        message: "Your response rate is below 30% — try sending follow-ups within 30 minutes of first contact.",
        type: 'warning',
        priority: 90,
      });
    }

    // High not-picked rate
    if (notPickedRate > 40 && leads > 5) {
      tips.push({
        message: `${notPickedRate.toFixed(0)}% calls weren't picked. Try calling between 11 AM–1 PM or 5–7 PM.`,
        type: 'warning',
        priority: 85,
      });
    }

    // Low video send rate
    if (videoRate < 50 && leads > 5 && responses > 0) {
      tips.push({
        message: "Only " + videoRate.toFixed(0) + "% leads got videos. Sending videos early increases enrollment by 2x.",
        type: 'insight',
        priority: 70,
      });
    }

    // Funnel drop-off analysis
    if (funnelDropOffs.length > 0) {
      const maxDropIdx = funnelDropOffs.indexOf(Math.max(...funnelDropOffs));
      const maxDrop = funnelDropOffs[maxDropIdx];
      if (maxDrop > 40) {
        tips.push({
          message: `Funnel ${maxDropIdx + 1} → ${maxDropIdx + 2} has ${maxDrop.toFixed(0)}% drop-off. Share video or schedule call earlier.`,
          type: 'warning',
          priority: 80,
        });
      }
    }

    // Enrollment success
    if (enrollRate > 40 && enrollments > 2) {
      tips.push({
        message: "Great enrollment rate! Keep using today's approach — repeat what's working.",
        type: 'success',
        priority: 60,
      });
    }

    // Good response rate
    if (responseRate > 60 && leads > 5) {
      tips.push({
        message: "Strong response rate! Focus now on video delivery and enrollment calls.",
        type: 'success',
        priority: 55,
      });
    }

    // Low activity
    if (leads < 3) {
      tips.push({
        message: "Add more leads today. Consistency beats intensity — aim for 5-10 daily.",
        type: 'insight',
        priority: 50,
      });
    }

    // Default tip
    if (tips.length === 0) {
      tips.push({
        message: "Track daily for patterns. Your data will reveal your best strategies over time.",
        type: 'insight',
        priority: 10,
      });
    }

    // Sort by priority and pick the highest
    tips.sort((a, b) => b.priority - a.priority);
    return tips[0];
  }, [leads, responses, enrollments, videosSent, notPicked, funnelDropOffs, today]);

  const getTypeStyles = (type: 'warning' | 'success' | 'insight') => {
    switch (type) {
      case 'warning':
        return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-700', icon: 'text-amber-500' };
      case 'success':
        return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-700', icon: 'text-emerald-500' };
      case 'insight':
        return { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-700', icon: 'text-violet-500' };
    }
  };

  const styles = getTypeStyles(tip.type);

  return (
    <div className={cn(
      "rounded-xl border p-3",
      styles.bg,
      styles.border,
      className
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg bg-background/50 shrink-0", styles.icon)}>
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb className={cn("h-3 w-3", styles.icon)} />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              AI Tip of the Day
            </span>
          </div>
          <p className={cn("text-sm font-medium leading-relaxed", styles.text)}>
            {tip.message}
          </p>
          <p className="text-[10px] text-muted-foreground mt-2">
            Based on today's data • Updates daily
          </p>
        </div>
      </div>
    </div>
  );
}
