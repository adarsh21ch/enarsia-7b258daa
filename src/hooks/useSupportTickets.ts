import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type TicketCategory = 'app_issue' | 'training_help' | 'payment' | 'other';
export type TicketStatus = 'pending' | 'in_review' | 'resolved';

export interface SupportTicket {
  id: string;
  user_id: string;
  category: TicketCategory;
  subject: string;
  description: string;
  attachments: string[];
  status: TicketStatus;
  admin_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields for admin view
  user_email?: string;
  user_name?: string;
  user_neverai_id?: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
}

interface CreateTicketInput {
  category: TicketCategory;
  subject: string;
  description: string;
  attachments?: string[];
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  app_issue: 'App Issue',
  training_help: 'Training / Business Help',
  payment: 'Payment / Subscription',
  other: 'Other Query',
};

export function useSupportTickets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's own tickets
  const { data: myTickets, isLoading: loadingMyTickets, refetch: refetchMyTickets } = useQuery({
    queryKey: ['support_tickets', 'my', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!user?.id,
  });

  // Create a new ticket
  const createTicketMutation = useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id,
          category: input.category,
          subject: input.subject,
          description: input.description,
          attachments: input.attachments || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
      toast.success('Your request has been submitted. Our team will review it shortly.');
    },
    onError: (error) => {
      console.error('Error creating ticket:', error);
      toast.error('Failed to submit request. Please try again.');
    },
  });

  const createTicket = useCallback(async (input: CreateTicketInput) => {
    return createTicketMutation.mutateAsync(input);
  }, [createTicketMutation]);

  return {
    myTickets: myTickets || [],
    loadingMyTickets,
    refetchMyTickets,
    createTicket,
    isCreating: createTicketMutation.isPending,
    CATEGORY_LABELS,
  };
}

// Admin-specific hook for managing all tickets
export function useAdminSupportTickets() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');

  // Fetch all tickets for admin
  const { data: allTickets, isLoading, refetch } = useQuery({
    queryKey: ['support_tickets', 'admin', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user details for each ticket
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, neverai_id')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(ticket => ({
        ...ticket,
        user_email: profileMap.get(ticket.user_id)?.email || 'Unknown',
        user_name: profileMap.get(ticket.user_id)?.display_name || 'Unknown',
        user_neverai_id: profileMap.get(ticket.user_id)?.neverai_id || 'N/A',
      })) as SupportTicket[];
    },
  });

  // Fetch replies for a specific ticket
  const fetchReplies = useCallback(async (ticketId: string) => {
    const { data, error } = await supabase
      .from('support_ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as TicketReply[];
  }, []);

  // Update ticket status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: TicketStatus }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets'] });
      toast.success('Ticket status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  // Add admin reply
  const addReplyMutation = useMutation({
    mutationFn: async ({ ticketId, message, userId }: { ticketId: string; message: string; userId: string }) => {
      const { error } = await supabase
        .from('support_ticket_replies')
        .insert({
          ticket_id: ticketId,
          user_id: userId,
          message,
          is_admin_reply: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reply sent');
    },
    onError: () => {
      toast.error('Failed to send reply');
    },
  });

  return {
    tickets: allTickets || [],
    isLoading,
    refetch,
    statusFilter,
    setStatusFilter,
    updateStatus: updateStatusMutation.mutateAsync,
    addReply: addReplyMutation.mutateAsync,
    fetchReplies,
    isUpdating: updateStatusMutation.isPending,
    isReplying: addReplyMutation.isPending,
  };
}
