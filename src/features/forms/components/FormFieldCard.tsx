import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, Plus, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { ConditionalLogicEditor } from './ConditionalLogicEditor';
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
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'linear_scale', label: 'Scale' },
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
  onDuplicate?: () => void;
}

export function FormFieldCard({ field, index, allFields, onChange, onDelete, onDuplicate }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
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
    <div className="border border-blue-100/60 dark:border-blue-900/30 rounded-2xl p-4 bg-white/80 dark:bg-card/80 shadow-sm shadow-blue-100/40 dark:shadow-blue-900/20 space-y-3 hover:border-blue-200/80 dark:hover:border-blue-800/50 transition-colors">
      {/* Top row */}
      <div className="flex items-center gap-3">
        <GripVertical className="h-5 w-5 text-blue-300/60 dark:text-blue-700/40 cursor-grab shrink-0" />
        <Input
          value={field.label}
          onChange={e => {
            updateField({
              label: e.target.value,
            });
          }}
          placeholder="Question"
          className="flex-1 border-0 border-b-2 border-blue-400/50 dark:border-blue-600/40 rounded-none px-0 text-sm font-medium focus-visible:ring-0 focus-visible:border-blue-500 bg-transparent"
        />
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
          <SelectTrigger className="w-[130px] shrink-0 rounded-full border-blue-200/60 dark:border-blue-800/40 h-9 text-sm bg-blue-50/50 dark:bg-blue-950/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Choice options */}
      {hasChoices && (
        <div className="space-y-2 pl-8">
          {(opts.choices || []).map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={c} onChange={e => updateChoice(i, e.target.value)} className="text-sm h-8" />
              <Button variant="ghost" size="icon" onClick={() => removeChoice(i)} className="shrink-0 h-7 w-7">
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={addChoice} className="text-xs text-blue-600 dark:text-blue-400">
            <Plus className="h-3 w-3 mr-1" /> Add Option
          </Button>
        </div>
      )}

      {/* Linear scale */}
      {field.field_type === 'linear_scale' && (
        <div className="grid grid-cols-2 gap-3 pl-8">
          <div>
            <Label className="text-xs text-muted-foreground">Min</Label>
            <Input type="number" value={opts.min || 1} onChange={e => updateOptions({ min: parseInt(e.target.value) || 1 })} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max</Label>
            <Input type="number" value={opts.max || 5} onChange={e => updateOptions({ max: parseInt(e.target.value) || 5 })} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Min Label</Label>
            <Input value={opts.min_label || ''} onChange={e => updateOptions({ min_label: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max Label</Label>
            <Input value={opts.max_label || ''} onChange={e => updateOptions({ max_label: e.target.value })} className="h-8 text-sm" />
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex items-center justify-between pt-1 border-t border-blue-100/40 dark:border-blue-900/20">
        <div className="flex items-center gap-1">
          {onDuplicate && (
            <Button variant="ghost" size="icon" onClick={onDuplicate} className="h-8 w-8 text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30">
              <Copy className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-blue-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-blue-600 transition-colors"
          >
            {moreOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            More options
          </button>
          <div className="flex items-center gap-2 border-l border-blue-100/40 dark:border-blue-900/20 pl-3">
            <Label className="text-xs text-muted-foreground">Required</Label>
            <Switch checked={field.required} onCheckedChange={v => updateField({ required: v })} className="scale-90" />
          </div>
        </div>
      </div>

      {/* Expanded options */}
      {moreOpen && (
        <div className="space-y-3 pl-8 pt-2 border-t border-blue-100/40 dark:border-blue-900/20">
          <Input
            value={field.placeholder || ''}
            onChange={e => updateField({ placeholder: e.target.value })}
            placeholder="Placeholder text (optional)"
            className="text-sm h-8"
          />
          <Input
            value={field.description || ''}
            onChange={e => updateField({ description: e.target.value })}
            placeholder="Helper text (optional)"
            className="text-sm h-8"
          />
          {field.field_type === 'number' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Min Value</Label>
                <Input
                  type="number"
                  value={(field.validation as FieldValidation)?.min ?? ''}
                  onChange={e => updateField({ validation: { ...field.validation as FieldValidation, min: e.target.value ? parseFloat(e.target.value) : undefined } })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Max Value</Label>
                <Input
                  type="number"
                  value={(field.validation as FieldValidation)?.max ?? ''}
                  onChange={e => updateField({ validation: { ...field.validation as FieldValidation, max: e.target.value ? parseFloat(e.target.value) : undefined } })}
                  className="h-8 text-sm"
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
    </div>
  );
}
