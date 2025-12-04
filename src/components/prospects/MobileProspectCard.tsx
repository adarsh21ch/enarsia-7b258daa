import { useState } from 'react';
import { Prospect, FUNNEL_STAGES, ACTIONS, STATUSES, PRIORITIES, ENROLLMENT_STATUSES } from '@/types/prospect';
import { InlineSelect } from './InlineSelect';
import { StatusBadge, PriorityBadge, StageBadge, EnrollBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageCircle, Phone, Trash2, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface MobileProspectCardProps {
  prospect: Prospect;
  index: number;
  isCalling: boolean;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onDelete: (id: string) => Promise<boolean>;
  onOpenReportCard?: (prospect: Prospect) => void;
}

export function MobileProspectCard({ prospect, index, isCalling, onUpdate, onDelete, onOpenReportCard }: MobileProspectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localName, setLocalName] = useState(prospect.name);
  const [localPhone, setLocalPhone] = useState(prospect.phone);
  const [localNotes, setLocalNotes] = useState(prospect.notes || '');
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleNameClick = () => {
    if (onOpenReportCard) {
      onOpenReportCard(prospect);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border/50 p-3 space-y-2.5 shadow-sm">
      {/* Header: # + Name + Phone + Quick Actions */}
      <div className="flex items-start gap-2">
        <span className="text-xs font-medium text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 mt-0.5">
          #{index}
        </span>
        <div className="flex-1 min-w-0">
          {onOpenReportCard ? (
            <button
              onClick={handleNameClick}
              className="text-sm font-semibold text-primary hover:underline cursor-pointer bg-transparent border-0 p-0 text-left"
            >
              {localName}
            </button>
          ) : (
            <Input
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={() => localName !== prospect.name && localName.trim() && onUpdate(prospect.id, { name: localName.trim() })}
              className="h-7 text-sm font-semibold border-0 p-0 focus-visible:ring-0 bg-transparent"
            />
          )}
          <div className="flex items-center gap-1 mt-0.5">
            <Input
              value={localPhone}
              onChange={(e) => setLocalPhone(e.target.value)}
              onBlur={() => localPhone !== prospect.phone && localPhone.trim() && onUpdate(prospect.id, { phone: localPhone.trim() })}
              className="h-6 text-xs text-muted-foreground border-0 p-0 focus-visible:ring-0 bg-transparent flex-1"
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openCall}>
            <Phone className="h-4 w-4 text-accent" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={openWhatsApp}>
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {isCalling ? (
          <InlineSelect
            value={prospect.enrollment_status || 'Not Enrolled'}
            options={ENROLLMENT_STATUSES}
            onChange={(value) => {
              const updates: Partial<Prospect> = { enrollment_status: value };
              if (value === 'Enrolled' && (!prospect.funnel_stage || prospect.funnel_stage === 'Enrollment')) {
                updates.funnel_stage = 'Day 1';
              }
              onUpdate(prospect.id, updates);
            }}
            renderValue={(value) => <EnrollBadge status={value} />}
          />
        ) : (
          <InlineSelect
            value={prospect.funnel_stage}
            options={FUNNEL_STAGES}
            onChange={(value) => onUpdate(prospect.id, { funnel_stage: value })}
            renderValue={(value) => <StageBadge stage={value} />}
          />
        )}
        <InlineSelect
          value={prospect.action_taken}
          options={ACTIONS}
          onChange={(value) => onUpdate(prospect.id, { action_taken: value })}
          placeholder="Action"
        />
        <InlineSelect
          value={prospect.prospect_status}
          options={STATUSES}
          onChange={(value) => onUpdate(prospect.id, { prospect_status: value })}
          placeholder="Status"
          renderValue={(value) => <StatusBadge status={value} />}
        />
        <InlineSelect
          value={prospect.priority}
          options={PRIORITIES}
          onChange={(value) => onUpdate(prospect.id, { priority: value })}
          renderValue={(value) => <PriorityBadge priority={value} />}
        />
      </div>

      {/* Date + Expand */}
      <div className="flex items-center justify-between">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
              <CalendarIcon className="h-3 w-3 mr-1" />
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

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
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

      {/* Expanded Notes */}
      {isExpanded && (
        <div className="pt-2 border-t border-border/50 space-y-2 animate-fade-in">
          <Textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={() => localNotes !== (prospect.notes || '') && onUpdate(prospect.id, { notes: localNotes || null })}
            placeholder="Add notes..."
            className="min-h-[60px] text-xs resize-none"
          />
          {prospect.email && (
            <p className="text-xs text-muted-foreground">Email: {prospect.email}</p>
          )}
        </div>
      )}
    </div>
  );
}
