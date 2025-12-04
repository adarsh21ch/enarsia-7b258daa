import { useState, useEffect } from 'react';
import { Prospect, FUNNEL_STAGES, ACTIONS, STATUSES, PRIORITIES, ENROLLMENT_STATUSES } from '@/types/prospect';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { StageBadge, StatusBadge, PriorityBadge, EnrollBadge } from './StatusBadge';
import { Phone, MessageCircle, Calendar as CalendarIcon, Clock, User, MapPin, Cake, Target } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProspectReportCardProps {
  prospect: Prospect | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
}

export function ProspectReportCard({ prospect, open, onOpenChange, onUpdate }: ProspectReportCardProps) {
  const [localData, setLocalData] = useState<Partial<Prospect>>({});

  useEffect(() => {
    if (prospect) {
      setLocalData({
        name: prospect.name,
        phone: prospect.phone,
        email: prospect.email || '',
        city: prospect.city || '',
        age: prospect.age || undefined,
        date_of_birth: prospect.date_of_birth || '',
        why_need: prospect.why_need || '',
        notes: prospect.notes || '',
        funnel_stage: prospect.funnel_stage,
        enrollment_status: prospect.enrollment_status || 'Not Enrolled',
        action_taken: prospect.action_taken,
        prospect_status: prospect.prospect_status,
        priority: prospect.priority,
        last_contact_date: prospect.last_contact_date,
      });
    }
  }, [prospect]);

  if (!prospect) return null;

  const handleUpdate = (field: keyof Prospect, value: any) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
    onUpdate(prospect.id, { [field]: value });
  };

  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9+]/g, '');

  const openWhatsApp = () => {
    window.location.href = `whatsapp://send?phone=${cleanPhoneNumber(prospect.phone)}`;
  };

  const openCall = () => {
    window.location.href = `tel:${cleanPhoneNumber(prospect.phone)}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border/50">
          <SheetTitle className="text-left">Prospect Report Card</SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button onClick={openCall} variant="outline" className="flex-1 gap-2">
              <Phone className="h-4 w-4" />
              Call
            </Button>
            <Button onClick={openWhatsApp} variant="outline" className="flex-1 gap-2 text-green-600 hover:text-green-600">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <StageBadge stage={prospect.funnel_stage} />
            {prospect.enrollment_status && <EnrollBadge status={prospect.enrollment_status} />}
            {prospect.prospect_status && <StatusBadge status={prospect.prospect_status} />}
            <PriorityBadge priority={prospect.priority} />
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                Name
              </Label>
              <Input
                value={localData.name || ''}
                onChange={(e) => setLocalData(prev => ({ ...prev, name: e.target.value }))}
                onBlur={() => localData.name !== prospect.name && handleUpdate('name', localData.name)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                Phone
              </Label>
              <Input
                value={localData.phone || ''}
                onChange={(e) => setLocalData(prev => ({ ...prev, phone: e.target.value }))}
                onBlur={() => localData.phone !== prospect.phone && handleUpdate('phone', localData.phone)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={localData.email || ''}
                onChange={(e) => setLocalData(prev => ({ ...prev, email: e.target.value }))}
                onBlur={() => localData.email !== prospect.email && handleUpdate('email', localData.email || null)}
                placeholder="email@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  City
                </Label>
                <Input
                  value={localData.city || ''}
                  onChange={(e) => setLocalData(prev => ({ ...prev, city: e.target.value }))}
                  onBlur={() => localData.city !== prospect.city && handleUpdate('city', localData.city || null)}
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Age</Label>
                <Input
                  type="number"
                  value={localData.age || ''}
                  onChange={(e) => setLocalData(prev => ({ ...prev, age: e.target.value ? parseInt(e.target.value) : undefined }))}
                  onBlur={() => localData.age !== prospect.age && handleUpdate('age', localData.age || null)}
                  placeholder="Age"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Cake className="h-4 w-4" />
                Date of Birth
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localData.date_of_birth ? format(parseISO(localData.date_of_birth), 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border-border z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={localData.date_of_birth ? parseISO(localData.date_of_birth) : undefined}
                    onSelect={(date) => {
                      const dateStr = date ? format(date, 'yyyy-MM-dd') : null;
                      setLocalData(prev => ({ ...prev, date_of_birth: dateStr || '' }));
                      handleUpdate('date_of_birth', dateStr);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Dropdowns Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Stage</Label>
              <Select
                value={localData.funnel_stage}
                onValueChange={(value) => handleUpdate('funnel_stage', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {FUNNEL_STAGES.map(stage => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Enrollment</Label>
              <Select
                value={localData.enrollment_status || 'Not Enrolled'}
                onValueChange={(value) => handleUpdate('enrollment_status', value)}
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
                onValueChange={(value) => handleUpdate('action_taken', value || null)}
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
              <Label className="text-muted-foreground">Status</Label>
              <Select
                value={localData.prospect_status || ''}
                onValueChange={(value) => handleUpdate('prospect_status', value || null)}
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
              <Label className="text-muted-foreground">Priority</Label>
              <Select
                value={localData.priority}
                onValueChange={(value) => handleUpdate('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
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
                    onSelect={(date) => handleUpdate('last_contact_date', date ? format(date, 'yyyy-MM-dd') : null)}
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
              onChange={(e) => setLocalData(prev => ({ ...prev, why_need: e.target.value }))}
              onBlur={() => localData.why_need !== prospect.why_need && handleUpdate('why_need', localData.why_need || null)}
              placeholder="Why do they want to earn? What's their motivation?"
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Notes</Label>
            <Textarea
              value={localData.notes || ''}
              onChange={(e) => setLocalData(prev => ({ ...prev, notes: e.target.value }))}
              onBlur={() => localData.notes !== prospect.notes && handleUpdate('notes', localData.notes || null)}
              placeholder="Recent conversations, call notes, action items..."
              className="min-h-[120px] resize-none"
            />
          </div>

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
      </SheetContent>
    </Sheet>
  );
}
