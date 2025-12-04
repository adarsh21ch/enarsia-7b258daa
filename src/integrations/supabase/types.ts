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
      custom_options: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          option_type: string
          option_value: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          option_type: string
          option_value: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          company_name: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          action_taken: Database["public"]["Enums"]["action_taken"] | null
          age: number | null
          batch_date: string | null
          city: string | null
          date_added: string
          date_of_birth: string | null
          email: string | null
          enrollment_status: string | null
          funnel_stage: Database["public"]["Enums"]["funnel_stage"] | null
          id: string
          last_contact_date: string | null
          name: string
          notes: string | null
          phone: string
          priority: Database["public"]["Enums"]["priority_level"] | null
          prospect_status: Database["public"]["Enums"]["prospect_status"] | null
          sheet_id: string | null
          updated_at: string
          user_id: string
          why_need: string | null
        }
        Insert: {
          action_taken?: Database["public"]["Enums"]["action_taken"] | null
          age?: number | null
          batch_date?: string | null
          city?: string | null
          date_added?: string
          date_of_birth?: string | null
          email?: string | null
          enrollment_status?: string | null
          funnel_stage?: Database["public"]["Enums"]["funnel_stage"] | null
          id?: string
          last_contact_date?: string | null
          name: string
          notes?: string | null
          phone: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          prospect_status?:
            | Database["public"]["Enums"]["prospect_status"]
            | null
          sheet_id?: string | null
          updated_at?: string
          user_id: string
          why_need?: string | null
        }
        Update: {
          action_taken?: Database["public"]["Enums"]["action_taken"] | null
          age?: number | null
          batch_date?: string | null
          city?: string | null
          date_added?: string
          date_of_birth?: string | null
          email?: string | null
          enrollment_status?: string | null
          funnel_stage?: Database["public"]["Enums"]["funnel_stage"] | null
          id?: string
          last_contact_date?: string | null
          name?: string
          notes?: string | null
          phone?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          prospect_status?:
            | Database["public"]["Enums"]["prospect_status"]
            | null
          sheet_id?: string | null
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
      [_ in never]: never
    }
    Enums: {
      action_taken:
        | "Video Sent"
        | "Called"
        | "Not Picked"
        | "Busy"
        | "Follow Up Scheduled"
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
    },
  },
} as const
