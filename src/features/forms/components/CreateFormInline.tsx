import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, FileText, Settings, Check } from 'lucide-react';
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
  const getClientFieldId = () => `client-${crypto.randomUUID()}`;
  const [title, setTitle] = useState(editingForm?.title || '');
  const [description, setDescription] = useState(editingForm?.description || '');
  const [fields, setFields] = useState<NevoraFormField[]>(
    () => (editingForm?.fields || []).map((field) => ({ ...field, id: field.id || getClientFieldId() }))
  );
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
  const [activeSubTab, setActiveSubTab] = useState('questions');

  const addField = () => {
    const idx = fields.length;
    const newField: NevoraFormField = {
      id: getClientFieldId(),
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

  const duplicateField = (index: number) => {
    const original = fields[index];
    const newField: NevoraFormField = {
      ...original,
      id: getClientFieldId(),
      field_key: generateFieldKey(original.label + ' copy', fields.length),
      label: original.label + ' (Copy)',
      position: fields.length,
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
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <div className="flex items-center gap-2">
          <TabsList className="flex-1 grid grid-cols-2 h-9 bg-blue-50/80 dark:bg-blue-950/30 p-1 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
            <TabsTrigger value="questions" className="rounded-lg text-sm gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-blue-900/40 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 data-[state=active]:shadow-sm">
              <FileText className="h-3.5 w-3.5" /> Questions
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg text-sm gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-blue-900/40 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 data-[state=active]:shadow-sm">
              <Settings className="h-3.5 w-3.5" /> Settings
            </TabsTrigger>
          </TabsList>
          <Button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200/50 dark:shadow-blue-900/30"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
          </Button>
        </div>

        <TabsContent value="questions" className="mt-4 space-y-4">
          {/* Form title/description card */}
          <div className="border-2 border-blue-300/60 dark:border-blue-700/40 rounded-2xl p-5 bg-white/80 dark:bg-card/80 shadow-sm shadow-blue-100/50 dark:shadow-blue-900/20 space-y-3">
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Untitled Form"
              className="text-lg font-medium border-0 border-b-2 border-blue-200/60 dark:border-blue-800/40 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-500 bg-transparent"
            />
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Form description (optional)"
              className="text-sm text-muted-foreground border-0 px-0 focus-visible:ring-0 bg-transparent"
            />
          </div>

          {/* Field cards */}
          {fields.length === 0 ? (
            <div className="border-2 border-dashed border-blue-200/60 dark:border-blue-800/30 rounded-2xl p-8 text-center bg-white/50 dark:bg-card/50">
              <p className="text-muted-foreground mb-3">No questions yet</p>
              <Button variant="outline" onClick={addField} className="rounded-full border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30">
                <Plus className="h-4 w-4 mr-2" /> Add your first question
              </Button>
            </div>
          ) : (
            <>
              {fields.map((field, index) => (
                <FormFieldCard
                  key={field.id}
                  field={field}
                  index={index}
                  allFields={fields}
                  onChange={updated => updateFieldAt(index, updated)}
                  onDelete={() => deleteFieldAt(index)}
                  onDuplicate={() => duplicateField(index)}
                />
              ))}
              <div className="flex justify-center">
                <Button variant="outline" onClick={addField} className="rounded-full border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30">
                  <Plus className="h-4 w-4 mr-2" /> Add Question
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="border border-blue-100/50 dark:border-blue-900/30 rounded-2xl p-5 bg-white/80 dark:bg-card/80 shadow-sm shadow-blue-100/50 dark:shadow-blue-900/20 space-y-6">
            <FormSettingsPanel settings={settings} onChange={setSettings} />
          </div>
          <div className="mt-4">
            <LeadMappingConfig fields={fields} mapping={leadMapping} onChange={setLeadMapping} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
