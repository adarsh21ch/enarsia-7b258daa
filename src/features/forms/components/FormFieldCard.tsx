import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GripVertical, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { ConditionalLogicEditor } from './ConditionalLogicEditor';
import { generateFieldKey } from '../utils/formUtils';
import type { NevoraFormField, FormFieldType, FieldOptions, FieldValidation } from '../types';

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'short_text', label: 'Short Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'select', label: 'Dropdown' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'linear_scale', label: 'Linear Scale' },
  { value: 'file', label: 'File Upload' },
  { value: 'audio', label: 'Audio' },
];

const CHOICE_TYPES: FormFieldType[] = ['select', 'radio', 'checkbox', 'multiselect'];

interface Props {
  field: NevoraFormField;
  index: number;
  allFields: NevoraFormField[];
  onChange: (updated: NevoraFormField) => void;
  onDelete: () => void;
}

export function FormFieldCard({ field, index, allFields, onChange, onDelete }: Props) {
  const [expanded, setExpanded] = useState(true);
  const opts = (field.options || {}) as FieldOptions;
  const hasChoices = CHOICE_TYPES.includes(field.field_type);

  const updateField = (partial: Partial<NevoraFormField>) => {
    onChange({ ...field, ...partial });
  };

  const updateOptions = (partial: Partial<FieldOptions>) => {
    updateField({ options: { ...opts, ...partial } });
  };

  const addChoice = () => {
    const choices = [...(opts.choices || []), `Option ${(opts.choices?.length || 0) + 1}`];
    updateOptions({ choices });
  };

  const updateChoice = (i: number, val: string) => {
    const choices = [...(opts.choices || [])];
    choices[i] = val;
    updateOptions({ choices });
  };

  const removeChoice = (i: number) => {
    const choices = (opts.choices || []).filter((_, idx) => idx !== i);
    updateOptions({ choices });
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
        <span className="text-xs font-medium text-muted-foreground shrink-0">#{index + 1}</span>
        <Input
          value={field.label}
          onChange={e => {
            updateField({
              label: e.target.value,
              field_key: generateFieldKey(e.target.value, index),
            });
          }}
          placeholder="Question label"
          className="flex-1 font-medium"
        />
        <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)} className="shrink-0">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="shrink-0 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3 pl-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Field Type</Label>
              <Select
                value={field.field_type}
                onValueChange={(v: string) => {
                  const ft = v as FormFieldType;
                  const newField: Partial<NevoraFormField> = { field_type: ft };
                  if (CHOICE_TYPES.includes(ft) && !(opts.choices?.length)) {
                    newField.options = { choices: ['Option 1', 'Option 2'] };
                  }
                  if (ft === 'linear_scale') {
                    newField.options = { min: 1, max: 5, min_label: 'Low', max_label: 'High' };
                  }
                  updateField(newField);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <Switch checked={field.required} onCheckedChange={v => updateField({ required: v })} />
                <Label className="text-xs">Required</Label>
              </div>
            </div>
          </div>

          <Input
            value={field.placeholder || ''}
            onChange={e => updateField({ placeholder: e.target.value })}
            placeholder="Placeholder text (optional)"
            className="text-sm"
          />

          <Input
            value={field.description || ''}
            onChange={e => updateField({ description: e.target.value })}
            placeholder="Helper text (optional)"
            className="text-sm"
          />

          {hasChoices && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Options</Label>
              {(opts.choices || []).map((c, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={c} onChange={e => updateChoice(i, e.target.value)} className="text-sm" />
                  <Button variant="ghost" size="icon" onClick={() => removeChoice(i)} className="shrink-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addChoice} className="w-full">
                <Plus className="h-3 w-3 mr-1" /> Add Option
              </Button>
            </div>
          )}

          {field.field_type === 'linear_scale' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min</Label>
                <Input type="number" value={opts.min || 1} onChange={e => updateOptions({ min: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <Label className="text-xs">Max</Label>
                <Input type="number" value={opts.max || 5} onChange={e => updateOptions({ max: parseInt(e.target.value) || 5 })} />
              </div>
              <div>
                <Label className="text-xs">Min Label</Label>
                <Input value={opts.min_label || ''} onChange={e => updateOptions({ min_label: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Max Label</Label>
                <Input value={opts.max_label || ''} onChange={e => updateOptions({ max_label: e.target.value })} />
              </div>
            </div>
          )}

          {field.field_type === 'number' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min Value</Label>
                <Input
                  type="number"
                  value={(field.validation as FieldValidation)?.min ?? ''}
                  onChange={e => updateField({ validation: { ...field.validation as FieldValidation, min: e.target.value ? parseFloat(e.target.value) : undefined } })}
                />
              </div>
              <div>
                <Label className="text-xs">Max Value</Label>
                <Input
                  type="number"
                  value={(field.validation as FieldValidation)?.max ?? ''}
                  onChange={e => updateField({ validation: { ...field.validation as FieldValidation, max: e.target.value ? parseFloat(e.target.value) : undefined } })}
                />
              </div>
            </div>
          )}

          <ConditionalLogicEditor
            field={field}
            allFields={allFields}
            onChange={logic => updateField({ conditional_logic: logic })}
          />
        </div>
      )}
    </Card>
  );
}
