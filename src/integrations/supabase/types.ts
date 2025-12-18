export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          new_value: string | null
          old_value: string | null
          prospect_id: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          prospect_id?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          prospect_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usages: {
        Row: {
          coupon_code: string
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_code: string
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_options: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          is_filter_tag: boolean
          option_type: string
          option_value: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_filter_tag?: boolean
          option_type: string
          option_value: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_filter_tag?: boolean
          option_type?: string
          option_value?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: []
      }
      daily_leads: {
        Row: {
          calls: number | null
          created_at: string
          day_number: number
          enrolls: number | null
          id: string
          leads: number | null
          month_year: string
          updated_at: string
          user_id: string
          videos: number | null
        }
        Insert: {
          calls?: number | null
          created_at?: string
          day_number: number
          enrolls?: number | null
          id?: string
          leads?: number | null
          month_year: string
          updated_at?: string
          user_id: string
          videos?: number | null
        }
        Update: {
          calls?: number | null
          created_at?: string
          day_number?: number
          enrolls?: number | null
          id?: string
          leads?: number | null
          month_year?: string
          updated_at?: string
          user_id?: string
          videos?: number | null
        }
        Relationships: []
      }
      daily_stats: {
        Row: {
          breakdown_json: Json | null
          created_at: string
          date_logged: string
          id: string
          total_leads: number
          updated_at: string
          user_id: string
        }
        Insert: {
          breakdown_json?: Json | null
          created_at?: string
          date_logged?: string
          id?: string
          total_leads?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          breakdown_json?: Json | null
          created_at?: string
          date_logged?: string
          id?: string
          total_leads?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      funnel_configs: {
        Row: {
          created_at: string
          day_1_start: string
          funnel_length: number
          funnel_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_1_start?: string
          funnel_length?: number
          funnel_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_1_start?: string
          funnel_length?: number
          funnel_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      funnel_tracking: {
        Row: {
          created_at: string
          day_1: number | null
          day_2: number | null
          funnel_number: number
          id: string
          level_up: number | null
          minimum_billing: number | null
          two_cc: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_1?: number | null
          day_2?: number | null
          funnel_number: number
          id?: string
          level_up?: number | null
          minimum_billing?: number | null
          two_cc?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_1?: number | null
          day_2?: number | null
          funnel_number?: number
          id?: string
          level_up?: number | null
          minimum_billing?: number | null
          two_cc?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leader_levels: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_default: boolean
          label: string
          leader_id: string
          position: number
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          leader_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          leader_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      leader_member_aliases: {
        Row: {
          alias_name: string
          created_at: string
          id: string
          leader_id: string
          member_id: string
          updated_at: string
        }
        Insert: {
          alias_name: string
          created_at?: string
          id?: string
          leader_id: string
          member_id: string
          updated_at?: string
        }
        Update: {
          alias_name?: string
          created_at?: string
          id?: string
          leader_id?: string
          member_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments_log: {
        Row: {
          action_taken: string | null
          amount: number | null
          created_at: string
          error_message: string | null
          event_type: string
          found_user: boolean | null
          id: string
          raw_payload: Json | null
          razorpay_payment_id: string | null
          status: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          amount?: number | null
          created_at?: string
          error_message?: string | null
          event_type: string
          found_user?: boolean | null
          id?: string
          raw_payload?: Json | null
          razorpay_payment_id?: string | null
          status?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          amount?: number | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          found_user?: boolean | null
          id?: string
          raw_payload?: Json | null
          razorpay_payment_id?: string | null
          status?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allow_leader_to_view: boolean
          avatar_url: string | null
          bio: string | null
          city: string | null
          company_name: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          leaders_id_of_my_leader: string | null
          level_id: string | null
          neverai_id: string | null
          phone: string | null
          response_labels: Json | null
          root_leader_id: string | null
          stage_count: number
          stage_labels: Json | null
          tags_refresh_token: string | null
          updated_at: string
          use_leader_stages: boolean
          user_id: string
        }
        Insert: {
          allow_leader_to_view?: boolean
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          leaders_id_of_my_leader?: string | null
          level_id?: string | null
          neverai_id?: string | null
          phone?: string | null
          response_labels?: Json | null
          root_leader_id?: string | null
          stage_count?: number
          stage_labels?: Json | null
          tags_refresh_token?: string | null
          updated_at?: string
          use_leader_stages?: boolean
          user_id: string
        }
        Update: {
          allow_leader_to_view?: boolean
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          leaders_id_of_my_leader?: string | null
          level_id?: string | null
          neverai_id?: string | null
          phone?: string | null
          response_labels?: Json | null
          root_leader_id?: string | null
          stage_count?: number
          stage_labels?: Json | null
          tags_refresh_token?: string | null
          updated_at?: string
          use_leader_stages?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "leader_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          action_taken: string | null
          action_taken_at: string | null
          address: string | null
          age_or_dob: string | null
          batch_date: string | null
          date_added: string
          funnel_stage: string | null
          funnel_stage_at: string | null
          gender: string | null
          id: string
          instagram: string | null
          name: string
          notes: string | null
          personal_tags: Json | null
          phone: string
          priority: string | null
          profession: string | null
          prospect_status: string | null
          sheet_id: string | null
          sort_order: number | null
          stage_index: number | null
          updated_at: string
          user_id: string
          why_need: string | null
        }
        Insert: {
          action_taken?: string | null
          action_taken_at?: string | null
          address?: string | null
          age_or_dob?: string | null
          batch_date?: string | null
          date_added?: string
          funnel_stage?: string | null
          funnel_stage_at?: string | null
          gender?: string | null
          id?: string
          instagram?: string | null
          name: string
          notes?: string | null
          personal_tags?: Json | null
          phone: string
          priority?: string | null
          profession?: string | null
          prospect_status?: string | null
          sheet_id?: string | null
          sort_order?: number | null
          stage_index?: number | null
          updated_at?: string
          user_id: string
          why_need?: string | null
        }
        Update: {
          action_taken?: string | null
          action_taken_at?: string | null
          address?: string | null
          age_or_dob?: string | null
          batch_date?: string | null
          date_added?: string
          funnel_stage?: string | null
          funnel_stage_at?: string | null
          gender?: string | null
          id?: string
          instagram?: string | null
          name?: string
          notes?: string | null
          personal_tags?: Json | null
          phone?: string
          priority?: string | null
          profession?: string | null
          prospect_status?: string | null
          sheet_id?: string | null
          sort_order?: number | null
          stage_index?: number | null
          updated_at?: string
          user_id?: string
          why_need?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      sheets: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      team_access: {
        Row: {
          allowed_tabs: string[] | null
          created_at: string
          id: string
          owner_user_id: string
          shared_with_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          allowed_tabs?: string[] | null
          created_at?: string
          id?: string
          owner_user_id: string
          shared_with_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          allowed_tabs?: string[] | null
          created_at?: string
          id?: string
          owner_user_id?: string
          shared_with_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          completed: boolean
          created_at: string
          due_date: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_admin_override: boolean
          payment_id: string | null
          plan: Database["public"]["Enums"]["user_plan"]
          status: string
          subscribed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_admin_override?: boolean
          payment_id?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          status?: string
          subscribed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_admin_override?: boolean
          payment_id?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          status?: string
          subscribed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_targets: {
        Row: {
          created_at: string
          id: string
          target_type: string
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_type: string
          target_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_type?: string
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_stats: {
        Args: never
        Returns: {
          active_pro_users: number
          total_payments: number
          total_users: number
        }[]
      }
      admin_list_all_profiles: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          neverai_id: string
          phone: string
          subscription_expires_at: string
          subscription_plan: string
          subscription_status: string
          user_id: string
        }[]
      }
      generate_neverai_id: { Args: never; Returns: string }
      get_leader_stage_config: {
        Args: { target_leader_id: string }
        Returns: Json
      }
      get_or_create_default_level: {
        Args: { p_leader_user_id: string }
        Returns: string
      }
      get_user_by_neverai_id: {
        Args: { target_neverai_id: string }
        Returns: {
          display_name: string
          neverai_id: string
          user_id: string
        }[]
      }
      get_user_email_by_leader_id: {
        Args: { target_leader_id: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_user_email_for_admin: {
        Args: { target_user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_in_downline: {
        Args: { _target_user_id: string; _viewer_id: string }
        Returns: boolean
      }
      update_leader_hierarchy: {
        Args: { p_leader_neverai_id: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      action_taken:
        | "Video Sent"
        | "Called"
        | "Not Picked"
        | "Busy"
        | "Follow Up Scheduled"
      app_role: "admin" | "user"
      funnel_stage:
        | "Enrollment"
        | "Day 1"
        | "Day 2"
        | "Day 3"
        | "Minimum Bill"
        | "Level Up"
        | "2CC"
      priority_level: "High" | "Medium" | "Low"
      prospect_status: "+VE" | "-VE" | "50-50" | "30-70"
      user_plan: "free" | "pro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      action_taken: [
        "Video Sent",
        "Called",
        "Not Picked",
        "Busy",
        "Follow Up Scheduled",
      ],
      app_role: ["admin", "user"],
      funnel_stage: [
        "Enrollment",
        "Day 1",
        "Day 2",
        "Day 3",
        "Minimum Bill",
        "Level Up",
        "2CC",
      ],
      priority_level: ["High", "Medium", "Low"],
      prospect_status: ["+VE", "-VE", "50-50", "30-70"],
      user_plan: ["free", "pro"],
    },
  },
} as const
