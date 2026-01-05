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
          entered_upline_leader_id: string
          id: string
          status: string
          updated_at: string | null
          upline_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entered_upline_leader_id: string
          id?: string
          status?: string
          updated_at?: string | null
          upline_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
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
          city: string
          created_at: string | null
          dob: string
          full_name: string
          mobile: string
          onboarding_completed_at: string | null
          state: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string | null
          dob: string
          full_name: string
          mobile: string
          onboarding_completed_at?: string | null
          state: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string | null
          dob?: string
          full_name?: string
          mobile?: string
          onboarding_completed_at?: string | null
          state?: string
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
          leader_code_seq: number | null
          leader_prompt_completed: boolean
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
          leader_code_seq?: number | null
          leader_prompt_completed?: boolean
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
          leader_code_seq?: number | null
          leader_prompt_completed?: boolean
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
      admin_search_users: {
        Args: { search_query?: string }
        Returns: {
          created_at: string
          display_name: string
          email: string
          expires_at: string
          is_admin_override: boolean
          phone: string
          plan: string
          subscribed_at: string
          user_id: string
        }[]
      }
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
      generate_neverai_id: { Args: never; Returns: string }
      generate_simple_neverai_id: { Args: never; Returns: string }
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
      is_in_downline: {
        Args: { _target_user_id: string; _viewer_id: string }
        Returns: boolean
      }
      record_app_access: { Args: { p_app: string }; Returns: undefined }
      update_leader_hierarchy: {
        Args: { p_leader_neverai_id: string; p_user_id: string }
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
      membership_status: "active" | "blocked" | "left"
      message_type: "text" | "media" | "system"
      notification_type: "achievement" | "reminder" | "system" | "mention"
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
      membership_status: ["active", "blocked", "left"],
      message_type: ["text", "media", "system"],
      notification_type: ["achievement", "reminder", "system", "mention"],
      priority_level: ["High", "Medium", "Low"],
      prospect_status: ["+VE", "-VE", "50-50", "30-70"],
      user_plan: ["free", "pro"],
    },
  },
} as const
