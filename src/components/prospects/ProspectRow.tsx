import { useState, useRef, useEffect } from 'react';
import { Prospect, FunnelStage, ActionTaken, ProspectStatus, PriorityLevel, FUNNEL_STAGES, EXTENDED_ACTIONS, STATUSES, PRIORITIES, ExtendedActionTaken } from '@/types/prospect';
import { InlineSelect } from './InlineSelect';
import { StatusBadge, PriorityBadge, StageBadge, ActionBadge } from './StatusBadge';
import { InlineReportCard } from './InlineReportCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageCircle, Phone, Trash2, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCustomOptionsContext } from '@/contexts/CustomOptionsContext';

interface ProspectRowProps {
  prospect: Prospect;
  index: number;
  isCalling: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onDelete: (id: string) => Promise<boolean>;
  isEven: boolean;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  isMobileTable?: boolean;
}

export function ProspectRow({ 
  prospect, 
  index, 
  isCalling, 
  isExpanded,
  onToggleExpand,
  onUpdate, 
  onDelete,
  isEven,
  columnOrder,
  columnWidths,
  isMobileTable = false,
}: ProspectRowProps) {
  const [localName, setLocalName] = useState(prospect.name);
  const [localPhone, setLocalPhone] = useState(prospect.phone);
  const [isDeleting, setIsDeleting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  
  const { addOption, deleteOption, getOptionsForType, getCustomOptionsForType } = useCustomOptionsContext();

  // Get combined options (default + custom)
  const stageOptions = getOptionsForType('funnel_stage', FUNNEL_STAGES) as FunnelStage[];
  const actionOptions = getOptionsForType('action_taken', EXTENDED_ACTIONS) as ExtendedActionTaken[];
  const statusOptions = getOptionsForType('prospect_status', STATUSES) as ProspectStatus[];
  const priorityOptions = getOptionsForType('priority', PRIORITIES) as PriorityLevel[];

  useEffect(() => {
    setLocalName(prospect.name);
    setLocalPhone(prospect.phone);
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

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(prospect.id);
    setIsDeleting(false);
  };

  // Handle action change - if "Enrolled" is selected, also update enrollment_status
  const handleActionChange = (value: ExtendedActionTaken) => {
    const updates: Partial<Prospect> = {};
    
    if (value === 'Enrolled') {
      updates.enrollment_status = 'Enrolled';
      // Auto-set to Day 1 if still at Enrollment stage
      if (!prospect.funnel_stage || prospect.funnel_stage === 'Enrollment') {
        updates.funnel_stage = 'Day 1';
      }
      // Keep the action as the last real action or null
      updates.action_taken = prospect.action_taken;
    } else {
      updates.action_taken = value as ActionTaken;
    }
    
    onUpdate(prospect.id, updates);
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

  // Get display value for action - show "Enrolled" if enrolled, otherwise show action
  const getActionDisplayValue = (): ExtendedActionTaken | null => {
    if (prospect.enrollment_status === 'Enrolled') {
      return 'Enrolled';
    }
    return prospect.action_taken || null;
  };

  const renderCell = (columnId: string) => {
    const width = columnWidths[columnId];
    const style = { width: width ? `${width}px` : undefined, minWidth: width ? `${width}px` : undefined };
    
    // Sticky columns for mobile table
    const isSticky = isMobileTable && (columnId === 'name' || columnId === 'phone' || columnId === 'index');
    const stickyLeft = isMobileTable && columnId === 'index' ? 0 : 
                       isMobileTable && columnId === 'name' ? columnWidths['index'] :
                       isMobileTable && columnId === 'phone' ? columnWidths['index'] + columnWidths['name'] : undefined;
    
    const stickyClass = isSticky ? cn(
      "sticky z-10",
      isEven ? "bg-muted/20" : "bg-card"
    ) : "";
    
    switch (columnId) {
      case 'index':
        return (
          <td key={columnId} className={cn("px-2 py-2 text-center", stickyClass)} style={{ ...style, left: stickyLeft !== undefined ? `${stickyLeft}px` : undefined }}>
            <span className={cn("text-xs font-semibold text-muted-foreground bg-muted/60 rounded-md px-1.5 py-0.5", isMobileTable && "text-[10px] px-1")}>
              {index}
            </span>
          </td>
        );
      case 'name':
        return (
          <td key={columnId} className={cn("px-2 py-2", stickyClass)} style={{ ...style, left: stickyLeft !== undefined ? `${stickyLeft}px` : undefined }}>
            <button
              onClick={onToggleExpand}
              className={cn(
                "text-left font-semibold text-foreground hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0 truncate max-w-full",
                isMobileTable && "text-xs"
              )}
            >
              {localName}
            </button>
          </td>
        );
      case 'phone':
        return (
          <td key={columnId} className={cn("px-2 py-2", stickyClass)} style={{ ...style, left: stickyLeft !== undefined ? `${stickyLeft}px` : undefined }}>
            <div className="flex items-center gap-1">
              <span className={cn("text-sm text-muted-foreground font-medium truncate", isMobileTable && "text-xs")}>{localPhone}</span>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-6 w-6 shrink-0", !isMobileTable && "opacity-0 group-hover:opacity-100 transition-opacity")}
                onClick={openCall}
              >
                <Phone className="h-3 w-3 text-accent" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-6 w-6 shrink-0 text-green-500 hover:text-green-600", !isMobileTable && "opacity-0 group-hover:opacity-100 transition-opacity")}
                onClick={openWhatsApp}
              >
                <MessageCircle className="h-3 w-3" />
              </Button>
            </div>
          </td>
        );
      case 'stage':
        return (
          <td key={columnId} className="px-3 py-3" style={style}>
            <InlineSelect
              value={prospect.funnel_stage}
              options={stageOptions}
              onChange={(value) => onUpdate(prospect.id, { funnel_stage: value })}
              renderValue={(value) => <StageBadge stage={value} />}
              placeholder="Select..."
              optionType="funnel_stage"
              customOptions={getCustomOptionsForType('funnel_stage')}
              onAddOption={addOption}
              onDeleteOption={deleteOption}
              defaultOptions={FUNNEL_STAGES}
            />
          </td>
        );
      case 'action':
        return (
          <td key={columnId} className="px-3 py-3" style={style}>
            <InlineSelect
              value={getActionDisplayValue()}
              options={isCalling ? actionOptions : actionOptions.filter(a => a !== 'Enrolled')}
              onChange={handleActionChange}
              placeholder="Select..."
              renderValue={(value) => <ActionBadge action={value} />}
              optionType="action_taken"
              customOptions={getCustomOptionsForType('action_taken')}
              onAddOption={addOption}
              onDeleteOption={deleteOption}
              defaultOptions={EXTENDED_ACTIONS}
            />
          </td>
        );
      case 'status':
        return (
          <td key={columnId} className="px-3 py-3" style={style}>
            <InlineSelect
              value={prospect.prospect_status}
              options={statusOptions}
              onChange={(value) => onUpdate(prospect.id, { prospect_status: value })}
              placeholder="Select..."
              renderValue={(value) => <StatusBadge status={value} />}
              optionType="prospect_status"
              customOptions={getCustomOptionsForType('prospect_status')}
              onAddOption={addOption}
              onDeleteOption={deleteOption}
              defaultOptions={STATUSES}
            />
          </td>
        );
      case 'priority':
        return (
          <td key={columnId} className="px-3 py-3" style={style}>
            <InlineSelect
              value={prospect.priority}
              options={priorityOptions}
              onChange={(value) => onUpdate(prospect.id, { priority: value })}
              renderValue={(value) => <PriorityBadge priority={value} />}
              placeholder="Select..."
              optionType="priority"
              customOptions={getCustomOptionsForType('priority')}
              onAddOption={addOption}
              onDeleteOption={deleteOption}
              defaultOptions={PRIORITIES}
            />
          </td>
        );
      case 'lastContact':
        return (
          <td key={columnId} className="px-3 py-3" style={style}>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-xs font-normal justify-start px-2 hover:bg-muted/50">
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
        );
      case 'actions':
        return (
          <td key={columnId} className="px-3 py-3" style={style}>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted/50"
                onClick={onToggleExpand}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
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
        );
      default:
        return null;
    }
  };

  return (
    <>
      <tr className={cn(
        "group transition-colors duration-100 border-b border-border/30",
        isEven ? "bg-muted/20" : "bg-transparent",
        "hover:bg-muted/40",
        isExpanded && "bg-primary/5 hover:bg-primary/5"
      )}>
        {columnOrder.map(renderCell)}
      </tr>
      {isExpanded && (
        <InlineReportCard 
          prospect={prospect} 
          onUpdate={onUpdate} 
          colSpan={columnOrder.length}
        />
      )}
    </>
  );
}
