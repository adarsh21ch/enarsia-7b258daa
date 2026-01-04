import { useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Todo } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useTodos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['todos', user?.id];

  const { data: todos = [], isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<Todo[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('completed', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching todos:', error);
        throw error;
      }

      return (data || []) as Todo[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Add todo mutation
  const addMutation = useMutation({
    mutationFn: async ({ title, dueDate }: { title: string; dueDate?: string }) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('todos')
        .insert({
          title,
          due_date: dueDate || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Todo;
    },
    onSuccess: (newTodo) => {
      queryClient.setQueryData<Todo[]>(queryKey, (prev) => 
        prev ? [newTodo, ...prev] : [newTodo]
      );
      toast.success('Task added');
    },
    onError: () => {
      toast.error('Failed to add task');
    },
  });

  // Update todo mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Todo> }) => {
      const { data, error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Todo;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Todo[]>(queryKey);
      
      if (previous) {
        queryClient.setQueryData<Todo[]>(queryKey, 
          previous.map(t => t.id === id ? { ...t, ...updates } : t)
        );
      }
      
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error('Failed to update task');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Delete todo mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Todo[]>(queryKey);
      
      if (previous) {
        queryClient.setQueryData<Todo[]>(queryKey, previous.filter(t => t.id !== id));
      }
      
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error('Failed to delete task');
    },
  });

  const addTodo = useCallback(async (title: string, dueDate?: string) => {
    try {
      return await addMutation.mutateAsync({ title, dueDate });
    } catch {
      return null;
    }
  }, [addMutation]);

  const updateTodo = useCallback(async (id: string, updates: Partial<Todo>) => {
    try {
      return await updateMutation.mutateAsync({ id, updates });
    } catch {
      return null;
    }
  }, [updateMutation]);

  const deleteTodo = useCallback(async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [deleteMutation]);

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    return updateTodo(id, { completed });
  }, [updateTodo]);

  return {
    todos,
    loading,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    refetch,
  };
}
