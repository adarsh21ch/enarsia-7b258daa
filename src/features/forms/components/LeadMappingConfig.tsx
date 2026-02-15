import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { NevoraFormField, LeadMapping } from '../types';

interface Props {
  fields: NevoraFormField[];
  mapping: LeadMapping | null;
  onChange: (mapping: LeadMapping) => void;
}

export function LeadMappingConfig({ fields, mapping, onChange }: Props) {
  const m = mapping || {};
  const textFields = fields.filter(f => ['short_text', 'email', 'phone'].includes(f.field_type));

  return (
    <div className="space-y-3 border-t pt-4">
      <div>
        <Label className="text-sm font-semibold">Lead Mapping</Label>
        <p className="text-xs text-muted-foreground">Map form fields to auto-create leads in your CRM</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Name Field</Label>
        <Select value={m.name_field_key || '_none'} onValueChange={v => onChange({ ...m, name_field_key: v === '_none' ? undefined : v })}>
          <SelectTrigger className="h-8"><SelectValue placeholder="Select field" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">None</SelectItem>
            {textFields.map(f => <SelectItem key={f.field_key} value={f.field_key}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Phone Field</Label>
        <Select value={m.phone_field_key || '_none'} onValueChange={v => onChange({ ...m, phone_field_key: v === '_none' ? undefined : v })}>
          <SelectTrigger className="h-8"><SelectValue placeholder="Select field" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">None</SelectItem>
            {textFields.map(f => <SelectItem key={f.field_key} value={f.field_key}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Email Field</Label>
        <Select value={m.email_field_key || '_none'} onValueChange={v => onChange({ ...m, email_field_key: v === '_none' ? undefined : v })}>
          <SelectTrigger className="h-8"><SelectValue placeholder="Select field" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">None</SelectItem>
            {textFields.map(f => <SelectItem key={f.field_key} value={f.field_key}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
