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
import { Phone, MessageCircle, Calendar as CalendarIcon, Clock, MapPin, Cake, Target, Mail, User, Briefcase, Save, X } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { useActivityLogs } from '@/hooks/useActivityLogs';
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
  const { activities } = useActivityLogs();

  // Filter activities for this prospect (last 5)
  const prospectActivities = activities
    .filter(log => log.prospect_id === prospect.id)
    .slice(0, 5);

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
      
      // Only include changed fields
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

  return (
    <tr className="bg-muted/20 animate-fade-in">
      <td colSpan={colSpan} className="p-0">
        <div className="p-4 border-t border-b-2 border-primary/20 bg-gradient-to-b from-muted/30 to-transparent">
          {/* Header with Close button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-foreground">{localData.name}</h3>
              <div className="flex flex-wrap gap-1.5">
                {localData.funnel_stage && <StageBadge stage={localData.funnel_stage} />}
                {localData.enrollment_status && <EnrollBadge status={localData.enrollment_status} />}
                {localData.prospect_status && <StatusBadge status={localData.prospect_status} />}
                {localData.priority && <PriorityBadge priority={localData.priority} />}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mb-4">
            <Button onClick={openCall} variant="outline" size="sm" className="gap-2">
              <Phone className="h-3.5 w-3.5" />
              Call
            </Button>
            <Button onClick={openWhatsApp} variant="outline" size="sm" className="gap-2 text-green-600 hover:text-green-600">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Column 1 - Basic Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Info</h4>
              
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                    <User className="h-3 w-3" /> Name *
                  </Label>
                  <Input
                    value={localData.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="Prospect name"
                    className="h-8 text-sm"
                  />
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Phone className="h-3 w-3" /> Phone *
                  </Label>
                  <Input
                    value={localData.phone || ''}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    placeholder="Phone number"
                    className="h-8 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <Input
                    type="email"
                    value={localData.email || ''}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="email@example.com"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Column 2 - Location & Demographics */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Demographics</h4>
              
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                      <MapPin className="h-3 w-3" /> City
                    </Label>
                    <Input
                      value={localData.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      placeholder="City"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">State</Label>
                    <Input
                      value={localData.state || ''}
                      onChange={(e) => handleFieldChange('state', e.target.value)}
                      placeholder="State"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Age</Label>
                    <Input
                      type="number"
                      value={localData.age || ''}
                      onChange={(e) => handleFieldChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Age"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                      <Cake className="h-3 w-3" /> DOB
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal h-8 text-xs">
                          <CalendarIcon className="mr-1.5 h-3 w-3" />
                          {localData.date_of_birth ? format(parseISO(localData.date_of_birth), 'MMM d, yy') : 'Select'}
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
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Briefcase className="h-3 w-3" /> Currently Doing
                  </Label>
                  <Input
                    value={localData.currently_doing || ''}
                    onChange={(e) => handleFieldChange('currently_doing', e.target.value)}
                    placeholder="Job / Business / Profession"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Column 3 - Status & Dropdowns */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</h4>
              
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Stage</Label>
                    <Select
                      value={localData.funnel_stage || ''}
                      onValueChange={(value) => handleFieldChange('funnel_stage', value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {FUNNEL_STAGES.map(stage => (
                          <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Enrollment</Label>
                    <Select
                      value={localData.enrollment_status || 'Not Enrolled'}
                      onValueChange={(value) => handleFieldChange('enrollment_status', value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {ENROLLMENT_STATUSES.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Status</Label>
                    <Select
                      value={localData.prospect_status || ''}
                      onValueChange={(value) => handleFieldChange('prospect_status', value || null)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {STATUSES.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Priority</Label>
                    <Select
                      value={localData.priority || ''}
                      onValueChange={(value) => handleFieldChange('priority', value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {PRIORITIES.map(priority => (
                          <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Action</Label>
                    <Select
                      value={localData.action_taken || ''}
                      onValueChange={(value) => handleFieldChange('action_taken', value || null)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {ACTIONS.map(action => (
                          <SelectItem key={action} value={action}>{action}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Last Contact</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal h-8 text-xs">
                          <CalendarIcon className="mr-1.5 h-3 w-3" />
                          {localData.last_contact_date ? format(parseISO(localData.last_contact_date), 'MMM d') : 'Set'}
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
              </div>
            </div>

            {/* Column 4 - Notes & Activity */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-3 w-3" /> Why / Need
              </h4>
              <Textarea
                value={localData.why_need || ''}
                onChange={(e) => handleFieldChange('why_need', e.target.value)}
                placeholder="Why do they want to earn?"
                className="min-h-[50px] text-sm resize-none"
              />
              
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</h4>
              <Textarea
                value={localData.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Call notes, action items..."
                className="min-h-[60px] text-sm resize-none"
              />
            </div>
          </div>

          {/* Activity Timeline & Save Button Row */}
          <div className="mt-4 pt-4 border-t border-border/30 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            {/* Recent Activity */}
            <div className="flex-1 max-w-md">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Clock className="h-3 w-3" /> Recent Activity
              </h4>
              {prospectActivities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {prospectActivities.slice(0, 3).map((activity) => (
                    <div key={activity.id} className="text-xs bg-background/50 rounded px-2 py-1 border border-border/30">
                      <span className="text-foreground">{activity.description}</span>
                      <span className="text-muted-foreground ml-1.5">
                        {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No recent activity</p>
              )}
              <div className="mt-2 text-xs text-muted-foreground">
                Added {formatDistanceToNow(parseISO(prospect.date_added), { addSuffix: true })} • Updated {formatDistanceToNow(parseISO(prospect.updated_at), { addSuffix: true })}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex-shrink-0">
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !hasChanges}
                className={cn(
                  "gap-2 min-w-[140px]",
                  hasChanges && "bg-primary hover:bg-primary/90"
                )}
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
              </Button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}