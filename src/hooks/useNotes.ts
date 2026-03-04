import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface NoteBlock {
  id: string;
  type: 'text' | 'heading' | 'checklist';
  content: string;
  checked?: boolean;
  style?: 'bold' | 'italic' | 'normal';
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: NoteBlock[];
  color_label: string;
  is_pinned: boolean;
  folder: string;
  created_at: string;
  updated_at: string;
}

export function useNotes(folder?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const notesQuery = useQuery({
    queryKey: ['notes', user?.id, folder],
    queryFn: async () => {
      let query = supabase
        .from('notes')
        .select('*')
        .eq('user_id', user!.id)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (folder && folder !== 'All') {
        query = query.eq('folder', folder);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(n => ({
        ...n,
        content: (Array.isArray(n.content) ? n.content : []) as unknown as NoteBlock[],
      })) as Note[];
    },
    enabled: !!user?.id,
  });

  const createNote = useMutation({
    mutationFn: async (note: Partial<Note>) => {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user!.id,
          title: note.title || '',
          content: (note.content || []) as any,
          color_label: note.color_label || 'default',
          is_pinned: note.is_pinned || false,
          folder: note.folder || 'General',
        })
        .select()
        .single();
      if (error) throw error;
      return { ...data, content: data.content as unknown as NoteBlock[] } as Note;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
    onError: () => toast.error('Failed to create note'),
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Note> & { id: string }) => {
      const payload: any = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.content !== undefined) payload.content = updates.content as any;
      if (updates.color_label !== undefined) payload.color_label = updates.color_label;
      if (updates.is_pinned !== undefined) payload.is_pinned = updates.is_pinned;
      if (updates.folder !== undefined) payload.folder = updates.folder;

      const { error } = await supabase
        .from('notes')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note deleted');
    },
    onError: () => toast.error('Failed to delete note'),
  });

  const folders = useQuery({
    queryKey: ['note-folders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('folder')
        .eq('user_id', user!.id);
      if (error) throw error;
      const unique = [...new Set((data || []).map(d => d.folder || 'General'))];
      return ['All', ...unique.sort()];
    },
    enabled: !!user?.id,
  });

  return {
    notes: notesQuery.data || [],
    isLoading: notesQuery.isLoading,
    folders: folders.data || ['All', 'General'],
    createNote,
    updateNote,
    deleteNote,
    refetch: notesQuery.refetch,
  };
}
