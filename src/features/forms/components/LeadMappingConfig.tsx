import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, Link } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { NevoraFormField, LeadMapping } from '../types';

interface Props {
  fields: NevoraFormField[];
  mapping: LeadMapping | null;
  onChange: (mapping: LeadMapping) => void;
}

export function LeadMappingConfig({ fields, mapping, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const m = mapping || {};
  const textFields = fields.filter(f => ['short_text', 'email', 'phone'].includes(f.field_type));

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border border-blue-100/50 dark:border-blue-900/30 rounded-2xl bg-white/80 dark:bg-card/80 shadow-sm shadow-blue-100/40 dark:shadow-blue-900/20">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 rounded-2xl transition-colors">
        <div className="flex items-center gap-2">
          <Link className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">Lead Mapping</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-3">
        <p className="text-xs text-muted-foreground">Map form fields to auto-create leads in your CRM</p>

        <div className="space-y-2">
          <Label className="text-xs">Name Field</Label>
          <Select value={m.name_field_key || '_none'} onValueChange={v => onChange({ ...m, name_field_key: v === '_none' ? undefined : v })}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select field" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {textFields.map(f => <SelectItem key={f.field_key} value={f.field_key}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Phone Field</Label>
          <Select value={m.phone_field_key || '_none'} onValueChange={v => onChange({ ...m, phone_field_key: v === '_none' ? undefined : v })}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select field" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {textFields.map(f => <SelectItem key={f.field_key} value={f.field_key}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Email Field</Label>
          <Select value={m.email_field_key || '_none'} onValueChange={v => onChange({ ...m, email_field_key: v === '_none' ? undefined : v })}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select field" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {textFields.map(f => <SelectItem key={f.field_key} value={f.field_key}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
