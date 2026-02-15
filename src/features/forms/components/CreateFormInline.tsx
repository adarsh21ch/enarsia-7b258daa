import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { FormFieldCard } from './FormFieldCard';
import { FormSettingsPanel } from './FormSettingsPanel';
import { LeadMappingConfig } from './LeadMappingConfig';
import { generateFieldKey } from '../utils/formUtils';
import { useForms } from '../hooks/useForms';
import type { NevoraFormField, FormFieldType, UpdateFormInput, LeadMapping, NevoraFormWithFields } from '../types';

interface Props {
  editingForm?: NevoraFormWithFields | null;
  onSuccess?: () => void;
}

export function CreateFormInline({ editingForm, onSuccess }: Props) {
  const { createForm, updateForm } = useForms();
  const [title, setTitle] = useState(editingForm?.title || '');
  const [description, setDescription] = useState(editingForm?.description || '');
  const [fields, setFields] = useState<NevoraFormField[]>(editingForm?.fields || []);
  const [settings, setSettings] = useState<UpdateFormInput>({
    confirmation_message: editingForm?.confirmation_message || 'Thank you for your submission!',
    is_accepting: editingForm?.is_accepting ?? true,
    allow_multiple_submissions: editingForm?.allow_multiple_submissions ?? true,
    collect_utm: editingForm?.collect_utm ?? false,
    embed_enabled: editingForm?.embed_enabled ?? false,
    max_submissions: editingForm?.max_submissions ?? null,
    close_date: editingForm?.close_date ?? null,
  });
  const [leadMapping, setLeadMapping] = useState<LeadMapping | null>(editingForm?.lead_mapping || null);
  const [saving, setSaving] = useState(false);

  const addField = () => {
    const idx = fields.length;
    const newField: NevoraFormField = {
      id: '',
      form_id: editingForm?.id || '',
      field_key: generateFieldKey(`Question ${idx + 1}`, idx),
      field_type: 'short_text' as FormFieldType,
      label: `Question ${idx + 1}`,
      description: null,
      placeholder: null,
      required: false,
      position: idx,
      options: null,
      validation: null,
      conditional_logic: null,
      created_at: new Date().toISOString(),
    };
    setFields([...fields, newField]);
  };

  const updateFieldAt = (index: number, updated: NevoraFormField) => {
    const newFields = [...fields];
    newFields[index] = { ...updated, position: index };
    setFields(newFields);
  };

  const deleteFieldAt = (index: number) => {
    setFields(fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, position: i })));
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (editingForm) {
        await updateForm(editingForm.id, {
          title,
          description: description || null,
          ...settings,
          lead_mapping: leadMapping,
        }, fields);
      } else {
        await createForm({
          title,
          description: description || undefined,
          ...settings,
          lead_mapping: leadMapping,
          fields: fields.map(f => ({
            field_key: f.field_key,
            field_type: f.field_type,
            label: f.label,
            description: f.description,
            placeholder: f.placeholder,
            required: f.required,
            position: f.position,
            options: f.options,
            validation: f.validation,
            conditional_logic: f.conditional_logic,
          })),
        });
      }
      onSuccess?.();
      if (!editingForm) {
        setTitle('');
        setDescription('');
        setFields([]);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Form Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Contact Form" className="mt-1" />
        </div>
        <div>
          <Label className="text-sm font-medium">Description</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" className="mt-1" rows={2} />
        </div>
      </div>

      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="questions" className="flex-1">Questions</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-3 mt-3">
          {fields.map((field, index) => (
            <FormFieldCard
              key={field.id || index}
              field={field}
              index={index}
              allFields={fields}
              onChange={updated => updateFieldAt(index, updated)}
              onDelete={() => deleteFieldAt(index)}
            />
          ))}
          <Button variant="outline" onClick={addField} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Add Question
          </Button>
        </TabsContent>

        <TabsContent value="settings" className="mt-3">
          <FormSettingsPanel settings={settings} onChange={setSettings} />
          <LeadMappingConfig fields={fields} mapping={leadMapping} onChange={setLeadMapping} />
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {editingForm ? 'Save Changes' : 'Create Form'}
      </Button>
    </div>
  );
}
