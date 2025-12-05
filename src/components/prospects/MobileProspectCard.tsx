import { useState, useEffect } from 'react';
import { Prospect, GENDERS } from '@/types/prospect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageCircle, Phone, Trash2, ChevronDown, MapPin, Save } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MobileProspectCardProps {
  prospect: Prospect;
  index: number;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onDelete: (id: string) => Promise<boolean>;
}

export function MobileProspectCard({ prospect, index, onUpdate, onDelete }: MobileProspectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localData, setLocalData] = useState({
    name: prospect.name,
    phone: prospect.phone,
    age_or_dob: prospect.age_or_dob || '',
    city: prospect.city || '',
    state: prospect.state || '',
    gender: prospect.gender || '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalData({
      name: prospect.name,
      phone: prospect.phone,
      age_or_dob: prospect.age_or_dob || '',
      city: prospect.city || '',
      state: prospect.state || '',
      gender: prospect.gender || '',
    });
    setHasChanges(false);
  }, [prospect]);

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

  const handleFieldChange = (field: string, value: string) => {
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
      if ((localData.age_or_dob || null) !== (prospect.age_or_dob || null)) updates.age_or_dob = localData.age_or_dob || null;
      if ((localData.city || null) !== (prospect.city || null)) updates.city = localData.city || null;
      if ((localData.state || null) !== (prospect.state || null)) updates.state = localData.state || null;
      if ((localData.gender || null) !== (prospect.gender || null)) updates.gender = localData.gender || null;

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

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
      {/* Header: Name + Phone + Quick Actions */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground bg-muted/60 rounded-md px-2 py-0.5">
                #{index}
              </span>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  "group flex items-center gap-1.5 text-base font-bold text-foreground hover:text-primary transition-all duration-200 text-left truncate",
                  "hover:bg-primary/5 px-1.5 py-0.5 -ml-1.5 rounded-md active:scale-[0.98]",
                  isExpanded && "text-primary bg-primary/10"
                )}
              >
                <span className="truncate">{prospect.name}</span>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-transform duration-200",
                  isExpanded && "rotate-180 text-primary"
                )} />
              </button>
            </div>
            <a 
              href={`tel:${cleanPhoneNumber(prospect.phone)}`}
              className="text-sm text-muted-foreground font-medium hover:text-accent transition-colors"
            >
              {localData.phone}
            </a>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={openCall}>
              <Phone className="h-4 w-4 text-accent" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600" onClick={openWhatsApp}>
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Info Chips Row */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-2 bg-muted/10">
        {prospect.city && (
          <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-1 rounded-md flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {[prospect.city, prospect.state].filter(Boolean).join(', ')}
          </span>
        )}
        {prospect.age_or_dob && (
          <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-1 rounded-md">
            {prospect.age_or_dob}
          </span>
        )}
        {prospect.gender && (
          <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-1 rounded-md">
            {prospect.gender}
          </span>
        )}
      </div>

      {/* Actions Row */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-border/30">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-8 w-8 transition-all duration-200",
              isExpanded && "bg-primary/10 text-primary"
            )} 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform duration-200",
              isExpanded && "rotate-180"
            )} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
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
        <span className="text-xs text-muted-foreground">
          Added {formatDistanceToNow(parseISO(prospect.date_added), { addSuffix: true })}
        </span>
      </div>

      {/* Expanded Edit Form */}
      {isExpanded && (
        <div className="border-t border-border/50 p-4 space-y-4 bg-muted/10 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Name *</Label>
              <Input
                value={localData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Phone *</Label>
              <Input
                value={localData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Age / DOB</Label>
              <Input
                value={localData.age_or_dob}
                onChange={(e) => handleFieldChange('age_or_dob', e.target.value)}
                placeholder="e.g. 25 or 1998-05-15"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Gender</Label>
              <Select 
                value={localData.gender} 
                onValueChange={(val) => handleFieldChange('gender', val)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">City</Label>
              <Input
                value={localData.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">State</Label>
              <Input
                value={localData.state}
                onChange={(e) => handleFieldChange('state', e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          
          {hasChanges && (
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
