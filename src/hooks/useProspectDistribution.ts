import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProspectDistribution {
  threshold: number;
  threshold_label: string;
  user_count: number;
}

export interface UserByThreshold {
  user_id: string;
  display_name: string | null;
  email: string | null;
  neverai_id: string | null;
  prospect_count: number;
  plan: string;
  last_active: string | null;
}

export function useProspectDistribution() {
  return useQuery({
    queryKey: ["admin", "prospect-distribution"],
    queryFn: async (): Promise<ProspectDistribution[]> => {
      const { data, error } = await supabase.rpc("admin_get_prospect_distribution");
      
      if (error) throw error;
      return (data || []) as ProspectDistribution[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUsersByProspectThreshold(threshold: number | null) {
  return useQuery({
    queryKey: ["admin", "users-by-threshold", threshold],
    queryFn: async (): Promise<UserByThreshold[]> => {
      if (threshold === null) return [];
      
      const { data, error } = await supabase.rpc("admin_get_users_by_prospect_threshold", {
        p_threshold: threshold,
      });
      
      if (error) throw error;
      return (data || []) as UserByThreshold[];
    },
    enabled: threshold !== null,
    staleTime: 5 * 60 * 1000,
  });
}
