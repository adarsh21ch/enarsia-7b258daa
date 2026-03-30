import { useState, useEffect } from 'react';
import { Prospect, FUNNEL_STAGES, ACTIONS, STATUSES, FunnelStage, ActionTaken, ProspectStatus } from '@/types/prospect';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { StageBadge, StatusBadge, ActionBadge } from './StatusBadge';
import { X, Phone, ChevronDown, Instagram, Clock, Trash2, MessageSquareText, Mail } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/ActionIcons';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTrackingTags } from '@/hooks/useTrackingTags';

interface InlineReportCardProps {
  prospect: Prospect;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onDelete: (id: string) => Promise<boolean | Prospect | null>;
  onClose: () => void;
  colSpan: number;
}

// Clickable tag that opens a dropdown for selection
function EditableTag<T extends string>({ 
  value, 
  options, 
  onChange, 
  renderBadge,
  placeholder = "Select"
}: { 
  value: T | null | undefined; 
  options: readonly T[]; 
  onChange: (val: T | null) => void;
  renderBadge: (val: T) => React.ReactNode;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-0.5 hover:opacity-80 transition-opacity cursor-pointer">
          {value ? renderBadge(value) : (
            <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">{placeholder}</span>
          )}
          <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1 bg-popover border-border z-50" align="start">
        <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={cn(
                "text-left px-2 py-1 text-xs rounded hover:bg-muted/50 transition-colors",
                value === opt && "bg-primary/10 text-primary"
              )}
            >
              {opt}
            </button>
          ))}
          {value && (
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className="text-left px-2 py-1 text-xs rounded hover:bg-destructive/10 text-muted-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function InlineReportCard({ prospect, onUpdate, onDelete, onClose, colSpan }: InlineReportCardProps) {
const [localData, setLocalData] = useState<Partial<Prospect>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const { callingTrackingTags, stageTrackingTags } = useTrackingTags();

  // Use tracking tags if configured, otherwise fall back to default
  const actionOptions = callingTrackingTags.length > 0 ? callingTrackingTags : ACTIONS;
  const stageOptions = stageTrackingTags.length > 0 ? stageTrackingTags : FUNNEL_STAGES;

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
      currently_doing: prospect.currently_doing || '',
      notes: prospect.notes || '',
      funnel_stage: prospect.funnel_stage,
      action_taken: prospect.action_taken,
      prospect_status: prospect.prospect_status,
      instagram: prospect.instagram || '',
      profession: prospect.profession || '',
      email: prospect.email || '',
    });
  }, [prospect.id]); // Only reset when lead ID changes

  const handleFieldChange = (field: string, value: any) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-save on blur - saves individual field immediately
  const handleFieldBlur = async (field: string) => {
    const currentValue = localData[field as keyof typeof localData];
    const originalValue = prospect[field as keyof Prospect];
    
    // Normalize empty strings to null for comparison
    const normalizedCurrent = currentValue === '' ? null : currentValue;
    const normalizedOriginal = originalValue === '' ? null : originalValue;
    
    if (normalizedCurrent !== normalizedOriginal) {
      try {
        await onUpdate(prospect.id, { [field]: normalizedCurrent } as any);
      } catch (error) {
        toast.error('Failed to save');
      }
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await onDelete(prospect.id);
      if (result) {
        toast.success('Lead deleted');
        onClose();
      }
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const cleanPhoneNumber = (phone: string) => {
    return phone.replace(/[^0-9+]/g, '');
  };

  const openWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Use whatsapp:// protocol to open native app directly
    window.location.href = `whatsapp://send?phone=${cleanPhoneNumber(prospect.phone)}`;
  };

  const openCall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cleanPhone = cleanPhoneNumber(prospect.phone);
    window.open(`tel:${cleanPhone}`, '_self');
  };

  const openInstagram = () => {
    if (localData.instagram) {
      const username = localData.instagram.replace('@', '').trim();
      if (username) {
        window.open(`https://instagram.com/${username}`, '_blank');
      }
    }
  };

  const openSMS = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `sms:${cleanPhoneNumber(prospect.phone)}`;
  };


  return (
    <tr className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
      <td colSpan={colSpan} className="p-0">
        <div className="relative px-3 py-2 border-t border-b border-primary/20 bg-gradient-to-b from-muted/40 to-background/50 backdrop-blur-sm shadow-inner">
          {/* Close button - top right */}
          <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-1.5 right-1.5 h-6 w-6 z-10">
            <X className="h-3 w-3" />
          </Button>

          {/* Row 1: Name + Tags */}
          <div className="flex items-center gap-2 flex-wrap mb-1 pr-7">
            <span className="font-semibold text-foreground text-sm">{localData.name}</span>
            {localData.instagram && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-pink-500 hover:text-pink-600 hover:bg-pink-500/10" onClick={openInstagram}>
                <Instagram className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <EditableTag
              value={localData.action_taken as ActionTaken}
              options={actionOptions}
              onChange={(val) => handleFieldChange('action_taken', val)}
              renderBadge={(val) => <ActionBadge action={val} />}
              placeholder="Response (tracking)"
            />
            <EditableTag
              value={localData.funnel_stage as FunnelStage}
              options={stageOptions}
              onChange={(val) => handleFieldChange('funnel_stage', val)}
              renderBadge={(val) => <StageBadge stage={val} />}
              placeholder="Stage (tracking)"
            />
            <EditableTag
              value={localData.prospect_status as ProspectStatus}
              options={STATUSES}
              onChange={(val) => handleFieldChange('prospect_status', val)}
              renderBadge={(val) => <StatusBadge status={val} />}
              placeholder="Quality"
            />
          </div>

          {/* Row 1.5: Action Buttons - Call / Text / WhatsApp */}
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="outline"
              className="flex-1 h-8 gap-1.5 text-xs font-medium border-accent/30 text-accent hover:bg-accent/10"
              onClick={openCall}
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-8 gap-1.5 text-xs font-medium border-blue-400/30 text-blue-500 hover:bg-blue-500/10"
              onClick={openSMS}
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              Text
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-8 gap-1.5 text-xs font-medium border-green-400/30 text-green-600 hover:bg-green-500/10"
              onClick={openWhatsApp}
            >
              <WhatsAppIcon className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
          </div>

          {/* Row 2: Compact editable fields grid */}
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-2">
            {/* Name */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Name *</Label>
              <Input
                value={localData.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                onBlur={() => handleFieldBlur('name')}
                className="h-7 text-xs"
              />
            </div>
            {/* Phone 1 */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Phone 1 *</Label>
              <Input
                value={localData.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                onBlur={() => handleFieldBlur('phone')}
                className="h-7 text-xs"
              />
            </div>
            {/* Phone 2 */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Phone 2</Label>
              <Input
                value={localData.phone2 || ''}
                onChange={(e) => handleFieldChange('phone2', e.target.value)}
                onBlur={() => handleFieldBlur('phone2')}
                className="h-7 text-xs"
                placeholder="Alt number"
              />
            </div>
            {/* Address */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Address</Label>
              <Input
                value={localData.address || ''}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                onBlur={() => handleFieldBlur('address')}
                className="h-7 text-xs"
                placeholder="City, State"
              />
            </div>
            {/* Age */}
            <div className="w-16">
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Age</Label>
              <Input
                value={localData.age_or_dob || ''}
                onChange={(e) => handleFieldChange('age_or_dob', e.target.value)}
                onBlur={() => handleFieldBlur('age_or_dob')}
                className="h-7 text-xs w-16"
                placeholder="25"
              />
            </div>
            {/* Gender */}
            <div className="w-16">
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Gender</Label>
              <Input
                value={localData.gender || ''}
                onChange={(e) => handleFieldChange('gender', e.target.value)}
                onBlur={() => handleFieldBlur('gender')}
                className="h-7 text-xs w-16"
                placeholder="M/F"
              />
            </div>
            {/* Profession */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Profession</Label>
              <Input
                value={localData.profession || localData.currently_doing || ''}
                onChange={(e) => handleFieldChange('profession', e.target.value)}
                onBlur={() => handleFieldBlur('profession')}
                className="h-7 text-xs"
                placeholder="student / job"
              />
            </div>
            {/* Instagram */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Instagram</Label>
              <Input
                value={localData.instagram || ''}
                onChange={(e) => handleFieldChange('instagram', e.target.value)}
                onBlur={() => handleFieldBlur('instagram')}
                className="h-7 text-xs"
                placeholder="@username"
              />
            </div>
          </div>

          {/* Row 3: Why/Need + Notes + Date Added */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-0.5 block">Why / Need</Label>
                <Textarea
                  value={localData.why_need || ''}
                  onChange={(e) => handleFieldChange('why_need', e.target.value)}
                  onBlur={() => handleFieldBlur('why_need')}
                  placeholder="Reason for earning..."
                  className="min-h-[36px] h-9 text-xs resize-none"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-0.5 block">Notes</Label>
                <Textarea
                  value={localData.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  onBlur={() => handleFieldBlur('notes')}
                  placeholder="Call notes..."
                  className="min-h-[36px] h-9 text-xs resize-none"
                />
              </div>
            </div>
            <div className="flex items-end">
              <div className="flex flex-col text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Added {format(parseISO(prospect.date_added), 'MMM d, yyyy')}
                </span>
                <span className="hidden sm:inline">
                  Updated {formatDistanceToNow(parseISO(prospect.updated_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          {/* Delete button */}
          <div className="mt-3 pt-2 border-t border-border/50">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 px-3 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete lead
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove <strong>{prospect.name}</strong> and their data from Calling. This action cannot be undone.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete} 
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete lead'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </td>
    </tr>
  );
}