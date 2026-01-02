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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_contact_history: {
        Row: {
          agent_id: string
          contact_type: string
          contacted_at: string | null
          contacted_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          subject: string | null
        }
        Insert: {
          agent_id: string
          contact_type: string
          contacted_at?: string | null
          contacted_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          subject?: string | null
        }
        Update: {
          agent_id?: string
          contact_type?: string
          contacted_at?: string | null
          contacted_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_contact_history_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "agent_contact_history_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_contact_history_contacted_by_fkey"
            columns: ["contacted_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tips: {
        Row: {
          agent_id: string
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          listing_id: string | null
          tip_text: string
        }
        Insert: {
          agent_id: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          listing_id?: string | null
          tip_text: string
        }
        Update: {
          agent_id?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          listing_id?: string | null
          tip_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tips_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "agent_tips_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tips_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_weekly_stats: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          listings_created: number | null
          orders_placed: number | null
          page_views: number | null
          revenue_cents: number | null
          week_start: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          listings_created?: number | null
          orders_placed?: number | null
          page_views?: number | null
          revenue_cents?: number | null
          week_start: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          listings_created?: number | null
          orders_placed?: number | null
          page_views?: number | null
          revenue_cents?: number | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_weekly_stats_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "agent_weekly_stats_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          aryeo_customer_id: string | null
          auth_user_id: string | null
          clerk_user_id: string | null
          bio: string | null
          brand_color: string | null
          created_at: string | null
          credit_balance: number | null
          email: string
          headshot_url: string | null
          id: string
          instagram_url: string | null
          last_contacted_at: string | null
          lifetime_credits: number | null
          logo_url: string | null
          name: string
          phone: string | null
          referral_code: string | null
          referral_tier: string | null
          referred_by_id: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          aryeo_customer_id?: string | null
          auth_user_id?: string | null
          clerk_user_id?: string | null
          bio?: string | null
          brand_color?: string | null
          created_at?: string | null
          credit_balance?: number | null
          email: string
          headshot_url?: string | null
          id?: string
          instagram_url?: string | null
          last_contacted_at?: string | null
          lifetime_credits?: number | null
          logo_url?: string | null
          name: string
          phone?: string | null
          referral_code?: string | null
          referral_tier?: string | null
          referred_by_id?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          aryeo_customer_id?: string | null
          auth_user_id?: string | null
          clerk_user_id?: string | null
          bio?: string | null
          brand_color?: string | null
          created_at?: string | null
          credit_balance?: number | null
          email?: string
          headshot_url?: string | null
          id?: string
          instagram_url?: string | null
          last_contacted_at?: string | null
          lifetime_credits?: number | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          referral_code?: string | null
          referral_tier?: string | null
          referred_by_id?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_referred_by_id_fkey"
            columns: ["referred_by_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "agents_referred_by_id_fkey"
            columns: ["referred_by_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_executions: {
        Row: {
          agent_slug: string
          campaign_id: string | null
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input: Json
          listing_id: string | null
          metadata: Json | null
          output: Json | null
          status: string | null
          tokens_used: number | null
          trigger_source: string | null
          triggered_by: string | null
        }
        Insert: {
          agent_slug: string
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json
          listing_id?: string | null
          metadata?: Json | null
          output?: Json | null
          status?: string | null
          tokens_used?: number | null
          trigger_source?: string | null
          triggered_by?: string | null
        }
        Update: {
          agent_slug?: string
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json
          listing_id?: string | null
          metadata?: Json | null
          output?: Json | null
          status?: string | null
          tokens_used?: number | null
          trigger_source?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_executions_agent_slug_fkey"
            columns: ["agent_slug"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ai_agent_executions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "listing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_executions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_executions_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_schedules: {
        Row: {
          agent_slug: string
          created_at: string | null
          created_by: string | null
          cron_expression: string | null
          event_trigger: string | null
          id: string
          interval_minutes: number | null
          is_active: boolean | null
          last_run_at: string | null
          max_concurrent: number | null
          next_run_at: string | null
          run_count: number | null
          schedule_type: string
          updated_at: string | null
        }
        Insert: {
          agent_slug: string
          created_at?: string | null
          created_by?: string | null
          cron_expression?: string | null
          event_trigger?: string | null
          id?: string
          interval_minutes?: number | null
          is_active?: boolean | null
          last_run_at?: string | null
          max_concurrent?: number | null
          next_run_at?: string | null
          run_count?: number | null
          schedule_type: string
          updated_at?: string | null
        }
        Update: {
          agent_slug?: string
          created_at?: string | null
          created_by?: string | null
          cron_expression?: string | null
          event_trigger?: string | null
          id?: string
          interval_minutes?: number | null
          is_active?: boolean | null
          last_run_at?: string | null
          max_concurrent?: number | null
          next_run_at?: string | null
          run_count?: number | null
          schedule_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_schedules_agent_slug_fkey"
            columns: ["agent_slug"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ai_agent_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_workflows: {
        Row: {
          campaign_id: string | null
          completed_at: string | null
          context: Json | null
          created_at: string | null
          current_step: number | null
          error_message: string | null
          id: string
          listing_id: string | null
          name: string
          status: string | null
          steps: Json
          trigger_event: string
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          current_step?: number | null
          error_message?: string | null
          id?: string
          listing_id?: string | null
          name: string
          status?: string | null
          steps?: Json
          trigger_event: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          current_step?: number | null
          error_message?: string | null
          id?: string
          listing_id?: string | null
          name?: string
          status?: string | null
          steps?: Json
          trigger_event?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_workflows_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "listing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_workflows_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          category: string
          config: Json | null
          created_at: string | null
          description: string | null
          execution_mode: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          system_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          config?: Json | null
          created_at?: string | null
          description?: string | null
          execution_mode?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          system_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          config?: Json | null
          created_at?: string | null
          description?: string | null
          execution_mode?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          system_prompt?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_tool_usage: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          input: Json
          listing_id: string | null
          output: Json
          tokens_used: number | null
          tool_type: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          input: Json
          listing_id?: string | null
          output: Json
          tokens_used?: number | null
          tool_type: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          input?: Json
          listing_id?: string | null
          output?: Json
          tokens_used?: number | null
          tool_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "ai_tool_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_usage_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_alert_history: {
        Row: {
          alert_id: string
          id: string
          metadata: Json | null
          metric_value: number | null
          notification_channels: string[] | null
          notification_sent: boolean | null
          threshold_value: number | null
          triggered_at: string | null
        }
        Insert: {
          alert_id: string
          id?: string
          metadata?: Json | null
          metric_value?: number | null
          notification_channels?: string[] | null
          notification_sent?: boolean | null
          threshold_value?: number | null
          triggered_at?: string | null
        }
        Update: {
          alert_id?: string
          id?: string
          metadata?: Json | null
          metric_value?: number | null
          notification_channels?: string[] | null
          notification_sent?: boolean | null
          threshold_value?: number | null
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_alert_history_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "analytics_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_alerts: {
        Row: {
          comparison_period: string | null
          condition: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          metric_type: string
          name: string
          notification_channels: string[] | null
          recipients: string[] | null
          threshold: number
          trigger_count: number | null
          updated_at: string | null
        }
        Insert: {
          comparison_period?: string | null
          condition: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          metric_type: string
          name: string
          notification_channels?: string[] | null
          recipients?: string[] | null
          threshold: number
          trigger_count?: number | null
          updated_at?: string | null
        }
        Update: {
          comparison_period?: string | null
          condition?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          metric_type?: string
          name?: string
          notification_channels?: string[] | null
          recipients?: string[] | null
          threshold?: number
          trigger_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_alerts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          allowed_domains: string[] | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string | null
          last_used_at: string | null
          monthly_limit: number | null
          name: string | null
          requests_this_month: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string | null
          user_id: string | null
          webhook_url: string | null
        }
        Insert: {
          allowed_domains?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix?: string | null
          last_used_at?: string | null
          monthly_limit?: number | null
          name?: string | null
          requests_this_month?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string | null
          user_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          allowed_domains?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string | null
          last_used_at?: string | null
          monthly_limit?: number | null
          name?: string | null
          requests_this_month?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string | null
          user_id?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      booking_reference_files: {
        Row: {
          booking_session_id: string
          content_type: string | null
          id: string
          original_name: string
          size_bytes: number | null
          storage_key: string
          uploaded_at: string | null
        }
        Insert: {
          booking_session_id: string
          content_type?: string | null
          id?: string
          original_name: string
          size_bytes?: number | null
          storage_key: string
          uploaded_at?: string | null
        }
        Update: {
          booking_session_id?: string
          content_type?: string | null
          id?: string
          original_name?: string
          size_bytes?: number | null
          storage_key?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_reference_files_booking_session_id_fkey"
            columns: ["booking_session_id"]
            isOneToOne: false
            referencedRelation: "booking_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      booking_sessions: {
        Row: {
          converted_at: string | null
          created_at: string | null
          current_step: number
          email: string | null
          form_data: Json
          id: string
          is_abandoned: boolean
          is_converted: boolean
          last_activity_at: string
          package_key: string | null
          pricing_snapshot: Json | null
          property_address: string | null
          property_city: string | null
          scheduled_date: string | null
          session_id: string
          updated_at: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          abandoned_at: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string | null
          current_step: number
          email?: string | null
          form_data?: Json
          id?: string
          is_abandoned?: boolean
          is_converted?: boolean
          last_activity_at?: string
          package_key?: string | null
          pricing_snapshot?: Json | null
          property_address?: string | null
          property_city?: string | null
          scheduled_date?: string | null
          session_id: string
          updated_at?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          abandoned_at?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string | null
          current_step?: number
          email?: string | null
          form_data?: Json
          id?: string
          is_abandoned?: boolean
          is_converted?: boolean
          last_activity_at?: string
          package_key?: string | null
          pricing_snapshot?: Json | null
          property_address?: string | null
          property_city?: string | null
          scheduled_date?: string | null
          session_id?: string
          updated_at?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          abandoned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      care_tasks: {
        Row: {
          agent_id: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          due_at: string | null
          id: string
          listing_id: string | null
          notes: string | null
          outcome: string | null
          priority: number | null
          status: string | null
          task_type: string
        }
        Insert: {
          agent_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          outcome?: string | null
          priority?: number | null
          status?: string | null
          task_type: string
        }
        Update: {
          agent_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          outcome?: string | null
          priority?: number | null
          status?: string | null
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "care_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_tasks_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          agent_id: string | null
          body: string | null
          channel: string
          created_at: string | null
          direction: string
          external_id: string | null
          id: string
          listing_id: string | null
          status: string | null
          template_key: string | null
          to_address: string | null
        }
        Insert: {
          agent_id?: string | null
          body?: string | null
          channel: string
          created_at?: string | null
          direction: string
          external_id?: string | null
          id?: string
          listing_id?: string | null
          status?: string | null
          template_key?: string | null
          to_address?: string | null
        }
        Update: {
          agent_id?: string | null
          body?: string | null
          channel?: string
          created_at?: string | null
          direction?: string
          external_id?: string | null
          id?: string
          listing_id?: string | null
          status?: string | null
          template_key?: string | null
          to_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "communications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      content_retainers: {
        Row: {
          a_la_carte_value: number | null
          created_at: string | null
          description: string | null
          display_order: number | null
          features: string[]
          id: string
          included_video_types: Json
          is_active: boolean | null
          is_popular: boolean | null
          key: string
          name: string
          price_monthly: number
          savings: number | null
          shoot_days_per_month: number
          tier: number
          turnaround_hours: number | null
          updated_at: string | null
          videos_per_month: number
        }
        Insert: {
          a_la_carte_value?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: string[]
          id?: string
          included_video_types?: Json
          is_active?: boolean | null
          is_popular?: boolean | null
          key: string
          name: string
          price_monthly: number
          savings?: number | null
          shoot_days_per_month: number
          tier: number
          turnaround_hours?: number | null
          updated_at?: string | null
          videos_per_month: number
        }
        Update: {
          a_la_carte_value?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: string[]
          id?: string
          included_video_types?: Json
          is_active?: boolean | null
          is_popular?: boolean | null
          key?: string
          name?: string
          price_monthly?: number
          savings?: number | null
          shoot_days_per_month?: number
          tier?: number
          turnaround_hours?: number | null
          updated_at?: string | null
          videos_per_month?: number
        }
        Relationships: []
      }
      content_subscriptions: {
        Row: {
          cancelled_at: string | null
          client_id: string
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          retainer_id: string
          shoot_days_used_this_month: number | null
          started_at: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string | null
          videos_used_this_month: number | null
        }
        Insert: {
          cancelled_at?: string | null
          client_id: string
          created_at?: string | null
          current_period_end: string
          current_period_start?: string
          id?: string
          retainer_id: string
          shoot_days_used_this_month?: number | null
          started_at?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
          videos_used_this_month?: number | null
        }
        Update: {
          cancelled_at?: string | null
          client_id?: string
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          retainer_id?: string
          shoot_days_used_this_month?: number | null
          started_at?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
          videos_used_this_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_subscriptions_retainer_id_fkey"
            columns: ["retainer_id"]
            isOneToOne: false
            referencedRelation: "content_retainers"
            referencedColumns: ["id"]
          },
        ]
      }
      content_videos: {
        Row: {
          addon_price: number | null
          client_id: string
          created_at: string | null
          delivered_at: string | null
          description: string | null
          id: string
          is_addon: boolean | null
          shoot_date: string | null
          status: string | null
          storage_path: string | null
          subscription_id: string | null
          title: string | null
          updated_at: string | null
          video_type: string
        }
        Insert: {
          addon_price?: number | null
          client_id: string
          created_at?: string | null
          delivered_at?: string | null
          description?: string | null
          id?: string
          is_addon?: boolean | null
          shoot_date?: string | null
          status?: string | null
          storage_path?: string | null
          subscription_id?: string | null
          title?: string | null
          updated_at?: string | null
          video_type: string
        }
        Update: {
          addon_price?: number | null
          client_id?: string
          created_at?: string | null
          delivered_at?: string | null
          description?: string | null
          id?: string
          is_addon?: boolean | null
          shoot_date?: string | null
          status?: string | null
          storage_path?: string | null
          subscription_id?: string | null
          title?: string | null
          updated_at?: string | null
          video_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_videos_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "content_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packages: {
        Row: {
          created_at: string | null
          credit_amount: number
          description: string | null
          discount_percent: number | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          price_cents: number
          sort_order: number | null
          stripe_price_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credit_amount: number
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          price_cents: number
          sort_order?: number | null
          stripe_price_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credit_amount?: number
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          price_cents?: number
          sort_order?: number | null
          stripe_price_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_reservations: {
        Row: {
          amount: number
          committed_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          purpose: string
          reference_id: string | null
          reference_type: string | null
          released_at: string | null
          status: string | null
          unified_user_id: string
        }
        Insert: {
          amount: number
          committed_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          purpose: string
          reference_id?: string | null
          reference_type?: string | null
          released_at?: string | null
          status?: string | null
          unified_user_id: string
        }
        Update: {
          amount?: number
          committed_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          purpose?: string
          reference_id?: string | null
          reference_type?: string | null
          released_at?: string | null
          status?: string | null
          unified_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_reservations_unified_user_id_fkey"
            columns: ["unified_user_id"]
            isOneToOne: false
            referencedRelation: "unified_users"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          agent_id: string
          amount: number
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          referral_id: string | null
          type: string
        }
        Insert: {
          agent_id: string
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          referral_id?: string | null
          type: string
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          referral_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "credit_transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      curated_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          lat: number
          lng: number
          radius_miles: number | null
          source_url: string | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          lat: number
          lng: number
          radius_miles?: number | null
          source_url?: string | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          lat?: number
          lng?: number
          radius_miles?: number | null
          source_url?: string | null
          title?: string
        }
        Relationships: []
      }
      generated_invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_notes: string | null
          due_date: string | null
          email_opened_at: string | null
          id: string
          internal_notes: string | null
          invoice_date: string
          invoice_number: string
          order_id: string
          paid_at: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          sent_at: string | null
          sent_to_email: string | null
          status: string
          template_id: string | null
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_notes?: string | null
          due_date?: string | null
          email_opened_at?: string | null
          id?: string
          internal_notes?: string | null
          invoice_date?: string
          invoice_number: string
          order_id: string
          paid_at?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          sent_to_email?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_notes?: string | null
          due_date?: string | null
          email_opened_at?: string | null
          id?: string
          internal_notes?: string | null
          invoice_date?: string
          invoice_number?: string
          order_id?: string
          paid_at?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          sent_to_email?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_invoices_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "invoice_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_templates: {
        Row: {
          accent_color: string | null
          agent_id: string | null
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          company_website: string | null
          created_at: string | null
          font_family: string | null
          footer_text: string | null
          header_text: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          margin_bottom: number | null
          margin_left: number | null
          margin_right: number | null
          margin_top: number | null
          name: string
          paper_size: string | null
          payment_instructions: string | null
          primary_color: string | null
          secondary_color: string | null
          show_due_date: boolean | null
          show_line_item_details: boolean | null
          show_logo: boolean | null
          show_payment_link: boolean | null
          show_qr_code: boolean | null
          terms_and_conditions: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          agent_id?: string | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_website?: string | null
          created_at?: string | null
          font_family?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          margin_bottom?: number | null
          margin_left?: number | null
          margin_right?: number | null
          margin_top?: number | null
          name?: string
          paper_size?: string | null
          payment_instructions?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_due_date?: boolean | null
          show_line_item_details?: boolean | null
          show_logo?: boolean | null
          show_payment_link?: boolean | null
          show_qr_code?: boolean | null
          terms_and_conditions?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          agent_id?: string | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_website?: string | null
          created_at?: string | null
          font_family?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          margin_bottom?: number | null
          margin_left?: number | null
          margin_right?: number | null
          margin_top?: number | null
          name?: string
          paper_size?: string | null
          payment_instructions?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_due_date?: boolean | null
          show_line_item_details?: boolean | null
          show_logo?: boolean | null
          show_payment_link?: boolean | null
          show_qr_code?: boolean | null
          terms_and_conditions?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_templates_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "invoice_templates_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          agent_id: string
          amount: number
          brokerage_info: Json | null
          created_at: string
          created_by: string | null
          custom_notes: string | null
          days_overdue: number | null
          due_date: string
          id: string
          invoice_number: string
          line_items: Json | null
          listing_address: string | null
          listing_id: string | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_method: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          amount: number
          brokerage_info?: Json | null
          created_at?: string
          created_by?: string | null
          custom_notes?: string | null
          days_overdue?: number | null
          due_date: string
          id?: string
          invoice_number: string
          line_items?: Json | null
          listing_address?: string | null
          listing_id?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          amount?: number
          brokerage_info?: Json | null
          created_at?: string
          created_by?: string | null
          custom_notes?: string | null
          days_overdue?: number | null
          due_date?: string
          id?: string
          invoice_number?: string
          line_items?: Json | null
          listing_address?: string | null
          listing_id?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "invoices_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_events: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          created_at: string | null
          event_type: string
          id: string
          listing_id: string | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          listing_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          listing_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "job_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agent_id: string | null
          created_at: string | null
          email: string | null
          id: string
          listing_id: string | null
          message: string | null
          name: string
          phone: string | null
          source: string | null
          status: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          listing_id?: string | null
          message?: string | null
          name: string
          phone?: string | null
          source?: string | null
          status?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          listing_id?: string | null
          message?: string | null
          name?: string
          phone?: string | null
          source?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_campaigns: {
        Row: {
          agent_answers: Json | null
          agent_id: string
          blog_post_content: Json | null
          carousel_types: string[] | null
          created_at: string | null
          credits_used: number | null
          generated_questions: Json | null
          id: string
          listing_id: string | null
          name: string | null
          neighborhood_data: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_answers?: Json | null
          agent_id: string
          blog_post_content?: Json | null
          carousel_types?: string[] | null
          created_at?: string | null
          credits_used?: number | null
          generated_questions?: Json | null
          id?: string
          listing_id?: string | null
          name?: string | null
          neighborhood_data?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_answers?: Json | null
          agent_id?: string
          blog_post_content?: Json | null
          carousel_types?: string[] | null
          created_at?: string | null
          credits_used?: number | null
          generated_questions?: Json | null
          id?: string
          listing_id?: string | null
          name?: string | null
          neighborhood_data?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_campaigns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "listing_campaigns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_campaigns_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_carousels: {
        Row: {
          bannerbear_collection_uid: string | null
          campaign_id: string
          caption: string | null
          carousel_type: string
          created_at: string | null
          hashtags: string[] | null
          id: string
          render_status: string | null
          rendered_at: string | null
          rendered_image_urls: string[] | null
          slides: Json
          title: string | null
        }
        Insert: {
          bannerbear_collection_uid?: string | null
          campaign_id: string
          caption?: string | null
          carousel_type: string
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          render_status?: string | null
          rendered_at?: string | null
          rendered_image_urls?: string[] | null
          slides?: Json
          title?: string | null
        }
        Update: {
          bannerbear_collection_uid?: string | null
          campaign_id?: string
          caption?: string | null
          carousel_type?: string
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          render_status?: string | null
          rendered_at?: string | null
          rendered_image_urls?: string[] | null
          slides?: Json
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_carousels_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "listing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string
          agent_id: string | null
          aryeo_listing_id: string | null
          aryeo_order_id: string | null
          baths: number | null
          beds: number | null
          city: string | null
          client_id: string | null
          created_at: string | null
          delivered_at: string | null
          dom: number | null
          id: string
          is_rush: boolean | null
          lat: number | null
          lng: number | null
          ops_status: string | null
          photographer_id: string | null
          price: number | null
          scheduled_at: string | null
          sold_date: string | null
          sold_price: number | null
          sqft: number | null
          state: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          zip: string | null
          // From enterprise upgrade migration - integration tracking
          fotello_job_id: string | null
          fotello_status: string | null
          cubicasa_order_id: string | null
          cubicasa_status: string | null
          zillow_3d_id: string | null
          zillow_3d_status: string | null
          integration_error_message: string | null
          last_integration_check: string | null
          // From enterprise upgrade migration - SLA tracking
          expected_completion: string | null
          sla_status: string | null
          stage_entered_at: string | null
          // From editor workflow migration
          editor_id: string | null
          editing_started_at: string | null
          editing_completed_at: string | null
          // From enterprise features phase1 migration - airspace
          airspace_qualified: boolean | null
          airspace_status: string | null
          airspace_checked_at: string | null
          airspace_result: unknown | null
          front_facing_direction: string | null
          optimal_shoot_times: unknown | null
        }
        Insert: {
          address: string
          agent_id?: string | null
          aryeo_listing_id?: string | null
          aryeo_order_id?: string | null
          baths?: number | null
          beds?: number | null
          city?: string | null
          client_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          dom?: number | null
          id?: string
          is_rush?: boolean | null
          lat?: number | null
          lng?: number | null
          ops_status?: string | null
          photographer_id?: string | null
          price?: number | null
          scheduled_at?: string | null
          sold_date?: string | null
          sold_price?: number | null
          sqft?: number | null
          state?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          zip?: string | null
          fotello_job_id?: string | null
          fotello_status?: string | null
          cubicasa_order_id?: string | null
          cubicasa_status?: string | null
          zillow_3d_id?: string | null
          zillow_3d_status?: string | null
          integration_error_message?: string | null
          last_integration_check?: string | null
          expected_completion?: string | null
          sla_status?: string | null
          stage_entered_at?: string | null
          editor_id?: string | null
          editing_started_at?: string | null
          editing_completed_at?: string | null
          airspace_qualified?: boolean | null
          airspace_status?: string | null
          airspace_checked_at?: string | null
          airspace_result?: unknown | null
          front_facing_direction?: string | null
          optimal_shoot_times?: unknown | null
        }
        Update: {
          address?: string
          agent_id?: string | null
          aryeo_listing_id?: string | null
          aryeo_order_id?: string | null
          baths?: number | null
          beds?: number | null
          city?: string | null
          client_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          dom?: number | null
          id?: string
          is_rush?: boolean | null
          lat?: number | null
          lng?: number | null
          ops_status?: string | null
          photographer_id?: string | null
          price?: number | null
          scheduled_at?: string | null
          sold_date?: string | null
          sold_price?: number | null
          sqft?: number | null
          state?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          zip?: string | null
          fotello_job_id?: string | null
          fotello_status?: string | null
          cubicasa_order_id?: string | null
          cubicasa_status?: string | null
          zillow_3d_id?: string | null
          zillow_3d_status?: string | null
          integration_error_message?: string | null
          last_integration_check?: string | null
          expected_completion?: string | null
          sla_status?: string | null
          stage_entered_at?: string | null
          editor_id?: string | null
          editing_started_at?: string | null
          editing_completed_at?: string | null
          airspace_qualified?: boolean | null
          airspace_status?: string | null
          airspace_checked_at?: string | null
          airspace_result?: unknown | null
          front_facing_direction?: string | null
          optimal_shoot_times?: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          aryeo_url: string | null
          category: string | null
          created_at: string | null
          id: string
          listing_id: string
          qc_notes: string | null
          qc_status: string | null
          sort_order: number | null
          storage_path: string | null
          tip_text: string | null
          type: string
          // From founddr integration migration
          processing_job_id: string | null
          processed_storage_path: string | null
          approved_storage_path: string | null
          edit_history: unknown | null
          qc_assigned_to: string | null
          needs_editing: boolean | null
          original_filename: string | null
          file_size_bytes: number | null
          image_width: number | null
          image_height: number | null
          // From native media storage migration
          media_url: string | null
          storage_bucket: string | null
          migration_status: string | null
          migrated_at: string | null
        }
        Insert: {
          aryeo_url?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          listing_id: string
          qc_notes?: string | null
          qc_status?: string | null
          sort_order?: number | null
          storage_path?: string | null
          tip_text?: string | null
          type: string
          processing_job_id?: string | null
          processed_storage_path?: string | null
          approved_storage_path?: string | null
          edit_history?: unknown | null
          qc_assigned_to?: string | null
          needs_editing?: boolean | null
          original_filename?: string | null
          file_size_bytes?: number | null
          image_width?: number | null
          image_height?: number | null
          media_url?: string | null
          storage_bucket?: string | null
          migration_status?: string | null
          migrated_at?: string | null
        }
        Update: {
          aryeo_url?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string
          qc_notes?: string | null
          qc_status?: string | null
          sort_order?: number | null
          storage_path?: string | null
          tip_text?: string | null
          type?: string
          processing_job_id?: string | null
          processed_storage_path?: string | null
          approved_storage_path?: string | null
          edit_history?: unknown | null
          qc_assigned_to?: string | null
          needs_editing?: boolean | null
          original_filename?: string | null
          file_size_bytes?: number | null
          image_width?: number | null
          image_height?: number | null
          media_url?: string | null
          storage_bucket?: string | null
          migration_status?: string | null
          migrated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      media_uploads: {
        Row: {
          content_type: string | null
          created_at: string | null
          filename: string
          id: string
          listing_id: string | null
          media_type: string | null
          metadata: Json | null
          original_name: string | null
          processing_status: string | null
          size_bytes: number | null
          storage_bucket: string | null
          storage_key: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          filename: string
          id?: string
          listing_id?: string | null
          media_type?: string | null
          metadata?: Json | null
          original_name?: string | null
          processing_status?: string | null
          size_bytes?: number | null
          storage_bucket?: string | null
          storage_key: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          filename?: string
          id?: string
          listing_id?: string | null
          media_type?: string | null
          metadata?: Json | null
          original_name?: string | null
          processing_status?: string | null
          size_bytes?: number | null
          storage_bucket?: string | null
          storage_key?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_uploads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          body: string | null
          channel: string
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          notification_type: string
          read_at: string | null
          recipient_email: string | null
          recipient_phone: string | null
          recipient_type: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type: string
          read_at?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_type?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_type?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          delivery_notifications: boolean | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          marketing_emails: boolean | null
          order_updates: boolean | null
          payment_reminders: boolean | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          system_alerts: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_notifications?: boolean | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          marketing_emails?: boolean | null
          order_updates?: boolean | null
          payment_reminders?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          system_alerts?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivery_notifications?: boolean | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          marketing_emails?: boolean | null
          order_updates?: boolean | null
          payment_reminders?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          system_alerts?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          changed_by_type: string | null
          created_at: string | null
          id: string
          new_status: string
          notes: string | null
          order_id: string
          previous_status: string | null
        }
        Insert: {
          changed_by?: string | null
          changed_by_type?: string | null
          created_at?: string | null
          id?: string
          new_status: string
          notes?: string | null
          order_id: string
          previous_status?: string | null
        }
        Update: {
          changed_by?: string | null
          changed_by_type?: string | null
          created_at?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          order_id?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          agent_id: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string | null
          discount_cents: number | null
          id: string
          internal_notes: string | null
          listing_id: string | null
          package_key: string
          package_name: string
          paid_at: string | null
          payment_intent_id: string | null
          payment_status: string | null
          property_address: string | null
          property_baths: number | null
          property_beds: number | null
          property_city: string | null
          property_sqft: number | null
          property_state: string | null
          property_zip: string | null
          retainer_months: number | null
          retainer_start_date: string | null
          scheduled_at: string | null
          scheduled_duration_minutes: number | null
          service_type: string
          services: Json | null
          special_instructions: string | null
          sqft_tier: string | null
          status: string | null
          subtotal_cents: number
          tax_cents: number | null
          total_cents: number
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string | null
          discount_cents?: number | null
          id?: string
          internal_notes?: string | null
          listing_id?: string | null
          package_key: string
          package_name: string
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          property_address?: string | null
          property_baths?: number | null
          property_beds?: number | null
          property_city?: string | null
          property_sqft?: number | null
          property_state?: string | null
          property_zip?: string | null
          retainer_months?: number | null
          retainer_start_date?: string | null
          scheduled_at?: string | null
          scheduled_duration_minutes?: number | null
          service_type: string
          services?: Json | null
          special_instructions?: string | null
          sqft_tier?: string | null
          status?: string | null
          subtotal_cents: number
          tax_cents?: number | null
          total_cents: number
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string | null
          discount_cents?: number | null
          id?: string
          internal_notes?: string | null
          listing_id?: string | null
          package_key?: string
          package_name?: string
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          property_address?: string | null
          property_baths?: number | null
          property_beds?: number | null
          property_city?: string | null
          property_sqft?: number | null
          property_state?: string | null
          property_zip?: string | null
          retainer_months?: number | null
          retainer_start_date?: string | null
          scheduled_at?: string | null
          scheduled_duration_minutes?: number | null
          service_type?: string
          services?: Json | null
          special_instructions?: string | null
          sqft_tier?: string | null
          status?: string | null
          subtotal_cents?: number
          tax_cents?: number | null
          total_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "orders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      package_pricing: {
        Row: {
          created_at: string | null
          id: string
          package_id: string
          price: number
          tier_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          package_id: string
          price: number
          tier_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          package_id?: string
          price?: number
          tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_pricing_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_pricing_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          included_services: string[]
          is_active: boolean | null
          key: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          included_services?: string[]
          is_active?: boolean | null
          key: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          included_services?: string[]
          is_active?: boolean | null
          key?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_portions: {
        Row: {
          amount_cents: number
          card_brand: string | null
          card_last_four: string | null
          created_at: string | null
          error_message: string | null
          id: string
          payment_intent_id: string | null
          payment_method_id: string | null
          payment_method_type: string
          percentage: number | null
          processed_at: string | null
          split_payment_id: string
          status: string
        }
        Insert: {
          amount_cents: number
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payment_intent_id?: string | null
          payment_method_id?: string | null
          payment_method_type?: string
          percentage?: number | null
          processed_at?: string | null
          split_payment_id: string
          status?: string
        }
        Update: {
          amount_cents?: number
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payment_intent_id?: string | null
          payment_method_id?: string | null
          payment_method_type?: string
          percentage?: number | null
          processed_at?: string | null
          split_payment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_portions_split_payment_id_fkey"
            columns: ["split_payment_id"]
            isOneToOne: false
            referencedRelation: "split_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_summaries: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          paid_amount_cents: number | null
          status: string | null
          total_amount_cents: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          paid_amount_cents?: number | null
          status?: string | null
          total_amount_cents: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          paid_amount_cents?: number | null
          status?: string | null
          total_amount_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_summaries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      photographer_locations: {
        Row: {
          accuracy: number | null
          created_at: string | null
          eta_minutes: number | null
          heading: number | null
          id: string
          last_updated_at: string | null
          latitude: number
          listing_id: string | null
          longitude: number
          speed: number | null
          staff_id: string
          status: string | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          eta_minutes?: number | null
          heading?: number | null
          id?: string
          last_updated_at?: string | null
          latitude: number
          listing_id?: string | null
          longitude: number
          speed?: number | null
          staff_id: string
          status?: string | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          eta_minutes?: number | null
          heading?: number | null
          id?: string
          last_updated_at?: string | null
          latitude?: number
          listing_id?: string | null
          longitude?: number
          speed?: number | null
          staff_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photographer_locations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photographer_locations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          created_at: string | null
          id: string
          label: string
          max_sqft: number | null
          min_sqft: number
          package_tier: string
          photo_price: number
          tier_key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          max_sqft?: number | null
          min_sqft: number
          package_tier: string
          photo_price: number
          tier_key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          max_sqft?: number | null
          min_sqft?: number
          package_tier?: string
          photo_price?: number
          tier_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      processing_jobs: {
        Row: {
          bracket_count: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          founddr_job_id: string | null
          id: string
          input_keys: string[]
          listing_id: string | null
          metrics: Json | null
          output_key: string | null
          processing_time_ms: number | null
          queued_at: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          webhook_received_at: string | null
        }
        Insert: {
          bracket_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          founddr_job_id?: string | null
          id?: string
          input_keys: string[]
          listing_id?: string | null
          metrics?: Json | null
          output_key?: string | null
          processing_time_ms?: number | null
          queued_at?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          webhook_received_at?: string | null
        }
        Update: {
          bracket_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          founddr_job_id?: string | null
          id?: string
          input_keys?: string[]
          listing_id?: string | null
          metrics?: Json | null
          output_key?: string | null
          processing_time_ms?: number | null
          queued_at?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          webhook_received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_jobs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      redemptions: {
        Row: {
          agent_id: string
          aryeo_coupon_id: string | null
          created_at: string | null
          credits_cost: number
          id: string
          metadata: Json | null
          reward_id: string
          reward_type: string
          status: string | null
        }
        Insert: {
          agent_id: string
          aryeo_coupon_id?: string | null
          created_at?: string | null
          credits_cost: number
          id?: string
          metadata?: Json | null
          reward_id: string
          reward_type: string
          status?: string | null
        }
        Update: {
          agent_id?: string
          aryeo_coupon_id?: string | null
          created_at?: string | null
          credits_cost?: number
          id?: string
          metadata?: Json | null
          reward_id?: string
          reward_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "redemptions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          aryeo_order_id: string | null
          completed_at: string | null
          created_at: string | null
          credits_awarded: number | null
          id: string
          order_type: string | null
          referred_agent_id: string | null
          referred_email: string
          referrer_id: string
          status: string | null
        }
        Insert: {
          aryeo_order_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          credits_awarded?: number | null
          id?: string
          order_type?: string | null
          referred_agent_id?: string | null
          referred_email: string
          referrer_id: string
          status?: string | null
        }
        Update: {
          aryeo_order_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          credits_awarded?: number | null
          id?: string
          order_type?: string | null
          referred_agent_id?: string | null
          referred_email?: string
          referrer_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_agent_id_fkey"
            columns: ["referred_agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "referrals_referred_agent_id_fkey"
            columns: ["referred_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      service_territories: {
        Row: {
          cities: string[] | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          zip_codes: string[] | null
        }
        Insert: {
          cities?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          zip_codes?: string[] | null
        }
        Update: {
          cities?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          zip_codes?: string[] | null
        }
        Relationships: []
      }
      services: {
        Row: {
          base_price: number
          category: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          price_label: string | null
          updated_at: string | null
        }
        Insert: {
          base_price: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          price_label?: string | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          price_label?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      split_payments: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          order_id: string
          split_type: string
          status: string
          total_amount_cents: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          order_id: string
          split_type?: string
          status?: string
          total_amount_cents: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          order_id?: string
          split_type?: string
          status?: string
          total_amount_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "split_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "split_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          auth_user_id: string | null
          clerk_user_id: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          role: string
          timezone: string | null
          weekly_report_enabled: boolean | null
          stripe_connect_id: string | null
          stripe_connect_status: string | null
          payout_type: string | null
          default_payout_percent: number | null
          hourly_rate: number | null
          partner_id: string | null
          stripe_payouts_enabled: boolean | null
          stripe_onboarding_completed_at: string | null
          roles: string[] | null
          team_role: string | null
          // From smart assignment migration
          skills: string[] | null
          enabled_skills: string[] | null
          home_lat: number | null
          home_lng: number | null
          max_daily_jobs: number | null
          certifications: string[] | null
        }
        Insert: {
          auth_user_id?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          role: string
          timezone?: string | null
          weekly_report_enabled?: boolean | null
          stripe_connect_id?: string | null
          stripe_connect_status?: string | null
          payout_type?: string | null
          default_payout_percent?: number | null
          hourly_rate?: number | null
          partner_id?: string | null
          stripe_payouts_enabled?: boolean | null
          stripe_onboarding_completed_at?: string | null
          roles?: string[] | null
          team_role?: string | null
          skills?: string[] | null
          enabled_skills?: string[] | null
          home_lat?: number | null
          home_lng?: number | null
          max_daily_jobs?: number | null
          certifications?: string[] | null
        }
        Update: {
          auth_user_id?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          role?: string
          timezone?: string | null
          weekly_report_enabled?: boolean | null
          stripe_connect_id?: string | null
          stripe_connect_status?: string | null
          payout_type?: string | null
          default_payout_percent?: number | null
          hourly_rate?: number | null
          partner_id?: string | null
          stripe_payouts_enabled?: boolean | null
          stripe_onboarding_completed_at?: string | null
          roles?: string[] | null
          team_role?: string | null
          skills?: string[] | null
          enabled_skills?: string[] | null
          home_lat?: number | null
          home_lng?: number | null
          max_daily_jobs?: number | null
          certifications?: string[] | null
        }
        Relationships: []
      }
      staff_territories: {
        Row: {
          assigned_at: string | null
          id: string
          is_primary: boolean | null
          staff_id: string
          territory_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          is_primary?: boolean | null
          staff_id: string
          territory_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          is_primary?: boolean | null
          staff_id?: string
          territory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_territories_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_territories_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "service_territories"
            referencedColumns: ["id"]
          },
        ]
      }
      storywork_brand_kits: {
        Row: {
          created_at: string | null
          font_family: string | null
          headshot_url: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          font_family?: string | null
          headshot_url?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          font_family?: string | null
          headshot_url?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storywork_brand_kits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storywork_users"
            referencedColumns: ["id"]
          },
        ]
      }
      storywork_credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          source: string | null
          story_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          story_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          story_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storywork_credit_transactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "storywork_stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storywork_credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storywork_users"
            referencedColumns: ["id"]
          },
        ]
      }
      storywork_stories: {
        Row: {
          answers: Json | null
          bannerbear_render_id: string | null
          brand_kit_id: string | null
          carousel_images: Json | null
          carousel_template: string | null
          created_at: string | null
          generated_content: Json | null
          id: string
          raw_input: string | null
          status: string | null
          story_type: string
          title: string | null
          transcription: string | null
          updated_at: string | null
          user_id: string
          voice_recording_url: string | null
        }
        Insert: {
          answers?: Json | null
          bannerbear_render_id?: string | null
          brand_kit_id?: string | null
          carousel_images?: Json | null
          carousel_template?: string | null
          created_at?: string | null
          generated_content?: Json | null
          id?: string
          raw_input?: string | null
          status?: string | null
          story_type: string
          title?: string | null
          transcription?: string | null
          updated_at?: string | null
          user_id: string
          voice_recording_url?: string | null
        }
        Update: {
          answers?: Json | null
          bannerbear_render_id?: string | null
          brand_kit_id?: string | null
          carousel_images?: Json | null
          carousel_template?: string | null
          created_at?: string | null
          generated_content?: Json | null
          id?: string
          raw_input?: string | null
          status?: string | null
          story_type?: string
          title?: string | null
          transcription?: string | null
          updated_at?: string | null
          user_id?: string
          voice_recording_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storywork_stories_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "storywork_brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storywork_stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storywork_users"
            referencedColumns: ["id"]
          },
        ]
      }
      storywork_users: {
        Row: {
          asm_agent_id: string | null
          clerk_id: string | null
          created_at: string | null
          credit_balance: number | null
          email: string
          id: string
          lifetime_credits: number | null
          stripe_customer_id: string | null
          subscription_ends_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          asm_agent_id?: string | null
          clerk_id?: string | null
          created_at?: string | null
          credit_balance?: number | null
          email: string
          id?: string
          lifetime_credits?: number | null
          stripe_customer_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          asm_agent_id?: string | null
          clerk_id?: string | null
          created_at?: string | null
          credit_balance?: number | null
          email?: string
          id?: string
          lifetime_credits?: number | null
          stripe_customer_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storywork_users_asm_agent_id_fkey"
            columns: ["asm_agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "storywork_users_asm_agent_id_fkey"
            columns: ["asm_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          config_json: Json | null
          id: string
          name: string
          preview_url: string | null
        }
        Insert: {
          config_json?: Json | null
          id?: string
          name: string
          preview_url?: string | null
        }
        Update: {
          config_json?: Json | null
          id?: string
          name?: string
          preview_url?: string | null
        }
        Relationships: []
      }
      travel_tiers: {
        Row: {
          created_at: string | null
          description: string | null
          fee_per_mile: number
          flat_fee: number | null
          id: string
          max_miles: number | null
          min_miles: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          fee_per_mile: number
          flat_fee?: number | null
          id?: string
          max_miles?: number | null
          min_miles: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          fee_per_mile?: number
          flat_fee?: number | null
          id?: string
          max_miles?: number | null
          min_miles?: number
        }
        Relationships: []
      }
      unified_credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          running_balance: number
          source_platform: string
          transaction_type: string
          unified_user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          running_balance: number
          source_platform: string
          transaction_type: string
          unified_user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          running_balance?: number
          source_platform?: string
          transaction_type?: string
          unified_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unified_credit_transactions_unified_user_id_fkey"
            columns: ["unified_user_id"]
            isOneToOne: false
            referencedRelation: "unified_users"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_users: {
        Row: {
          asm_agent_id: string | null
          asm_user_id: string | null
          created_at: string | null
          credit_balance: number | null
          email: string
          id: string
          last_activity_at: string | null
          lifetime_credits: number | null
          storywork_clerk_id: string | null
          storywork_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          asm_agent_id?: string | null
          asm_user_id?: string | null
          created_at?: string | null
          credit_balance?: number | null
          email: string
          id?: string
          last_activity_at?: string | null
          lifetime_credits?: number | null
          storywork_clerk_id?: string | null
          storywork_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          asm_agent_id?: string | null
          asm_user_id?: string | null
          created_at?: string | null
          credit_balance?: number | null
          email?: string
          id?: string
          last_activity_at?: string | null
          lifetime_credits?: number | null
          storywork_clerk_id?: string | null
          storywork_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_users_asm_agent_id_fkey"
            columns: ["asm_agent_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_summary"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "unified_users_asm_agent_id_fkey"
            columns: ["asm_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_users_storywork_user_id_fkey"
            columns: ["storywork_user_id"]
            isOneToOne: false
            referencedRelation: "storywork_users"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_forecasts: {
        Row: {
          conditions: string | null
          expires_at: string | null
          fetched_at: string | null
          forecast_data: Json
          forecast_date: string
          high_temp_f: number | null
          id: string
          latitude: number
          longitude: number
          low_temp_f: number | null
          precipitation_chance: number | null
          source: string | null
          wind_speed_mph: number | null
        }
        Insert: {
          conditions?: string | null
          expires_at?: string | null
          fetched_at?: string | null
          forecast_data: Json
          forecast_date: string
          high_temp_f?: number | null
          id?: string
          latitude: number
          longitude: number
          low_temp_f?: number | null
          precipitation_chance?: number | null
          source?: string | null
          wind_speed_mph?: number | null
        }
        Update: {
          conditions?: string | null
          expires_at?: string | null
          fetched_at?: string | null
          forecast_data?: Json
          forecast_date?: string
          high_temp_f?: number | null
          id?: string
          latitude?: number
          longitude?: number
          low_temp_f?: number | null
          precipitation_chance?: number | null
          source?: string | null
          wind_speed_mph?: number | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          aryeo_event_id: string
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          retry_count: number | null
          status: string | null
        }
        Insert: {
          aryeo_event_id: string
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          retry_count?: number | null
          status?: string | null
        }
        Update: {
          aryeo_event_id?: string
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          retry_count?: number | null
          status?: string | null
        }
        Relationships: []
      }
      share_links: {
        Row: {
          id: string
          listing_id: string
          agent_id: string | null
          client_email: string | null
          client_name: string | null
          share_token: string
          link_type: string | null
          expires_at: string | null
          access_count: number | null
          last_accessed_at: string | null
          is_active: boolean | null
          created_at: string | null
          media_access_enabled: boolean | null
        }
        Insert: {
          id?: string
          listing_id: string
          agent_id?: string | null
          client_email?: string | null
          client_name?: string | null
          share_token: string
          link_type?: string | null
          expires_at?: string | null
          access_count?: number | null
          last_accessed_at?: string | null
          is_active?: boolean | null
          created_at?: string | null
          media_access_enabled?: boolean | null
        }
        Update: {
          id?: string
          listing_id?: string
          agent_id?: string | null
          client_email?: string | null
          client_name?: string | null
          share_token?: string
          link_type?: string | null
          expires_at?: string | null
          access_count?: number | null
          last_accessed_at?: string | null
          is_active?: boolean | null
          created_at?: string | null
          media_access_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "share_links_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_schedules: {
        Row: {
          id: string
          listing_id: string
          share_link_id: string | null
          seller_name: string | null
          seller_email: string | null
          seller_phone: string | null
          available_slots: Json
          selected_slot: Json | null
          status: string | null
          notes: string | null
          submitted_at: string | null
          confirmed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          share_link_id?: string | null
          seller_name?: string | null
          seller_email?: string | null
          seller_phone?: string | null
          available_slots?: Json
          selected_slot?: Json | null
          status?: string | null
          notes?: string | null
          submitted_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          share_link_id?: string | null
          seller_name?: string | null
          seller_email?: string | null
          seller_phone?: string | null
          available_slots?: Json
          selected_slot?: Json | null
          status?: string | null
          notes?: string | null
          submitted_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reschedule_requests: {
        Row: {
          id: string
          listing_id: string
          order_id: string | null
          requested_by: string | null
          requested_by_type: string | null
          original_date: string | null
          new_date: string | null
          requested_slots: Json | null
          reason: string | null
          status: string | null
          approved_by: string | null
          approved_at: string | null
          handled_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          order_id?: string | null
          requested_by?: string | null
          requested_by_type?: string | null
          original_date?: string | null
          new_date?: string | null
          requested_slots?: Json | null
          reason?: string | null
          status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          handled_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          order_id?: string | null
          requested_by?: string | null
          requested_by_type?: string | null
          original_date?: string | null
          new_date?: string | null
          requested_slots?: Json | null
          reason?: string | null
          status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          handled_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      photographer_assignments: {
        Row: {
          id: string
          listing_id: string
          photographer_id: string
          status: string | null
          scheduled_at: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          completed_at: string | null
          notes: string | null
          google_event_id: string | null
          location_lat: number | null
          location_lng: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          photographer_id: string
          status?: string | null
          scheduled_at?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          completed_at?: string | null
          notes?: string | null
          google_event_id?: string | null
          location_lat?: number | null
          location_lng?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          photographer_id?: string
          status?: string | null
          scheduled_at?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          completed_at?: string | null
          notes?: string | null
          google_event_id?: string | null
          location_lat?: number | null
          location_lng?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photographer_assignments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          id: string
          staff_id: string
          clock_in: string
          clock_out: string | null
          duration_minutes: number | null
          break_minutes: number | null
          hourly_rate: number
          total_pay_cents: number | null
          status: string | null
          pay_period_id: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          staff_id: string
          clock_in: string
          clock_out?: string | null
          duration_minutes?: number | null
          break_minutes?: number | null
          hourly_rate: number
          total_pay_cents?: number | null
          status?: string | null
          pay_period_id?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          staff_id?: string
          clock_in?: string
          clock_out?: string | null
          duration_minutes?: number | null
          break_minutes?: number | null
          hourly_rate?: number
          total_pay_cents?: number | null
          status?: string | null
          pay_period_id?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pay_periods: {
        Row: {
          id: string
          start_date: string
          end_date: string
          status: string | null
          total_hours: number | null
          total_pay_cents: number | null
          paid_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          start_date: string
          end_date: string
          status?: string | null
          total_hours?: number | null
          total_pay_cents?: number | null
          paid_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          start_date?: string
          end_date?: string
          status?: string | null
          total_hours?: number | null
          total_pay_cents?: number | null
          paid_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          id: string
          name: string
          email: string
          user_id: string | null
          clerk_user_id: string | null
          stripe_connect_id: string | null
          stripe_connect_status: string | null
          stripe_payouts_enabled: boolean | null
          stripe_onboarding_completed_at: string | null
          default_profit_percent: number | null
          payout_schedule: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          user_id?: string | null
          clerk_user_id?: string | null
          stripe_connect_id?: string | null
          stripe_connect_status?: string | null
          stripe_payouts_enabled?: boolean | null
          stripe_onboarding_completed_at?: string | null
          default_profit_percent?: number | null
          payout_schedule?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          user_id?: string | null
          clerk_user_id?: string | null
          stripe_connect_id?: string | null
          stripe_connect_status?: string | null
          stripe_payouts_enabled?: boolean | null
          stripe_onboarding_completed_at?: string | null
          default_profit_percent?: number | null
          payout_schedule?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_payouts: {
        Row: {
          id: string
          staff_id: string
          order_id: string
          listing_id: string | null
          role: string
          order_total_cents: number
          payout_amount_cents: number
          payout_percent: number
          stripe_transfer_id: string | null
          stripe_destination_account: string | null
          status: string | null
          error_message: string | null
          reversed_at: string | null
          reversal_reason: string | null
          created_at: string | null
          processed_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          staff_id: string
          order_id: string
          listing_id?: string | null
          role: string
          order_total_cents: number
          payout_amount_cents: number
          payout_percent: number
          stripe_transfer_id?: string | null
          stripe_destination_account?: string | null
          status?: string | null
          error_message?: string | null
          reversed_at?: string | null
          reversal_reason?: string | null
          created_at?: string | null
          processed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          staff_id?: string
          order_id?: string
          listing_id?: string | null
          role?: string
          order_total_cents?: number
          payout_amount_cents?: number
          payout_percent?: number
          stripe_transfer_id?: string | null
          stripe_destination_account?: string | null
          status?: string | null
          error_message?: string | null
          reversed_at?: string | null
          reversal_reason?: string | null
          created_at?: string | null
          processed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      partner_payouts: {
        Row: {
          id: string
          partner_id: string
          order_id: string
          listing_id: string | null
          staff_id: string | null
          order_total_cents: number
          payout_amount_cents: number
          payout_percent: number
          stripe_transfer_id: string | null
          stripe_destination_account: string | null
          status: string | null
          error_message: string | null
          reversed_at: string | null
          reversal_reason: string | null
          created_at: string | null
          processed_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          partner_id: string
          order_id: string
          listing_id?: string | null
          staff_id?: string | null
          order_total_cents: number
          payout_amount_cents: number
          payout_percent: number
          stripe_transfer_id?: string | null
          stripe_destination_account?: string | null
          status?: string | null
          error_message?: string | null
          reversed_at?: string | null
          reversal_reason?: string | null
          created_at?: string | null
          processed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          partner_id?: string
          order_id?: string
          listing_id?: string | null
          staff_id?: string | null
          order_total_cents?: number
          payout_amount_cents?: number
          payout_percent?: number
          stripe_transfer_id?: string | null
          stripe_destination_account?: string | null
          status?: string | null
          error_message?: string | null
          reversed_at?: string | null
          reversal_reason?: string | null
          created_at?: string | null
          processed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          id: string
          listing_id: string | null
          agent_id: string | null
          name: string
          subject: string | null
          body: string | null
          template_id: string | null
          type: string | null
          status: string | null
          recipient_filter: Json | null
          recipient_count: number | null
          recipient_segment_id: string | null
          recipient_list: string[] | null
          scheduled_at: string | null
          sent_at: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          listing_id?: string | null
          agent_id?: string | null
          name: string
          subject?: string | null
          body?: string | null
          template_id?: string | null
          type?: string | null
          status?: string | null
          recipient_filter?: Json | null
          recipient_count?: number | null
          recipient_segment_id?: string | null
          recipient_list?: string[] | null
          scheduled_at?: string | null
          sent_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          listing_id?: string | null
          agent_id?: string | null
          name?: string
          subject?: string | null
          body?: string | null
          template_id?: string | null
          type?: string | null
          status?: string | null
          recipient_filter?: Json | null
          recipient_count?: number | null
          recipient_segment_id?: string | null
          recipient_list?: string[] | null
          scheduled_at?: string | null
          sent_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      stories: {
        Row: {
          id: string
          user_id: string | null
          agent_id: string | null
          title: string | null
          story_type: string | null
          status: string | null
          content: Json | null
          guided_answers: Json | null
          media_urls: Json | null
          created_at: string | null
          updated_at: string | null
          published_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          agent_id?: string | null
          title?: string | null
          story_type?: string | null
          status?: string | null
          content?: Json | null
          guided_answers?: Json | null
          media_urls?: Json | null
          created_at?: string | null
          updated_at?: string | null
          published_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          agent_id?: string | null
          title?: string | null
          story_type?: string | null
          status?: string | null
          content?: Json | null
          guided_answers?: Json | null
          media_urls?: Json | null
          created_at?: string | null
          updated_at?: string | null
          published_at?: string | null
        }
        Relationships: []
      }
      brand_kits: {
        Row: {
          id: string
          agent_id: string | null
          name: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          font_family: string | null
          is_default: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          agent_id?: string | null
          name: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          font_family?: string | null
          is_default?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          agent_id?: string | null
          name?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          font_family?: string | null
          is_default?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      portal_settings: {
        Row: {
          id: string
          listing_id: string
          branding_enabled: boolean | null
          custom_domain: string | null
          password_protected: boolean | null
          password_hash: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          branding_enabled?: boolean | null
          custom_domain?: string | null
          password_protected?: boolean | null
          password_hash?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          branding_enabled?: boolean | null
          custom_domain?: string | null
          password_protected?: boolean | null
          password_hash?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      portal_activity_log: {
        Row: {
          id: string
          listing_id: string | null
          share_link_id: string | null
          staff_id: string | null
          action: string
          activity_type: string | null
          entity_type: string | null
          entity_id: string | null
          details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          listing_id?: string | null
          share_link_id?: string | null
          staff_id?: string | null
          action?: string
          activity_type?: string | null
          entity_type?: string | null
          entity_id?: string | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          listing_id?: string | null
          share_link_id?: string | null
          staff_id?: string | null
          action?: string
          activity_type?: string | null
          entity_type?: string | null
          entity_id?: string | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      company_pool: {
        Row: {
          id: string
          order_id: string
          listing_id: string | null
          pool_type: string
          amount_cents: number
          percent: number
          status: string | null
          allocated_to: string | null
          paid_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          listing_id?: string | null
          pool_type: string
          amount_cents: number
          percent: number
          status?: string | null
          allocated_to?: string | null
          paid_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          listing_id?: string | null
          pool_type?: string
          amount_cents?: number
          percent?: number
          status?: string | null
          allocated_to?: string | null
          paid_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      communities: {
        Row: {
          id: string
          slug: string
          name: string
          tagline: string | null
          description: string | null
          hero_image_url: string | null
          gallery_urls: string[] | null
          lat: number
          lng: number
          city: string | null
          state: string | null
          zip: string | null
          meta_title: string | null
          meta_description: string | null
          focus_keyword: string | null
          secondary_keywords: string[] | null
          overview_content: Json | null
          lifestyle_content: Json | null
          market_snapshot: Json | null
          schools_info: Json | null
          subdivisions: Json | null
          quick_facts: Json | null
          featured_agent_ids: string[] | null
          is_published: boolean | null
          published_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          slug: string
          name: string
          tagline?: string | null
          description?: string | null
          hero_image_url?: string | null
          gallery_urls?: string[] | null
          lat: number
          lng: number
          city?: string | null
          state?: string | null
          zip?: string | null
          meta_title?: string | null
          meta_description?: string | null
          focus_keyword?: string | null
          secondary_keywords?: string[] | null
          overview_content?: Json | null
          lifestyle_content?: Json | null
          market_snapshot?: Json | null
          schools_info?: Json | null
          subdivisions?: Json | null
          quick_facts?: Json | null
          featured_agent_ids?: string[] | null
          is_published?: boolean | null
          published_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          tagline?: string | null
          description?: string | null
          hero_image_url?: string | null
          gallery_urls?: string[] | null
          lat?: number
          lng?: number
          city?: string | null
          state?: string | null
          zip?: string | null
          meta_title?: string | null
          meta_description?: string | null
          focus_keyword?: string | null
          secondary_keywords?: string[] | null
          overview_content?: Json | null
          lifestyle_content?: Json | null
          market_snapshot?: Json | null
          schools_info?: Json | null
          subdivisions?: Json | null
          quick_facts?: Json | null
          featured_agent_ids?: string[] | null
          is_published?: boolean | null
          published_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      zapier_webhooks: {
        Row: {
          id: string
          agent_id: string | null
          event_type: string
          webhook_url: string
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          agent_id?: string | null
          event_type: string
          webhook_url: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          agent_id?: string | null
          event_type?: string
          webhook_url?: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      zapier_webhook_logs: {
        Row: {
          id: string
          webhook_id: string
          event_type: string
          payload: Json | null
          response_status: number | null
          response_body: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          webhook_id: string
          event_type: string
          payload?: Json | null
          response_status?: number | null
          response_body?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          webhook_id?: string
          event_type?: string
          payload?: Json | null
          response_status?: number | null
          response_body?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      delivery_notifications: {
        Row: {
          id: string
          listing_id: string
          agent_id: string | null
          recipient_type: string | null
          recipient_email: string | null
          recipient_phone: string | null
          notification_type: string
          template_key: string | null
          subject: string | null
          body: string | null
          status: string | null
          error_message: string | null
          retry_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          opened_at: string | null
          clicked_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          agent_id?: string | null
          recipient_type?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          notification_type: string
          template_key?: string | null
          subject?: string | null
          body?: string | null
          status?: string | null
          error_message?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          agent_id?: string | null
          recipient_type?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          notification_type?: string
          template_key?: string | null
          subject?: string | null
          body?: string | null
          status?: string | null
          error_message?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      client_messages: {
        Row: {
          id: string
          listing_id: string
          share_link_id: string | null
          sender_type: string
          sender_id: string | null
          sender_name: string | null
          sender_email: string | null
          content: string
          attachments: Json | null
          read_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          share_link_id?: string | null
          sender_type: string
          sender_id?: string | null
          sender_name?: string | null
          sender_email?: string | null
          content: string
          attachments?: Json | null
          read_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          share_link_id?: string | null
          sender_type?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_email?: string | null
          content?: string
          attachments?: Json | null
          read_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      instagram_connections: {
        Row: {
          id: string
          agent_id: string
          instagram_user_id: string
          access_token: string | null
          token_expires_at: string | null
          username: string | null
          status: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          instagram_user_id: string
          access_token?: string | null
          token_expires_at?: string | null
          username?: string | null
          status?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
          instagram_user_id?: string
          access_token?: string | null
          token_expires_at?: string | null
          username?: string | null
          status?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      seller_access_controls: {
        Row: {
          id: string
          listing_id: string
          share_link_id: string | null
          can_download: boolean | null
          can_share: boolean | null
          can_message: boolean | null
          can_reschedule: boolean | null
          media_access_enabled: boolean | null
          granted_at: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          share_link_id?: string | null
          can_download?: boolean | null
          can_share?: boolean | null
          can_message?: boolean | null
          can_reschedule?: boolean | null
          media_access_enabled?: boolean | null
          granted_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          share_link_id?: string | null
          can_download?: boolean | null
          can_share?: boolean | null
          can_message?: boolean | null
          can_reschedule?: boolean | null
          media_access_enabled?: boolean | null
          granted_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_routes: {
        Row: {
          id: string
          photographer_id: string
          staff_id: string | null
          route_date: string
          status: string | null
          total_stops: number | null
          total_distance_miles: number | null
          estimated_duration_minutes: number | null
          start_lat: number | null
          start_lng: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          photographer_id?: string
          staff_id?: string | null
          route_date: string
          status?: string | null
          total_stops?: number | null
          total_distance_miles?: number | null
          estimated_duration_minutes?: number | null
          start_lat?: number | null
          start_lng?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          photographer_id?: string
          staff_id?: string | null
          route_date?: string
          status?: string | null
          total_stops?: number | null
          total_distance_miles?: number | null
          estimated_duration_minutes?: number | null
          start_lat?: number | null
          start_lng?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      route_stops: {
        Row: {
          id: string
          route_id: string
          listing_id: string | null
          stop_order: number
          arrival_time: string | null
          departure_time: string | null
          status: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          route_id: string
          listing_id?: string | null
          stop_order: number
          arrival_time?: string | null
          departure_time?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          route_id?: string
          listing_id?: string | null
          stop_order?: number
          arrival_time?: string | null
          departure_time?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      drive_time_cache: {
        Row: {
          id: string
          origin_lat: number
          origin_lng: number
          destination_lat: number
          destination_lng: number
          duration_seconds: number
          distance_meters: number
          traffic_model: string | null
          calculated_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          origin_lat: number
          origin_lng: number
          destination_lat: number
          destination_lng: number
          duration_seconds: number
          distance_meters: number
          traffic_model?: string | null
          calculated_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          origin_lat?: number
          origin_lng?: number
          destination_lat?: number
          destination_lng?: number
          duration_seconds?: number
          distance_meters?: number
          traffic_model?: string | null
          calculated_at?: string | null
          expires_at?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          agent_id: string | null
          name: string
          email: string | null
          phone: string | null
          company: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          agent_id?: string | null
          name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          agent_id?: string | null
          name?: string
          email?: string | null
          phone?: string | null
          company?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payout_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          updated_by: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      processed_events: {
        Row: {
          event_id: string
          provider: string
          processed_at: string | null
          metadata: Json | null
        }
        Insert: {
          event_id: string
          provider: string
          processed_at?: string | null
          metadata?: Json | null
        }
        Update: {
          event_id?: string
          provider?: string
          processed_at?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      sellers: {
        Row: {
          id: string
          agent_id: string
          listing_id: string | null
          email: string
          name: string
          phone: string | null
          clerk_user_id: string | null
          access_level: string | null
          last_accessed_at: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          listing_id?: string | null
          email: string
          name: string
          phone?: string | null
          clerk_user_id?: string | null
          access_level?: string | null
          last_accessed_at?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
          listing_id?: string | null
          email?: string
          name?: string
          phone?: string | null
          clerk_user_id?: string | null
          access_level?: string | null
          last_accessed_at?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sellers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sellers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      agent_activity_summary: {
        Row: {
          active_listings: number | null
          agent_id: string | null
          email: string | null
          last_listing_at: string | null
          last_order_at: string | null
          name: string | null
          total_listings: number | null
          total_orders: number | null
          total_revenue_cents: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_reservations: { Args: never; Returns: number }
      cleanup_stale_photographer_locations: { Args: never; Returns: undefined }
      create_order_and_listing: {
        Args: {
          p_agent_id: string | null
          p_service_type: string
          p_package_key: string | null
          p_package_name: string | null
          p_sqft_tier: string | null
          p_services: string[]
          p_subtotal_cents: number
          p_discount_cents: number
          p_tax_cents: number
          p_total_cents: number
          p_property_address: string
          p_property_city: string | null
          p_property_state: string | null
          p_property_zip: string | null
          p_property_sqft: number | null
          p_property_beds: number | null
          p_property_baths: number | null
          p_contact_name: string | null
          p_contact_email: string | null
          p_contact_phone: string | null
          p_scheduled_at: string | null
          p_payment_intent_id: string | null
          p_payment_status: string | null
          p_special_instructions: string | null
        }
        Returns: {
          order: {
            id: string
            reference_code: string
            status: string
            total_cents: number
          }
          listing: {
            id: string
          }
        }
      }
      commit_reservation: {
        Args: { p_idempotency_key?: string; p_reservation_id: string }
        Returns: {
          error: string
          new_balance: number
          success: boolean
        }[]
      }
      earn_unified_credits: {
        Args: {
          p_amount: number
          p_description: string
          p_idempotency_key?: string
          p_reference_id?: string
          p_reference_type?: string
          p_source_platform: string
          p_transaction_type: string
          p_unified_user_id: string
        }
        Returns: {
          error: string
          new_balance: number
          success: boolean
        }[]
      }
      get_nearby_curated_items: {
        Args: { p_lat: number; p_lng: number; p_radius_miles?: number }
        Returns: {
          category: string | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          lat: number
          lng: number
          radius_miles: number | null
          source_url: string | null
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "curated_items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_or_create_unified_user: {
        Args: {
          p_asm_agent_id?: string
          p_email: string
          p_storywork_clerk_id?: string
          p_storywork_user_id?: string
        }
        Returns: string
      }
      release_reservation: {
        Args: { p_reservation_id: string }
        Returns: boolean
      }
      reserve_credits: {
        Args: {
          p_amount: number
          p_purpose: string
          p_reference_id?: string
          p_reference_type?: string
          p_unified_user_id: string
        }
        Returns: {
          error: string
          reservation_id: string
          success: boolean
        }[]
      }
      spend_unified_credits: {
        Args: {
          p_amount: number
          p_description: string
          p_idempotency_key?: string
          p_reference_id?: string
          p_reference_type?: string
          p_source_platform: string
          p_transaction_type: string
          p_unified_user_id: string
        }
        Returns: {
          error: string
          new_balance: number
          success: boolean
        }[]
      }
      sync_agent_auth_user_ids: { Args: never; Returns: undefined }
      sync_staff_auth_user_ids: { Args: never; Returns: undefined }
      update_photographer_location: {
        Args: {
          p_accuracy?: number
          p_eta_minutes?: number
          p_heading?: number
          p_latitude: number
          p_listing_id: string
          p_longitude: number
          p_speed?: number
          p_staff_id: string
          p_status?: string
        }
        Returns: {
          accuracy: number | null
          created_at: string | null
          eta_minutes: number | null
          heading: number | null
          id: string
          last_updated_at: string | null
          latitude: number
          listing_id: string | null
          longitude: number
          speed: number | null
          staff_id: string
          status: string | null
        }
        SetofOptions: {
          from: "*"
          to: "photographer_locations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

// ============================================================================
// Custom Types (not auto-generated from database)
// ============================================================================

// Integration status types for Cubicasa floor plans
export type IntegrationStatus =
  | 'pending'
  | 'ordered'
  | 'processing'
  | 'delivered'
  | 'failed'
  | 'not_applicable'
  | 'needs_manual'

// Zillow 3D tour status types
export type Zillow3DStatus =
  | 'pending'
  | 'scheduled'
  | 'scanned'
  | 'processing'
  | 'live'
  | 'failed'
  | 'not_applicable'

// Share link types
export type ShareLinkType = 'delivery' | 'schedule' | 'preview' | 'marketing'

// Share link insert type
export type ShareLinkInsert = Database['public']['Tables']['share_links']['Insert']

// Carousel slide type for ListingLaunch
export interface CarouselSlide {
  position: number
  headline: string
  body: string
  background_image_id?: string | null
  background_image_url?: string | null
  text_position: 'top_left' | 'top_center' | 'top_right' | 'center_left' | 'center' | 'center_right' | 'bottom_left' | 'bottom_center' | 'bottom_right'
  overlay_style: 'gradient_bottom' | 'gradient_top' | 'solid' | 'none'
}

// Generated question for ListingLaunch
export interface GeneratedQuestion {
  id: string
  question: string
  category?: string
  answer?: string
  context?: string
  suggestedFollowUp?: string
}

export interface CommunitySubdivision {
  name: string
  image_url?: string
  description?: string
  price_range?: string
  year_built?: string
  homes_count?: number
  home_styles?: string[]
}

export interface CommunityQuickFacts {
  population?: number
  founded?: string
  area_sqmi?: number
  median_age?: number
  median_income?: number
  total_homes?: number
  avg_commute?: number
  zip_codes?: string[]
  nearby_cities?: string[]
}

export interface CommunityMarketSnapshot {
  median_price?: number
  yoy_change?: number
  avg_dom?: number
  price_per_sqft?: number
  active_listings?: number
  sold_last_30?: number
  updated_at?: string
}

export interface CommunityOverviewBlock {
  type: 'heading' | 'paragraph' | 'list'
  content?: string
  items?: string[]
}

export interface CommunityOverviewContent {
  blocks?: CommunityOverviewBlock[]
  highlights?: string[]
}

export interface CommunitySchoolInfo {
  name: string
  type: 'elementary' | 'middle' | 'high' | 'private' | 'charter'
  rating?: number
  grades?: string
  enrollment?: number
  distance?: string
}

export interface CommunitySchoolsInfo {
  elementary?: CommunitySchoolInfo[]
  middle?: CommunitySchoolInfo[]
  high?: CommunitySchoolInfo[]
  private?: CommunitySchoolInfo[]
  charter?: CommunitySchoolInfo[]
}
