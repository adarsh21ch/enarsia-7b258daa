import { useState, useRef, useEffect } from 'react';
import { Prospect, FunnelStage, ActionTaken, ProspectStatus, PriorityLevel, FUNNEL_STAGES, ACTIONS, STATUSES, PRIORITIES, ENROLLMENT_STATUSES, EnrollmentStatus } from '@/types/prospect';
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

interface ProspectRowProps {
  prospect: Prospect;
  index: number;
  isCalling: boolean;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onDelete: (id: string) => Promise<boolean>;
  onOpenReportCard?: (prospect: Prospect) => void;
}

export function ProspectRow({ prospect, index, isCalling, onUpdate, onDelete, onOpenReportCard }: ProspectRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localName, setLocalName] = useState(prospect.name);
  const [localPhone, setLocalPhone] = useState(prospect.phone);
  const [localNotes, setLocalNotes] = useState(prospect.notes || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalName(prospect.name);
    setLocalPhone(prospect.phone);
    setLocalNotes(prospect.notes || '');
  }, [prospect]);

  const handleNameBlur = () => {
    if (localName !== prospect.name && localName.trim()) {
      onUpdate(prospect.id, { name: localName.trim() });
    }
  };

  const handlePhoneBlur = () => {
    if (localPhone !== prospect.phone && localPhone.trim()) {
      onUpdate(prospect.id, { phone: localPhone.trim() });
    }
  };

  const handleNotesBlur = () => {
    if (localNotes !== (prospect.notes || '')) {
      onUpdate(prospect.id, { notes: localNotes || null });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(prospect.id);
    setIsDeleting(false);
  };

  const handleEnrollmentChange = (value: EnrollmentStatus) => {
    const updates: Partial<Prospect> = { enrollment_status: value };
    // When enrolling, auto-set to Day 1 if still at Enrollment stage
    if (value === 'Enrolled' && (!prospect.funnel_stage || prospect.funnel_stage === 'Enrollment')) {
      updates.funnel_stage = 'Day 1';
    }
    onUpdate(prospect.id, updates);
  };

  const handleNameClick = () => {
    if (onOpenReportCard) {
      onOpenReportCard(prospect);
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

  return (
    <>
      <tr className="table-row-hover group border-b border-border/50">
        <td className="px-2 py-2 text-center">
          <span className="text-xs font-medium text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
            {index}
          </span>
        </td>
        <td className="px-3 py-2">
          {onOpenReportCard ? (
            <button
              onClick={handleNameClick}
              className="text-left w-full font-medium text-primary hover:underline cursor-pointer bg-transparent border-0 p-0"
            >
              {localName}
            </button>
          ) : (
            <Input
              ref={nameRef}
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={handleNameBlur}
              className="inline-edit-input font-medium"
            />
          )}
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <Input
              ref={phoneRef}
              value={localPhone}
              onChange={(e) => setLocalPhone(e.target.value)}
              onBlur={handlePhoneBlur}
              className="inline-edit-input flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={openCall}
            >
              <Phone className="h-3.5 w-3.5 text-accent" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-status-positive hover:text-status-positive"
              onClick={openWhatsApp}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
        <td className="px-3 py-2">
          {isCalling ? (
            <InlineSelect
              value={prospect.enrollment_status || 'Not Enrolled'}
              options={ENROLLMENT_STATUSES}
              onChange={handleEnrollmentChange}
              renderValue={(value) => <EnrollBadge status={value as EnrollmentStatus} />}
            />
          ) : (
            <InlineSelect
              value={prospect.funnel_stage}
              options={FUNNEL_STAGES}
              onChange={(value) => onUpdate(prospect.id, { funnel_stage: value })}
              renderValue={(value) => <StageBadge stage={value} />}
            />
          )}
        </td>
        <td className="px-3 py-2">
          <InlineSelect
            value={prospect.action_taken}
            options={ACTIONS}
            onChange={(value) => onUpdate(prospect.id, { action_taken: value })}
            placeholder="Select action..."
          />
        </td>
        <td className="px-3 py-2">
          <InlineSelect
            value={prospect.prospect_status}
            options={STATUSES}
            onChange={(value) => onUpdate(prospect.id, { prospect_status: value })}
            placeholder="Select status..."
            renderValue={(value) => <StatusBadge status={value} />}
          />
        </td>
        <td className="px-3 py-2">
          <InlineSelect
            value={prospect.priority}
            options={PRIORITIES}
            onChange={(value) => onUpdate(prospect.id, { priority: value })}
            renderValue={(value) => <PriorityBadge priority={value} />}
          />
        </td>
        <td className="px-3 py-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs font-normal justify-start px-2">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                {prospect.last_contact_date
                  ? format(parseISO(prospect.last_contact_date), 'MMM d')
                  : 'Set date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border border-border z-50" align="start">
              <Calendar
                mode="single"
                selected={prospect.last_contact_date ? parseISO(prospect.last_contact_date) : undefined}
                onSelect={(date) => onUpdate(prospect.id, { last_contact_date: date ? format(date, 'yyyy-MM-dd') : null })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete prospect?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {prospect.name}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-muted/30 animate-fade-in">
          <td colSpan={9} className="px-3 py-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Textarea
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add notes about this prospect..."
                className="min-h-[80px] text-sm resize-none"
              />
              {prospect.email && (
                <p className="text-xs text-muted-foreground">
                  Email: {prospect.email}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
