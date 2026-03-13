import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Plus, Trash2, Clock, Loader2 } from 'lucide-react';
import { useAIInsights, METRIC_LABELS, type MetricType, type Frequency } from '@/hooks/useAIInsights';

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i === 0 ? '12' : i > 12 ? i - 12 : i}:00 ${i < 12 ? 'AM' : 'PM'}`,
}));

interface AIInsightsSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIInsightsSettings({ open, onOpenChange }: AIInsightsSettingsProps) {
  const {
    trackers, trackersLoading,
    preferences, prefsLoading,
    addTracker, updateTracker, deleteTracker, updatePreferences,
  } = useAIInsights();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newMetric, setNewMetric] = useState<MetricType>('leads_added');
  const [newFreq, setNewFreq] = useState<Frequency>('daily');
  const [newHour, setNewHour] = useState(20);

  const handleAddTracker = () => {
    addTracker.mutate({ metric_type: newMetric, frequency: newFreq, notify_hour: newHour });
    setShowAddForm(false);
  };

  const togglePref = (key: 'daily_snapshot' | 'ai_alerts' | 'coaching_insights' | 'weekly_team_summary', value: boolean) => {
    updatePreferences.mutate({ [key]: value });
  };

  const loading = trackersLoading || prefsLoading;
  const prefs = preferences || { daily_snapshot: true, ai_alerts: true, coaching_insights: true, weekly_team_summary: true, snapshot_hour: 20 };

  // Metrics already tracked
  const usedMetrics = new Set(trackers.map(t => t.metric_type));
  const availableMetrics = (Object.keys(METRIC_LABELS) as MetricType[]).filter(m => !usedMetrics.has(m));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 rounded-t-2xl">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Insights Settings
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Global Toggles */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Automatic Insights</h3>
                <ToggleRow
                  label="Daily Snapshot"
                  description="Get a summary of your business numbers every day"
                  checked={prefs.daily_snapshot}
                  onChange={(v) => togglePref('daily_snapshot', v)}
                />
                <ToggleRow
                  label="AI Alerts"
                  description="Alerts for team gaps, stuck prospects, activity drops"
                  checked={prefs.ai_alerts}
                  onChange={(v) => togglePref('ai_alerts', v)}
                />
                <ToggleRow
                  label="Coaching Insights"
                  description="Weekly tips to improve your business activity"
                  checked={prefs.coaching_insights}
                  onChange={(v) => togglePref('coaching_insights', v)}
                />
                <ToggleRow
                  label="Team Summary"
                  description="Weekly team performance summary (leaders only)"
                  checked={prefs.weekly_team_summary}
                  onChange={(v) => togglePref('weekly_team_summary', v)}
                />

                {/* Snapshot hour */}
                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">Notification Time (IST)</span>
                  </div>
                  <Select
                    value={String(prefs.snapshot_hour)}
                    onValueChange={(v) => updatePreferences.mutate({ snapshot_hour: parseInt(v) })}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map(h => (
                        <SelectItem key={h.value} value={String(h.value)}>{h.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Trackers Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">AI Trackers</h3>
                  {availableMetrics.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs rounded-full"
                      onClick={() => {
                        setNewMetric(availableMetrics[0]);
                        setShowAddForm(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Tracker
                    </Button>
                  )}
                </div>

                {/* Add Tracker Form */}
                {showAddForm && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block">Metric</label>
                        <Select value={newMetric} onValueChange={(v) => setNewMetric(v as MetricType)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {availableMetrics.map(m => (
                              <SelectItem key={m} value={m}>{METRIC_LABELS[m]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block">Frequency</label>
                        <Select value={newFreq} onValueChange={(v) => setNewFreq(v as Frequency)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(['daily', 'weekly', 'monthly'] as Frequency[]).map(f => (
                              <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Notify at (IST)</label>
                      <Select value={String(newHour)} onValueChange={(v) => setNewHour(parseInt(v))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {HOURS.map(h => (
                            <SelectItem key={h.value} value={String(h.value)}>{h.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleAddTracker} disabled={addTracker.isPending}>
                        {addTracker.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowAddForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {/* Tracker List */}
                {trackers.length === 0 && !showAddForm && (
                  <p className="text-xs text-muted-foreground py-2">No trackers yet. Add one to get automatic metric updates.</p>
                )}
                {trackers.map(t => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{METRIC_LABELS[t.metric_type] || t.metric_type}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {FREQUENCY_LABELS[t.frequency]} · {HOURS.find(h => h.value === t.notify_hour)?.label || `${t.notify_hour}:00`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={t.is_active}
                        onCheckedChange={(v) => updateTracker.mutate({ id: t.id, is_active: v })}
                        className="scale-90"
                      />
                      <button
                        onClick={() => deleteTracker.mutate(t.id)}
                        className="p-1 rounded hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="min-w-0 flex-1 mr-3">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
