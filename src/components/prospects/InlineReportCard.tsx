import { useState, useEffect } from 'react';
import { Prospect, GENDERS } from '@/types/prospect';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Save, X, Phone, MessageCircle } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
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
      age_or_dob: prospect.age_or_dob || '',
      city: prospect.city || '',
      state: prospect.state || '',
      gender: prospect.gender || '',
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
    <tr className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
      <td colSpan={colSpan} className="p-0">
        <div className="px-3 py-3 border-t border-b border-primary/20 bg-gradient-to-b from-muted/40 to-background/50 backdrop-blur-sm shadow-inner">
          {/* Header: Name + Quick Actions */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="font-semibold text-foreground text-sm">{localData.name}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent/10" onClick={openCall}>
                <Phone className="h-3.5 w-3.5 text-accent" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={openWhatsApp}>
                <MessageCircle className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 ml-1">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Editable Fields Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Name *</Label>
              <Input
                value={localData.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Phone *</Label>
              <Input
                value={localData.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Age / DOB</Label>
              <Input
                value={localData.age_or_dob || ''}
                onChange={(e) => handleFieldChange('age_or_dob', e.target.value)}
                className="h-8 text-xs"
                placeholder="e.g. 25 or 1998-05-15"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">City</Label>
              <Input
                value={localData.city || ''}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">State</Label>
              <Input
                value={localData.state || ''}
                onChange={(e) => handleFieldChange('state', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground mb-0.5 block">Gender</Label>
              <Select 
                value={localData.gender || ''} 
                onValueChange={(val) => handleFieldChange('gender', val)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Footer: Updated time + Save */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
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
      </td>
    </tr>
  );
}
