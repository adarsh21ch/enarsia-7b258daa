import { useState, useEffect } from 'react';
import { Prospect, FunnelStage, ProspectStatus, FUNNEL_STAGES, EXTENDED_ACTIONS, STATUSES, ExtendedActionTaken, ActionTaken } from '@/types/prospect';
import { InlineSelect } from './InlineSelect';
import { StatusBadge, StageBadge, ActionBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageCircle, Phone, Trash2, Calendar as CalendarIcon, ChevronDown, MapPin, Target } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { useCustomOptionsContext } from '@/contexts/CustomOptionsContext';

interface MobileProspectCardProps {
  prospect: Prospect;
  index: number;
  isCalling: boolean;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onDelete: (id: string) => Promise<boolean>;
}

export function MobileProspectCard({ prospect, index, isCalling, onUpdate, onDelete }: MobileProspectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localData, setLocalData] = useState({
    name: prospect.name,
    phone: prospect.phone,
    address: prospect.address || '',
    why_need: prospect.why_need || '',
    notes: prospect.notes || '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const { activities } = useActivityLogs();
  const { addOption, deleteOption, getOptionsForType, getCustomOptionsForType } = useCustomOptionsContext();

  // Get combined options (cast to proper types)
  const stageOptions = getOptionsForType('funnel_stage', FUNNEL_STAGES) as (typeof FUNNEL_STAGES[number])[];
  const actionOptions = getOptionsForType('action_taken', EXTENDED_ACTIONS) as (typeof EXTENDED_ACTIONS[number])[];
  const statusOptions = getOptionsForType('prospect_status', STATUSES) as (typeof STATUSES[number])[];

  useEffect(() => {
    setLocalData({
      name: prospect.name,
      phone: prospect.phone,
      address: prospect.address || '',
      why_need: prospect.why_need || '',
      notes: prospect.notes || '',
    });
  }, [prospect]);

  const prospectActivities = activities
    .filter(log => log.prospect_id === prospect.id)
    .slice(0, 3);

  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9+]/g, '');

  const openWhatsApp = () => {
    window.location.href = `whatsapp://send?phone=${cleanPhoneNumber(prospect.phone)}`;
  };

  const openCall = () => {
    window.location.href = `tel:${cleanPhoneNumber(prospect.phone)}`;
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(prospect.id);
    setIsDeleting(false);
  };

  // Handle action change - if "Enrollment" is selected, also update enrollment_status
  const handleActionChange = (value: ExtendedActionTaken) => {
    const updates: Partial<Prospect> = {};
    
    if (value === 'Enrollment') {
      updates.enrollment_status = 'Enrolled';
      if (!prospect.funnel_stage) {
        updates.funnel_stage = 'Day 1';
      }
      updates.action_taken = prospect.action_taken;
    } else {
      updates.action_taken = value as ActionTaken;
    }
    
    onUpdate(prospect.id, updates);
  };

  const getActionDisplayValue = (): ExtendedActionTaken | null => {
    if (prospect.enrollment_status === 'Enrolled') {
      return 'Enrollment';
    }
    return prospect.action_taken || null;
  };

  const handleFieldUpdate = (field: keyof Prospect, value: any) => {
    if (value !== (prospect as any)[field]) {
      onUpdate(prospect.id, { [field]: value || null });
    }
  };

  // Handle address field
  const handleAddressChange = (value: string) => {
    setLocalData(prev => ({ ...prev, address: value }));
  };

  const handleAddressBlur = () => {
    if (localData.address !== prospect.address) {
      onUpdate(prospect.id, { address: localData.address || null });
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
      {/* Header: Name + Phone + Age/Gender + Quick Actions */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground bg-muted/60 rounded-md px-2 py-0.5">
                #{index}
              </span>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  "group flex items-center gap-1.5 text-base font-bold text-foreground hover:text-primary transition-all duration-200 text-left truncate",
                  "hover:bg-primary/5 px-1.5 py-0.5 -ml-1.5 rounded-md active:scale-[0.98]",
                  isExpanded && "text-primary bg-primary/10"
                )}
              >
                <span className="truncate">{prospect.name}</span>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-transform duration-200",
                  isExpanded && "rotate-180 text-primary"
                )} />
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                onClick={openCall}
                className="text-sm text-muted-foreground font-medium hover:text-accent transition-colors text-left"
              >
                {localData.phone}
              </button>
              <span className="text-xs text-muted-foreground">
                Age: {(prospect as any).age_or_dob || '–'}
              </span>
              <span className="text-xs text-muted-foreground">
                Gender: {(prospect as any).gender || '–'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={openCall}>
              <Phone className="h-4 w-4 text-accent" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600" onClick={openWhatsApp}>
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status Chips Row (removed Priority) */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-2 bg-muted/10">
        {!isCalling && (
          <InlineSelect<FunnelStage>
            value={prospect.funnel_stage}
            options={stageOptions as FunnelStage[]}
            onChange={(value) => onUpdate(prospect.id, { funnel_stage: value })}
            renderValue={(value) => <StageBadge stage={value} />}
            placeholder="Stage"
            optionType="funnel_stage"
            customOptions={getCustomOptionsForType('funnel_stage')}
            onAddOption={addOption}
            onDeleteOption={deleteOption}
            defaultOptions={FUNNEL_STAGES}
          />
        )}
        <InlineSelect<ExtendedActionTaken>
          value={getActionDisplayValue()}
          options={(isCalling ? actionOptions : actionOptions.filter(a => a !== 'Enrollment')) as ExtendedActionTaken[]}
          onChange={handleActionChange}
          placeholder="Response"
          renderValue={(value) => <ActionBadge action={value as any} />}
          optionType="action_taken"
          customOptions={getCustomOptionsForType('action_taken')}
          onAddOption={addOption}
          onDeleteOption={deleteOption}
          defaultOptions={EXTENDED_ACTIONS}
        />
        <InlineSelect<ProspectStatus>
          value={prospect.prospect_status}
          options={statusOptions as ProspectStatus[]}
          onChange={(value) => onUpdate(prospect.id, { prospect_status: value })}
          placeholder="Status"
          renderValue={(value) => <StatusBadge status={value} />}
          optionType="prospect_status"
          customOptions={getCustomOptionsForType('prospect_status')}
          onAddOption={addOption}
          onDeleteOption={deleteOption}
          defaultOptions={STATUSES}
        />
      </div>

      {/* Date + Notes Preview + Expand */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-border/30">
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs px-2 hover:bg-muted/50">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                {prospect.last_contact_date ? format(parseISO(prospect.last_contact_date), 'MMM d') : 'Set date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border-border z-50" align="start">
              <Calendar
                mode="single"
                selected={prospect.last_contact_date ? parseISO(prospect.last_contact_date) : undefined}
                onSelect={(date) => onUpdate(prospect.id, { last_contact_date: date ? format(date, 'yyyy-MM-dd') : null })}
              />
            </PopoverContent>
          </Popover>
          {prospect.notes && !isExpanded && (
            <p className="text-xs text-muted-foreground truncate max-w-[120px]">
              {prospect.notes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-8 w-8 transition-all duration-200",
              isExpanded && "bg-primary/10 text-primary"
            )} 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform duration-200",
              isExpanded && "rotate-180"
            )} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete prospect?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {prospect.name}?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive">
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Expanded Report Card */}
      {isExpanded && (
        <div className="border-t border-border/50 p-4 space-y-4 bg-muted/10 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {/* Contact Info */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</h4>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                value={localData.address}
                onChange={(e) => handleAddressChange(e.target.value)}
                onBlur={handleAddressBlur}
                placeholder="City, State"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Why/Need */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Why / Need
            </h4>
            <Textarea
              value={localData.why_need}
              onChange={(e) => setLocalData(prev => ({ ...prev, why_need: e.target.value }))}
              onBlur={() => handleFieldUpdate('why_need', localData.why_need)}
              placeholder="Why do they want to earn?"
              className="min-h-[60px] text-sm resize-none"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</h4>
            <Textarea
              value={localData.notes}
              onChange={(e) => setLocalData(prev => ({ ...prev, notes: e.target.value }))}
              onBlur={() => handleFieldUpdate('notes', localData.notes)}
              placeholder="Call notes, action items..."
              className="min-h-[80px] text-sm resize-none"
            />
          </div>

          {/* Recent Activity */}
          {prospectActivities.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h4>
              <div className="space-y-1.5">
                {prospectActivities.map((activity) => (
                  <div key={activity.id} className="text-xs bg-background rounded-lg p-2 border border-border/30">
                    <p className="text-foreground">{activity.description}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="pt-2 border-t border-border/30 text-xs text-muted-foreground">
            <p>Added {formatDistanceToNow(parseISO(prospect.date_added), { addSuffix: true })}</p>
          </div>
        </div>
      )}
    </div>
  );
}
