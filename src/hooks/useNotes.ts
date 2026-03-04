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

function getNotesErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (
    message.includes('session_expired') ||
    message.includes('auth session missing') ||
    message.includes('jwt') ||
    message.includes('row-level security')
  ) {
    return 'Session expired. Please sign in again.';
  }

  return fallback;
}

export function useNotes(folder?: string) {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  const ensureSessionUserId = async () => {
    let activeSession = session;

    if (!activeSession?.access_token) {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      activeSession = data.session;
    }

    if (!activeSession?.access_token) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      activeSession = data.session;
    }

    if (!activeSession?.user?.id) {
      throw new Error('SESSION_EXPIRED');
    }

    return activeSession.user.id;
  };

  const notesQuery = useQuery({
    queryKey: ['notes', session?.access_token ? user?.id : null, folder],
    queryFn: async () => {
      const userId = await ensureSessionUserId();

      let query = supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (folder && folder !== 'All') {
        query = query.eq('folder', folder);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((n) => ({
        ...n,
        content: (Array.isArray(n.content) ? n.content : []) as unknown as NoteBlock[],
      })) as Note[];
    },
    enabled: !!user?.id && !!session?.access_token,
  });

  const createNote = useMutation({
    mutationFn: async (note: Partial<Note>) => {
      const userId = await ensureSessionUserId();

      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: userId,
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
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['notes', created.user_id] });
      queryClient.invalidateQueries({ queryKey: ['note', created.user_id, created.id] });
    },
    onError: (error) => toast.error(getNotesErrorMessage(error, 'Failed to create note')),
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Note> & { id: string }) => {
      const userId = await ensureSessionUserId();

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
        .eq('user_id', userId);

      if (error) throw error;
      return { id, userId };
    },
    onSuccess: ({ id, userId }) => {
      queryClient.invalidateQueries({ queryKey: ['notes', userId] });
      queryClient.invalidateQueries({ queryKey: ['note', userId, id] });
    },
    onError: (error) => toast.error(getNotesErrorMessage(error, 'Failed to update note')),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const userId = await ensureSessionUserId();

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return { id, userId };
    },
    onSuccess: ({ id, userId }) => {
      queryClient.invalidateQueries({ queryKey: ['notes', userId] });
      queryClient.removeQueries({ queryKey: ['note', userId, id] });
      toast.success('Note deleted');
    },
    onError: (error) => toast.error(getNotesErrorMessage(error, 'Failed to delete note')),
  });

  const folders = useQuery({
    queryKey: ['note-folders', session?.access_token ? user?.id : null],
    queryFn: async () => {
      const userId = await ensureSessionUserId();

      const { data, error } = await supabase
        .from('notes')
        .select('folder')
        .eq('user_id', userId);

      if (error) throw error;
      const unique = [...new Set((data || []).map((d) => d.folder || 'General'))];
      return ['All', ...unique.sort()];
    },
    enabled: !!user?.id && !!session?.access_token,
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
