import { useState, useEffect } from 'react';
import { Prospect, FUNNEL_STAGES, ACTIONS, STATUSES, PRIORITIES, ENROLLMENT_STATUSES } from '@/types/prospect';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { StageBadge, StatusBadge, PriorityBadge, EnrollBadge } from './StatusBadge';
import { Phone, MessageCircle, Calendar as CalendarIcon, Save, X } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface InlineReportCardProps {
  prospect: Prospect;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onClose: () => void;
  colSpan: number;
}

export function InlineReportCard({ prospect, onUpdate, onClose, colSpan }: InlineReportCardProps) {
  const [localData, setLocalData] = useState<Partial<Prospect>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalData({
      name: prospect.name,
      phone: prospect.phone,
      email: prospect.email || '',
      city: prospect.city || '',
      state: prospect.state || '',
      age: prospect.age || undefined,
      date_of_birth: prospect.date_of_birth || '',
      why_need: prospect.why_need || '',
      currently_doing: prospect.currently_doing || '',
      notes: prospect.notes || '',
      funnel_stage: prospect.funnel_stage,
      enrollment_status: prospect.enrollment_status || 'Not Enrolled',
      action_taken: prospect.action_taken,
      prospect_status: prospect.prospect_status,
      priority: prospect.priority,
      last_contact_date: prospect.last_contact_date,
    });
    setHasChanges(false);
  }, [prospect]);

  const handleFieldChange = (field: keyof Prospect, value: any) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    try {
      const updates: Partial<Prospect> = {};
      
      if (localData.name !== prospect.name) updates.name = localData.name;
      if (localData.phone !== prospect.phone) updates.phone = localData.phone;
      if ((localData.email || null) !== (prospect.email || null)) updates.email = localData.email || null;
      if ((localData.city || null) !== (prospect.city || null)) updates.city = localData.city || null;
      if ((localData.state || null) !== (prospect.state || null)) updates.state = localData.state || null;
      if ((localData.age || null) !== (prospect.age || null)) updates.age = localData.age || null;
      if ((localData.date_of_birth || null) !== (prospect.date_of_birth || null)) updates.date_of_birth = localData.date_of_birth || null;
      if ((localData.why_need || null) !== (prospect.why_need || null)) updates.why_need = localData.why_need || null;
      if ((localData.currently_doing || null) !== (prospect.currently_doing || null)) updates.currently_doing = localData.currently_doing || null;
      if ((localData.notes || null) !== (prospect.notes || null)) updates.notes = localData.notes || null;
      if (localData.funnel_stage !== prospect.funnel_stage) updates.funnel_stage = localData.funnel_stage;
      if (localData.enrollment_status !== prospect.enrollment_status) updates.enrollment_status = localData.enrollment_status;
      if (localData.action_taken !== prospect.action_taken) updates.action_taken = localData.action_taken;
      if (localData.prospect_status !== prospect.prospect_status) updates.prospect_status = localData.prospect_status;
      if (localData.priority !== prospect.priority) updates.priority = localData.priority;
      if (localData.last_contact_date !== prospect.last_contact_date) updates.last_contact_date = localData.last_contact_date;

      if (Object.keys(updates).length > 0) {
        const result = await onUpdate(prospect.id, updates);
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

  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9+]/g, '');

  const openWhatsApp = () => {
    window.location.href = `whatsapp://send?phone=${cleanPhoneNumber(prospect.phone)}`;
  };

  const openCall = () => {
    window.location.href = `tel:${cleanPhoneNumber(prospect.phone)}`;
  };

  return (
    <tr className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
      <td colSpan={colSpan} className="p-0">
        <div className="px-3 py-2 border-t border-b border-primary/20 bg-gradient-to-b from-muted/40 to-background/50 backdrop-blur-sm shadow-inner">
          {/* Row 1: Header - Name, Badges, Actions, Close */}
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground text-sm">{localData.name}</span>
              <div className="flex items-center gap-1 flex-wrap">
                {localData.funnel_stage && <StageBadge stage={localData.funnel_stage} />}
                {localData.enrollment_status && <EnrollBadge status={localData.enrollment_status} />}
                {localData.priority && <PriorityBadge priority={localData.priority} />}
                {localData.prospect_status && <StatusBadge status={localData.prospect_status} />}
              </div>
              {/* Quick Actions inline */}
              <div className="flex gap-1 ml-2">
                <Button onClick={openCall} variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs">
                  <Phone className="h-3 w-3" /> Call
                </Button>
                <Button onClick={openWhatsApp} variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs text-green-600 hover:text-green-600">
                  <MessageCircle className="h-3 w-3" /> WA
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Row 2: All editable fields in compact grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mb-2">
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
            {/* Email */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Email</Label>
              <Input
                type="email"
                value={localData.email || ''}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            {/* City */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">City</Label>
              <Input
                value={localData.city || ''}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            {/* State */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">State</Label>
              <Input
                value={localData.state || ''}
                onChange={(e) => handleFieldChange('state', e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            {/* Age */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Age</Label>
              <Input
                type="number"
                value={localData.age || ''}
                onChange={(e) => handleFieldChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
                className="h-7 text-xs"
              />
            </div>
            {/* DOB */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">DOB</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start h-7 text-[10px] px-2">
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {localData.date_of_birth ? format(parseISO(localData.date_of_birth), 'MMM d, yy') : '—'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border-border z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={localData.date_of_birth ? parseISO(localData.date_of_birth) : undefined}
                    onSelect={(date) => handleFieldChange('date_of_birth', date ? format(date, 'yyyy-MM-dd') : null)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {/* Currently Doing */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Profession</Label>
              <Input
                value={localData.currently_doing || ''}
                onChange={(e) => handleFieldChange('currently_doing', e.target.value)}
                className="h-7 text-xs"
                placeholder="Job/Biz"
              />
            </div>
          </div>

          {/* Row 3: Status dropdowns in compact grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
            {/* Stage */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Stage</Label>
              <Select value={localData.funnel_stage || ''} onValueChange={(v) => handleFieldChange('funnel_stage', v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {FUNNEL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Enrollment */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Enrollment</Label>
              <Select value={localData.enrollment_status || 'Not Enrolled'} onValueChange={(v) => handleFieldChange('enrollment_status', v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {ENROLLMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Status */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Status</Label>
              <Select value={localData.prospect_status || ''} onValueChange={(v) => handleFieldChange('prospect_status', v || null)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Priority */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Priority</Label>
              <Select value={localData.priority || ''} onValueChange={(v) => handleFieldChange('priority', v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Action */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Action</Label>
              <Select value={localData.action_taken || ''} onValueChange={(v) => handleFieldChange('action_taken', v || null)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Last Contact */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Last Contact</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start h-7 text-[10px] px-2">
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {localData.last_contact_date ? format(parseISO(localData.last_contact_date), 'MMM d') : '—'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border-border z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={localData.last_contact_date ? parseISO(localData.last_contact_date) : undefined}
                    onSelect={(date) => handleFieldChange('last_contact_date', date ? format(date, 'yyyy-MM-dd') : null)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Row 4: Context (Why/Need + Notes) + Save */}
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
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Updated {formatDistanceToNow(parseISO(prospect.updated_at), { addSuffix: true })}
              </span>
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
