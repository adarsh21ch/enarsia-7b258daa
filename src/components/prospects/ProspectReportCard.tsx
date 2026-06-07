import { useState, useEffect } from 'react';
import { Prospect, FUNNEL_STAGES, ACTIONS, STATUSES, PRIORITIES, ENROLLMENT_STATUSES } from '@/types/prospect';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { StageBadge, StatusBadge, PriorityBadge, EnrollBadge } from './StatusBadge';
import { Phone, MessageCircle, MessageSquareText, Calendar as CalendarIcon, Clock, User, MapPin, Target, Briefcase, Save } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProspectReportCardProps {
  prospect: Prospect | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
}

export function ProspectReportCard({ prospect, open, onOpenChange, onUpdate }: ProspectReportCardProps) {
  const [localData, setLocalData] = useState<Partial<Prospect>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (prospect) {
      setLocalData({
        name: prospect.name,
        phone: prospect.phone,
        email: prospect.email || '',
        address: prospect.address || '',
        state: prospect.state || '',
        age_or_dob: prospect.age_or_dob || '',
        gender: prospect.gender || '',
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
    }
  }, [prospect]);

  if (!prospect) return null;

  const handleFieldChange = (field: keyof Prospect, value: any) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!prospect || !hasChanges) return;
    
    setIsSaving(true);
    try {
      const updates: Partial<Prospect> = {};
      
      // Only include changed fields
      if (localData.name !== prospect.name) updates.name = localData.name;
      if (localData.phone !== prospect.phone) updates.phone = localData.phone;
      if ((localData.email || null) !== (prospect.email || null)) updates.email = localData.email || null;
      if ((localData.address || null) !== (prospect.address || null)) updates.address = localData.address || null;
      if ((localData.state || null) !== (prospect.state || null)) (updates as any).state = localData.state || null;
      if ((localData.age_or_dob || null) !== (prospect.age_or_dob || null)) updates.age_or_dob = localData.age_or_dob || null;
      if ((localData.gender || null) !== (prospect.gender || null)) updates.gender = localData.gender || null;
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
          toast.success('Prospect updated successfully');
          setHasChanges(false);
        }
      }
    } catch (error) {
      toast.error('Failed to update prospect');
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

  const openSMS = () => {
    window.location.href = `sms:${cleanPhoneNumber(prospect.phone)}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader className="pb-4 border-b border-border/50">
          <SheetTitle className="text-left">Prospect Report Card</SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6 flex-1 overflow-y-auto">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button onClick={openCall} variant="outline" className="flex-1 gap-2">
              <Phone className="h-4 w-4" />
              Call
            </Button>
            <Button onClick={openSMS} variant="outline" className="flex-1 gap-2 text-blue-600 hover:text-blue-600">
              <MessageSquareText className="h-4 w-4" />
              Text
            </Button>
            <Button onClick={openWhatsApp} variant="outline" className="flex-1 gap-2 text-green-600 hover:text-green-600">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <StageBadge stage={localData.funnel_stage} />
            {localData.enrollment_status && <EnrollBadge status={localData.enrollment_status} />}
            {localData.prospect_status && <StatusBadge status={localData.prospect_status} />}
            <PriorityBadge priority={localData.priority} />
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                Name *
              </Label>
              <Input
                value={localData.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Prospect name"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                Phone *
              </Label>
              <Input
                value={localData.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="Phone number"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={localData.email || ''}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Address
                </Label>
                <Input
                  value={localData.address || ''}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  placeholder="City, State"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Age / DOB</Label>
                <Input
                  value={localData.age_or_dob || ''}
                  onChange={(e) => handleFieldChange('age_or_dob', e.target.value)}
                  placeholder="25 or 1990-05-15"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Gender</Label>
                <Select
                  value={localData.gender || ''}
                  onValueChange={(value) => handleFieldChange('gender', value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                Currently Doing (Job/Business/Profession)
              </Label>
              <Input
                value={localData.currently_doing || ''}
                onChange={(e) => handleFieldChange('currently_doing', e.target.value)}
                placeholder="e.g., Software Engineer, Business Owner, Student"
              />
            </div>
          </div>

          {/* Dropdowns Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Stage</Label>
              <Select
                value={localData.funnel_stage || ''}
                onValueChange={(value) => handleFieldChange('funnel_stage', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {FUNNEL_STAGES.map(stage => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Status</Label>
              <Select
                value={localData.prospect_status || ''}
                onValueChange={(value) => handleFieldChange('prospect_status', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Enrollment</Label>
              <Select
                value={localData.enrollment_status || 'Not Enrolled'}
                onValueChange={(value) => handleFieldChange('enrollment_status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {ENROLLMENT_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Action</Label>
              <Select
                value={localData.action_taken || ''}
                onValueChange={(value) => handleFieldChange('action_taken', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {ACTIONS.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Priority</Label>
              <Select
                value={localData.priority || ''}
                onValueChange={(value) => handleFieldChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {PRIORITIES.map(priority => (
                    <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Last Contact</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localData.last_contact_date ? format(parseISO(localData.last_contact_date), 'MMM d') : 'Set date'}
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

          {/* Why / Need */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              Why / Need (Reason for earning)
            </Label>
            <Textarea
              value={localData.why_need || ''}
              onChange={(e) => handleFieldChange('why_need', e.target.value)}
              placeholder="Why do they want to earn? What's their motivation?"
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Notes</Label>
            <Textarea
              value={localData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Recent conversations, call notes, action items..."
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Extra details from import (custom_fields) */}
          {prospect.custom_fields && Object.keys(prospect.custom_fields).length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label className="text-muted-foreground">Extra details</Label>
              <div className="rounded-lg border border-border/60 bg-muted/30 divide-y divide-border/50">
                {Object.entries(prospect.custom_fields).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-3 px-3 py-2 text-xs">
                    <span className="font-medium text-foreground/80 min-w-[35%] max-w-[45%] break-words">{k}</span>
                    <span className="flex-1 text-muted-foreground break-words">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta Info */}
          <div className="pt-4 border-t border-border/50 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>Added {formatDistanceToNow(parseISO(prospect.date_added), { addSuffix: true })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>Updated {formatDistanceToNow(parseISO(prospect.updated_at), { addSuffix: true })}</span>
            </div>
          </div>

        </div>

        {/* Fixed Save Button at bottom */}
        <SheetFooter className="border-t border-border/50 pt-4">
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !hasChanges}
            className="w-full gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}