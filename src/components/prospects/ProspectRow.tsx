import { useState, useRef, useEffect } from 'react';
import { Prospect } from '@/types/prospect';
import { InlineReportCard } from './InlineReportCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageCircle, Phone, Trash2, ChevronDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProspectRowProps {
  prospect: Prospect;
  index: number;
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
  isExpanded,
  onToggleExpand,
  onUpdate, 
  onDelete,
  isEven,
  columnOrder,
  columnWidths,
  isMobileTable = false,
}: ProspectRowProps) {
  const [localPhone, setLocalPhone] = useState(prospect.phone);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalPhone(prospect.phone);
  }, [prospect]);

  useEffect(() => {
    if (isEditingPhone && phoneRef.current) {
      phoneRef.current.focus();
      phoneRef.current.select();
    }
  }, [isEditingPhone]);

  const handlePhoneBlur = () => {
    setIsEditingPhone(false);
    if (localPhone !== prospect.phone && localPhone.trim()) {
      onUpdate(prospect.id, { phone: localPhone.trim() });
    } else {
      setLocalPhone(prospect.phone);
    }
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePhoneBlur();
    } else if (e.key === 'Escape') {
      setLocalPhone(prospect.phone);
      setIsEditingPhone(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(prospect.id);
    setIsDeleting(false);
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

  const renderCell = (columnId: string) => {
    const width = columnWidths[columnId];
    const style = { width: width ? `${width}px` : undefined, minWidth: width ? `${width}px` : undefined };
    
    const bgColor = isEven ? "bg-muted/20" : "bg-card";
    const isNameColumn = columnId === 'name';
    const isIndexColumn = columnId === 'index';
    
    const cellClass = cn(
      "px-2 py-2 whitespace-nowrap",
      !isMobileTable && "px-3 py-3",
      isMobileTable && "text-xs",
      isMobileTable && isNameColumn && `sticky left-[36px] z-10 ${bgColor} shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]`,
      isMobileTable && isIndexColumn && `sticky left-0 z-10 ${bgColor}`
    );
    
    switch (columnId) {
      case 'index':
        return (
          <td key={columnId} className={cn(cellClass, "text-center")} style={style}>
            <span className={cn("text-xs font-semibold text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5", isMobileTable && "text-[10px] px-1")}>
              {index}
            </span>
          </td>
        );
      case 'name':
        return (
          <td key={columnId} className={cellClass} style={style}>
            <button
              onClick={onToggleExpand}
              className={cn(
                "group flex items-center gap-1 text-left font-semibold text-foreground hover:text-primary transition-all duration-200 cursor-pointer bg-transparent border-0 py-1 px-1.5 -ml-1.5 rounded-md truncate max-w-full",
                "hover:bg-primary/5 active:scale-[0.98]",
                isMobileTable && "text-xs py-0.5",
                isExpanded && "text-primary bg-primary/10"
              )}
              title={isExpanded ? "Click to collapse" : "Click to expand details"}
            >
              <span className="truncate">{prospect.name}</span>
              <span className={cn(
                "transition-transform duration-200 text-muted-foreground group-hover:text-primary",
                isExpanded && "rotate-180"
              )}>
                <ChevronDown className={cn("h-3 w-3", isMobileTable && "h-2.5 w-2.5")} />
              </span>
            </button>
          </td>
        );
      case 'phone':
        return (
          <td key={columnId} className={cellClass} style={style}>
            <div className="flex items-center gap-0.5">
              {isEditingPhone ? (
                <Input
                  ref={phoneRef}
                  value={localPhone}
                  onChange={(e) => setLocalPhone(e.target.value)}
                  onBlur={handlePhoneBlur}
                  onKeyDown={handlePhoneKeyDown}
                  className={cn(
                    "h-7 px-1.5 text-sm border-primary",
                    isMobileTable ? "h-5 text-[10px] w-full" : "w-28"
                  )}
                />
              ) : (
                <button
                  onClick={() => setIsEditingPhone(true)}
                  className={cn(
                    "text-muted-foreground font-medium hover:text-primary hover:bg-muted/50 px-1 py-0.5 -ml-1 rounded transition-colors truncate",
                    isMobileTable ? "text-[10px]" : "text-sm"
                  )}
                  title="Click to edit phone"
                >
                  {localPhone}
                </button>
              )}
            </div>
          </td>
        );
      case 'contact':
        return (
          <td key={columnId} className={cellClass} style={style}>
            <div className="flex items-center gap-0.5">
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("hover:bg-accent/10", isMobileTable ? "h-6 w-6" : "h-7 w-7")} 
                onClick={openCall}
              >
                <Phone className={cn("text-accent", isMobileTable ? "h-3 w-3" : "h-3.5 w-3.5")} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("text-green-500 hover:text-green-600 hover:bg-green-500/10", isMobileTable ? "h-6 w-6" : "h-7 w-7")} 
                onClick={openWhatsApp}
              >
                <MessageCircle className={cn(isMobileTable ? "h-3 w-3" : "h-3.5 w-3.5")} />
              </Button>
            </div>
          </td>
        );
      case 'location':
        return (
          <td key={columnId} className={cellClass} style={style}>
            <span className={cn("text-muted-foreground truncate block", isMobileTable && "text-[10px]")}>
              {[prospect.city, prospect.state].filter(Boolean).join(', ') || '-'}
            </span>
          </td>
        );
      case 'age':
        return (
          <td key={columnId} className={cellClass} style={style}>
            <span className={cn("text-muted-foreground", isMobileTable && "text-[10px]")}>
              {prospect.age_or_dob || '-'}
            </span>
          </td>
        );
      case 'gender':
        return (
          <td key={columnId} className={cellClass} style={style}>
            <span className={cn("text-muted-foreground", isMobileTable && "text-[10px]")}>
              {prospect.gender || '-'}
            </span>
          </td>
        );
      case 'actions':
        return (
          <td key={columnId} className={cellClass} style={style}>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 hover:bg-muted/50 transition-all duration-200",
                  isMobileTable && "h-6 w-6",
                  isExpanded && "bg-primary/10 text-primary"
                )}
                onClick={onToggleExpand}
              >
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isMobileTable && "h-3 w-3",
                  isExpanded && "rotate-180"
                )} />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10", isMobileTable && "h-6 w-6")}
                  >
                    <Trash2 className={cn("h-4 w-4", isMobileTable && "h-3 w-3")} />
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
          onClose={onToggleExpand}
          colSpan={columnOrder.length}
        />
      )}
    </>
  );
}
