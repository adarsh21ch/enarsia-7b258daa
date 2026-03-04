import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface NoteAttachment {
  id: string;
  note_id: string;
  user_id: string;
  type: 'photo' | 'audio';
  storage_path: string;
  file_name: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  created_at: string;
  publicUrl?: string;
}

export function useNoteAttachments(noteId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const attachmentsQuery = useQuery({
    queryKey: ['note-attachments', noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('note_attachments')
        .select('*')
        .eq('note_id', noteId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      
      // Generate signed URLs for each attachment
      const withUrls = await Promise.all(
        (data || []).map(async (att) => {
          const { data: urlData } = await supabase.storage
            .from('note-attachments')
            .createSignedUrl(att.storage_path, 3600);
          return { ...att, publicUrl: urlData?.signedUrl || '' } as NoteAttachment;
        })
      );
      return withUrls;
    },
    enabled: !!noteId && !!user?.id,
  });

  const uploadAttachment = useMutation({
    mutationFn: async ({ noteId, file, type, durationSeconds }: {
      noteId: string;
      file: File;
      type: 'photo' | 'audio';
      durationSeconds?: number;
    }) => {
      const ext = file.name.split('.').pop() || (type === 'audio' ? 'webm' : 'jpg');
      const path = `${user!.id}/${noteId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('note-attachments')
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('note_attachments')
        .insert({
          note_id: noteId,
          user_id: user!.id,
          type,
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          duration_seconds: durationSeconds || null,
        });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-attachments'] });
    },
    onError: () => toast.error('Failed to upload attachment'),
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachment: NoteAttachment) => {
      await supabase.storage.from('note-attachments').remove([attachment.storage_path]);
      const { error } = await supabase
        .from('note_attachments')
        .delete()
        .eq('id', attachment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-attachments'] });
    },
    onError: () => toast.error('Failed to delete attachment'),
  });

  return {
    attachments: attachmentsQuery.data || [],
    isLoading: attachmentsQuery.isLoading,
    uploadAttachment,
    deleteAttachment,
    refetch: attachmentsQuery.refetch,
  };
}
