import { useState } from 'react';
import { LeadsTracker } from '@/components/trackup/LeadsTracker';
import { FunnelTracker } from '@/components/trackup/FunnelTracker';
import { Button } from '@/components/ui/button';
import { BarChart3, Layers, Lock, Crown, Zap, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';

interface ProfileTrackUpProps {
  /** Whether user has Pro plan (full access) */
  isPro: boolean;
  /** Whether user has Mini plan (limited access) */
  isMini?: boolean;
}

type TrackUpTab = 'leads' | 'funnel';

export function ProfileTrackUp({ isPro, isMini = false }: ProfileTrackUpProps) {
  const [activeTab, setActiveTab] = useState<TrackUpTab>('leads');
  const { openPaymentLink, PLAN_CONFIG } = usePaymentLinks();
  
  // Mini and Pro users have access to personal tracking
  const hasAccess = isPro || isMini;

  return (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
      {/* Header with tabs */}
      <div className="p-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">My Tracking</h3>
          </div>
        </div>
        
        {/* Tab Toggle */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('leads')}
            className={cn(
              "flex-1 h-8 text-xs font-medium gap-1.5 rounded-md transition-all",
              activeTab === 'leads' 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Leads
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('funnel')}
            className={cn(
              "flex-1 h-8 text-xs font-medium gap-1.5 rounded-md transition-all",
              activeTab === 'funnel' 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Funnel
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative">
        {/* Pro Lock Overlay - Only show for free users */}
        {!hasAccess && (
          <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Premium Feature</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Upgrade to unlock personal tracking analytics
              </p>
              <div className="flex flex-col gap-2">
                <Button 
                  size="sm" 
                  onClick={() => openPaymentLink('pro')}
                  className="gap-1"
                >
                  <Crown className="h-4 w-4" />
                  Get Pro – ₹{PLAN_CONFIG.pro.price}/mo
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openPaymentLink('mini')}
                  className="gap-1"
                >
                  <Zap className="h-4 w-4" />
                  Get Mini – ₹{PLAN_CONFIG.mini.price}/mo
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className={cn("p-3", !hasAccess && "blur-sm pointer-events-none")}>
          {activeTab === 'leads' ? (
            <LeadsTracker isPro={isPro} />
          ) : (
            <FunnelTracker isPro={isPro} />
          )}
        </div>
      </div>
    </div>
  );
}
