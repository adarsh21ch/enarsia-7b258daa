import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export interface DirectTeamMember {
  user_id: string;
  display_name: string | null;
  level_id: string | null;
  level_position: number | null;
}

export function useDirectTeam() {
  const [members, setMembers] = useState<DirectTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { profile } = useProfile();

  const fetchDirectTeam = useCallback(async () => {
    if (!user || !profile?.neverai_id) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Get all profiles where leaders_id_of_my_leader matches current user's neverai_id
    // Use ilike for case-insensitive matching
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, level_id')
      .ilike('leaders_id_of_my_leader', profile.neverai_id);

    if (error) {
      console.error('Error fetching direct team:', error);
      setMembers([]);
    } else {
      // Get level positions for each member
      const memberIds = (data || []).map(m => m.level_id).filter(Boolean);
      
      let levelPositions: Record<string, number> = {};
      if (memberIds.length > 0) {
        const { data: levels } = await supabase
          .from('leader_levels')
          .select('id, position')
          .in('id', memberIds);
        
        if (levels) {
          levelPositions = levels.reduce((acc, l) => {
            acc[l.id] = l.position;
            return acc;
          }, {} as Record<string, number>);
        }
      }

      const membersWithPosition = (data || []).map(m => ({
        user_id: m.user_id,
        display_name: m.display_name,
        level_id: m.level_id,
        level_position: m.level_id ? levelPositions[m.level_id] || null : null
      }));

      setMembers(membersWithPosition);
    }
    setLoading(false);
  }, [user, profile?.neverai_id]);

  useEffect(() => {
    fetchDirectTeam();
  }, [fetchDirectTeam]);

  const hasDirectTeam = members.length > 0;

  // Get unique level positions
  const levelPositions = [...new Set(members.map(m => m.level_position).filter(Boolean))] as number[];

  return {
    members,
    loading,
    hasDirectTeam,
    levelPositions,
    refetch: fetchDirectTeam
  };
}
