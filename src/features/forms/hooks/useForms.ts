import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import type {
  NevoraForm,
  NevoraFormField,
  NevoraFormWithFields,
  SubmissionWithAnswers,
  CreateFormInput,
  UpdateFormInput,
  FieldOptions,
  FieldValidation,
  ConditionalLogic,
  FormFieldType,
} from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any;

function castField(raw: AnyRecord): NevoraFormField {
  return {
    id: raw.id,
    form_id: raw.form_id,
    field_key: raw.field_key,
    field_type: raw.field_type as FormFieldType,
    label: raw.label,
    description: raw.description || null,
    placeholder: raw.placeholder || null,
    required: raw.required,
    position: raw.position,
    options: raw.options as FieldOptions | null,
    validation: raw.validation as FieldValidation | null,
    conditional_logic: raw.conditional_logic as ConditionalLogic | null,
    created_at: raw.created_at,
  };
}

function castForm(raw: AnyRecord): NevoraForm {
  return {
    id: raw.id,
    owner_user_id: raw.owner_user_id,
    title: raw.title,
    description: raw.description || null,
    access_mode: raw.access_mode,
    is_public: raw.is_public,
    is_accepting: raw.is_accepting,
    close_date: raw.close_date || null,
    collect_utm: raw.collect_utm,
    allow_multiple_submissions: raw.allow_multiple_submissions,
    max_submissions: raw.max_submissions || null,
    confirmation_message: raw.confirmation_message || null,
    embed_enabled: raw.embed_enabled,
    form_type: raw.form_type || null,
    lead_mapping: raw.lead_mapping as NevoraForm['lead_mapping'],
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

export function useForms() {
  const { user } = useAuth();
  const [forms, setForms] = useState<NevoraFormWithFields[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchForms = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nevorai_forms')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const formsWithFields: NevoraFormWithFields[] = (data || []).map((f: AnyRecord) => ({
        ...castForm(f),
        fields: [],
      }));
      setForms(formsWithFields);
    } catch (err) {
      console.error('fetchForms error:', err);
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchFormWithFields = useCallback(async (formId: string): Promise<NevoraFormWithFields | null> => {
    try {
      const [formRes, fieldsRes] = await Promise.all([
        supabase.from('nevorai_forms').select('*').eq('id', formId).single(),
        supabase.from('nevorai_form_fields').select('*').eq('form_id', formId).order('position'),
      ]);
      if (formRes.error) throw formRes.error;
      if (fieldsRes.error) throw fieldsRes.error;
      return {
        ...castForm(formRes.data),
        fields: (fieldsRes.data || []).map((f: AnyRecord) => castField(f)),
      };
    } catch (err) {
      console.error('fetchFormWithFields error:', err);
      return null;
    }
  }, []);

  const fetchFormByToken = useCallback(async (token: string): Promise<NevoraFormWithFields | null> => {
    try {
      const { data, error } = await supabase.rpc('nevorai_get_form_by_token', { p_token: token });
      if (error) throw error;
      if (!data || (Array.isArray(data) && data.length === 0)) return null;
      const result: AnyRecord = Array.isArray(data) ? data[0] : data;
      // RPC returns form_id (not id) and no is_accepting column — the closed/expired
      // state is fully encoded in is_expired. If is_expired is false, the form is open.
      const fields = (result.fields || []).map((f: AnyRecord) => castField(f));
      return {
        id: result.form_id,
        owner_user_id: result.owner_user_id,
        title: result.title,
        description: result.description || null,
        access_mode: 'public',
        is_public: true,
        is_accepting: !result.is_expired,
        close_date: null,
        collect_utm: false,
        allow_multiple_submissions: true,
        max_submissions: null,
        confirmation_message: null,
        embed_enabled: false,
        form_type: null,
        lead_mapping: null,
        created_at: '',
        updated_at: '',
        fields,
      } as NevoraFormWithFields;
    } catch (err) {
      console.error('fetchFormByToken RPC error:', err);
      return null;
    }
  }, [fetchFormWithFields]);


  const createForm = useCallback(async (input: CreateFormInput): Promise<NevoraFormWithFields | null> => {
    if (!user) return null;
    try {
      const { data: formData, error: formError } = await supabase
        .from('nevorai_forms')
        .insert({
          owner_user_id: user.id,
          title: input.title,
          description: input.description || null,
          access_mode: input.access_mode || 'public',
          is_public: input.is_public ?? true,
          collect_utm: input.collect_utm ?? false,
          allow_multiple_submissions: input.allow_multiple_submissions ?? true,
          max_submissions: input.max_submissions ?? null,
          confirmation_message: input.confirmation_message || 'Thank you for your submission!',
          embed_enabled: input.embed_enabled ?? false,
          lead_mapping: (input.lead_mapping || null) as Json,
        })
        .select()
        .single();
      if (formError) throw formError;
      const form = castForm(formData);

      if (input.fields.length > 0) {
        const fieldInserts = input.fields.map((f, i) => ({
          form_id: form.id,
          field_key: f.field_key,
          field_type: f.field_type as string,
          label: f.label,
          description: f.description || null,
          placeholder: f.placeholder || null,
          required: f.required ?? false,
          position: f.position ?? i,
          options: (f.options || null) as Json,
          validation: (f.validation || null) as Json,
          conditional_logic: (f.conditional_logic || null) as Json,
        }));
        await supabase.from('nevorai_form_fields').insert(fieldInserts);
      }

      await supabase.from('nevorai_form_shares').insert({
        form_id: form.id,
        created_by: user.id,
      });

      toast.success('Form created successfully!');
      await fetchForms();
      return { ...form, fields: [] };
    } catch (err) {
      console.error('createForm error:', err);
      toast.error('Failed to create form');
      return null;
    }
  }, [user, fetchForms]);

  const updateForm = useCallback(async (
    formId: string,
    updates: UpdateFormInput,
    fields?: NevoraFormField[]
  ): Promise<boolean> => {
    try {
      const updatePayload: AnyRecord = { ...updates, updated_at: new Date().toISOString() };
      if (updates.lead_mapping !== undefined) {
        updatePayload.lead_mapping = updates.lead_mapping as Json;
      }
      const { error } = await supabase
        .from('nevorai_forms')
        .update(updatePayload)
        .eq('id', formId);
      if (error) throw error;

      if (fields) {
        const { data: existingFields } = await supabase
          .from('nevorai_form_fields')
          .select('id')
          .eq('form_id', formId);
        const existingIds = new Set((existingFields || []).map((f: AnyRecord) => f.id));
        const newIds = new Set(fields.filter(f => f.id).map(f => f.id));

        const toDelete = [...existingIds].filter(id => !newIds.has(id));
        if (toDelete.length > 0) {
          await supabase.from('nevorai_form_fields').delete().in('id', toDelete);
        }

        for (const field of fields) {
          const fieldData = {
            form_id: formId,
            field_key: field.field_key,
            field_type: field.field_type as string,
            label: field.label,
            description: field.description || null,
            placeholder: field.placeholder || null,
            required: field.required,
            position: field.position,
            options: (field.options || null) as Json,
            validation: (field.validation || null) as Json,
            conditional_logic: (field.conditional_logic || null) as Json,
          };
          if (field.id && existingIds.has(field.id)) {
            await supabase.from('nevorai_form_fields').update(fieldData).eq('id', field.id);
          } else {
            await supabase.from('nevorai_form_fields').insert([fieldData]);
          }
        }
      }

      toast.success('Form updated');
      await fetchForms();
      return true;
    } catch (err) {
      console.error('updateForm error:', err);
      toast.error('Failed to update form');
      return false;
    }
  }, [fetchForms]);

  const duplicateForm = useCallback(async (formId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const original = await fetchFormWithFields(formId);
      if (!original) throw new Error('Form not found');
      const result = await createForm({
        title: `${original.title} (Copy)`,
        description: original.description || undefined,
        access_mode: original.access_mode,
        is_public: original.is_public,
        collect_utm: original.collect_utm,
        allow_multiple_submissions: original.allow_multiple_submissions,
        max_submissions: original.max_submissions,
        confirmation_message: original.confirmation_message || undefined,
        embed_enabled: original.embed_enabled,
        lead_mapping: original.lead_mapping,
        fields: original.fields.map(f => ({
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
      return !!result;
    } catch (err) {
      console.error('duplicateForm error:', err);
      toast.error('Failed to duplicate form');
      return false;
    }
  }, [user, fetchFormWithFields, createForm]);

  const deleteForm = useCallback(async (formId: string): Promise<boolean> => {
    try {
      const { data: subs } = await supabase
        .from('nevorai_form_submissions')
        .select('id')
        .eq('form_id', formId);
      const subIds = (subs || []).map((s: AnyRecord) => s.id as string);

      if (subIds.length > 0) {
        await supabase.from('nevorai_submission_attachments').delete().in('submission_id', subIds);
        await supabase.from('nevorai_submission_answers').delete().in('submission_id', subIds);
      }
      await supabase.from('nevorai_form_submissions').delete().eq('form_id', formId);
      await supabase.from('nevorai_form_shares').delete().eq('form_id', formId);
      await supabase.from('nevorai_form_fields').delete().eq('form_id', formId);
      await supabase.from('nevorai_forms').delete().eq('id', formId);

      toast.success('Form deleted');
      await fetchForms();
      return true;
    } catch (err) {
      console.error('deleteForm error:', err);
      toast.error('Failed to delete form');
      return false;
    }
  }, [fetchForms]);

  const fetchSubmissions = useCallback(async (formId: string): Promise<SubmissionWithAnswers[]> => {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('nevorai_list_submissions', {
        p_form_id: formId,
        p_limit: 500,
        p_offset: 0,
      });
      if (!rpcError && rpcData) {
        return (rpcData as AnyRecord[]).map((s: AnyRecord) => ({
          id: s.id,
          form_id: s.form_id,
          share_id: s.share_id || null,
          submitter_user_id: s.submitter_user_id || null,
          submitter_name: s.submitter_name || null,
          submitter_email: s.submitter_email || null,
          source: s.source || 'direct',
          utm_source: s.utm_source || null,
          utm_medium: s.utm_medium || null,
          utm_campaign: s.utm_campaign || null,
          utm_content: s.utm_content || null,
          lead_created: s.lead_created || false,
          lead_id: s.lead_id || null,
          created_at: s.created_at,
          answers: (s.answers || []).map((a: AnyRecord) => ({
            id: a.id,
            submission_id: a.submission_id,
            field_id: a.field_id || null,
            field_key: a.field_key,
            value: a.value || null,
            value_json: a.value_json || null,
            created_at: a.created_at,
          })),
        }));
      }
    } catch {
      // fall through
    }

    try {
      const { data: subs } = await supabase
        .from('nevorai_form_submissions')
        .select('*')
        .eq('form_id', formId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (!subs?.length) return [];

      const subIds = subs.map((s: AnyRecord) => s.id);
      const { data: answers } = await supabase
        .from('nevorai_submission_answers')
        .select('*')
        .in('submission_id', subIds);

      const answerMap = new Map<string, AnyRecord[]>();
      (answers || []).forEach((a: AnyRecord) => {
        if (!answerMap.has(a.submission_id)) answerMap.set(a.submission_id, []);
        answerMap.get(a.submission_id)!.push(a);
      });

      return subs.map((s: AnyRecord) => ({
        id: s.id,
        form_id: s.form_id,
        share_id: s.share_id || null,
        submitter_user_id: s.submitter_user_id || null,
        submitter_name: s.submitter_name || null,
        submitter_email: s.submitter_email || null,
        source: s.source || 'direct',
        utm_source: s.utm_source || null,
        utm_medium: s.utm_medium || null,
        utm_campaign: s.utm_campaign || null,
        utm_content: s.utm_content || null,
        lead_created: s.lead_created || false,
        lead_id: s.lead_id || null,
        created_at: s.created_at,
        answers: (answerMap.get(s.id) || []).map((a: AnyRecord) => ({
          id: a.id,
          submission_id: a.submission_id,
          field_id: a.field_id || null,
          field_key: a.field_key,
          value: a.value || null,
          value_json: a.value_json || null,
          created_at: a.created_at,
        })),
      }));
    } catch (err) {
      console.error('fetchSubmissions fallback error:', err);
      return [];
    }
  }, []);

  const submitForm = useCallback(async (
    token: string,
    answers: Record<string, string | string[]>,
    _attachments?: File[],
    utmData?: Record<string, string>
  ): Promise<boolean> => {
    try {
      const answersJson = Object.entries(answers).map(([key, value]) => ({
        field_key: key,
        value: Array.isArray(value) ? value.join(', ') : value,
        value_json: Array.isArray(value) ? value : null,
      }));

      const { error } = await supabase.rpc('nevorai_submit_form', {
        p_token: token,
        p_answers_json: answersJson as unknown as Json,
        p_attachments_json: [] as unknown as Json,
        p_source: 'app',
        p_utm_source: utmData?.utm_source || null,
        p_utm_medium: utmData?.utm_medium || null,
        p_utm_campaign: utmData?.utm_campaign || null,
        p_utm_content: utmData?.utm_content || null,
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('submitForm error:', err);
      toast.error('Submission failed');
      return false;
    }
  }, []);

  const getShareToken = useCallback(async (formId: string): Promise<string | null> => {
    if (!user) return null;
    try {
      const { data } = await supabase
        .from('nevorai_form_shares')
        .select('token')
        .eq('form_id', formId)
        .limit(1)
        .single();
      if (data) return data.token;

      const { data: newShare, error } = await supabase
        .from('nevorai_form_shares')
        .insert({ form_id: formId, created_by: user.id })
        .select('token')
        .single();
      if (error) throw error;
      return newShare?.token || null;
    } catch {
      return null;
    }
  }, [user]);

  const getShareUrl = (token: string): string => {
    return `${window.location.origin}/share/form/${token}`;
  };

  const getSubmissionCount = useCallback(async (formId: string): Promise<number> => {
    const { count } = await supabase
      .from('nevorai_form_submissions')
      .select('*', { head: true, count: 'exact' })
      .eq('form_id', formId);
    return count || 0;
  }, []);

  return {
    forms,
    loading,
    fetchForms,
    fetchFormWithFields,
    fetchFormByToken,
    createForm,
    updateForm,
    duplicateForm,
    deleteForm,
    fetchSubmissions,
    submitForm,
    getShareToken,
    getShareUrl,
    getSubmissionCount,
  };
}
