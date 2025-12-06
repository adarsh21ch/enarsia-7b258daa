import { useState, useEffect } from 'react';
import { Prospect, FUNNEL_STAGES, ACTIONS, STATUSES, FunnelStage, ActionTaken, ProspectStatus } from '@/types/prospect';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { StageBadge, StatusBadge, ActionBadge } from './StatusBadge';
import { Save, X, Phone, MessageCircle, ChevronDown, Instagram, Clock } from 'lucide-react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface InlineReportCardProps {
  prospect: Prospect;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
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

export function InlineReportCard({ prospect, onUpdate, onClose, colSpan }: InlineReportCardProps) {
  const [localData, setLocalData] = useState<Partial<Prospect>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalData({
      name: prospect.name,
      phone: prospect.phone,
      city: prospect.city || '',
      state: prospect.state || '',
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
    });
    setHasChanges(false);
  }, [prospect]);

  const handleFieldChange = (field: string, value: any) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Handle combined address field
  const handleAddressChange = (value: string) => {
    const parts = value.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      setLocalData(prev => ({ ...prev, city: parts[0], state: parts.slice(1).join(', ') }));
    } else {
      setLocalData(prev => ({ ...prev, city: value, state: '' }));
    }
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    try {
      const updates: Partial<Prospect> = {};
      
      if (localData.name !== prospect.name) updates.name = localData.name;
      if (localData.phone !== prospect.phone) updates.phone = localData.phone;
      if ((localData.city || null) !== (prospect.city || null)) updates.city = localData.city || null;
      if ((localData.state || null) !== (prospect.state || null)) updates.state = localData.state || null;
      if ((localData.age_or_dob || null) !== (prospect.age_or_dob || null)) updates.age_or_dob = localData.age_or_dob || null;
      if ((localData.gender || null) !== (prospect.gender || null)) updates.gender = localData.gender || null;
      if ((localData.why_need || null) !== (prospect.why_need || null)) updates.why_need = localData.why_need || null;
      if ((localData.currently_doing || null) !== (prospect.currently_doing || null)) updates.currently_doing = localData.currently_doing || null;
      if ((localData.notes || null) !== (prospect.notes || null)) updates.notes = localData.notes || null;
      if (localData.funnel_stage !== prospect.funnel_stage) updates.funnel_stage = localData.funnel_stage;
      if (localData.action_taken !== prospect.action_taken) updates.action_taken = localData.action_taken;
      if (localData.prospect_status !== prospect.prospect_status) updates.prospect_status = localData.prospect_status;
      if ((localData.instagram || null) !== (prospect.instagram || null)) updates.instagram = localData.instagram || null;
      if ((localData.profession || null) !== (prospect.profession || null)) updates.profession = localData.profession || null;

      if (Object.keys(updates).length > 0) {
        const result = await onUpdate(prospect.id, updates as any);
        if (result) {
          toast.success('Prospect updated');
          setHasChanges(false);
        }
      }
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const cleanPhoneNumber = (phone: string) => {
    return phone.replace(/[^0-9+]/g, '');
  };

  const openWhatsApp = () => {
    const cleanPhone = cleanPhoneNumber(prospect.phone);
    window.location.href = `whatsapp://send?phone=${cleanPhone}`;
  };

  const openCall = () => {
    const cleanPhone = cleanPhoneNumber(prospect.phone);
    window.location.href = `tel:${cleanPhone}`;
  };

  const openInstagram = () => {
    if (localData.instagram) {
      const username = localData.instagram.replace('@', '').trim();
      if (username) {
        window.open(`https://instagram.com/${username}`, '_blank');
      }
    }
  };

  return (
    <tr className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
      <td colSpan={colSpan} className="p-0">
        <div className="px-3 py-2 border-t border-b border-primary/20 bg-gradient-to-b from-muted/40 to-background/50 backdrop-blur-sm shadow-inner">
          {/* Row 1: Header - Name with Tags, Quick Actions, Close */}
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground text-sm">{localData.name}</span>
              {/* Editable Stage/Quality/Action tags */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <EditableTag
                  value={localData.funnel_stage as FunnelStage}
                  options={FUNNEL_STAGES}
                  onChange={(val) => handleFieldChange('funnel_stage', val)}
                  renderBadge={(val) => <StageBadge stage={val} />}
                  placeholder="Stage"
                />
                <EditableTag
                  value={localData.prospect_status as ProspectStatus}
                  options={STATUSES}
                  onChange={(val) => handleFieldChange('prospect_status', val)}
                  renderBadge={(val) => <StatusBadge status={val} />}
                  placeholder="Quality"
                />
                <EditableTag
                  value={localData.action_taken as ActionTaken}
                  options={ACTIONS}
                  onChange={(val) => handleFieldChange('action_taken', val)}
                  renderBadge={(val) => <ActionBadge action={val} />}
                  placeholder="Action"
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Quick Call/WhatsApp/Instagram */}
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent/10" onClick={openCall}>
                <Phone className="h-3.5 w-3.5 text-accent" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={openWhatsApp}>
                <MessageCircle className="h-3.5 w-3.5" />
              </Button>
              {localData.instagram && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-pink-500 hover:text-pink-600 hover:bg-pink-500/10" onClick={openInstagram}>
                  <Instagram className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 ml-1">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Row 2: Compact editable fields grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
            {/* Name */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Name *</Label>
              <Input
                value={localData.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            {/* Phone */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Phone *</Label>
              <Input
                value={localData.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            {/* Address (combined city & state) */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Address</Label>
              <Input
                value={[localData.city, localData.state].filter(Boolean).join(', ')}
                onChange={(e) => handleAddressChange(e.target.value)}
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
                className="h-7 text-xs w-16"
                placeholder="25"
              />
            </div>
            {/* Profession */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Profession</Label>
              <Input
                value={localData.profession || localData.currently_doing || ''}
                onChange={(e) => handleFieldChange('profession', e.target.value)}
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
                className="h-7 text-xs"
                placeholder="@username"
              />
            </div>
          </div>

          {/* Row 3: Why/Need + Notes + Date Added + Save */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-0.5 block">Why / Need</Label>
                <Textarea
                  value={localData.why_need || ''}
                  onChange={(e) => handleFieldChange('why_need', e.target.value)}
                  placeholder="Reason for earning..."
                  className="min-h-[36px] h-9 text-xs resize-none"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-0.5 block">Notes</Label>
                <Textarea
                  value={localData.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="Call notes..."
                  className="min-h-[36px] h-9 text-xs resize-none"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex flex-col text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Added {format(parseISO(prospect.date_added), 'MMM d, yyyy')}
                </span>
                <span className="hidden sm:inline">
                  Updated {formatDistanceToNow(parseISO(prospect.updated_at), { addSuffix: true })}
                </span>
              </div>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !hasChanges}
                size="sm"
                className={cn("h-8 px-3 gap-1.5 text-xs", hasChanges && "bg-primary hover:bg-primary/90")}
              >
                <Save className="h-3 w-3" />
                {isSaving ? 'Saving...' : hasChanges ? 'Save' : 'Saved'}
              </Button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
