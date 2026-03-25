import { useState, useEffect, useCallback } from 'react';
import { Prospect, FunnelStage, ProspectStatus, FUNNEL_STAGES, EXTENDED_ACTIONS, STATUSES, ExtendedActionTaken, ActionTaken } from '@/types/prospect';
import { InlineSelect } from './InlineSelect';
import { StatusBadge, StageBadge, ActionBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Phone, Trash2, Calendar as CalendarIcon, ChevronDown, MapPin, Target, X } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/ActionIcons';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { useCustomOptionsContext } from '@/contexts/CustomOptionsContext';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';

interface MobileProspectCardProps {
  prospect: Prospect;
  index: number;
  isCalling: boolean;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onDelete: (id: string) => Promise<boolean>;
  isLastContacted?: boolean;
  onMarkLastContacted?: () => void;
}

export function MobileProspectCard({ prospect, index, isCalling, onUpdate, onDelete, isLastContacted = false, onMarkLastContacted }: MobileProspectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Optimistic state for instant UI updates
  const [optimisticAction, setOptimisticAction] = useState<ExtendedActionTaken | null>(null);
  const [optimisticStage, setOptimisticStage] = useState<string | null>(null);
  
const [localData, setLocalData] = useState({
    name: prospect.name,
    phone: prospect.phone,
    phone2: (prospect as any).phone2 || '',
    address: prospect.address || '',
    age_or_dob: prospect.age_or_dob || '',
    gender: prospect.gender || '',
    why_need: prospect.why_need || '',
    notes: prospect.notes || '',
    instagram: prospect.instagram || '',
    profession: prospect.profession || '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const { activities } = useActivityLogs();
  const { getOptionsForType, getCustomOptionsForType, addOption, deleteOption } = useCustomOptionsContext();
  const { 
    // Leads tags
    leadsTrackingTags,
    leadsNonTrackingTags,
    leadsTrackingTagNames,
    leadsFinalTargetTag,
    isLeadsFinalTarget,
    leadsStageTag,
    
    // Stage tags
    stageTags,
    stageNonTrackingTags,
    stageTagNames,
    stageFinalTargetTag,
    isStageFinalTarget,
    
    // Helpers
    handleTargetComplete 
  } = useTrackingFormatContext();

  // Build dropdown options ONLY from TrackingFormatContext (no custom_options fallback)
  const hasLeadsTrackingTags = leadsTrackingTagNames.length > 0;
  const actionOptions = hasLeadsTrackingTags 
    ? [...leadsTrackingTagNames, ...leadsNonTrackingTags]
    : EXTENDED_ACTIONS as string[];
  
  const hasStageTrackingTags = stageTagNames.length > 0;
  const stageOptions = hasStageTrackingTags
    ? [...stageTagNames, ...stageNonTrackingTags]
    : FUNNEL_STAGES as string[];
    
  const statusOptions = getOptionsForType('prospect_status', STATUSES) as (typeof STATUSES[number])[];

  // Only reset local data when switching to a different lead
  useEffect(() => {
    setLocalData({
      name: prospect.name,
      phone: prospect.phone,
      phone2: (prospect as any).phone2 || '',
      address: prospect.address || '',
      age_or_dob: prospect.age_or_dob || '',
      gender: prospect.gender || '',
      why_need: prospect.why_need || '',
      notes: prospect.notes || '',
      instagram: prospect.instagram || '',
      profession: prospect.profession || '',
    });
    // Clear optimistic state when prospect updates
    setOptimisticAction(null);
    setOptimisticStage(null);
  }, [prospect.id]); // Only reset when lead ID changes

  const prospectActivities = activities
    .filter(log => log.prospect_id === prospect.id)
    .slice(0, 3);

  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9+]/g, '');

  const openWhatsApp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkLastContacted?.();
    // Use whatsapp:// protocol to open native app directly
    window.location.href = `whatsapp://send?phone=${cleanPhoneNumber(prospect.phone)}`;
  }, [prospect.phone, onMarkLastContacted]);

  const openCall = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkLastContacted?.();
    window.open(`tel:${cleanPhoneNumber(prospect.phone)}`, '_self');
  }, [prospect.phone, onMarkLastContacted]);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(prospect.id);
    setIsDeleting(false);
  };


  // Handle action change with Leads target completion check + optimistic update
  const handleActionChange = async (value: ExtendedActionTaken) => {
    // Optimistic update
    setOptimisticAction(value);
    
    const updates: Partial<Prospect> = {};
    updates.action_taken = value as ActionTaken;
    
    // Check if this is the final Leads target tag
    if (isLeadsFinalTarget(value)) {
      handleTargetComplete(value, prospect.name);
    }
    
    const result = await onUpdate(prospect.id, updates);
    if (!result) {
      setOptimisticAction(null);
    }
  };

  // Handle stage change with Stage target completion check + optimistic update
  const handleStageChange = async (value: string) => {
    // Optimistic update
    setOptimisticStage(value);
    
    const updates: Partial<Prospect> = { funnel_stage: value };
    
    // Check if this is the final Stage target tag
    if (isStageFinalTarget(value)) {
      handleTargetComplete(value, prospect.name);
    }
    
    const result = await onUpdate(prospect.id, updates);
    if (!result) {
      setOptimisticStage(null);
    }
  };

  const getActionDisplayValue = (): ExtendedActionTaken | null => {
    if (optimisticAction !== null) return optimisticAction;
    return prospect.action_taken || null;
  };
  
  const getStageDisplayValue = (): string | null => {
    if (optimisticStage !== null) return optimisticStage;
    return prospect.funnel_stage || null;
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
    <div className={cn(
      "bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden transition-all duration-300",
      isLastContacted && "ring-2 ring-primary/50 bg-primary/5"
    )}>
      {/* Header: Name + Phone + Quick Actions */}
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
            {/* Phone number only - no age/gender */}
            <button 
              onClick={openCall}
              className="text-sm text-muted-foreground font-medium hover:text-accent transition-colors text-left"
            >
              {localData.phone}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={openCall}>
              <Phone className="h-4 w-4 text-accent" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 border-green-500/50 bg-green-500 text-white hover:bg-green-600 dark:hover:bg-green-600" 
              onClick={openWhatsApp}
            >
              <WhatsAppIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status Chips Row - Tracking Tags */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-2 bg-muted/10">
        {!isCalling && (
          <InlineSelect<FunnelStage>
            value={getStageDisplayValue() as FunnelStage}
            options={stageOptions as FunnelStage[]}
            onChange={handleStageChange}
            renderValue={(value) => <StageBadge stage={value} />}
            placeholder="Stage"
            showTagSeparation={hasStageTrackingTags}
            trackingOptions={stageTagNames}
            nonTrackingOptions={stageNonTrackingTags}
            finalTargetTag={stageFinalTargetTag}
          />
        )}
        <InlineSelect<ExtendedActionTaken>
          value={getActionDisplayValue()}
          options={actionOptions as ExtendedActionTaken[]}
          onChange={handleActionChange}
          placeholder="Response"
          renderValue={(value) => <ActionBadge action={value as any} />}
          showTagSeparation={hasLeadsTrackingTags}
          trackingOptions={leadsTrackingTagNames}
          nonTrackingOptions={leadsNonTrackingTags}
          finalTargetTag={leadsFinalTargetTag}
          stageTag={leadsStageTag}
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
                <AlertDialogTitle>Delete lead?</AlertDialogTitle>
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
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Input
                  value={localData.address}
                  onChange={(e) => setLocalData(prev => ({ ...prev, address: e.target.value }))}
                  onBlur={handleAddressBlur}
                  placeholder="City, State"
                  className="h-8 text-sm"
                />
              </div>
              {localData.phone2 || true ? (
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">Phone 2</label>
                  <Input
                    value={localData.phone2}
                    onChange={(e) => setLocalData(prev => ({ ...prev, phone2: e.target.value }))}
                    onBlur={() => handleFieldUpdate('phone2' as any, localData.phone2)}
                    placeholder="Alt number"
                    className="h-8 text-sm"
                  />
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Age</label>
                <Input
                  value={localData.age_or_dob}
                  onChange={(e) => setLocalData(prev => ({ ...prev, age_or_dob: e.target.value }))}
                  onBlur={() => handleFieldUpdate('age_or_dob', localData.age_or_dob)}
                  placeholder="25"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Gender</label>
                <Input
                  value={localData.gender}
                  onChange={(e) => setLocalData(prev => ({ ...prev, gender: e.target.value }))}
                  onBlur={() => handleFieldUpdate('gender', localData.gender)}
                  placeholder="M/F"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Profession</label>
                <Input
                  value={localData.profession}
                  onChange={(e) => setLocalData(prev => ({ ...prev, profession: e.target.value }))}
                  onBlur={() => handleFieldUpdate('profession', localData.profession)}
                  placeholder="student / job"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Instagram</label>
              <Input
                value={localData.instagram}
                onChange={(e) => setLocalData(prev => ({ ...prev, instagram: e.target.value }))}
                onBlur={() => handleFieldUpdate('instagram', localData.instagram)}
                placeholder="@username"
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
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity History</h4>
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
