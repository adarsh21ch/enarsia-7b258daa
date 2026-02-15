import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { NevoraFormField, FieldOptions } from '../types';

interface Props {
  field: NevoraFormField;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  error?: string;
  disabled?: boolean;
}

export function FormFieldRenderer({ field, value, onChange, error, disabled }: Props) {
  const opts = field.options as FieldOptions | null;
  const choices = opts?.choices || [];
  const strVal = Array.isArray(value) ? value.join(', ') : (value || '');
  const arrVal = Array.isArray(value) ? value : (value ? [value] : []);

  const renderField = () => {
    switch (field.field_type) {
      case 'short_text':
        return <Input value={strVal} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} disabled={disabled} />;
      case 'long_text':
        return <Textarea value={strVal} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} disabled={disabled} rows={4} />;
      case 'email':
        return <Input type="email" value={strVal} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || 'email@example.com'} disabled={disabled} />;
      case 'phone':
        return <Input type="tel" value={strVal} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || '+91...'} disabled={disabled} />;
      case 'number':
        return <Input type="number" value={strVal} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} min={field.validation?.min} max={field.validation?.max} disabled={disabled} />;
      case 'date':
        return <Input type="date" value={strVal} onChange={e => onChange(e.target.value)} disabled={disabled} />;
      case 'time':
        return <Input type="time" value={strVal} onChange={e => onChange(e.target.value)} disabled={disabled} />;
      case 'select':
        return (
          <Select value={strVal} onValueChange={v => onChange(v)} disabled={disabled}>
            <SelectTrigger><SelectValue placeholder={field.placeholder || 'Select...'} /></SelectTrigger>
            <SelectContent>
              {choices.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case 'radio':
        return (
          <RadioGroup value={strVal} onValueChange={v => onChange(v)} disabled={disabled} className="space-y-2">
            {choices.map(c => (
              <div key={c} className="flex items-center space-x-2">
                <RadioGroupItem value={c} id={`${field.field_key}-${c}`} />
                <Label htmlFor={`${field.field_key}-${c}`} className="font-normal">{c}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case 'checkbox':
      case 'multiselect':
        return (
          <div className="space-y-2">
            {choices.map(c => (
              <div key={c} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.field_key}-${c}`}
                  checked={arrVal.includes(c)}
                  onCheckedChange={checked => {
                    const newVal = checked ? [...arrVal, c] : arrVal.filter(v => v !== c);
                    onChange(newVal);
                  }}
                  disabled={disabled}
                />
                <Label htmlFor={`${field.field_key}-${c}`} className="font-normal">{c}</Label>
              </div>
            ))}
          </div>
        );
      case 'linear_scale': {
        const min = opts?.min || 1;
        const max = opts?.max || 5;
        const scale = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{opts?.min_label || min}</span>
              <span>{opts?.max_label || max}</span>
            </div>
            <RadioGroup value={strVal} onValueChange={v => onChange(v)} disabled={disabled} className="flex gap-2 justify-between">
              {scale.map(n => (
                <div key={n} className="flex flex-col items-center gap-1">
                  <RadioGroupItem value={String(n)} id={`${field.field_key}-${n}`} />
                  <Label htmlFor={`${field.field_key}-${n}`} className="text-xs font-normal">{n}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      }
      case 'file':
        return <Input type="file" onChange={e => onChange(e.target.files?.[0]?.name || '')} disabled={disabled} />;
      case 'audio':
        return <Input type="file" accept="audio/*" onChange={e => onChange(e.target.files?.[0]?.name || '')} disabled={disabled} />;
      default:
        return <Input value={strVal} onChange={e => onChange(e.target.value)} disabled={disabled} />;
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
      {renderField()}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
