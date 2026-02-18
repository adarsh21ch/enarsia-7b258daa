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
      abuse_logs: {
        Row: {
          created_at: string | null
          event_type: string
          funnel_id: string | null
          id: string
          ip_hash: string | null
          key_hash: string | null
          lead_id: string | null
          metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          funnel_id?: string | null
          id?: string
          ip_hash?: string | null
          key_hash?: string | null
          lead_id?: string | null
          metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          funnel_id?: string | null
          id?: string
          ip_hash?: string | null
          key_hash?: string | null
          lead_id?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "abuse_logs_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abuse_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "funnel_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ac_announcement_media: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          media_type: string
          media_url: string
          sort_order: number
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          media_type?: string
          media_url: string
          sort_order?: number
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ac_announcement_media_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "ac_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      ac_announcements: {
        Row: {
          author_user_id: string | null
          body: string
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          is_pinned: boolean
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          author_user_id?: string | null
          body: string
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string | null
          body?: string
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ac_chat_messages: {
        Row: {
          attachments_json: Json | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          is_pinned: boolean
          mentioned_user_ids: string[] | null
          message: string
          message_type: string
          poll_id: string | null
          reply_to_id: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          attachments_json?: Json | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          mentioned_user_ids?: string[] | null
          message: string
          message_type?: string
          poll_id?: string | null
          reply_to_id?: string | null
          room_id?: string
          user_id: string
        }
        Update: {
          attachments_json?: Json | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          mentioned_user_ids?: string[] | null
          message?: string
          message_type?: string
          poll_id?: string | null
          reply_to_id?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ac_chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "ac_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ac_chat_poll_options: {
        Row: {
          id: string
          label: string
          poll_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          label: string
          poll_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          label?: string
          poll_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ac_chat_poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "ac_chat_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      ac_chat_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ac_chat_poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "ac_chat_poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ac_chat_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "ac_chat_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      ac_chat_polls: {
        Row: {
          closes_at: string | null
          created_at: string
          created_by: string
          id: string
          is_closed: boolean
          question: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_closed?: boolean
          question: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_closed?: boolean
          question?: string
        }
        Relationships: []
      }
      ac_chat_read_status: {
        Row: {
          id: string
          last_read_at: string
          last_read_message_id: string | null
          room_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string
          last_read_message_id?: string | null
          room_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string
          last_read_message_id?: string | null
          room_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ac_chat_read_status_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "ac_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ac_event_rsvps: {
        Row: {
          checked_in_at: string | null
          created_at: string
          event_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ac_event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "ac_events"
            referencedColumns: ["id"]
          },
        ]
      }
      ac_events: {
        Row: {
          all_day: boolean | null
          capacity: number | null
          category: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          end_at: string | null
          host_name: string | null
          id: string
          link: string | null
          location: string | null
          start_at: string
          timezone: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          all_day?: boolean | null
          capacity?: number | null
          category?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          end_at?: string | null
          host_name?: string | null
          id?: string
          link?: string | null
          location?: string | null
          start_at: string
          timezone?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          all_day?: boolean | null
          capacity?: number | null
          category?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          end_at?: string | null
          host_name?: string | null
          id?: string
          link?: string | null
          location?: string | null
          start_at?: string
          timezone?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      ac_join_requests: {
        Row: {
          created_at: string | null
          entered_upline_email: string | null
          entered_upline_leader_id: string
          id: string
          status: string
          updated_at: string | null
          upline_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entered_upline_email?: string | null
          entered_upline_leader_id: string
          id?: string
          status?: string
          updated_at?: string | null
          upline_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entered_upline_email?: string | null
          entered_upline_leader_id?: string
          id?: string
          status?: string
          updated_at?: string | null
          upline_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      ac_notifications: {
        Row: {
          announcement_id: string | null
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link_url: string | null
          payload_json: Json | null
          read_at: string | null
          receiver_user_id: string | null
          scheduled_at: string | null
          status: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          announcement_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          payload_json?: Json | null
          read_at?: string | null
          receiver_user_id?: string | null
          scheduled_at?: string | null
          status?: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          announcement_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          payload_json?: Json | null
          read_at?: string | null
          receiver_user_id?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ac_notifications_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "ac_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      ac_profiles: {
        Row: {
          city: string | null
          created_at: string | null
          dob: string | null
          full_name: string | null
          mobile: string | null
          onboarding_completed_at: string | null
          state: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          dob?: string | null
          full_name?: string | null
          mobile?: string | null
          onboarding_completed_at?: string | null
          state?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string | null
          dob?: string | null
          full_name?: string | null
          mobile?: string | null
          onboarding_completed_at?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ac_resource_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ac_resource_items: {
        Row: {
          created_at: string
          group_id: string
          id: string
          label: string
          note: string | null
          sort_order: number
          title: string
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          label: string
          note?: string | null
          sort_order?: number
          title: string
          type?: string
          url: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          label?: string
          note?: string | null
          sort_order?: number
          title?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ac_resource_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "ac_resource_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      ac_todo_completions: {
        Row: {
          created_at: string
          date: string
          done_at: string | null
          id: string
          is_done: boolean
          template_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          done_at?: string | null
          id?: string
          is_done?: boolean
          template_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          done_at?: string | null
          id?: string
          is_done?: boolean
          template_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ac_todo_completions_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "ac_todo_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ac_todo_day_highlights: {
        Row: {
          created_at: string | null
          created_by: string
          date: string
          group_id: string | null
          highlight_title_override: string | null
          id: string
          send_notification: boolean
          template_item_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          date: string
          group_id?: string | null
          highlight_title_override?: string | null
          id?: string
          send_notification?: boolean
          template_item_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          date?: string
          group_id?: string | null
          highlight_title_override?: string | null
          id?: string
          send_notification?: boolean
          template_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ac_todo_day_highlights_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "ac_todo_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ac_todo_template_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_starred: boolean
          sort_order: number
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_starred?: boolean
          sort_order?: number
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_starred?: boolean
          sort_order?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ac_todo_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ac_todo_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ac_todo_templates: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          group_id: string | null
          id: string
          scope: string
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          group_id?: string | null
          id?: string
          scope?: string
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          group_id?: string | null
          id?: string
          scope?: string
          title?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          achieved_at: string
          community_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          media_url: string | null
          member_user_id: string
          title: string
        }
        Insert: {
          achieved_at?: string
          community_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          media_url?: string | null
          member_user_id: string
          title: string
        }
        Update: {
          achieved_at?: string
          community_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          media_url?: string | null
          member_user_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      achievers_club_pending: {
        Row: {
          claimed_at: string | null
          claimed_user_id: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          leader_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          claimed_user_id?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id?: string
          leader_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          claimed_user_id?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          leader_id?: string | null
        }
        Relationships: []
      }
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
      admin_audit_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string | null
          description: string
          id: string
          new_value: Json | null
          old_value: Json | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string | null
          description: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          description?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      admin_config_text: {
        Row: {
          config_key: string
          config_value: string
          description: string | null
          id: string
          is_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: string
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_feature_flags: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          feature_key: string
          feature_name: string
          free_access: boolean | null
          free_limit: number | null
          id: string
          is_enabled: boolean | null
          pro_access: boolean | null
          pro_limit: number | null
          trial_access: boolean | null
          trial_limit: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          feature_key: string
          feature_name: string
          free_access?: boolean | null
          free_limit?: number | null
          id?: string
          is_enabled?: boolean | null
          pro_access?: boolean | null
          pro_limit?: number | null
          trial_access?: boolean | null
          trial_limit?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          feature_key?: string
          feature_name?: string
          free_access?: boolean | null
          free_limit?: number | null
          id?: string
          is_enabled?: boolean | null
          pro_access?: boolean | null
          pro_limit?: number | null
          trial_access?: boolean | null
          trial_limit?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_offers: {
        Row: {
          applicable_plan_ids: string[] | null
          created_at: string | null
          discount_type: string
          discount_value: number
          end_date: string
          id: string
          is_active: boolean | null
          max_uses_per_user: number | null
          offer_name: string
          offer_payment_link: string | null
          promo_code: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          applicable_plan_ids?: string[] | null
          created_at?: string | null
          discount_type: string
          discount_value: number
          end_date: string
          id?: string
          is_active?: boolean | null
          max_uses_per_user?: number | null
          offer_name: string
          offer_payment_link?: string | null
          promo_code?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          applicable_plan_ids?: string[] | null
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string
          id?: string
          is_active?: boolean | null
          max_uses_per_user?: number | null
          offer_name?: string
          offer_payment_link?: string | null
          promo_code?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_subscription_plans: {
        Row: {
          badge_text: string | null
          created_at: string | null
          description: string | null
          duration_days: number
          features: Json | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          payment_link: string | null
          plan_key: string
          plan_name: string
          price_inr: number
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          badge_text?: string | null
          created_at?: string | null
          description?: string | null
          duration_days: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          payment_link?: string | null
          plan_key: string
          plan_name: string
          price_inr: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          badge_text?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          payment_link?: string | null
          plan_key?: string
          plan_name?: string
          price_inr?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_usage_limits: {
        Row: {
          config_key: string
          config_value: number
          description: string | null
          id: string
          is_enabled: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: number
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: number
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      admin_user_overrides: {
        Row: {
          created_at: string | null
          created_by: string | null
          custom_daily_limit: number | null
          custom_expiry_date: string | null
          custom_total_limit: number | null
          force_pro_access: boolean | null
          id: string
          notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          custom_daily_limit?: number | null
          custom_expiry_date?: string | null
          custom_total_limit?: number | null
          force_pro_access?: boolean | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          custom_daily_limit?: number | null
          custom_expiry_date?: string | null
          custom_total_limit?: number | null
          force_pro_access?: boolean | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string | null
          community_id: string
          created_at: string
          created_by: string
          id: string
          media_url: string | null
          message_type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          body?: string | null
          community_id: string
          created_at?: string
          created_by: string
          id?: string
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          body?: string | null
          community_id?: string
          created_at?: string
          created_by?: string
          id?: string
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          chat_mode: string
          community_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          root_owner_user_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          chat_mode?: string
          community_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          root_owner_user_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          chat_mode?: string
          community_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          root_owner_user_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_memberships: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["community_role"]
          root_owner_user_id: string | null
          status: Database["public"]["Enums"]["membership_status"]
          upline_email: string | null
          upline_leader_id_text: string | null
          upline_member_user_id: string | null
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_role"]
          root_owner_user_id?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          upline_email?: string | null
          upline_leader_id_text?: string | null
          upline_member_user_id?: string | null
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_role"]
          root_owner_user_id?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          upline_email?: string | null
          upline_leader_id_text?: string | null
          upline_member_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_memberships_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          name: string
          start_date: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usages: {
        Row: {
          coupon_code: string
          id: string
          payment_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_code: string
          id?: string
          payment_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string
          id?: string
          payment_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          course_id: string
          email: string | null
          enrolled_at: string
          id: string
          name: string | null
          payment_proof_url: string | null
          payment_status: string
          phone: string | null
          user_identifier: string
        }
        Insert: {
          course_id: string
          email?: string | null
          enrolled_at?: string
          id?: string
          name?: string | null
          payment_proof_url?: string | null
          payment_status?: string
          phone?: string | null
          user_identifier: string
        }
        Update: {
          course_id?: string
          email?: string | null
          enrolled_at?: string
          id?: string
          name?: string | null
          payment_proof_url?: string | null
          payment_status?: string
          phone?: string | null
          user_identifier?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_video_progress: {
        Row: {
          completed: boolean
          course_video_id: string
          enrollment_id: string
          id: string
          last_heartbeat_at: string | null
          last_position: number
          updated_at: string
          watch_percentage: number
          watch_seconds: number
        }
        Insert: {
          completed?: boolean
          course_video_id: string
          enrollment_id: string
          id?: string
          last_heartbeat_at?: string | null
          last_position?: number
          updated_at?: string
          watch_percentage?: number
          watch_seconds?: number
        }
        Update: {
          completed?: boolean
          course_video_id?: string
          enrollment_id?: string
          id?: string
          last_heartbeat_at?: string | null
          last_position?: number
          updated_at?: string
          watch_percentage?: number
          watch_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_video_progress_course_video_id_fkey"
            columns: ["course_video_id"]
            isOneToOne: false
            referencedRelation: "course_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_video_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "course_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      course_videos: {
        Row: {
          course_id: string
          created_at: string
          id: string
          sort_order: number
          title: string | null
          video_asset_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string | null
          video_asset_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string | null
          video_asset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_videos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          access_type: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          owner_user_id: string
          price: number
          qr_image_url: string | null
          sequential_unlock: boolean
          slug: string
          title: string
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          access_type?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          owner_user_id: string
          price?: number
          qr_image_url?: string | null
          sequential_unlock?: boolean
          slug: string
          title: string
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          access_type?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          owner_user_id?: string
          price?: number
          qr_image_url?: string | null
          sequential_unlock?: boolean
          slug?: string
          title?: string
          updated_at?: string
          upi_id?: string | null
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
      daily_tracking_logs: {
        Row: {
          created_at: string | null
          enrolled_count: number | null
          final_stage_tag: string | null
          final_tag: string | null
          id: string
          leads_count: number | null
          log_date: string
          no_contact_count: number | null
          response_tags: Json | null
          responses_count: number | null
          stage_tags: Json | null
          updated_at: string | null
          user_id: string
          video_sent_count: number | null
        }
        Insert: {
          created_at?: string | null
          enrolled_count?: number | null
          final_stage_tag?: string | null
          final_tag?: string | null
          id?: string
          leads_count?: number | null
          log_date: string
          no_contact_count?: number | null
          response_tags?: Json | null
          responses_count?: number | null
          stage_tags?: Json | null
          updated_at?: string | null
          user_id: string
          video_sent_count?: number | null
        }
        Update: {
          created_at?: string | null
          enrolled_count?: number | null
          final_stage_tag?: string | null
          final_tag?: string | null
          id?: string
          leads_count?: number | null
          log_date?: string
          no_contact_count?: number | null
          response_tags?: Json | null
          responses_count?: number | null
          stage_tags?: Json | null
          updated_at?: string | null
          user_id?: string
          video_sent_count?: number | null
        }
        Relationships: []
      }
      email_otps: {
        Row: {
          attempts: number | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          otp_code: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          otp_code: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      feed_posts: {
        Row: {
          body: string | null
          community_id: string
          created_at: string
          created_by: string
          id: string
          media_url: string | null
          title: string | null
          type: Database["public"]["Enums"]["feed_post_type"]
          updated_at: string
        }
        Insert: {
          body?: string | null
          community_id: string
          created_at?: string
          created_by: string
          id?: string
          media_url?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["feed_post_type"]
          updated_at?: string
        }
        Update: {
          body?: string | null
          community_id?: string
          created_at?: string
          created_by?: string
          id?: string
          media_url?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["feed_post_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_access: {
        Row: {
          created_at: string | null
          funnel_id: string
          granted_by_user_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          funnel_id: string
          granted_by_user_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          funnel_id?: string
          granted_by_user_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_access_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
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
      funnel_leads: {
        Row: {
          access_granted: boolean | null
          access_granted_at: string | null
          access_token: string | null
          access_token_expires_at: string | null
          city: string | null
          conversation_id: string | null
          created_at: string | null
          custom_field_label: string | null
          custom_field_value: string | null
          email: string | null
          funnel_id: string
          id: string
          ip_address: string | null
          last_watched_second: number | null
          last_whatsapp_interaction: string | null
          max_watched_second: number | null
          name: string
          owner_user_id: string
          payment_status_cache: string | null
          phone: string | null
          session_token: string | null
          session_token_expires_at: string | null
          source: string | null
          synced_to_trackup_at: string | null
          updated_at: string | null
          user_agent: string | null
          video_access_expires_at: string | null
          video_completed: boolean | null
          video_watch_percent: number | null
          whatsapp_consent: boolean | null
        }
        Insert: {
          access_granted?: boolean | null
          access_granted_at?: string | null
          access_token?: string | null
          access_token_expires_at?: string | null
          city?: string | null
          conversation_id?: string | null
          created_at?: string | null
          custom_field_label?: string | null
          custom_field_value?: string | null
          email?: string | null
          funnel_id: string
          id?: string
          ip_address?: string | null
          last_watched_second?: number | null
          last_whatsapp_interaction?: string | null
          max_watched_second?: number | null
          name: string
          owner_user_id: string
          payment_status_cache?: string | null
          phone?: string | null
          session_token?: string | null
          session_token_expires_at?: string | null
          source?: string | null
          synced_to_trackup_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          video_access_expires_at?: string | null
          video_completed?: boolean | null
          video_watch_percent?: number | null
          whatsapp_consent?: boolean | null
        }
        Update: {
          access_granted?: boolean | null
          access_granted_at?: string | null
          access_token?: string | null
          access_token_expires_at?: string | null
          city?: string | null
          conversation_id?: string | null
          created_at?: string | null
          custom_field_label?: string | null
          custom_field_value?: string | null
          email?: string | null
          funnel_id?: string
          id?: string
          ip_address?: string | null
          last_watched_second?: number | null
          last_whatsapp_interaction?: string | null
          max_watched_second?: number | null
          name?: string
          owner_user_id?: string
          payment_status_cache?: string | null
          phone?: string | null
          session_token?: string | null
          session_token_expires_at?: string | null
          source?: string | null
          synced_to_trackup_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          video_access_expires_at?: string | null
          video_completed?: boolean | null
          video_watch_percent?: number | null
          whatsapp_consent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_leads_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          funnel_id: string | null
          id: string
          is_read: boolean | null
          lead_id: string | null
          owner_user_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          funnel_id?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          owner_user_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          funnel_id?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          owner_user_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_notifications_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "funnel_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          funnel_id: string
          id: string
          lead_id: string
          manual_verified_at: string | null
          manual_verified_by: string | null
          owner_user_id: string
          provider: string
          provider_order_id: string | null
          provider_payment_id: string | null
          provider_signature: string | null
          status: string | null
          updated_at: string | null
          upi_screenshot_url: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          funnel_id: string
          id?: string
          lead_id: string
          manual_verified_at?: string | null
          manual_verified_by?: string | null
          owner_user_id: string
          provider: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_signature?: string | null
          status?: string | null
          updated_at?: string | null
          upi_screenshot_url?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          funnel_id?: string
          id?: string
          lead_id?: string
          manual_verified_at?: string | null
          manual_verified_by?: string | null
          owner_user_id?: string
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_signature?: string | null
          status?: string | null
          updated_at?: string | null
          upi_screenshot_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_payments_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_payments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "funnel_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_price_options: {
        Row: {
          amount: number
          created_at: string | null
          funnel_id: string
          id: string
          is_default: boolean | null
          label: string
          qr_image_url: string | null
          sort_order: number | null
          upi_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          funnel_id: string
          id?: string
          is_default?: boolean | null
          label: string
          qr_image_url?: string | null
          sort_order?: number | null
          upi_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          funnel_id?: string
          id?: string
          is_default?: boolean | null
          label?: string
          qr_image_url?: string | null
          sort_order?: number | null
          upi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_price_options_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
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
      funnel_video_analytics: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          funnel_id: string
          id: string
          lead_id: string
          timestamp_second: number | null
          watched_percent: number | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          funnel_id: string
          id?: string
          lead_id: string
          timestamp_second?: number | null
          watched_percent?: number | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          funnel_id?: string
          id?: string
          lead_id?: string
          timestamp_second?: number | null
          watched_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_video_analytics_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_video_analytics_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "funnel_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_video_sessions: {
        Row: {
          created_at: string
          funnel_id: string
          id: string
          is_completed: boolean
          is_currently_watching: boolean
          last_active_at: string
          last_position_seconds: number
          lead_id: string | null
          max_watched_seconds: number
          total_watch_seconds: number
          updated_at: string
          video_duration_seconds: number
          viewer_token: string
          watch_percent: number
        }
        Insert: {
          created_at?: string
          funnel_id: string
          id?: string
          is_completed?: boolean
          is_currently_watching?: boolean
          last_active_at?: string
          last_position_seconds?: number
          lead_id?: string | null
          max_watched_seconds?: number
          total_watch_seconds?: number
          updated_at?: string
          video_duration_seconds?: number
          viewer_token: string
          watch_percent?: number
        }
        Update: {
          created_at?: string
          funnel_id?: string
          id?: string
          is_completed?: boolean
          is_currently_watching?: boolean
          last_active_at?: string
          last_position_seconds?: number
          lead_id?: string | null
          max_watched_seconds?: number
          total_watch_seconds?: number
          updated_at?: string
          video_duration_seconds?: number
          viewer_token?: string
          watch_percent?: number
        }
        Relationships: []
      }
      funnel_view_analytics: {
        Row: {
          completed: boolean | null
          created_at: string | null
          device_type: string | null
          funnel_id: string
          id: string
          ip_address: string | null
          last_heartbeat_at: string | null
          opened_video: boolean | null
          owner_user_id: string
          referrer: string | null
          session_end: string | null
          session_start: string | null
          updated_at: string | null
          user_agent: string | null
          viewer_id: string
          viewer_type: string | null
          watch_percentage: number | null
          watch_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          device_type?: string | null
          funnel_id: string
          id?: string
          ip_address?: string | null
          last_heartbeat_at?: string | null
          opened_video?: boolean | null
          owner_user_id: string
          referrer?: string | null
          session_end?: string | null
          session_start?: string | null
          updated_at?: string | null
          user_agent?: string | null
          viewer_id: string
          viewer_type?: string | null
          watch_percentage?: number | null
          watch_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          device_type?: string | null
          funnel_id?: string
          id?: string
          ip_address?: string | null
          last_heartbeat_at?: string | null
          opened_video?: boolean | null
          owner_user_id?: string
          referrer?: string | null
          session_end?: string | null
          session_start?: string | null
          updated_at?: string | null
          user_agent?: string | null
          viewer_id?: string
          viewer_type?: string | null
          watch_percentage?: number | null
          watch_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_view_analytics_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          allow_forward_seek: boolean | null
          allow_speed_control: boolean | null
          audio_play_timing: string | null
          audio_url: string | null
          contact_email: string | null
          contact_follows_cta: boolean | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string | null
          cta_button_text: string | null
          cta_redirect_url: string | null
          cta_trigger_type: string | null
          cta_trigger_value: number | null
          description: string | null
          id: string
          intent_type: string | null
          is_published: boolean | null
          lead_form_config: Json | null
          lock_cta_until_complete: boolean | null
          owner_user_id: string
          payment_confirmation_method: string
          payment_type: string | null
          price: number | null
          razorpay_payment_link: string | null
          show_contact: boolean
          show_cta: boolean
          slug: string
          success_message: string | null
          thumbnail_object_key: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          upi_id: string | null
          video_access_limit_minutes: number | null
          video_asset_id: string | null
          video_url: string | null
          visibility_type: string | null
          whatsapp_auto_message: string | null
          whatsapp_auto_message_enabled: boolean | null
        }
        Insert: {
          allow_forward_seek?: boolean | null
          allow_speed_control?: boolean | null
          audio_play_timing?: string | null
          audio_url?: string | null
          contact_email?: string | null
          contact_follows_cta?: boolean | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string | null
          cta_button_text?: string | null
          cta_redirect_url?: string | null
          cta_trigger_type?: string | null
          cta_trigger_value?: number | null
          description?: string | null
          id?: string
          intent_type?: string | null
          is_published?: boolean | null
          lead_form_config?: Json | null
          lock_cta_until_complete?: boolean | null
          owner_user_id: string
          payment_confirmation_method?: string
          payment_type?: string | null
          price?: number | null
          razorpay_payment_link?: string | null
          show_contact?: boolean
          show_cta?: boolean
          slug: string
          success_message?: string | null
          thumbnail_object_key?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          upi_id?: string | null
          video_access_limit_minutes?: number | null
          video_asset_id?: string | null
          video_url?: string | null
          visibility_type?: string | null
          whatsapp_auto_message?: string | null
          whatsapp_auto_message_enabled?: boolean | null
        }
        Update: {
          allow_forward_seek?: boolean | null
          allow_speed_control?: boolean | null
          audio_play_timing?: string | null
          audio_url?: string | null
          contact_email?: string | null
          contact_follows_cta?: boolean | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string | null
          cta_button_text?: string | null
          cta_redirect_url?: string | null
          cta_trigger_type?: string | null
          cta_trigger_value?: number | null
          description?: string | null
          id?: string
          intent_type?: string | null
          is_published?: boolean | null
          lead_form_config?: Json | null
          lock_cta_until_complete?: boolean | null
          owner_user_id?: string
          payment_confirmation_method?: string
          payment_type?: string | null
          price?: number | null
          razorpay_payment_link?: string | null
          show_contact?: boolean
          show_cta?: boolean
          slug?: string
          success_message?: string | null
          thumbnail_object_key?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          upi_id?: string | null
          video_access_limit_minutes?: number | null
          video_asset_id?: string | null
          video_url?: string | null
          visibility_type?: string | null
          whatsapp_auto_message?: string | null
          whatsapp_auto_message_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "funnels_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_messages: {
        Row: {
          archived: boolean
          body: string
          created_at: string
          deep_link_route: string | null
          id: string
          leader_id: string | null
          message_type: string
          read_at: string | null
          recipient_user_id: string
          sender_user_id: string
          target_level_position: number | null
          title: string
        }
        Insert: {
          archived?: boolean
          body: string
          created_at?: string
          deep_link_route?: string | null
          id?: string
          leader_id?: string | null
          message_type?: string
          read_at?: string | null
          recipient_user_id: string
          sender_user_id: string
          target_level_position?: number | null
          title: string
        }
        Update: {
          archived?: boolean
          body?: string
          created_at?: string
          deep_link_route?: string | null
          id?: string
          leader_id?: string | null
          message_type?: string
          read_at?: string | null
          recipient_user_id?: string
          sender_user_id?: string
          target_level_position?: number | null
          title?: string
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
      learnup_resources: {
        Row: {
          body: string | null
          created_at: string
          created_by: string
          id: string
          link_url: string | null
          media_url: string | null
          sort_order: number | null
          title: string
          topic_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by: string
          id?: string
          link_url?: string | null
          media_url?: string | null
          sort_order?: number | null
          title: string
          topic_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string
          id?: string
          link_url?: string | null
          media_url?: string | null
          sort_order?: number | null
          title?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learnup_resources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "learnup_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      learnup_topics: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learnup_topics_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      nevorai_form_analytics_daily: {
        Row: {
          created_at: string
          date: string
          form_id: string
          id: string
          source_breakdown: Json
          submission_count: number
        }
        Insert: {
          created_at?: string
          date: string
          form_id: string
          id?: string
          source_breakdown?: Json
          submission_count?: number
        }
        Update: {
          created_at?: string
          date?: string
          form_id?: string
          id?: string
          source_breakdown?: Json
          submission_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "nevorai_form_analytics_daily_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "nevorai_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      nevorai_form_fields: {
        Row: {
          conditional_logic: Json | null
          created_at: string
          description: string | null
          field_key: string
          field_type: string
          form_id: string
          id: string
          label: string
          options: Json | null
          placeholder: string | null
          position: number
          required: boolean
          validation: Json | null
        }
        Insert: {
          conditional_logic?: Json | null
          created_at?: string
          description?: string | null
          field_key: string
          field_type: string
          form_id: string
          id?: string
          label: string
          options?: Json | null
          placeholder?: string | null
          position?: number
          required?: boolean
          validation?: Json | null
        }
        Update: {
          conditional_logic?: Json | null
          created_at?: string
          description?: string | null
          field_key?: string
          field_type?: string
          form_id?: string
          id?: string
          label?: string
          options?: Json | null
          placeholder?: string | null
          position?: number
          required?: boolean
          validation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "nevorai_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "nevorai_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      nevorai_form_shares: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          form_id: string
          id: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          form_id: string
          id?: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          form_id?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "nevorai_form_shares_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "nevorai_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      nevorai_form_submissions: {
        Row: {
          created_at: string
          form_id: string
          id: string
          lead_created: boolean
          lead_id: string | null
          share_id: string | null
          source: string
          submitter_email: string | null
          submitter_name: string | null
          submitter_user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          lead_created?: boolean
          lead_id?: string | null
          share_id?: string | null
          source?: string
          submitter_email?: string | null
          submitter_name?: string | null
          submitter_user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          lead_created?: boolean
          lead_id?: string | null
          share_id?: string | null
          source?: string
          submitter_email?: string | null
          submitter_name?: string | null
          submitter_user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nevorai_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "nevorai_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nevorai_form_submissions_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "nevorai_form_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      nevorai_forms: {
        Row: {
          access_mode: string
          allow_multiple_submissions: boolean
          close_date: string | null
          collect_utm: boolean
          confirmation_message: string | null
          created_at: string
          description: string | null
          embed_enabled: boolean
          form_type: string | null
          id: string
          is_accepting: boolean
          is_public: boolean
          lead_mapping: Json | null
          max_submissions: number | null
          owner_user_id: string
          title: string
          updated_at: string
        }
        Insert: {
          access_mode?: string
          allow_multiple_submissions?: boolean
          close_date?: string | null
          collect_utm?: boolean
          confirmation_message?: string | null
          created_at?: string
          description?: string | null
          embed_enabled?: boolean
          form_type?: string | null
          id?: string
          is_accepting?: boolean
          is_public?: boolean
          lead_mapping?: Json | null
          max_submissions?: number | null
          owner_user_id: string
          title: string
          updated_at?: string
        }
        Update: {
          access_mode?: string
          allow_multiple_submissions?: boolean
          close_date?: string | null
          collect_utm?: boolean
          confirmation_message?: string | null
          created_at?: string
          description?: string | null
          embed_enabled?: boolean
          form_type?: string | null
          id?: string
          is_accepting?: boolean
          is_public?: boolean
          lead_mapping?: Json | null
          max_submissions?: number | null
          owner_user_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      nevorai_submission_answers: {
        Row: {
          created_at: string
          field_id: string | null
          field_key: string
          id: string
          submission_id: string
          value: string | null
          value_json: Json | null
        }
        Insert: {
          created_at?: string
          field_id?: string | null
          field_key: string
          id?: string
          submission_id: string
          value?: string | null
          value_json?: Json | null
        }
        Update: {
          created_at?: string
          field_id?: string | null
          field_key?: string
          id?: string
          submission_id?: string
          value?: string | null
          value_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "nevorai_submission_answers_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "nevorai_form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nevorai_submission_answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "nevorai_form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      nevorai_submission_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          field_id: string | null
          id: string
          size: number | null
          storage_path: string
          submission_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          field_id?: string | null
          id?: string
          size?: number | null
          storage_path: string
          submission_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          field_id?: string | null
          id?: string
          size?: number | null
          storage_path?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nevorai_submission_attachments_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "nevorai_form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nevorai_submission_attachments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "nevorai_form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          community_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          link_url: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          community_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          community_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
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
      personal_snapshot_v2: {
        Row: {
          created_at: string
          date: string
          final_tag: string | null
          final_tag_count: number
          funnel_day: number | null
          funnel_start_date: string | null
          funnel_tag: string | null
          funnel_tag_count: number
          response_tags: Json
          snapshot_id: string
          source: Database["public"]["Enums"]["snapshot_source"]
          stage_tags: Json
          total_leads: number
          total_responses: number
          upline_leader_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          final_tag?: string | null
          final_tag_count?: number
          funnel_day?: number | null
          funnel_start_date?: string | null
          funnel_tag?: string | null
          funnel_tag_count?: number
          response_tags?: Json
          snapshot_id?: string
          source?: Database["public"]["Enums"]["snapshot_source"]
          stage_tags?: Json
          total_leads?: number
          total_responses?: number
          upline_leader_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          final_tag?: string | null
          final_tag_count?: number
          funnel_day?: number | null
          funnel_start_date?: string | null
          funnel_tag?: string | null
          funnel_tag_count?: number
          response_tags?: Json
          snapshot_id?: string
          source?: Database["public"]["Enums"]["snapshot_source"]
          stage_tags?: Json
          total_leads?: number
          total_responses?: number
          upline_leader_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      points_entries: {
        Row: {
          competition_id: string
          created_at: string
          created_by: string
          id: string
          points: number
          reason: string | null
          user_id: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          created_by: string
          id?: string
          points?: number
          reason?: string | null
          user_id: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          created_by?: string
          id?: string
          points?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_entries_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
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
          instagram_username: string | null
          is_suspended: boolean | null
          leader_code_seq: number | null
          leader_prompt_completed: boolean
          leaders_id_of_my_leader: string | null
          level_id: string | null
          neverai_id: string | null
          phone: string | null
          response_labels: Json | null
          root_leader_id: string | null
          source_app: string | null
          stage_count: number
          stage_labels: Json | null
          tags_refresh_token: string | null
          total_leads_added: number
          trial_start_date: string | null
          updated_at: string
          upline_email: string | null
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
          instagram_username?: string | null
          is_suspended?: boolean | null
          leader_code_seq?: number | null
          leader_prompt_completed?: boolean
          leaders_id_of_my_leader?: string | null
          level_id?: string | null
          neverai_id?: string | null
          phone?: string | null
          response_labels?: Json | null
          root_leader_id?: string | null
          source_app?: string | null
          stage_count?: number
          stage_labels?: Json | null
          tags_refresh_token?: string | null
          total_leads_added?: number
          trial_start_date?: string | null
          updated_at?: string
          upline_email?: string | null
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
          instagram_username?: string | null
          is_suspended?: boolean | null
          leader_code_seq?: number | null
          leader_prompt_completed?: boolean
          leaders_id_of_my_leader?: string | null
          level_id?: string | null
          neverai_id?: string | null
          phone?: string | null
          response_labels?: Json | null
          root_leader_id?: string | null
          source_app?: string | null
          stage_count?: number
          stage_labels?: Json | null
          tags_refresh_token?: string | null
          total_leads_added?: number
          trial_start_date?: string | null
          updated_at?: string
          upline_email?: string | null
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
          deleted_at: string | null
          funnel_stage: string | null
          funnel_stage_at: string | null
          gender: string | null
          id: string
          instagram: string | null
          name: string
          notes: string | null
          personal_tags: Json | null
          phone: string
          phone2: string | null
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
          deleted_at?: string | null
          funnel_stage?: string | null
          funnel_stage_at?: string | null
          gender?: string | null
          id?: string
          instagram?: string | null
          name: string
          notes?: string | null
          personal_tags?: Json | null
          phone: string
          phone2?: string | null
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
          deleted_at?: string | null
          funnel_stage?: string | null
          funnel_stage_at?: string | null
          gender?: string | null
          id?: string
          instagram?: string | null
          name?: string
          notes?: string | null
          personal_tags?: Json | null
          phone?: string
          phone2?: string | null
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
      reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      reminder_responses: {
        Row: {
          created_at: string
          id: string
          reminder_id: string
          response: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reminder_id: string
          response: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reminder_id?: string
          response?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_responses_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          also_post_to_chat: boolean | null
          community_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          message: string | null
          remind_at: string
          rsvp_enabled: boolean | null
          title: string
        }
        Insert: {
          also_post_to_chat?: boolean | null
          community_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          message?: string | null
          remind_at: string
          rsvp_enabled?: boolean | null
          title: string
        }
        Update: {
          also_post_to_chat?: boolean | null
          community_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          remind_at?: string
          rsvp_enabled?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
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
      support_ticket_replies: {
        Row: {
          created_at: string
          id: string
          is_admin_reply: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          attachments: Json | null
          category: string
          created_at: string
          description: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          attachments?: Json | null
          category: string
          created_at?: string
          description: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          attachments?: Json | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
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
      team_snapshot_v2: {
        Row: {
          created_at: string
          date: string
          final_tag: string | null
          final_tag_count: number
          funnel_day: number | null
          funnel_start_date: string | null
          funnel_tag: string | null
          funnel_tag_count: number
          leader_user_id: string
          member_breakdown: Json | null
          response_tags: Json
          snapshot_id: string
          source: Database["public"]["Enums"]["team_snapshot_source"]
          stage_tags: Json
          total_leads: number
          total_responses: number
        }
        Insert: {
          created_at?: string
          date: string
          final_tag?: string | null
          final_tag_count?: number
          funnel_day?: number | null
          funnel_start_date?: string | null
          funnel_tag?: string | null
          funnel_tag_count?: number
          leader_user_id: string
          member_breakdown?: Json | null
          response_tags?: Json
          snapshot_id?: string
          source?: Database["public"]["Enums"]["team_snapshot_source"]
          stage_tags?: Json
          total_leads?: number
          total_responses?: number
        }
        Update: {
          created_at?: string
          date?: string
          final_tag?: string | null
          final_tag_count?: number
          funnel_day?: number | null
          funnel_start_date?: string | null
          funnel_tag?: string | null
          funnel_tag_count?: number
          leader_user_id?: string
          member_breakdown?: Json | null
          response_tags?: Json
          snapshot_id?: string
          source?: Database["public"]["Enums"]["team_snapshot_source"]
          stage_tags?: Json
          total_leads?: number
          total_responses?: number
        }
        Relationships: []
      }
      todo_daily_task_status: {
        Row: {
          date: string
          id: string
          status: string | null
          template_item_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          date: string
          id?: string
          status?: string | null
          template_item_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          date?: string
          id?: string
          status?: string | null
          template_item_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_daily_task_status_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "todo_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_template_items: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          item_title: string
          leader_id: string
          level_position: number
          only_on_date: string | null
          sort_order: number
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          item_title: string
          leader_id: string
          level_position: number
          only_on_date?: string | null
          sort_order?: number
          template_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          item_title?: string
          leader_id?: string
          level_position?: number
          only_on_date?: string | null
          sort_order?: number
          template_name?: string
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
      total_snapshot_v2: {
        Row: {
          created_at: string
          date: string
          final_tag: string | null
          final_tag_count: number
          funnel_day: number | null
          funnel_start_date: string | null
          funnel_tag: string | null
          funnel_tag_count: number
          response_tags: Json
          snapshot_id: string
          source: Database["public"]["Enums"]["team_snapshot_source"]
          stage_tags: Json
          total_leads: number
          total_responses: number
          updated_at: string
          upline_leader_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          final_tag?: string | null
          final_tag_count?: number
          funnel_day?: number | null
          funnel_start_date?: string | null
          funnel_tag?: string | null
          funnel_tag_count?: number
          response_tags?: Json
          snapshot_id?: string
          source?: Database["public"]["Enums"]["team_snapshot_source"]
          stage_tags?: Json
          total_leads?: number
          total_responses?: number
          updated_at?: string
          upline_leader_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          final_tag?: string | null
          final_tag_count?: number
          funnel_day?: number | null
          funnel_start_date?: string | null
          funnel_tag?: string | null
          funnel_tag_count?: number
          response_tags?: Json
          snapshot_id?: string
          source?: Database["public"]["Enums"]["team_snapshot_source"]
          stage_tags?: Json
          total_leads?: number
          total_responses?: number
          updated_at?: string
          upline_leader_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tracking_overrides: {
        Row: {
          created_at: string | null
          id: string
          leads_count: number | null
          override_date: string
          response_values: Json | null
          responses_count: number | null
          stage_values: Json | null
          target_user_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          leads_count?: number | null
          override_date: string
          response_values?: Json | null
          responses_count?: number | null
          stage_values?: Json | null
          target_user_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          leads_count?: number | null
          override_date?: string
          response_values?: Json | null
          responses_count?: number | null
          stage_values?: Json | null
          target_user_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tracking_source_preferences: {
        Row: {
          created_at: string
          id: string
          personal_source: string
          team_source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          personal_source?: string
          team_source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          personal_source?: string
          team_source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trainings: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number | null
          id: string
          meeting_link: string | null
          start_at: string
          title: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          start_at: string
          title: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          start_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_app_access: {
        Row: {
          app: string
          first_seen_at: string
          id: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          app: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          user_id: string
        }
        Update: {
          app?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_daily_activity: {
        Row: {
          activity_date: string
          activity_sources: string[] | null
          created_at: string
          has_activity: boolean | null
          id: string
          user_id: string
        }
        Insert: {
          activity_date: string
          activity_sources?: string[] | null
          created_at?: string
          has_activity?: boolean | null
          id?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_sources?: string[] | null
          created_at?: string
          has_activity?: boolean | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_daily_task_status: {
        Row: {
          date: string
          id: string
          status: string | null
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          date: string
          id?: string
          status?: string | null
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          date?: string
          id?: string
          status?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_task_status_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "user_daily_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_tasks: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_daily_uploads: {
        Row: {
          id: string
          updated_at: string | null
          upload_count: number
          upload_date: string
          user_id: string
        }
        Insert: {
          id?: string
          updated_at?: string | null
          upload_count?: number
          upload_date?: string
          user_id: string
        }
        Update: {
          id?: string
          updated_at?: string | null
          upload_count?: number
          upload_date?: string
          user_id?: string
        }
        Relationships: []
      }
      user_funnel_subscriptions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_admin_override: boolean | null
          payment_id: string | null
          plan: string
          status: string
          subscribed_at: string | null
          subscription_source: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_admin_override?: boolean | null
          payment_id?: string | null
          plan?: string
          status?: string
          subscribed_at?: string | null
          subscription_source?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_admin_override?: boolean | null
          payment_id?: string | null
          plan?: string
          status?: string
          subscribed_at?: string | null
          subscription_source?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_kyc_submissions: {
        Row: {
          age: number | null
          city: string | null
          document_type: Database["public"]["Enums"]["kyc_document_type"]
          document_url: string
          full_name: string
          id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["kyc_status"] | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
          verified_by_admin_id: string | null
        }
        Insert: {
          age?: number | null
          city?: string | null
          document_type: Database["public"]["Enums"]["kyc_document_type"]
          document_url: string
          full_name: string
          id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["kyc_status"] | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
          verified_by_admin_id?: string | null
        }
        Update: {
          age?: number | null
          city?: string | null
          document_type?: Database["public"]["Enums"]["kyc_document_type"]
          document_url?: string
          full_name?: string
          id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["kyc_status"] | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by_admin_id?: string | null
        }
        Relationships: []
      }
      user_products: {
        Row: {
          created_at: string | null
          id: string
          product: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product?: string
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
      user_streaks: {
        Row: {
          current_streak: number | null
          grace_used: number | null
          id: string
          last_active_date: string | null
          longest_streak: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          grace_used?: number | null
          id?: string
          last_active_date?: string | null
          longest_streak?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number | null
          grace_used?: number | null
          id?: string
          last_active_date?: string | null
          longest_streak?: number | null
          updated_at?: string
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
          subscription_source: string | null
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
          subscription_source?: string | null
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
          subscription_source?: string | null
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
      video_assets: {
        Row: {
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          file_size_bytes: number
          id: string
          is_shareable: boolean | null
          mime_type: string | null
          owner_user_id: string
          r2_object_key: string
          status: string | null
          thumbnail_key: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_size_bytes: number
          id?: string
          is_shareable?: boolean | null
          mime_type?: string | null
          owner_user_id: string
          r2_object_key: string
          status?: string | null
          thumbnail_key?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_size_bytes?: number
          id?: string
          is_shareable?: boolean | null
          mime_type?: string | null
          owner_user_id?: string
          r2_object_key?: string
          status?: string | null
          thumbnail_key?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      video_assets_access: {
        Row: {
          granted_at: string | null
          granted_by_user_id: string
          id: string
          revoked_at: string | null
          user_id: string
          video_asset_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by_user_id: string
          id?: string
          revoked_at?: string | null
          user_id: string
          video_asset_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by_user_id?: string
          id?: string
          revoked_at?: string | null
          user_id?: string
          video_asset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_assets_access_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      video_folder_access: {
        Row: {
          folder_id: string
          granted_at: string | null
          granted_by_user_id: string
          id: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          folder_id: string
          granted_at?: string | null
          granted_by_user_id: string
          id?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          folder_id?: string
          granted_at?: string | null
          granted_by_user_id?: string
          id?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_folder_access_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "video_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      video_folder_items: {
        Row: {
          added_at: string | null
          folder_id: string
          id: string
          video_asset_id: string
        }
        Insert: {
          added_at?: string | null
          folder_id: string
          id?: string
          video_asset_id: string
        }
        Update: {
          added_at?: string | null
          folder_id?: string
          id?: string
          video_asset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_folder_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "video_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_folder_items_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      video_folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_user_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      video_plays: {
        Row: {
          country: string | null
          device: string | null
          duration_watched_seconds: number
          funnel_id: string | null
          id: string
          is_completed: boolean
          played_at: string
          referrer: string | null
          session_id: string
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          video_asset_id: string | null
          video_duration_seconds: number
        }
        Insert: {
          country?: string | null
          device?: string | null
          duration_watched_seconds?: number
          funnel_id?: string | null
          id?: string
          is_completed?: boolean
          played_at?: string
          referrer?: string | null
          session_id: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          video_asset_id?: string | null
          video_duration_seconds?: number
        }
        Update: {
          country?: string | null
          device?: string | null
          duration_watched_seconds?: number
          funnel_id?: string | null
          id?: string
          is_completed?: boolean
          played_at?: string
          referrer?: string | null
          session_id?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          video_asset_id?: string | null
          video_duration_seconds?: number
        }
        Relationships: []
      }
      video_stats_daily: {
        Row: {
          completions: number
          creator_user_id: string | null
          date: string
          funnel_id: string | null
          id: string
          plays: number
          total_watch_seconds: number
          uniques: number
          video_asset_id: string
        }
        Insert: {
          completions?: number
          creator_user_id?: string | null
          date: string
          funnel_id?: string | null
          id?: string
          plays?: number
          total_watch_seconds?: number
          uniques?: number
          video_asset_id: string
        }
        Update: {
          completions?: number
          creator_user_id?: string | null
          date?: string
          funnel_id?: string | null
          id?: string
          plays?: number
          total_watch_seconds?: number
          uniques?: number
          video_asset_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      ac_user_full_profile: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string | null
          dob: string | null
          email: string | null
          full_name: string | null
          leader_id: string | null
          leaders_id_of_my_leader: string | null
          level_id: string | null
          mobile: string | null
          nevorai_display_name: string | null
          onboarding_completed_at: string | null
          root_leader_id: string | null
          state: string | null
          updated_at: string | null
          user_id: string | null
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
      public_verified_users: {
        Row: {
          city: string | null
          full_name: string | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          city?: string | null
          full_name?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          city?: string | null
          full_name?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_get_active_usage_stats: {
        Args: never
        Returns: {
          active_callers_today: number
          active_callers_week: number
          leads_importers_today: number
          leads_importers_week: number
        }[]
      }
      admin_get_analytics: {
        Args: never
        Returns: {
          active_pro_users: number
          month_leads: number
          neverai_today_active: number
          neverai_total_users: number
          neverai_week_active: number
          today_leads: number
          total_leads: number
          week_leads: number
        }[]
      }
      admin_get_app_user_counts: {
        Args: never
        Returns: {
          app: string
          today_active: number
          total_users: number
          week_active: number
        }[]
      }
      admin_get_audit_logs: {
        Args: {
          p_action_type?: string
          p_limit?: number
          p_offset?: number
          p_target_type?: string
        }
        Returns: {
          action_type: string
          admin_email: string
          admin_user_id: string
          created_at: string
          description: string
          id: string
          new_value: Json
          old_value: Json
          target_id: string
          target_type: string
          total_count: number
        }[]
      }
      admin_get_churn_risk_users: {
        Args: { p_limit?: number }
        Returns: {
          days_since_active: number
          display_name: string
          email: string
          neverai_id: string
          plan: string
          risk_type: string
          trial_days_remaining: number
          user_id: string
        }[]
      }
      admin_get_conversion_analytics: {
        Args: never
        Returns: {
          conversion_rate: number
          conversions_last_month: number
          conversions_this_month: number
          free_users: number
          pro_users: number
          total_users: number
        }[]
      }
      admin_get_expiring_subscriptions: {
        Args: { days_ahead?: number }
        Returns: {
          days_remaining: number
          display_name: string
          email: string
          expires_at: string
          neverai_id: string
          plan: string
          user_id: string
        }[]
      }
      admin_get_free_users: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          last_active: string
          leads_count: number
          neverai_id: string
          user_id: string
        }[]
      }
      admin_get_free_users_paginated: {
        Args: { page_offset?: number; page_size?: number }
        Returns: {
          created_at: string
          display_name: string
          email: string
          last_active: string
          leads_count: number
          neverai_id: string
          total_count: number
          user_id: string
        }[]
      }
      admin_get_nevorai_user_count: { Args: never; Returns: number }
      admin_get_offer_analytics: {
        Args: never
        Returns: {
          discount_type: string
          discount_value: number
          end_date: string
          is_active: boolean
          offer_id: string
          offer_name: string
          promo_code: string
          revenue_generated: number
          start_date: string
          times_used: number
          unique_users: number
        }[]
      }
      admin_get_power_users: {
        Args: { limit_count?: number }
        Returns: {
          display_name: string
          email: string
          last_active: string
          leads_this_week: number
          neverai_id: string
          total_leads: number
          user_id: string
        }[]
      }
      admin_get_pro_users: {
        Args: never
        Returns: {
          days_remaining: number
          display_name: string
          email: string
          expires_at: string
          is_admin_override: boolean
          is_expired: boolean
          neverai_id: string
          payment_amount: number
          plan: string
          subscribed_at: string
          user_id: string
        }[]
      }
      admin_get_prospect_distribution: {
        Args: never
        Returns: {
          threshold: number
          threshold_label: string
          user_count: number
        }[]
      }
      admin_get_recent_payments: {
        Args: { limit_count?: number }
        Returns: {
          amount: number
          created_at: string
          event_type: string
          id: string
          razorpay_payment_id: string
          status: string
          user_display_name: string
          user_email: string
        }[]
      }
      admin_get_retention_analytics: {
        Args: never
        Returns: {
          dau: number
          four_seven_days_active: number
          inactive_30_plus: number
          mau: number
          one_two_weeks_active: number
          returning_rate: number
          today_active: number
          two_three_days_active: number
          wau: number
          yesterday_active: number
        }[]
      }
      admin_get_revenue_stats: {
        Args: never
        Returns: {
          failed_payments: number
          last_month_revenue: number
          monthly_plan_count: number
          monthly_plan_revenue: number
          quarterly_plan_count: number
          quarterly_plan_revenue: number
          successful_payments: number
          this_month_revenue: number
          total_payments: number
          total_revenue: number
        }[]
      }
      admin_get_revenue_trend: {
        Args: { days_back?: number }
        Returns: {
          date: string
          payment_count: number
          revenue: number
        }[]
      }
      admin_get_signup_cohort_analytics: {
        Args: never
        Returns: {
          cohort_day: number
          cohort_label: string
          retention_rate: number
          still_active: number
          user_count: number
        }[]
      }
      admin_get_stats: {
        Args: never
        Returns: {
          active_pro_users: number
          total_payments: number
          total_users: number
        }[]
      }
      admin_get_trial_analytics: {
        Args: never
        Returns: {
          active_trials: number
          avg_days_to_convert: number
          converted_to_pro: number
          day_1_users: number
          day_2_users: number
          day_3_users: number
          day_4_users: number
          day_5_users: number
          day_6_users: number
          day_7_users: number
          expired_trials: number
          trial_conversion_rate: number
          trials_expiring_today: number
        }[]
      }
      admin_get_users_by_prospect_threshold: {
        Args: { p_threshold: number }
        Returns: {
          display_name: string
          email: string
          last_active: string
          neverai_id: string
          plan: string
          prospect_count: number
          user_id: string
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
      admin_search_users:
        | {
            Args: {
              page_offset?: number
              page_size?: number
              plan_filter?: string
              search_query?: string
            }
            Returns: {
              created_at: string
              display_name: string
              email: string
              expires_at: string
              is_admin_override: boolean
              neverai_id: string
              plan: string
              subscribed_at: string
              upline_email: string
              user_id: string
            }[]
          }
        | {
            Args: { plan_filter?: string; search_query?: string }
            Returns: {
              display_name: string
              email: string
              expires_at: string
              is_admin_override: boolean
              plan: string
              subscribed_at: string
              upline_email: string
              user_id: string
            }[]
          }
      admin_search_users_enhanced: {
        Args: {
          page_offset?: number
          page_size?: number
          plan_filter?: string
          search_query?: string
        }
        Returns: {
          created_at: string
          display_name: string
          email: string
          expires_at: string
          is_admin_override: boolean
          is_suspended: boolean
          last_active_at: string
          neverai_id: string
          plan: string
          source_app: string
          subscribed_at: string
          total_count: number
          total_leads_count: number
          user_id: string
        }[]
      }
      admin_toggle_user_suspension: {
        Args: { p_suspend: boolean; p_user_id: string }
        Returns: boolean
      }
      aggregate_video_stats: { Args: never; Returns: undefined }
      batch_reorder_prospects: {
        Args: { p_updates: Json; p_user_id: string }
        Returns: boolean
      }
      can_access_learnup_resource: {
        Args: { p_topic_id: string; p_user_id: string }
        Returns: boolean
      }
      can_access_points_entry: {
        Args: { p_competition_id: string; p_user_id: string }
        Returns: boolean
      }
      can_access_reminder: {
        Args: { p_reminder_id: string; p_user_id: string }
        Returns: boolean
      }
      can_admin_learnup_resource: {
        Args: { p_topic_id: string; p_user_id: string }
        Returns: boolean
      }
      can_admin_points_entry: {
        Args: { p_competition_id: string; p_user_id: string }
        Returns: boolean
      }
      can_leader_view_member: {
        Args: { p_leader_user_id: string; p_member_user_id: string }
        Returns: boolean
      }
      check_provisioned_user: {
        Args: { target_email: string }
        Returns: {
          is_provisioned: boolean
          source_app: string
        }[]
      }
      check_upload_limit: {
        Args: { p_count?: number; p_user_id: string }
        Returns: Json
      }
      clear_upline_relationship: { Args: { p_user_id: string }; Returns: Json }
      ensure_ac_profile_exists: { Args: never; Returns: Json }
      gen_random_bytes: { Args: { n: number }; Returns: string }
      gen_random_uuid: { Args: never; Returns: string }
      generate_neverai_id: { Args: never; Returns: string }
      generate_sequential_neverai_id: { Args: never; Returns: string }
      generate_simple_neverai_id: { Args: never; Returns: string }
      get_app_config: { Args: never; Returns: Json }
      get_clean_display_name: {
        Args: { p_display_name: string; p_email: string }
        Returns: string
      }
      get_form_share_url: { Args: { p_form_id: string }; Returns: string }
      get_funnel_view_stats: {
        Args: { p_funnel_id: string }
        Returns: {
          avg_watch_percent: number
          completion_count: number
          completion_rate: number
          total_views: number
          unique_viewers: number
        }[]
      }
      get_lead_payment_status: { Args: { p_lead_id: string }; Returns: string }
      get_leader_funnel_config: {
        Args: { target_neverai_id: string }
        Returns: {
          day_1_start: string
          funnel_length: number
          funnel_name: string
          id: string
          user_id: string
        }[]
      }
      get_leader_stage_config: {
        Args: { target_leader_id: string }
        Returns: Json
      }
      get_or_create_default_level: {
        Args: { p_leader_user_id: string }
        Returns: string
      }
      get_prospects_paginated: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          action_taken: string
          action_taken_at: string
          address: string
          age_or_dob: string
          batch_date: string
          date_added: string
          funnel_stage: string
          funnel_stage_at: string
          gender: string
          id: string
          instagram: string
          name: string
          notes: string
          personal_tags: Json
          phone: string
          priority: string
          profession: string
          prospect_status: string
          sheet_id: string
          sort_order: number
          stage_index: number
          total_count: number
          updated_at: string
          user_id: string
          why_need: string
        }[]
      }
      get_user_by_email: {
        Args: { target_email: string }
        Returns: {
          display_name: string
          email: string
          neverai_id: string
          user_id: string
        }[]
      }
      get_user_by_neverai_id: {
        Args: { target_neverai_id: string }
        Returns: {
          display_name: string
          neverai_id: string
          user_id: string
        }[]
      }
      get_user_effective_limits: {
        Args: { p_user_id: string }
        Returns: {
          custom_expiry: string
          daily_limit: number
          force_pro: boolean
          is_override: boolean
          total_limit: number
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
      get_user_leader_id: { Args: { user_uuid: string }; Returns: string }
      grant_product_access: {
        Args: { p_product: string; p_user_id: string }
        Returns: boolean
      }
      has_folder_access: {
        Args: { p_folder_id: string; p_user_id: string }
        Returns: boolean
      }
      has_nevorai_profile: { Args: { user_uuid: string }; Returns: boolean }
      has_product_access: {
        Args: { p_product: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_video_access: {
        Args: { check_user_id: string; video_id: string }
        Returns: boolean
      }
      increment_daily_upload: {
        Args: { p_count: number; p_user_id: string }
        Returns: number
      }
      increment_leads_added: {
        Args: { count?: number; user_uuid: string }
        Returns: number
      }
      is_ac_admin: { Args: { user_uuid: string }; Returns: boolean }
      is_ac_member: { Args: { user_uuid: string }; Returns: boolean }
      is_community_admin: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: boolean
      }
      is_community_member: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: boolean
      }
      is_folder_owner: {
        Args: { p_folder_id: string; p_user_id: string }
        Returns: boolean
      }
      is_funnels_admin: { Args: { check_user_id: string }; Returns: boolean }
      is_in_downline: {
        Args: { target_user_id: string; viewer_user_id: string }
        Returns: boolean
      }
      is_user_upline: { Args: { target_user_id: string }; Returns: boolean }
      is_user_verified: { Args: { check_user_id: string }; Returns: boolean }
      is_video_owner: {
        Args: { check_user_id: string; video_id: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action_type: string
          p_description?: string
          p_new_value?: Json
          p_old_value?: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      nevorai_create_share_token: {
        Args: { p_expires_at?: string; p_form_id: string }
        Returns: string
      }
      nevorai_get_form_by_token: {
        Args: { p_token: string }
        Returns: {
          description: string
          fields: Json
          form_id: string
          is_expired: boolean
          owner_user_id: string
          share_id: string
          title: string
        }[]
      }
      nevorai_get_submission_answers: {
        Args: { p_submission_id: string }
        Returns: {
          answer_id: string
          attachments: Json
          field_id: string
          field_key: string
          field_label: string
          field_type: string
          value: string
          value_json: Json
        }[]
      }
      nevorai_list_submissions: {
        Args: { p_form_id: string; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      nevorai_submit_form:
        | {
            Args: {
              p_answers?: Json
              p_answers_json?: Json
              p_attachments_json?: Json
              p_form_id?: string
              p_share_token?: string
              p_source?: string
              p_submitter_email?: string
              p_submitter_name?: string
              p_token?: string
              p_utm_campaign?: string
              p_utm_content?: string
              p_utm_medium?: string
              p_utm_source?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_answers?: Json
              p_answers_json?: Json
              p_attachments_json?: Json
              p_form_id?: string
              p_share_token?: string
              p_source?: string
              p_submitter_email?: string
              p_submitter_name?: string
              p_token?: string
              p_utm_campaign?: string
              p_utm_content?: string
              p_utm_medium?: string
              p_utm_source?: string
            }
            Returns: Json
          }
      normalize_leader_id: { Args: { id: string }; Returns: string }
      record_app_access: { Args: { p_app: string }; Returns: undefined }
      update_leader_hierarchy: {
        Args: { p_leader_id: string; p_user_id: string }
        Returns: Json
      }
      update_upline_by_email: {
        Args: { p_upline_email: string; p_user_id: string }
        Returns: Json
      }
      upline_set_member_level: {
        Args: { p_level_id?: string; p_member_user_id: string }
        Returns: Json
      }
      xor_decrypt_phone: { Args: { encrypted_text: string }; Returns: string }
    }
    Enums: {
      action_taken:
        | "Video Sent"
        | "Called"
        | "Not Picked"
        | "Busy"
        | "Follow Up Scheduled"
      app_role: "admin" | "user"
      community_role: "owner" | "admin" | "member"
      feed_post_type: "activity" | "achievement" | "system"
      funnel_stage:
        | "Enrollment"
        | "Day 1"
        | "Day 2"
        | "Day 3"
        | "Minimum Bill"
        | "Level Up"
        | "2CC"
      kyc_document_type:
        | "aadhaar"
        | "pan"
        | "voter_id"
        | "passport"
        | "driving_license"
      kyc_status: "pending" | "approved" | "rejected"
      membership_status: "active" | "blocked" | "left"
      message_type: "text" | "media" | "system"
      notification_type: "achievement" | "reminder" | "system" | "mention"
      priority_level: "High" | "Medium" | "Low"
      prospect_status: "+VE" | "-VE" | "50-50" | "30-70"
      snapshot_source: "MANUAL" | "APPLICATION"
      team_snapshot_source: "MANUAL" | "TEAM_MEMBERS"
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
      community_role: ["owner", "admin", "member"],
      feed_post_type: ["activity", "achievement", "system"],
      funnel_stage: [
        "Enrollment",
        "Day 1",
        "Day 2",
        "Day 3",
        "Minimum Bill",
        "Level Up",
        "2CC",
      ],
      kyc_document_type: [
        "aadhaar",
        "pan",
        "voter_id",
        "passport",
        "driving_license",
      ],
      kyc_status: ["pending", "approved", "rejected"],
      membership_status: ["active", "blocked", "left"],
      message_type: ["text", "media", "system"],
      notification_type: ["achievement", "reminder", "system", "mention"],
      priority_level: ["High", "Medium", "Low"],
      prospect_status: ["+VE", "-VE", "50-50", "30-70"],
      snapshot_source: ["MANUAL", "APPLICATION"],
      team_snapshot_source: ["MANUAL", "TEAM_MEMBERS"],
      user_plan: ["free", "pro"],
    },
  },
} as const
