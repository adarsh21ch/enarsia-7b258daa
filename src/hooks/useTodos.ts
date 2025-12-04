import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Todo } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useTodos() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodos = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('completed', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTodos(data as Todo[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const addTodo = async (title: string, dueDate?: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('todos')
      .insert({
        title,
        due_date: dueDate || null,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add task');
      return null;
    }

    setTodos(prev => [data as Todo, ...prev]);
    toast.success('Task added');
    return data as Todo;
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    const { data, error } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('Failed to update task');
      return null;
    }

    setTodos(prev => prev.map(t => t.id === id ? (data as Todo) : t));
    return data as Todo;
  };

  const deleteTodo = async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete task');
      return false;
    }

    setTodos(prev => prev.filter(t => t.id !== id));
    return true;
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    return updateTodo(id, { completed });
  };

  return {
    todos,
    loading,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    refetch: fetchTodos,
  };
}
