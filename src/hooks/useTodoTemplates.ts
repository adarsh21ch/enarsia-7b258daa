// Hook for leader to manage compulsory actions per level
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TodoTemplateItem {
  id: string;
  leader_id: string;
  level_position: number;
  template_name: string;
  item_title: string;
  is_active: boolean;
  sort_order: number;
  only_on_date: string | null; // null = recurring, 'YYYY-MM-DD' = one-time
  created_at: string;
  updated_at: string;
}

export function useTodoTemplates(levelPosition: number | null) {
  const { user } = useAuth();
  const [items, setItems] = useState<TodoTemplateItem[]>([]);
  const [templateName, setTemplateName] = useState('Compulsory Actions');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTemplateItems = useCallback(async () => {
    if (!user || levelPosition === null) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('todo_template_items')
        .select('*')
        .eq('leader_id', user.id)
        .eq('level_position', levelPosition)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      const templateItems = (data || []) as TodoTemplateItem[];
      setItems(templateItems);
      
      // Get template name from first item (all items in same level share same template_name)
      if (templateItems.length > 0) {
        setTemplateName(templateItems[0].template_name);
      } else {
        setTemplateName('Compulsory Actions');
      }
    } catch (error) {
      console.error('Error fetching template items:', error);
    } finally {
      setLoading(false);
    }
  }, [user, levelPosition]);

  useEffect(() => {
    fetchTemplateItems();
  }, [fetchTemplateItems]);

  const addItem = async (title: string, onlyOnDate: string | null = null) => {
    if (!user || levelPosition === null || !title.trim()) return null;

    setSaving(true);
    const nextSortOrder = items.length > 0 
      ? Math.max(...items.map(i => i.sort_order)) + 1 
      : 1;

    try {
      const { data, error } = await supabase
        .from('todo_template_items')
        .insert({
          leader_id: user.id,
          level_position: levelPosition,
          template_name: templateName,
          item_title: title.trim(),
          sort_order: nextSortOrder,
          is_active: true,
          only_on_date: onlyOnDate
        })
        .select()
        .single();

      if (error) throw error;
      setItems(prev => [...prev, data as TodoTemplateItem]);
      toast.success('Item added');
      return data as TodoTemplateItem;
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (id: string, updates: Partial<Pick<TodoTemplateItem, 'item_title' | 'is_active' | 'sort_order' | 'only_on_date'>>) => {
    if (!user) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('todo_template_items')
        .update(updates)
        .eq('id', id)
        .eq('leader_id', user.id);

      if (error) throw error;
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
      return true;
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateTemplateName = async (newName: string) => {
    if (!user || levelPosition === null || !newName.trim()) return false;

    setSaving(true);
    try {
      // Update template_name for all items in this level
      const { error } = await supabase
        .from('todo_template_items')
        .update({ template_name: newName.trim() })
        .eq('leader_id', user.id)
        .eq('level_position', levelPosition);

      if (error) throw error;
      setTemplateName(newName.trim());
      setItems(prev => prev.map(i => ({ ...i, template_name: newName.trim() })));
      return true;
    } catch (error) {
      console.error('Error updating template name:', error);
      toast.error('Failed to update template name');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleItemActive = async (id: string, isActive: boolean) => {
    return updateItem(id, { is_active: isActive });
  };

  const reorderItems = async (reorderedItems: TodoTemplateItem[]) => {
    if (!user) return false;

    setItems(reorderedItems.map((item, i) => ({ ...item, sort_order: i + 1 })));

    try {
      // Update each item's sort_order
      for (let i = 0; i < reorderedItems.length; i++) {
        await supabase
          .from('todo_template_items')
          .update({ sort_order: i + 1 })
          .eq('id', reorderedItems[i].id)
          .eq('leader_id', user.id);
      }
      return true;
    } catch (error) {
      console.error('Error reordering items:', error);
      toast.error('Failed to reorder items');
      fetchTemplateItems(); // Revert on error
      return false;
    }
  };

  const deleteItem = async (id: string) => {
    if (!user) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('todo_template_items')
        .delete()
        .eq('id', id)
        .eq('leader_id', user.id);

      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Item deleted');
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    items,
    templateName,
    loading,
    saving,
    addItem,
    updateItem,
    updateTemplateName,
    toggleItemActive,
    reorderItems,
    deleteItem,
    refetch: fetchTemplateItems
  };
}
