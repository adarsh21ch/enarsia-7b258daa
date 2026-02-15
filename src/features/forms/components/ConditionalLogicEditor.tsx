import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { NevoraFormField, ConditionalLogic } from '../types';

interface Props {
  field: NevoraFormField;
  allFields: NevoraFormField[];
  onChange: (logic: ConditionalLogic | null) => void;
}

export function ConditionalLogicEditor({ field, allFields, onChange }: Props) {
  const logic = field.conditional_logic as ConditionalLogic | null;
  const enabled = !!logic?.show_if;
  const otherFields = allFields.filter(f => f.field_key !== field.field_key);

  if (otherFields.length === 0) return null;

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center gap-2">
        <Switch
          checked={enabled}
          onCheckedChange={v => {
            if (v) {
              onChange({
                show_if: {
                  field_key: otherFields[0]?.field_key || '',
                  operator: 'not_empty',
                },
              });
            } else {
              onChange(null);
            }
          }}
        />
        <Label className="text-xs">Conditional Logic</Label>
      </div>

      {enabled && logic?.show_if && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px]">When field</Label>
            <Select
              value={logic.show_if.field_key}
              onValueChange={v => onChange({ show_if: { ...logic.show_if!, field_key: v } })}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {otherFields.map(f => (
                  <SelectItem key={f.field_key} value={f.field_key}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px]">Operator</Label>
            <Select
              value={logic.show_if.operator}
              onValueChange={v => onChange({ show_if: { ...logic.show_if!, operator: v as ConditionalLogic['show_if'] extends { operator: infer O } ? O : never } })}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="not_equals">Not Equals</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="not_empty">Not Empty</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {logic.show_if.operator !== 'not_empty' && (
            <div>
              <Label className="text-[10px]">Value</Label>
              <Input
                value={logic.show_if.value || ''}
                onChange={e => onChange({ show_if: { ...logic.show_if!, value: e.target.value } })}
                className="h-8 text-xs"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
