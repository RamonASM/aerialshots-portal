export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string
          email: string
          name: string
          slug: string
          phone: string | null
          bio: string | null
          headshot_url: string | null
          logo_url: string | null
          brand_color: string
          instagram_url: string | null
          aryeo_customer_id: string | null
          referral_code: string | null
          credit_balance: number
          lifetime_credits: number
          referral_tier: string
          referred_by_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          slug: string
          phone?: string | null
          bio?: string | null
          headshot_url?: string | null
          logo_url?: string | null
          brand_color?: string
          instagram_url?: string | null
          aryeo_customer_id?: string | null
          referral_code?: string | null
          credit_balance?: number
          lifetime_credits?: number
          referral_tier?: string
          referred_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          slug?: string
          phone?: string | null
          bio?: string | null
          headshot_url?: string | null
          logo_url?: string | null
          brand_color?: string
          instagram_url?: string | null
          aryeo_customer_id?: string | null
          referral_code?: string | null
          credit_balance?: number
          lifetime_credits?: number
          referral_tier?: string
          referred_by_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          id: string
          agent_id: string | null
          aryeo_listing_id: string | null
          aryeo_order_id: string | null
          address: string
          city: string | null
          state: string
          zip: string | null
          lat: number | null
          lng: number | null
          beds: number | null
          baths: number | null
          sqft: number | null
          price: number | null
          status: string
          sold_price: number | null
          sold_date: string | null
          dom: number | null
          template_id: string | null
          ops_status: string
          photographer_id: string | null
          scheduled_at: string | null
          delivered_at: string | null
          is_rush: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id?: string | null
          aryeo_listing_id?: string | null
          aryeo_order_id?: string | null
          address: string
          city?: string | null
          state?: string
          zip?: string | null
          lat?: number | null
          lng?: number | null
          beds?: number | null
          baths?: number | null
          sqft?: number | null
          price?: number | null
          status?: string
          sold_price?: number | null
          sold_date?: string | null
          dom?: number | null
          template_id?: string | null
          ops_status?: string
          photographer_id?: string | null
          scheduled_at?: string | null
          delivered_at?: string | null
          is_rush?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string | null
          aryeo_listing_id?: string | null
          aryeo_order_id?: string | null
          address?: string
          city?: string | null
          state?: string
          zip?: string | null
          lat?: number | null
          lng?: number | null
          beds?: number | null
          baths?: number | null
          sqft?: number | null
          price?: number | null
          status?: string
          sold_price?: number | null
          sold_date?: string | null
          dom?: number | null
          template_id?: string | null
          ops_status?: string
          photographer_id?: string | null
          scheduled_at?: string | null
          delivered_at?: string | null
          is_rush?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      media_assets: {
        Row: {
          id: string
          listing_id: string
          aryeo_url: string
          type: string
          category: string | null
          sort_order: number | null
          tip_text: string | null
          storage_path: string | null
          qc_status: string
          qc_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          aryeo_url: string
          type: string
          category?: string | null
          sort_order?: number | null
          tip_text?: string | null
          storage_path?: string | null
          qc_status?: string
          qc_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          aryeo_url?: string
          type?: string
          category?: string | null
          sort_order?: number | null
          tip_text?: string | null
          storage_path?: string | null
          qc_status?: string
          qc_notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          }
        ]
      }
      leads: {
        Row: {
          id: string
          listing_id: string | null
          agent_id: string | null
          name: string
          email: string | null
          phone: string | null
          message: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          listing_id?: string | null
          agent_id?: string | null
          name: string
          email?: string | null
          phone?: string | null
          message?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string | null
          agent_id?: string | null
          name?: string
          email?: string | null
          phone?: string | null
          message?: string | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_email: string
          referred_agent_id: string | null
          status: string
          order_type: string | null
          aryeo_order_id: string | null
          credits_awarded: number
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_email: string
          referred_agent_id?: string | null
          status?: string
          order_type?: string | null
          aryeo_order_id?: string | null
          credits_awarded?: number
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_email?: string
          referred_agent_id?: string | null
          status?: string
          order_type?: string | null
          aryeo_order_id?: string | null
          credits_awarded?: number
          created_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          id: string
          agent_id: string
          amount: number
          type: string
          description: string | null
          referral_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          amount: number
          type: string
          description?: string | null
          referral_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          amount?: number
          type?: string
          description?: string | null
          referral_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          id: string
          agent_id: string
          reward_type: string
          reward_id: string
          credits_cost: number
          aryeo_coupon_id: string | null
          status: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          reward_type: string
          reward_id: string
          credits_cost: number
          aryeo_coupon_id?: string | null
          status?: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          reward_type?: string
          reward_id?: string
          credits_cost?: number
          aryeo_coupon_id?: string | null
          status?: string
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          id: string
          aryeo_event_id: string
          event_type: string
          payload: Json
          status: string
          retry_count: number
          processed_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          aryeo_event_id: string
          event_type: string
          payload: Json
          status?: string
          retry_count?: number
          processed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          aryeo_event_id?: string
          event_type?: string
          payload?: Json
          status?: string
          retry_count?: number
          processed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      care_tasks: {
        Row: {
          id: string
          agent_id: string | null
          listing_id: string | null
          assigned_to: string | null
          task_type: string
          status: string
          priority: number
          due_at: string | null
          completed_at: string | null
          outcome: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id?: string | null
          listing_id?: string | null
          assigned_to?: string | null
          task_type: string
          status?: string
          priority?: number
          due_at?: string | null
          completed_at?: string | null
          outcome?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string | null
          listing_id?: string | null
          assigned_to?: string | null
          task_type?: string
          status?: string
          priority?: number
          due_at?: string | null
          completed_at?: string | null
          outcome?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      curated_items: {
        Row: {
          id: string
          title: string
          description: string | null
          source_url: string | null
          category: string
          lat: number
          lng: number
          radius_miles: number
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          source_url?: string | null
          category: string
          lat: number
          lng: number
          radius_miles?: number
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          source_url?: string | null
          category?: string
          lat?: number
          lng?: number
          radius_miles?: number
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          id: string
          name: string
          preview_url: string | null
          config_json: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          preview_url?: string | null
          config_json?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          preview_url?: string | null
          config_json?: Record<string, unknown>
          created_at?: string
        }
        Relationships: []
      }
      agent_tips: {
        Row: {
          id: string
          agent_id: string
          listing_id: string | null
          tip_text: string
          category: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          listing_id?: string | null
          tip_text: string
          category?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          listing_id?: string | null
          tip_text?: string
          category?: string | null
          created_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          phone: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: string
          phone?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string
          phone?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      communications: {
        Row: {
          id: string
          agent_id: string | null
          listing_id: string | null
          channel: string
          direction: string
          to_address: string | null
          body: string | null
          template_key: string | null
          status: string
          external_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id?: string | null
          listing_id?: string | null
          channel: string
          direction: string
          to_address?: string | null
          body?: string | null
          template_key?: string | null
          status?: string
          external_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string | null
          listing_id?: string | null
          channel?: string
          direction?: string
          to_address?: string | null
          body?: string | null
          template_key?: string | null
          status?: string
          external_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      job_events: {
        Row: {
          id: string
          listing_id: string
          event_type: string
          old_value: Record<string, unknown> | null
          new_value: Record<string, unknown> | null
          actor_id: string | null
          actor_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          event_type: string
          old_value?: Record<string, unknown> | null
          new_value?: Record<string, unknown> | null
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          event_type?: string
          old_value?: Record<string, unknown> | null
          new_value?: Record<string, unknown> | null
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
        }
        Relationships: []
      }
      ai_tool_usage: {
        Row: {
          id: string
          agent_id: string
          listing_id: string | null
          tool_type: string
          input: Record<string, unknown>
          output: Record<string, unknown>
          tokens_used: number | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          listing_id?: string | null
          tool_type: string
          input: Record<string, unknown>
          output: Record<string, unknown>
          tokens_used?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          listing_id?: string | null
          tool_type?: string
          input?: Record<string, unknown>
          output?: Record<string, unknown>
          tokens_used?: number | null
          created_at?: string
        }
        Relationships: []
      }
      brand_kits: {
        Row: {
          id: string
          agent_id: string
          name: string
          logo_url: string | null
          headshot_url: string | null
          primary_color: string
          secondary_color: string | null
          font_family: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          name: string
          logo_url?: string | null
          headshot_url?: string | null
          primary_color?: string
          secondary_color?: string | null
          font_family?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          name?: string
          logo_url?: string | null
          headshot_url?: string | null
          primary_color?: string
          secondary_color?: string | null
          font_family?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          id: string
          agent_id: string
          listing_id: string | null
          brand_kit_id: string | null
          title: string
          story_type: string
          status: string
          input_type: string
          raw_input: string | null
          transcription: string | null
          detected_type: string | null
          guided_answers: Record<string, unknown> | null
          generated_content: Record<string, unknown> | null
          credits_used: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          listing_id?: string | null
          brand_kit_id?: string | null
          title: string
          story_type?: string
          status?: string
          input_type: string
          raw_input?: string | null
          transcription?: string | null
          detected_type?: string | null
          guided_answers?: Record<string, unknown> | null
          generated_content?: Record<string, unknown> | null
          credits_used?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          listing_id?: string | null
          brand_kit_id?: string | null
          title?: string
          story_type?: string
          status?: string
          input_type?: string
          raw_input?: string | null
          transcription?: string | null
          detected_type?: string | null
          guided_answers?: Record<string, unknown> | null
          generated_content?: Record<string, unknown> | null
          credits_used?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      carousels: {
        Row: {
          id: string
          story_id: string
          agent_id: string
          status: string
          slides: Record<string, unknown>[]
          bannerbear_uid: string | null
          image_urls: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          story_id: string
          agent_id: string
          status?: string
          slides: Record<string, unknown>[]
          bannerbear_uid?: string | null
          image_urls?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          story_id?: string
          agent_id?: string
          status?: string
          slides?: Record<string, unknown>[]
          bannerbear_uid?: string | null
          image_urls?: string[] | null
          created_at?: string
          updated_at?: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
