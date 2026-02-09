import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

export type ScopeLabel = 'FREE' | 'PRO' | 'TRIAL' | 'ALL';
export type SettingKind = 'LIMIT' | 'FEATURE';

export interface LimitSettingMeta {
  /** Renamed, human-friendly title */
  title: string;
  /** Who this affects */
  scope: ScopeLabel;
  /** Whether it's a numeric limit or a boolean feature toggle */
  kind: SettingKind;
  /** What happens when ENABLED */
  onEnabled: string;
  /** What happens when DISABLED */
  onDisabled: string;
  /** Full tooltip text */
  tooltip: string;
  /** Whether the value input should be hidden (boolean-only toggles) */
  isBoolean?: boolean;
  /** Extra hint shown below the value input */
  valueHint?: string;
}

interface LimitSettingCardProps {
  meta: LimitSettingMeta;
  currentValue: number;
  currentEnabled: boolean;
  hasChange: boolean;
  onValueChange: (value: number) => void;
  onEnabledChange: (enabled: boolean) => void;
  icon: React.ReactNode;
}

const SCOPE_STYLES: Record<ScopeLabel, string> = {
  FREE: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  PRO: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  TRIAL: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  ALL: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
};

export function LimitSettingCard({
  meta,
  currentValue,
  currentEnabled,
  hasChange,
  onValueChange,
  onEnabledChange,
  icon,
}: LimitSettingCardProps) {
  return (
    <Card className={`p-4 ${hasChange ? 'ring-2 ring-primary/50' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="p-2 rounded-lg bg-muted shrink-0 mt-0.5">
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title row with badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-semibold ${SCOPE_STYLES[meta.scope]}`}>
              {meta.scope === 'ALL' ? '👥 ALL USERS' : `${meta.scope} users`}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-border">
              {meta.kind}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {meta.tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <span className="font-medium text-sm block">{meta.title}</span>

          {/* Toggle semantics - always visible */}
          <div className="text-[11px] space-y-0.5">
            <p className={currentEnabled ? 'text-foreground font-medium' : 'text-muted-foreground'}>
              ✅ ON → {meta.onEnabled}
            </p>
            <p className={!currentEnabled ? 'text-foreground font-medium' : 'text-muted-foreground'}>
              ⛔ OFF → {meta.onDisabled}
            </p>
          </div>

          {/* Value hint */}
          {meta.valueHint && !meta.isBoolean && (
            <p className="text-[10px] text-muted-foreground italic">{meta.valueHint}</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {!meta.isBoolean && (
            <Input
              type="number"
              value={currentValue}
              onChange={(e) => onValueChange(parseInt(e.target.value) || 0)}
              className="w-20 h-8 text-right text-sm"
              min="0"
            />
          )}
          <Switch
            checked={currentEnabled}
            onCheckedChange={onEnabledChange}
          />
        </div>
      </div>
    </Card>
  );
}
