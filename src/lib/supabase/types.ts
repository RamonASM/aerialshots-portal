export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ListingLaunch Types
export interface CarouselSlide {
  position: number
  headline: string
  body: string
  background_image_id?: string | null
  background_image_url?: string | null
  text_position?: 'bottom_left' | 'bottom_center' | 'top_left' | 'center'
  overlay_style?: 'gradient_bottom' | 'gradient_top' | 'solid_bar' | 'minimal'
}

export interface NeighborhoodResearchData {
  dining?: PlaceResult[]
  shopping?: PlaceResult[]
  fitness?: PlaceResult[]
  entertainment?: PlaceResult[]
  services?: PlaceResult[]
  education?: PlaceResult[]
  walkScore?: number
  transitScore?: number
  bikeScore?: number
  events?: EventResult[]
  curatedItems?: CuratedItemResult[]
  researchedAt?: string
}

export interface PlaceResult {
  place_id: string
  name: string
  vicinity: string
  rating?: number
  user_ratings_total?: number
  types: string[]
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  opening_hours?: {
    open_now: boolean
  }
  price_level?: number
  distance?: number
}

export interface EventResult {
  id: string
  name: string
  url: string | null
  imageUrl: string | null
  date: string
  time: string | null
  venue: string
  city: string
  category: string
  genre: string | null
  priceRange: string | null
  distance: number | null
}

export interface CuratedItemResult {
  id: string
  title: string
  description: string | null
  sourceUrl: string | null
  category: string
}

// Community Page Types
export interface CommunityOverviewContent {
  blocks?: Array<{
    type: 'paragraph' | 'heading' | 'list'
    content: string
    items?: string[]
  }>
  highlights?: string[]
}

export interface CommunityLifestyleContent {
  description?: string
  amenities?: string[]
  nearbyAttractions?: Array<{
    name: string
    distance: string
    description?: string
  }>
}

export interface CommunityMarketSnapshot {
  median_price?: number
  avg_dom?: number
  yoy_change?: number
  active_listings?: number
  sold_last_30?: number
  price_per_sqft?: number
  updated_at?: string
}

export interface CommunitySchoolInfo {
  name: string
  type: 'elementary' | 'middle' | 'high' | 'private' | 'charter'
  rating?: number
  distance?: string
  enrollment?: number
  grades?: string
}

export interface CommunitySchoolsInfo {
  elementary?: CommunitySchoolInfo[]
  middle?: CommunitySchoolInfo[]
  high?: CommunitySchoolInfo[]
  private?: CommunitySchoolInfo[]
}

export interface CommunitySubdivision {
  name: string
  description?: string
  price_range?: string
  homes_count?: number
  year_built?: string
  home_styles?: string[]
  image_url?: string
}

export interface CommunityQuickFacts {
  population?: number
  founded?: number
  avg_commute?: number
  median_income?: number
  area_sqmi?: number
  zip_codes?: string[]
  nearby_cities?: string[]
}

export interface GeneratedQuestion {
  id: string
  question: string
  context?: string
  suggestedFollowUp?: string
  category?: string
}

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
          // Integration tracking (enterprise upgrade)
          fotello_job_id: string | null
          fotello_status: IntegrationStatus
          cubicasa_order_id: string | null
          cubicasa_status: IntegrationStatus
          zillow_3d_id: string | null
          zillow_3d_status: Zillow3DStatus
          integration_error_message: string | null
          last_integration_check: string | null
          // SLA tracking
          expected_completion: string | null
          sla_status: SLAStatus
          stage_entered_at: string | null
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
          // Integration tracking
          fotello_job_id?: string | null
          fotello_status?: IntegrationStatus
          cubicasa_order_id?: string | null
          cubicasa_status?: IntegrationStatus
          zillow_3d_id?: string | null
          zillow_3d_status?: Zillow3DStatus
          integration_error_message?: string | null
          last_integration_check?: string | null
          // SLA tracking
          expected_completion?: string | null
          sla_status?: SLAStatus
          stage_entered_at?: string | null
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
          // Integration tracking
          fotello_job_id?: string | null
          fotello_status?: IntegrationStatus
          cubicasa_order_id?: string | null
          cubicasa_status?: IntegrationStatus
          zillow_3d_id?: string | null
          zillow_3d_status?: Zillow3DStatus
          integration_error_message?: string | null
          last_integration_check?: string | null
          // SLA tracking
          expected_completion?: string | null
          sla_status?: SLAStatus
          stage_entered_at?: string | null
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
          // FoundDR integration columns
          processing_job_id: string | null
          processed_storage_path: string | null
          approved_storage_path: string | null
          edit_history: Json
          qc_assigned_to: string | null
          needs_editing: boolean
          original_filename: string | null
          file_size_bytes: number | null
          image_width: number | null
          image_height: number | null
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
          // FoundDR integration columns
          processing_job_id?: string | null
          processed_storage_path?: string | null
          approved_storage_path?: string | null
          edit_history?: Json
          qc_assigned_to?: string | null
          needs_editing?: boolean
          original_filename?: string | null
          file_size_bytes?: number | null
          image_width?: number | null
          image_height?: number | null
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
          // FoundDR integration columns
          processing_job_id?: string | null
          processed_storage_path?: string | null
          approved_storage_path?: string | null
          edit_history?: Json
          qc_assigned_to?: string | null
          needs_editing?: boolean
          original_filename?: string | null
          file_size_bytes?: number | null
          image_width?: number | null
          image_height?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_processing_job_id_fkey"
            columns: ["processing_job_id"]
            referencedRelation: "processing_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_qc_assigned_to_fkey"
            columns: ["qc_assigned_to"]
            referencedRelation: "staff"
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
          team_role: 'photographer' | 'videographer' | 'editor' | 'qc_specialist' | 'scheduler' | 'admin' | null
          phone: string | null
          is_active: boolean
          created_at: string
          // Smart assignment (enterprise upgrade)
          skills: string[]
          home_lat: number | null
          home_lng: number | null
          max_daily_jobs: number
          certifications: string[]
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: string
          team_role?: 'photographer' | 'videographer' | 'editor' | 'qc_specialist' | 'scheduler' | 'admin' | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          // Smart assignment
          skills?: string[]
          home_lat?: number | null
          home_lng?: number | null
          max_daily_jobs?: number
          certifications?: string[]
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string
          team_role?: 'photographer' | 'videographer' | 'editor' | 'qc_specialist' | 'scheduler' | 'admin' | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          // Smart assignment
          skills?: string[]
          home_lat?: number | null
          home_lng?: number | null
          max_daily_jobs?: number
          certifications?: string[]
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
      listing_campaigns: {
        Row: {
          id: string
          listing_id: string | null
          agent_id: string
          name: string | null
          status: 'draft' | 'researching' | 'questions' | 'generating' | 'completed' | 'published'
          neighborhood_data: Record<string, unknown> | null
          generated_questions: Record<string, unknown> | null
          agent_answers: Record<string, unknown> | null
          carousel_types: string[] | null
          blog_post_content: Record<string, unknown> | null
          credits_used: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id?: string | null
          agent_id: string
          name?: string | null
          status?: 'draft' | 'researching' | 'questions' | 'generating' | 'completed' | 'published'
          neighborhood_data?: Record<string, unknown> | null
          generated_questions?: Record<string, unknown> | null
          agent_answers?: Record<string, unknown> | null
          carousel_types?: string[] | null
          blog_post_content?: Record<string, unknown> | null
          credits_used?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string | null
          agent_id?: string
          name?: string | null
          status?: 'draft' | 'researching' | 'questions' | 'generating' | 'completed' | 'published'
          neighborhood_data?: Record<string, unknown> | null
          generated_questions?: Record<string, unknown> | null
          agent_answers?: Record<string, unknown> | null
          carousel_types?: string[] | null
          blog_post_content?: Record<string, unknown> | null
          credits_used?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_campaigns_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_campaigns_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      listing_carousels: {
        Row: {
          id: string
          campaign_id: string
          carousel_type: 'property_highlights' | 'neighborhood_guide' | 'local_favorites' | 'schools_families' | 'lifestyle' | 'market_update' | 'open_house'
          title: string | null
          slides: CarouselSlide[]
          caption: string | null
          hashtags: string[] | null
          bannerbear_collection_uid: string | null
          rendered_image_urls: string[] | null
          render_status: 'pending' | 'rendering' | 'completed' | 'failed'
          created_at: string
          rendered_at: string | null
        }
        Insert: {
          id?: string
          campaign_id: string
          carousel_type: 'property_highlights' | 'neighborhood_guide' | 'local_favorites' | 'schools_families' | 'lifestyle' | 'market_update' | 'open_house'
          title?: string | null
          slides: CarouselSlide[]
          caption?: string | null
          hashtags?: string[] | null
          bannerbear_collection_uid?: string | null
          rendered_image_urls?: string[] | null
          render_status?: 'pending' | 'rendering' | 'completed' | 'failed'
          created_at?: string
          rendered_at?: string | null
        }
        Update: {
          id?: string
          campaign_id?: string
          carousel_type?: 'property_highlights' | 'neighborhood_guide' | 'local_favorites' | 'schools_families' | 'lifestyle' | 'market_update' | 'open_house'
          title?: string | null
          slides?: CarouselSlide[]
          caption?: string | null
          hashtags?: string[] | null
          bannerbear_collection_uid?: string | null
          rendered_image_urls?: string[] | null
          render_status?: 'pending' | 'rendering' | 'completed' | 'failed'
          created_at?: string
          rendered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_carousels_campaign_id_fkey"
            columns: ["campaign_id"]
            referencedRelation: "listing_campaigns"
            referencedColumns: ["id"]
          }
        ]
      }
      listing_blog_posts: {
        Row: {
          id: string
          campaign_id: string
          listing_id: string | null
          title: string | null
          slug: string | null
          meta_description: string | null
          content: string | null
          focus_keyword: string | null
          secondary_keywords: string[] | null
          status: 'draft' | 'published'
          created_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          campaign_id: string
          listing_id?: string | null
          title?: string | null
          slug?: string | null
          meta_description?: string | null
          content?: string | null
          focus_keyword?: string | null
          secondary_keywords?: string[] | null
          status?: 'draft' | 'published'
          created_at?: string
          published_at?: string | null
        }
        Update: {
          id?: string
          campaign_id?: string
          listing_id?: string | null
          title?: string | null
          slug?: string | null
          meta_description?: string | null
          content?: string | null
          focus_keyword?: string | null
          secondary_keywords?: string[] | null
          status?: 'draft' | 'published'
          created_at?: string
          published_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_blog_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            referencedRelation: "listing_campaigns"
            referencedColumns: ["id"]
          }
        ]
      }
      instagram_connections: {
        Row: {
          id: string
          agent_id: string
          instagram_user_id: string
          instagram_username: string
          account_type: 'personal' | 'business' | 'creator' | null
          access_token_encrypted: string | null
          token_expires_at: string | null
          facebook_page_id: string | null
          facebook_page_name: string | null
          status: 'active' | 'expired' | 'revoked' | 'pending'
          permissions_granted: string[] | null
          profile_picture_url: string | null
          followers_count: number | null
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          instagram_user_id: string
          instagram_username: string
          account_type?: 'personal' | 'business' | 'creator' | null
          access_token_encrypted?: string | null
          token_expires_at?: string | null
          facebook_page_id?: string | null
          facebook_page_name?: string | null
          status?: 'active' | 'expired' | 'revoked' | 'pending'
          permissions_granted?: string[] | null
          profile_picture_url?: string | null
          followers_count?: number | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          instagram_user_id?: string
          instagram_username?: string
          account_type?: 'personal' | 'business' | 'creator' | null
          access_token_encrypted?: string | null
          token_expires_at?: string | null
          facebook_page_id?: string | null
          facebook_page_name?: string | null
          status?: 'active' | 'expired' | 'revoked' | 'pending'
          permissions_granted?: string[] | null
          profile_picture_url?: string | null
          followers_count?: number | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_connections_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      instagram_scheduled_posts: {
        Row: {
          id: string
          agent_id: string
          connection_id: string | null
          carousel_id: string | null
          media_urls: string[]
          caption: string
          hashtags: string[] | null
          scheduled_for: string
          timezone: string
          status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled'
          instagram_media_id: string | null
          instagram_permalink: string | null
          published_at: string | null
          error_message: string | null
          retry_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          connection_id?: string | null
          carousel_id?: string | null
          media_urls: string[]
          caption: string
          hashtags?: string[] | null
          scheduled_for: string
          timezone?: string
          status?: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled'
          instagram_media_id?: string | null
          instagram_permalink?: string | null
          published_at?: string | null
          error_message?: string | null
          retry_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          connection_id?: string | null
          carousel_id?: string | null
          media_urls?: string[]
          caption?: string
          hashtags?: string[] | null
          scheduled_for?: string
          timezone?: string
          status?: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled'
          instagram_media_id?: string | null
          instagram_permalink?: string | null
          published_at?: string | null
          error_message?: string | null
          retry_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_scheduled_posts_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_scheduled_posts_connection_id_fkey"
            columns: ["connection_id"]
            referencedRelation: "instagram_connections"
            referencedColumns: ["id"]
          }
        ]
      }
      instagram_embed_cache: {
        Row: {
          id: string
          agent_id: string
          instagram_url: string
          instagram_post_id: string | null
          embed_html: string
          thumbnail_url: string | null
          author_name: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          instagram_url: string
          instagram_post_id?: string | null
          embed_html: string
          thumbnail_url?: string | null
          author_name?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          instagram_url?: string
          instagram_post_id?: string | null
          embed_html?: string
          thumbnail_url?: string | null
          author_name?: string | null
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_embed_cache_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      carousel_types: {
        Row: {
          id: string
          name: string
          description: string | null
          slide_count: number
          prompt_template: string | null
          bannerbear_template_id: string | null
          is_active: boolean
          sort_order: number
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          slide_count?: number
          prompt_template?: string | null
          bannerbear_template_id?: string | null
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          slide_count?: number
          prompt_template?: string | null
          bannerbear_template_id?: string | null
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      ai_agents: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          category: 'operations' | 'content' | 'development' | 'lifestyle'
          is_active: boolean
          execution_mode: 'sync' | 'async' | 'scheduled'
          system_prompt: string | null
          config: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          category: 'operations' | 'content' | 'development' | 'lifestyle'
          is_active?: boolean
          execution_mode?: 'sync' | 'async' | 'scheduled'
          system_prompt?: string | null
          config?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          category?: 'operations' | 'content' | 'development' | 'lifestyle'
          is_active?: boolean
          execution_mode?: 'sync' | 'async' | 'scheduled'
          system_prompt?: string | null
          config?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_agent_executions: {
        Row: {
          id: string
          agent_slug: string
          triggered_by: string | null
          listing_id: string | null
          campaign_id: string | null
          status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          trigger_source: string | null
          input: Record<string, unknown>
          output: Record<string, unknown> | null
          error_message: string | null
          tokens_used: number
          duration_ms: number | null
          metadata: Record<string, unknown>
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          agent_slug: string
          triggered_by?: string | null
          listing_id?: string | null
          campaign_id?: string | null
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          trigger_source?: string | null
          input?: Record<string, unknown>
          output?: Record<string, unknown> | null
          error_message?: string | null
          tokens_used?: number
          duration_ms?: number | null
          metadata?: Record<string, unknown>
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          agent_slug?: string
          triggered_by?: string | null
          listing_id?: string | null
          campaign_id?: string | null
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          trigger_source?: string | null
          input?: Record<string, unknown>
          output?: Record<string, unknown> | null
          error_message?: string | null
          tokens_used?: number
          duration_ms?: number | null
          metadata?: Record<string, unknown>
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_executions_agent_slug_fkey"
            columns: ["agent_slug"]
            referencedRelation: "ai_agents"
            referencedColumns: ["slug"]
          }
        ]
      }
      ai_agent_workflows: {
        Row: {
          id: string
          name: string
          trigger_event: string
          status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
          listing_id: string | null
          campaign_id: string | null
          current_step: number
          steps: Record<string, unknown>[]
          context: Record<string, unknown>
          error_message: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          name: string
          trigger_event: string
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
          listing_id?: string | null
          campaign_id?: string | null
          current_step?: number
          steps?: Record<string, unknown>[]
          context?: Record<string, unknown>
          error_message?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          trigger_event?: string
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
          listing_id?: string | null
          campaign_id?: string | null
          current_step?: number
          steps?: Record<string, unknown>[]
          context?: Record<string, unknown>
          error_message?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
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
          gallery_urls: string[]
          lat: number
          lng: number
          city: string | null
          state: string
          zip: string | null
          meta_title: string | null
          meta_description: string | null
          focus_keyword: string | null
          secondary_keywords: string[]
          overview_content: CommunityOverviewContent | null
          lifestyle_content: CommunityLifestyleContent | null
          market_snapshot: CommunityMarketSnapshot | null
          schools_info: CommunitySchoolsInfo | null
          subdivisions: CommunitySubdivision[]
          quick_facts: CommunityQuickFacts | null
          featured_agent_ids: string[]
          is_published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          tagline?: string | null
          description?: string | null
          hero_image_url?: string | null
          gallery_urls?: string[]
          lat: number
          lng: number
          city?: string | null
          state?: string
          zip?: string | null
          meta_title?: string | null
          meta_description?: string | null
          focus_keyword?: string | null
          secondary_keywords?: string[]
          overview_content?: CommunityOverviewContent | null
          lifestyle_content?: CommunityLifestyleContent | null
          market_snapshot?: CommunityMarketSnapshot | null
          schools_info?: CommunitySchoolsInfo | null
          subdivisions?: CommunitySubdivision[]
          quick_facts?: CommunityQuickFacts | null
          featured_agent_ids?: string[]
          is_published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          tagline?: string | null
          description?: string | null
          hero_image_url?: string | null
          gallery_urls?: string[]
          lat?: number
          lng?: number
          city?: string | null
          state?: string
          zip?: string | null
          meta_title?: string | null
          meta_description?: string | null
          focus_keyword?: string | null
          secondary_keywords?: string[]
          overview_content?: CommunityOverviewContent | null
          lifestyle_content?: CommunityLifestyleContent | null
          market_snapshot?: CommunityMarketSnapshot | null
          schools_info?: CommunitySchoolsInfo | null
          subdivisions?: CommunitySubdivision[]
          quick_facts?: CommunityQuickFacts | null
          featured_agent_ids?: string[]
          is_published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          agent_id: string | null
          listing_id: string | null
          service_type: 'listing' | 'retainer'
          package_key: string
          package_name: string
          sqft_tier: string | null
          services: Record<string, unknown>[]
          subtotal_cents: number
          discount_cents: number
          tax_cents: number
          total_cents: number
          property_address: string | null
          property_city: string | null
          property_state: string
          property_zip: string | null
          property_sqft: number | null
          property_beds: number | null
          property_baths: number | null
          contact_name: string
          contact_email: string
          contact_phone: string | null
          scheduled_at: string | null
          scheduled_duration_minutes: number | null
          status: OrderStatus
          payment_intent_id: string | null
          payment_status: PaymentStatus
          paid_at: string | null
          retainer_start_date: string | null
          retainer_months: number | null
          special_instructions: string | null
          internal_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id?: string | null
          listing_id?: string | null
          service_type: 'listing' | 'retainer'
          package_key: string
          package_name: string
          sqft_tier?: string | null
          services?: Record<string, unknown>[]
          subtotal_cents: number
          discount_cents?: number
          tax_cents?: number
          total_cents: number
          property_address?: string | null
          property_city?: string | null
          property_state?: string
          property_zip?: string | null
          property_sqft?: number | null
          property_beds?: number | null
          property_baths?: number | null
          contact_name: string
          contact_email: string
          contact_phone?: string | null
          scheduled_at?: string | null
          scheduled_duration_minutes?: number | null
          status?: OrderStatus
          payment_intent_id?: string | null
          payment_status?: PaymentStatus
          paid_at?: string | null
          retainer_start_date?: string | null
          retainer_months?: number | null
          special_instructions?: string | null
          internal_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string | null
          listing_id?: string | null
          service_type?: 'listing' | 'retainer'
          package_key?: string
          package_name?: string
          sqft_tier?: string | null
          services?: Record<string, unknown>[]
          subtotal_cents?: number
          discount_cents?: number
          tax_cents?: number
          total_cents?: number
          property_address?: string | null
          property_city?: string | null
          property_state?: string
          property_zip?: string | null
          property_sqft?: number | null
          property_beds?: number | null
          property_baths?: number | null
          contact_name?: string
          contact_email?: string
          contact_phone?: string | null
          scheduled_at?: string | null
          scheduled_duration_minutes?: number | null
          status?: OrderStatus
          payment_intent_id?: string | null
          payment_status?: PaymentStatus
          paid_at?: string | null
          retainer_start_date?: string | null
          retainer_months?: number | null
          special_instructions?: string | null
          internal_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          }
        ]
      }
      order_status_history: {
        Row: {
          id: string
          order_id: string
          previous_status: string | null
          new_status: string
          changed_by: string | null
          changed_by_type: 'staff' | 'agent' | 'system' | 'stripe' | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          previous_status?: string | null
          new_status: string
          changed_by?: string | null
          changed_by_type?: 'staff' | 'agent' | 'system' | 'stripe' | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          previous_status?: string | null
          new_status?: string
          changed_by?: string | null
          changed_by_type?: 'staff' | 'agent' | 'system' | 'stripe' | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      api_keys: {
        Row: {
          id: string
          user_id: string | null
          key_hash: string
          key_prefix: string
          name: string | null
          tier: 'free' | 'pro' | 'business' | 'enterprise'
          monthly_limit: number
          is_active: boolean
          created_at: string
          last_used_at: string | null
          usage_count: number
        }
        Insert: {
          id?: string
          user_id?: string | null
          key_hash: string
          key_prefix: string
          name?: string | null
          tier?: 'free' | 'pro' | 'business' | 'enterprise'
          monthly_limit?: number
          is_active?: boolean
          created_at?: string
          last_used_at?: string | null
          usage_count?: number
        }
        Update: {
          id?: string
          user_id?: string | null
          key_hash?: string
          key_prefix?: string
          name?: string | null
          tier?: 'free' | 'pro' | 'business' | 'enterprise'
          monthly_limit?: number
          is_active?: boolean
          created_at?: string
          last_used_at?: string | null
          usage_count?: number
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          id: string
          api_key_id: string
          endpoint: string
          method: string
          status_code: number | null
          response_time_ms: number | null
          cached: boolean
          created_at: string
        }
        Insert: {
          id?: string
          api_key_id: string
          endpoint: string
          method?: string
          status_code?: number | null
          response_time_ms?: number | null
          cached?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          api_key_id?: string
          endpoint?: string
          method?: string
          status_code?: number | null
          response_time_ms?: number | null
          cached?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_api_key_id_fkey"
            columns: ["api_key_id"]
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          }
        ]
      }
      // ============================================
      // ENTERPRISE UPGRADE TABLES
      // ============================================
      share_links: {
        Row: {
          id: string
          listing_id: string
          agent_id: string | null
          client_email: string | null
          client_name: string | null
          share_token: string
          link_type: ShareLinkType
          expires_at: string | null
          access_count: number
          last_accessed_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          agent_id?: string | null
          client_email?: string | null
          client_name?: string | null
          share_token: string
          link_type?: ShareLinkType
          expires_at?: string | null
          access_count?: number
          last_accessed_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          agent_id?: string | null
          client_email?: string | null
          client_name?: string | null
          share_token?: string
          link_type?: ShareLinkType
          expires_at?: string | null
          access_count?: number
          last_accessed_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
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
          available_slots: AvailableSlot[]
          selected_slot: SelectedSlot | null
          status: SellerScheduleStatus
          notes: string | null
          submitted_at: string | null
          confirmed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          share_link_id?: string | null
          seller_name?: string | null
          seller_email?: string | null
          seller_phone?: string | null
          available_slots?: AvailableSlot[]
          selected_slot?: SelectedSlot | null
          status?: SellerScheduleStatus
          notes?: string | null
          submitted_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          share_link_id?: string | null
          seller_name?: string | null
          seller_email?: string | null
          seller_phone?: string | null
          available_slots?: AvailableSlot[]
          selected_slot?: SelectedSlot | null
          status?: SellerScheduleStatus
          notes?: string | null
          submitted_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_schedules_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_schedules_share_link_id_fkey"
            columns: ["share_link_id"]
            referencedRelation: "share_links"
            referencedColumns: ["id"]
          }
        ]
      }
      client_messages: {
        Row: {
          id: string
          listing_id: string
          share_link_id: string | null
          sender_type: ClientMessageSenderType
          sender_id: string | null
          sender_name: string | null
          sender_email: string | null
          content: string
          attachments: Json
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          share_link_id?: string | null
          sender_type: ClientMessageSenderType
          sender_id?: string | null
          sender_name?: string | null
          sender_email?: string | null
          content: string
          attachments?: Json
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          share_link_id?: string | null
          sender_type?: ClientMessageSenderType
          sender_id?: string | null
          sender_name?: string | null
          sender_email?: string | null
          content?: string
          attachments?: Json
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_messages_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_messages_share_link_id_fkey"
            columns: ["share_link_id"]
            referencedRelation: "share_links"
            referencedColumns: ["id"]
          }
        ]
      }
      client_feedback: {
        Row: {
          id: string
          listing_id: string
          share_link_id: string | null
          agent_id: string | null
          rating: number
          feedback_text: string | null
          category: string | null
          submitted_by_email: string | null
          submitted_by_name: string | null
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          share_link_id?: string | null
          agent_id?: string | null
          rating: number
          feedback_text?: string | null
          category?: string | null
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          share_link_id?: string | null
          agent_id?: string | null
          rating?: number
          feedback_text?: string | null
          category?: string | null
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          is_public?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_feedback_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      portal_settings: {
        Row: {
          id: string
          agent_id: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          font_family: string
          custom_css: string | null
          welcome_message: string | null
          footer_text: string | null
          show_powered_by: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          font_family?: string
          custom_css?: string | null
          welcome_message?: string | null
          footer_text?: string | null
          show_powered_by?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          font_family?: string
          custom_css?: string | null
          welcome_message?: string | null
          footer_text?: string | null
          show_powered_by?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_settings_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      ops_activity_log: {
        Row: {
          id: string
          listing_id: string
          actor_id: string
          actor_type: string
          action: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          actor_id: string
          actor_type?: string
          action: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          actor_id?: string
          actor_type?: string
          action?: string
          details?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          id: string
          listing_id: string | null
          order_id: string | null
          recipient_type: NotificationRecipientType
          recipient_id: string | null
          recipient_email: string | null
          recipient_phone: string | null
          notification_type: string
          channel: NotificationChannel
          subject: string | null
          content: string | null
          template_id: string | null
          status: NotificationStatus
          sent_at: string | null
          delivered_at: string | null
          opened_at: string | null
          error_message: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          listing_id?: string | null
          order_id?: string | null
          recipient_type: NotificationRecipientType
          recipient_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          notification_type: string
          channel: NotificationChannel
          subject?: string | null
          content?: string | null
          template_id?: string | null
          status?: NotificationStatus
          sent_at?: string | null
          delivered_at?: string | null
          opened_at?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string | null
          order_id?: string | null
          recipient_type?: NotificationRecipientType
          recipient_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          notification_type?: string
          channel?: NotificationChannel
          subject?: string | null
          content?: string | null
          template_id?: string | null
          status?: NotificationStatus
          sent_at?: string | null
          delivered_at?: string | null
          opened_at?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      email_templates: {
        Row: {
          id: string
          name: string
          slug: string
          subject: string
          body_html: string
          body_text: string | null
          category: EmailTemplateCategory
          variables: Json
          conditions: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          subject: string
          body_html: string
          body_text?: string | null
          category?: EmailTemplateCategory
          variables?: Json
          conditions?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          subject?: string
          body_html?: string
          body_text?: string | null
          category?: EmailTemplateCategory
          variables?: Json
          conditions?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      photographer_specialties: {
        Row: {
          id: string
          photographer_id: string
          specialty: PhotographerSpecialty
          proficiency_level: ProficiencyLevel
          certification_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          photographer_id: string
          specialty: PhotographerSpecialty
          proficiency_level?: ProficiencyLevel
          certification_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          photographer_id?: string
          specialty?: PhotographerSpecialty
          proficiency_level?: ProficiencyLevel
          certification_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photographer_specialties_photographer_id_fkey"
            columns: ["photographer_id"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          }
        ]
      }
      job_time_logs: {
        Row: {
          id: string
          photographer_assignment_id: string | null
          listing_id: string | null
          event_type: JobTimeEventType
          event_time: string
          gps_lat: number | null
          gps_lng: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          photographer_assignment_id?: string | null
          listing_id?: string | null
          event_type: JobTimeEventType
          event_time?: string
          gps_lat?: number | null
          gps_lng?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          photographer_assignment_id?: string | null
          listing_id?: string | null
          event_type?: JobTimeEventType
          event_time?: string
          gps_lat?: number | null
          gps_lng?: number | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_time_logs_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          }
        ]
      }
      // Phase 7: Drone Airspace & Marketing
      airspace_checks: {
        Row: {
          id: string
          lat: number
          lng: number
          address: string | null
          can_fly: boolean
          status: 'clear' | 'caution' | 'restricted' | 'prohibited'
          airspace_class: 'A' | 'B' | 'C' | 'D' | 'E' | 'G' | null
          max_altitude: number
          nearby_airports: Json
          restrictions: Json
          advisories: Json
          authorization_required: boolean
          authorization_type: string | null
          authorization_instructions: string | null
          checked_at: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          lat: number
          lng: number
          address?: string | null
          can_fly: boolean
          status: 'clear' | 'caution' | 'restricted' | 'prohibited'
          airspace_class?: 'A' | 'B' | 'C' | 'D' | 'E' | 'G' | null
          max_altitude?: number
          nearby_airports?: Json
          restrictions?: Json
          advisories?: Json
          authorization_required?: boolean
          authorization_type?: string | null
          authorization_instructions?: string | null
          checked_at?: string
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          lat?: number
          lng?: number
          address?: string | null
          can_fly?: boolean
          status?: 'clear' | 'caution' | 'restricted' | 'prohibited'
          airspace_class?: 'A' | 'B' | 'C' | 'D' | 'E' | 'G' | null
          max_altitude?: number
          nearby_airports?: Json
          restrictions?: Json
          advisories?: Json
          authorization_required?: boolean
          authorization_type?: string | null
          authorization_instructions?: string | null
          checked_at?: string
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          id: string
          name: string
          subject: string
          body: string
          template_id: string | null
          status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
          recipient_filter: Json | null
          recipient_count: number
          scheduled_at: string | null
          sent_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          subject: string
          body: string
          template_id?: string | null
          status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
          recipient_filter?: Json | null
          recipient_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          subject?: string
          body?: string
          template_id?: string | null
          status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
          recipient_filter?: Json | null
          recipient_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_template_id_fkey"
            columns: ["template_id"]
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          }
        ]
      }
      campaign_sends: {
        Row: {
          id: string
          campaign_id: string
          recipient_email: string
          recipient_name: string | null
          status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed'
          sent_at: string | null
          delivered_at: string | null
          opened_at: string | null
          clicked_at: string | null
          click_count: number
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          recipient_email: string
          recipient_name?: string | null
          status?: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed'
          sent_at?: string | null
          delivered_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          click_count?: number
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          recipient_email?: string
          recipient_name?: string | null
          status?: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed'
          sent_at?: string | null
          delivered_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          click_count?: number
          error_message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          }
        ]
      }
      // Phase 8: Task Management & Team Notes
      job_tasks: {
        Row: {
          id: string
          listing_id: string | null
          order_id: string | null
          title: string
          description: string | null
          task_type: 'general' | 'photo_editing' | 'video_editing' | 'floor_plan' | 'virtual_staging' | 'drone_review' | 'qc_review' | 'delivery' | 'client_followup' | 'reshoot' | 'revision'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'
          assigned_to: string | null
          assigned_by: string | null
          due_date: string | null
          completed_at: string | null
          completed_by: string | null
          blocked_reason: string | null
          sort_order: number
          parent_task_id: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id?: string | null
          order_id?: string | null
          title: string
          description?: string | null
          task_type?: 'general' | 'photo_editing' | 'video_editing' | 'floor_plan' | 'virtual_staging' | 'drone_review' | 'qc_review' | 'delivery' | 'client_followup' | 'reshoot' | 'revision'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'
          assigned_to?: string | null
          assigned_by?: string | null
          due_date?: string | null
          completed_at?: string | null
          completed_by?: string | null
          blocked_reason?: string | null
          sort_order?: number
          parent_task_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string | null
          order_id?: string | null
          title?: string
          description?: string | null
          task_type?: 'general' | 'photo_editing' | 'video_editing' | 'floor_plan' | 'virtual_staging' | 'drone_review' | 'qc_review' | 'delivery' | 'client_followup' | 'reshoot' | 'revision'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'
          assigned_to?: string | null
          assigned_by?: string | null
          due_date?: string | null
          completed_at?: string | null
          completed_by?: string | null
          blocked_reason?: string | null
          sort_order?: number
          parent_task_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_tasks_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tasks_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tasks_completed_by_fkey"
            columns: ["completed_by"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            referencedRelation: "job_tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      job_notes: {
        Row: {
          id: string
          listing_id: string | null
          order_id: string | null
          author_id: string
          content: string
          note_type: 'general' | 'internal' | 'client_visible' | 'photographer' | 'editor' | 'qc' | 'scheduling' | 'issue' | 'resolution'
          is_pinned: boolean
          is_important: boolean
          mentions: string[]
          attachments: Json
          read_by: string[]
          edited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          listing_id?: string | null
          order_id?: string | null
          author_id: string
          content: string
          note_type?: 'general' | 'internal' | 'client_visible' | 'photographer' | 'editor' | 'qc' | 'scheduling' | 'issue' | 'resolution'
          is_pinned?: boolean
          is_important?: boolean
          mentions?: string[]
          attachments?: Json
          read_by?: string[]
          edited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string | null
          order_id?: string | null
          author_id?: string
          content?: string
          note_type?: 'general' | 'internal' | 'client_visible' | 'photographer' | 'editor' | 'qc' | 'scheduling' | 'issue' | 'resolution'
          is_pinned?: boolean
          is_important?: boolean
          mentions?: string[]
          attachments?: Json
          read_by?: string[]
          edited_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_notes_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_notes_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_notes_author_id_fkey"
            columns: ["author_id"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          }
        ]
      }
      task_comments: {
        Row: {
          id: string
          task_id: string
          author_id: string
          content: string
          mentions: string[]
          attachments: Json
          created_at: string
          edited_at: string | null
        }
        Insert: {
          id?: string
          task_id: string
          author_id: string
          content: string
          mentions?: string[]
          attachments?: Json
          created_at?: string
          edited_at?: string | null
        }
        Update: {
          id?: string
          task_id?: string
          author_id?: string
          content?: string
          mentions?: string[]
          attachments?: Json
          created_at?: string
          edited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "job_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          }
        ]
      }
      task_history: {
        Row: {
          id: string
          task_id: string
          changed_by: string | null
          field_changed: string
          old_value: string | null
          new_value: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          changed_by?: string | null
          field_changed: string
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          changed_by?: string | null
          field_changed?: string
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "job_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_history_changed_by_fkey"
            columns: ["changed_by"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          }
        ]
      }
      task_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          service_type: string | null
          tasks: Json
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          service_type?: string | null
          tasks?: Json
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          service_type?: string | null
          tasks?: Json
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          }
        ]
      }
      // Phase 9 Tables - Edit Requests & Order Modifications
      edit_requests: {
        Row: {
          id: string
          order_id: string | null
          listing_id: string | null
          agent_id: string | null
          request_type: string
          title: string
          description: string | null
          asset_ids: string[] | null
          status: string
          priority: string
          is_rush: boolean
          is_billable: boolean
          estimated_cost: number | null
          actual_cost: number | null
          assigned_to: string | null
          assigned_at: string | null
          due_date: string | null
          resolved_by: string | null
          resolved_at: string | null
          resolution_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          listing_id?: string | null
          agent_id?: string | null
          request_type: string
          title: string
          description?: string | null
          asset_ids?: string[] | null
          status?: string
          priority?: string
          is_rush?: boolean
          is_billable?: boolean
          estimated_cost?: number | null
          actual_cost?: number | null
          assigned_to?: string | null
          assigned_at?: string | null
          due_date?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          resolution_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string | null
          listing_id?: string | null
          agent_id?: string | null
          request_type?: string
          title?: string
          description?: string | null
          asset_ids?: string[] | null
          status?: string
          priority?: string
          is_rush?: boolean
          is_billable?: boolean
          estimated_cost?: number | null
          actual_cost?: number | null
          assigned_to?: string | null
          assigned_at?: string | null
          due_date?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          resolution_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "edit_requests_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_requests_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_requests_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          }
        ]
      }
      edit_request_comments: {
        Row: {
          id: string
          edit_request_id: string
          author_type: string
          author_id: string | null
          content: string
          attachments: Json
          is_internal: boolean
          created_at: string
        }
        Insert: {
          id?: string
          edit_request_id: string
          author_type: string
          author_id?: string | null
          content: string
          attachments?: Json
          is_internal?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          edit_request_id?: string
          author_type?: string
          author_id?: string | null
          content?: string
          attachments?: Json
          is_internal?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "edit_request_comments_edit_request_id_fkey"
            columns: ["edit_request_id"]
            referencedRelation: "edit_requests"
            referencedColumns: ["id"]
          }
        ]
      }
      order_modifications: {
        Row: {
          id: string
          order_id: string
          listing_id: string | null
          modification_type: string
          service_id: string | null
          service_name: string | null
          service_price: number | null
          quantity: number
          price_change: number
          original_total: number | null
          new_total: number | null
          status: string
          reason: string | null
          requested_by: string | null
          requested_by_type: string
          approved_by: string | null
          approved_at: string | null
          applied_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          listing_id?: string | null
          modification_type: string
          service_id?: string | null
          service_name?: string | null
          service_price?: number | null
          quantity?: number
          price_change: number
          original_total?: number | null
          new_total?: number | null
          status?: string
          reason?: string | null
          requested_by?: string | null
          requested_by_type?: string
          approved_by?: string | null
          approved_at?: string | null
          applied_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          listing_id?: string | null
          modification_type?: string
          service_id?: string | null
          service_name?: string | null
          service_price?: number | null
          quantity?: number
          price_change?: number
          original_total?: number | null
          new_total?: number | null
          status?: string
          reason?: string | null
          requested_by?: string | null
          requested_by_type?: string
          approved_by?: string | null
          approved_at?: string | null
          applied_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_modifications_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_modifications_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          }
        ]
      }
      service_catalog: {
        Row: {
          id: string
          service_key: string
          name: string
          description: string | null
          category: string
          base_price: number
          unit: string
          min_quantity: number
          max_quantity: number | null
          duration_minutes: number | null
          requires_scheduling: boolean
          is_active: boolean
          display_order: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_key: string
          name: string
          description?: string | null
          category?: string
          base_price: number
          unit?: string
          min_quantity?: number
          max_quantity?: number | null
          duration_minutes?: number | null
          requires_scheduling?: boolean
          is_active?: boolean
          display_order?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_key?: string
          name?: string
          description?: string | null
          category?: string
          base_price?: number
          unit?: string
          min_quantity?: number
          max_quantity?: number | null
          duration_minutes?: number | null
          requires_scheduling?: boolean
          is_active?: boolean
          display_order?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      // Phase 10: Advanced Payments
      split_payments: {
        Row: {
          id: string
          order_id: string
          split_type: 'even' | 'custom' | 'percentage'
          total_amount_cents: number
          status: 'pending' | 'processing' | 'partial' | 'completed' | 'failed'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          split_type?: 'even' | 'custom' | 'percentage'
          total_amount_cents: number
          status?: 'pending' | 'processing' | 'partial' | 'completed' | 'failed'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          split_type?: 'even' | 'custom' | 'percentage'
          total_amount_cents?: number
          status?: 'pending' | 'processing' | 'partial' | 'completed' | 'failed'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_payments_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_payments_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      payment_portions: {
        Row: {
          id: string
          split_payment_id: string
          amount_cents: number
          percentage: number | null
          payment_method_type: string
          payment_intent_id: string | null
          payment_method_id: string | null
          card_brand: string | null
          card_last_four: string | null
          status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
          error_message: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          split_payment_id: string
          amount_cents: number
          percentage?: number | null
          payment_method_type?: string
          payment_intent_id?: string | null
          payment_method_id?: string | null
          card_brand?: string | null
          card_last_four?: string | null
          status?: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
          error_message?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          split_payment_id?: string
          amount_cents?: number
          percentage?: number | null
          payment_method_type?: string
          payment_intent_id?: string | null
          payment_method_id?: string | null
          card_brand?: string | null
          card_last_four?: string | null
          status?: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
          error_message?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_portions_split_payment_id_fkey"
            columns: ["split_payment_id"]
            referencedRelation: "split_payments"
            referencedColumns: ["id"]
          }
        ]
      }
      invoice_templates: {
        Row: {
          id: string
          agent_id: string | null
          name: string
          is_default: boolean
          logo_url: string | null
          company_name: string | null
          company_address: string | null
          company_phone: string | null
          company_email: string | null
          company_website: string | null
          primary_color: string
          secondary_color: string
          accent_color: string
          font_family: string
          header_text: string | null
          footer_text: string | null
          terms_and_conditions: string | null
          payment_instructions: string | null
          show_logo: boolean
          show_qr_code: boolean
          show_due_date: boolean
          show_payment_link: boolean
          show_line_item_details: boolean
          paper_size: 'letter' | 'a4' | 'legal'
          margin_top: number
          margin_bottom: number
          margin_left: number
          margin_right: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id?: string | null
          name?: string
          is_default?: boolean
          logo_url?: string | null
          company_name?: string | null
          company_address?: string | null
          company_phone?: string | null
          company_email?: string | null
          company_website?: string | null
          primary_color?: string
          secondary_color?: string
          accent_color?: string
          font_family?: string
          header_text?: string | null
          footer_text?: string | null
          terms_and_conditions?: string | null
          payment_instructions?: string | null
          show_logo?: boolean
          show_qr_code?: boolean
          show_due_date?: boolean
          show_payment_link?: boolean
          show_line_item_details?: boolean
          paper_size?: 'letter' | 'a4' | 'legal'
          margin_top?: number
          margin_bottom?: number
          margin_left?: number
          margin_right?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string | null
          name?: string
          is_default?: boolean
          logo_url?: string | null
          company_name?: string | null
          company_address?: string | null
          company_phone?: string | null
          company_email?: string | null
          company_website?: string | null
          primary_color?: string
          secondary_color?: string
          accent_color?: string
          font_family?: string
          header_text?: string | null
          footer_text?: string | null
          terms_and_conditions?: string | null
          payment_instructions?: string | null
          show_logo?: boolean
          show_qr_code?: boolean
          show_due_date?: boolean
          show_payment_link?: boolean
          show_line_item_details?: boolean
          paper_size?: 'letter' | 'a4' | 'legal'
          margin_top?: number
          margin_bottom?: number
          margin_left?: number
          margin_right?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_templates_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      generated_invoices: {
        Row: {
          id: string
          order_id: string
          template_id: string | null
          invoice_number: string
          invoice_date: string
          due_date: string | null
          status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
          pdf_url: string | null
          pdf_generated_at: string | null
          sent_at: string | null
          viewed_at: string | null
          paid_at: string | null
          sent_to_email: string | null
          email_opened_at: string | null
          internal_notes: string | null
          customer_notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          template_id?: string | null
          invoice_number?: string
          invoice_date?: string
          due_date?: string | null
          status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
          pdf_url?: string | null
          pdf_generated_at?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          paid_at?: string | null
          sent_to_email?: string | null
          email_opened_at?: string | null
          internal_notes?: string | null
          customer_notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          template_id?: string | null
          invoice_number?: string
          invoice_date?: string
          due_date?: string | null
          status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
          pdf_url?: string | null
          pdf_generated_at?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          paid_at?: string | null
          sent_to_email?: string | null
          email_opened_at?: string | null
          internal_notes?: string | null
          customer_notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_invoices_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_invoices_template_id_fkey"
            columns: ["template_id"]
            referencedRelation: "invoice_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_invoices_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          }
        ]
      }
      // Phase 13: Team Portals & Enterprise Integrations
      calendar_connections: {
        Row: {
          id: string
          staff_id: string
          provider: 'google' | 'outlook'
          calendar_id: string
          calendar_name: string
          access_token: string
          refresh_token: string
          token_expires_at: string
          sync_enabled: boolean
          sync_direction: 'push' | 'pull' | 'both'
          last_sync_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          provider: 'google' | 'outlook'
          calendar_id: string
          calendar_name: string
          access_token: string
          refresh_token: string
          token_expires_at: string
          sync_enabled?: boolean
          sync_direction?: 'push' | 'pull' | 'both'
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          provider?: 'google' | 'outlook'
          calendar_id?: string
          calendar_name?: string
          access_token?: string
          refresh_token?: string
          token_expires_at?: string
          sync_enabled?: boolean
          sync_direction?: 'push' | 'pull' | 'both'
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_staff_id_fkey"
            columns: ["staff_id"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          }
        ]
      }
      daily_routes: {
        Row: {
          id: string
          staff_id: string
          route_date: string
          start_lat: number | null
          start_lng: number | null
          start_time: string | null
          end_time: string | null
          total_distance_meters: number | null
          total_duration_seconds: number | null
          stop_count: number
          is_optimized: boolean
          optimization_algorithm: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          route_date: string
          start_lat?: number | null
          start_lng?: number | null
          start_time?: string | null
          end_time?: string | null
          total_distance_meters?: number | null
          total_duration_seconds?: number | null
          stop_count?: number
          is_optimized?: boolean
          optimization_algorithm?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          route_date?: string
          start_lat?: number | null
          start_lng?: number | null
          start_time?: string | null
          end_time?: string | null
          total_distance_meters?: number | null
          total_duration_seconds?: number | null
          stop_count?: number
          is_optimized?: boolean
          optimization_algorithm?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_routes_staff_id_fkey"
            columns: ["staff_id"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          }
        ]
      }
      route_stops: {
        Row: {
          id: string
          route_id: string
          stop_order: number
          listing_id: string | null
          photographer_assignment_id: string | null
          address: string
          lat: number
          lng: number
          estimated_arrival: string | null
          estimated_departure: string | null
          actual_arrival: string | null
          actual_departure: string | null
          dwell_time_minutes: number
          status: 'pending' | 'arrived' | 'completed' | 'skipped'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          route_id: string
          stop_order: number
          listing_id?: string | null
          photographer_assignment_id?: string | null
          address: string
          lat: number
          lng: number
          estimated_arrival?: string | null
          estimated_departure?: string | null
          actual_arrival?: string | null
          actual_departure?: string | null
          dwell_time_minutes?: number
          status?: 'pending' | 'arrived' | 'completed' | 'skipped'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          route_id?: string
          stop_order?: number
          listing_id?: string | null
          photographer_assignment_id?: string | null
          address?: string
          lat?: number
          lng?: number
          estimated_arrival?: string | null
          estimated_departure?: string | null
          actual_arrival?: string | null
          actual_departure?: string | null
          dwell_time_minutes?: number
          status?: 'pending' | 'arrived' | 'completed' | 'skipped'
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            referencedRelation: "daily_routes"
            referencedColumns: ["id"]
          }
        ]
      }
      drive_time_cache: {
        Row: {
          id: string
          origin_lat: number
          origin_lng: number
          destination_lat: number
          destination_lng: number
          distance_meters: number
          duration_seconds: number
          cached_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          origin_lat: number
          origin_lng: number
          destination_lat: number
          destination_lng: number
          distance_meters: number
          duration_seconds: number
          cached_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          origin_lat?: number
          origin_lng?: number
          destination_lat?: number
          destination_lng?: number
          distance_meters?: number
          duration_seconds?: number
          cached_at?: string
          expires_at?: string
        }
        Relationships: []
      }
      team_capabilities: {
        Row: {
          id: string
          staff_id: string
          category: 'photography' | 'video' | 'drone' | 'editing' | 'qc' | 'scheduling'
          capability: string
          proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          certified: boolean
          certification_date: string | null
          certification_expires: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          category: 'photography' | 'video' | 'drone' | 'editing' | 'qc' | 'scheduling'
          capability: string
          proficiency_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          certified?: boolean
          certification_date?: string | null
          certification_expires?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          category?: 'photography' | 'video' | 'drone' | 'editing' | 'qc' | 'scheduling'
          capability?: string
          proficiency_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          certified?: boolean
          certification_date?: string | null
          certification_expires?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_capabilities_staff_id_fkey"
            columns: ["staff_id"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          }
        ]
      }
      portal_activity_log: {
        Row: {
          id: string
          staff_id: string
          activity_type: string
          entity_type: string | null
          entity_id: string | null
          details: Record<string, unknown> | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          activity_type: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Record<string, unknown> | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          activity_type?: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Record<string, unknown> | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_activity_log_staff_id_fkey"
            columns: ["staff_id"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          }
        ]
      }
      photographer_assignments: {
        Row: {
          id: string
          listing_id: string
          photographer_id: string
          status: 'assigned' | 'confirmed' | 'en_route' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_date: string
          scheduled_time: string | null
          check_in_time: string | null
          check_out_time: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_out_lat: number | null
          check_out_lng: number | null
          google_event_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          photographer_id: string
          status?: 'assigned' | 'confirmed' | 'en_route' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_date: string
          scheduled_time?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          google_event_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          photographer_id?: string
          status?: 'assigned' | 'confirmed' | 'en_route' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_date?: string
          scheduled_time?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          google_event_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photographer_assignments_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photographer_assignments_photographer_id_fkey"
            columns: ["photographer_id"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          }
        ]
      }
      // Tier 5: Service Territories
      service_territories: {
        Row: {
          id: string
          name: string
          description: string | null
          boundaries: Json
          zip_codes: string[]
          cities: string[]
          is_active: boolean
          max_jobs_per_day: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          boundaries?: Json
          zip_codes?: string[]
          cities?: string[]
          is_active?: boolean
          max_jobs_per_day?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          boundaries?: Json
          zip_codes?: string[]
          cities?: string[]
          is_active?: boolean
          max_jobs_per_day?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_territories: {
        Row: {
          id: string
          staff_id: string
          territory_id: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          territory_id: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          territory_id?: string
          is_primary?: boolean
          created_at?: string
        }
        Relationships: []
      }
      // Tier 7: Zapier Integration
      zapier_webhooks: {
        Row: {
          id: string
          name: string
          url: string
          events: string[]
          is_active: boolean
          secret: string | null
          last_triggered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          url: string
          events?: string[]
          is_active?: boolean
          secret?: string | null
          last_triggered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          url?: string
          events?: string[]
          is_active?: boolean
          secret?: string | null
          last_triggered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      zapier_webhook_logs: {
        Row: {
          id: string
          webhook_id: string
          event_type: string
          payload: Json
          response_status: number | null
          response_body: string | null
          success: boolean
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          webhook_id: string
          event_type: string
          payload?: Json
          response_status?: number | null
          response_body?: string | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          webhook_id?: string
          event_type?: string
          payload?: Json
          response_status?: number | null
          response_body?: string | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      // Tier 3: Marketing Assets
      marketing_assets: {
        Row: {
          id: string
          name: string
          category: string
          asset_type: string
          file_url: string | null
          template_data: Json
          is_template: boolean
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: string
          asset_type?: string
          file_url?: string | null
          template_data?: Json
          is_template?: boolean
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          asset_type?: string
          file_url?: string | null
          template_data?: Json
          is_template?: boolean
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_templates: {
        Row: {
          id: string
          name: string
          platform: string
          template_type: string
          content: string
          variables: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          platform?: string
          template_type?: string
          content: string
          variables?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          platform?: string
          template_type?: string
          content?: string
          variables?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          id: string
          listing_id: string | null
          agent_id: string | null
          target_url: string
          short_code: string
          scan_count: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          listing_id?: string | null
          agent_id?: string | null
          target_url: string
          short_code: string
          scan_count?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string | null
          agent_id?: string | null
          target_url?: string
          short_code?: string
          scan_count?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      // Phase 11: Service Packages
      service_packages: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          features: string[]
          display_order: number
          is_featured: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          features?: string[]
          display_order?: number
          is_featured?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          features?: string[]
          display_order?: number
          is_featured?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      package_items: {
        Row: {
          id: string
          package_id: string
          service_id: string
          is_optional: boolean
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          package_id: string
          service_id: string
          is_optional?: boolean
          quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          package_id?: string
          service_id?: string
          is_optional?: boolean
          quantity?: number
          created_at?: string
        }
        Relationships: []
      }
      package_tiers: {
        Row: {
          id: string
          package_id: string
          tier_name: string
          min_sqft: number
          max_sqft: number | null
          price_cents: number
          created_at: string
        }
        Insert: {
          id?: string
          package_id: string
          tier_name?: string
          min_sqft: number
          max_sqft?: number | null
          price_cents: number
          created_at?: string
        }
        Update: {
          id?: string
          package_id?: string
          tier_name?: string
          min_sqft?: number
          max_sqft?: number | null
          price_cents?: number
          created_at?: string
        }
        Relationships: []
      }
      // Phase 12: Real-time & Notifications
      user_notifications: {
        Row: {
          id: string
          user_id: string
          user_type: string
          type: string
          title: string
          message: string
          action_url: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_type?: string
          type: string
          title: string
          message: string
          action_url?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_type?: string
          type?: string
          title?: string
          message?: string
          action_url?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          user_type: string
          endpoint: string
          keys: Json
          user_agent: string | null
          device_type: string | null
          is_active: boolean
          last_used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_type?: string
          endpoint: string
          keys: Json
          user_agent?: string | null
          device_type?: string | null
          is_active?: boolean
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_type?: string
          endpoint?: string
          keys?: Json
          user_agent?: string | null
          device_type?: string | null
          is_active?: boolean
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_notification_history: {
        Row: {
          id: string
          subscription_id: string
          user_id: string
          title: string
          body: string | null
          data: Json | null
          status: string
          error_message: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          user_id: string
          title: string
          body?: string | null
          data?: Json | null
          status?: string
          error_message?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          user_id?: string
          title?: string
          body?: string | null
          data?: Json | null
          status?: string
          error_message?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          user_type: string
          channel: string
          event_type: string
          is_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_type?: string
          channel?: string
          event_type: string
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_type?: string
          channel?: string
          event_type?: string
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_rules: {
        Row: {
          id: string
          name: string
          description: string | null
          trigger_event: string
          conditions: Json
          channels: string[]
          template_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          trigger_event: string
          conditions?: Json
          channels?: string[]
          template_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          trigger_event?: string
          conditions?: Json
          channels?: string[]
          template_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      // Tier 8: Advanced Features
      listing_customers: {
        Row: {
          id: string
          listing_id: string
          customer_name: string
          customer_email: string
          customer_phone: string | null
          role: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          customer_name: string
          customer_email: string
          customer_phone?: string | null
          role?: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          customer_name?: string
          customer_email?: string
          customer_phone?: string | null
          role?: string
          is_primary?: boolean
          created_at?: string
        }
        Relationships: []
      }
      merged_orders: {
        Row: {
          id: string
          primary_order_id: string
          merged_order_id: string
          merged_at: string
          merged_by: string | null
          reason: string | null
        }
        Insert: {
          id?: string
          primary_order_id: string
          merged_order_id: string
          merged_at?: string
          merged_by?: string | null
          reason?: string | null
        }
        Update: {
          id?: string
          primary_order_id?: string
          merged_order_id?: string
          merged_at?: string
          merged_by?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      video_previews: {
        Row: {
          id: string
          listing_id: string
          media_asset_id: string | null
          preview_url: string
          thumbnail_url: string | null
          duration_seconds: number | null
          is_approved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          media_asset_id?: string | null
          preview_url: string
          thumbnail_url?: string | null
          duration_seconds?: number | null
          is_approved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          media_asset_id?: string | null
          preview_url?: string
          thumbnail_url?: string | null
          duration_seconds?: number | null
          is_approved?: boolean
          created_at?: string
        }
        Relationships: []
      }
      // Analytics tables
      page_views: {
        Row: {
          id: string
          session_id: string | null
          page_path: string
          referrer: string | null
          user_agent: string | null
          ip_hash: string | null
          listing_id: string | null
          agent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id?: string | null
          page_path: string
          referrer?: string | null
          user_agent?: string | null
          ip_hash?: string | null
          listing_id?: string | null
          agent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string | null
          page_path?: string
          referrer?: string | null
          user_agent?: string | null
          ip_hash?: string | null
          listing_id?: string | null
          agent_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      media_downloads: {
        Row: {
          id: string
          media_asset_id: string | null
          listing_id: string | null
          session_id: string | null
          download_type: string
          created_at: string
        }
        Insert: {
          id?: string
          media_asset_id?: string | null
          listing_id?: string | null
          session_id?: string | null
          download_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          media_asset_id?: string | null
          listing_id?: string | null
          session_id?: string | null
          download_type?: string
          created_at?: string
        }
        Relationships: []
      }
      // FoundDR Integration tables (Phase 6)
      processing_jobs: {
        Row: {
          id: string
          founddr_job_id: string | null
          listing_id: string | null
          status: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
          input_keys: string[]
          output_key: string | null
          bracket_count: number | null
          queued_at: string | null
          started_at: string | null
          completed_at: string | null
          processing_time_ms: number | null
          metrics: Json
          error_message: string | null
          webhook_received_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          founddr_job_id?: string | null
          listing_id?: string | null
          status?: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
          input_keys: string[]
          output_key?: string | null
          bracket_count?: number | null
          queued_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          processing_time_ms?: number | null
          metrics?: Json
          error_message?: string | null
          webhook_received_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          founddr_job_id?: string | null
          listing_id?: string | null
          status?: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
          input_keys?: string[]
          output_key?: string | null
          bracket_count?: number | null
          queued_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          processing_time_ms?: number | null
          metrics?: Json
          error_message?: string | null
          webhook_received_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_jobs_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          }
        ]
      }
      inpainting_jobs: {
        Row: {
          id: string
          media_asset_id: string
          mask_data: Json
          prompt: string
          negative_prompt: string | null
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
          model_used: string
          input_path: string
          mask_path: string | null
          output_path: string | null
          processing_time_ms: number | null
          error_message: string | null
          created_by: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          media_asset_id: string
          mask_data: Json
          prompt?: string
          negative_prompt?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
          model_used?: string
          input_path: string
          mask_path?: string | null
          output_path?: string | null
          processing_time_ms?: number | null
          error_message?: string | null
          created_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          media_asset_id?: string
          mask_data?: Json
          prompt?: string
          negative_prompt?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
          model_used?: string
          input_path?: string
          mask_path?: string | null
          output_path?: string | null
          processing_time_ms?: number | null
          error_message?: string | null
          created_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inpainting_jobs_media_asset_id_fkey"
            columns: ["media_asset_id"]
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inpainting_jobs_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          }
        ]
      }
      lightroom_exports: {
        Row: {
          id: string
          listing_id: string
          media_asset_ids: string[]
          export_folder_name: string
          export_path: string | null
          status: 'pending' | 'exported' | 'editing' | 'reimporting' | 'completed' | 'failed'
          exported_by: string | null
          exported_at: string | null
          reimported_at: string | null
          reimported_count: number
          edit_instructions: string | null
          completion_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          media_asset_ids: string[]
          export_folder_name: string
          export_path?: string | null
          status?: 'pending' | 'exported' | 'editing' | 'reimporting' | 'completed' | 'failed'
          exported_by?: string | null
          exported_at?: string | null
          reimported_at?: string | null
          reimported_count?: number
          edit_instructions?: string | null
          completion_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          media_asset_ids?: string[]
          export_folder_name?: string
          export_path?: string | null
          status?: 'pending' | 'exported' | 'editing' | 'reimporting' | 'completed' | 'failed'
          exported_by?: string | null
          exported_at?: string | null
          reimported_at?: string | null
          reimported_count?: number
          edit_instructions?: string | null
          completion_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lightroom_exports_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightroom_exports_exported_by_fkey"
            columns: ["exported_by"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          }
        ]
      }
      qc_sessions: {
        Row: {
          id: string
          staff_id: string
          listing_id: string | null
          photos_reviewed: number
          photos_approved: number
          photos_rejected: number
          photos_edited: number
          inpainting_requests: number
          started_at: string
          ended_at: string | null
          total_duration_seconds: number | null
          avg_review_time_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          listing_id?: string | null
          photos_reviewed?: number
          photos_approved?: number
          photos_rejected?: number
          photos_edited?: number
          inpainting_requests?: number
          started_at?: string
          ended_at?: string | null
          total_duration_seconds?: number | null
          avg_review_time_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          listing_id?: string | null
          photos_reviewed?: number
          photos_approved?: number
          photos_rejected?: number
          photos_edited?: number
          inpainting_requests?: number
          started_at?: string
          ended_at?: string | null
          total_duration_seconds?: number | null
          avg_review_time_seconds?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_sessions_staff_id_fkey"
            columns: ["staff_id"]
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_sessions_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          }
        ]
      }
      delivery_notifications: {
        Row: {
          id: string
          listing_id: string
          agent_id: string
          notification_type: 'email' | 'sms' | 'push' | 'in_app'
          template_key: string | null
          subject: string | null
          body: string | null
          status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked'
          external_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          delivered_at: string | null
          opened_at: string | null
          error_message: string | null
          retry_count: number
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          agent_id: string
          notification_type: 'email' | 'sms' | 'push' | 'in_app'
          template_key?: string | null
          subject?: string | null
          body?: string | null
          status?: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked'
          external_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          opened_at?: string | null
          error_message?: string | null
          retry_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          agent_id?: string
          notification_type?: 'email' | 'sms' | 'push' | 'in_app'
          template_key?: string | null
          subject?: string | null
          body?: string | null
          status?: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked'
          external_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          opened_at?: string | null
          error_message?: string | null
          retry_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notifications_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notifications_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
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

// Order Types
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'confirmed'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'cancelled'

// AI Agent Types
export type AIAgentCategory = 'operations' | 'content' | 'development' | 'lifestyle'
export type AIAgentExecutionMode = 'sync' | 'async' | 'scheduled'
export type AIAgentExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type AIAgentTriggerSource = 'webhook' | 'cron' | 'manual' | 'api'

export interface AIAgentConfig {
  maxTokens?: number
  temperature?: number
  model?: string
  timeout?: number
  retryAttempts?: number
  [key: string]: unknown
}

export interface AIAgentStepResult {
  agent_slug: string
  status: AIAgentExecutionStatus
  output?: Record<string, unknown>
  error?: string
  completed_at?: string
}

// ============================================
// ENTERPRISE UPGRADE TYPES
// ============================================

// Integration Status Types
export type IntegrationStatus =
  | 'pending'
  | 'ordered'
  | 'processing'
  | 'delivered'
  | 'needs_manual'
  | 'failed'
  | 'not_applicable'

export type Zillow3DStatus =
  | 'pending'
  | 'scheduled'
  | 'scanned'
  | 'processing'
  | 'live'
  | 'failed'
  | 'not_applicable'

export type SLAStatus = 'on_track' | 'at_risk' | 'overdue'

// Share Link Types
export type ShareLinkType = 'media' | 'schedule' | 'status'

// Seller Schedule Types
export type SellerScheduleStatus =
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'rescheduled'
  | 'cancelled'

export interface AvailableSlot {
  date: string // ISO date string
  start_time: string // HH:mm format
  end_time: string // HH:mm format
  preferred?: boolean
}

export interface SelectedSlot {
  date: string
  start_time: string
  end_time: string
  confirmed_by?: string
  confirmed_at?: string
}

// Client Message Types
export type ClientMessageSenderType = 'client' | 'seller' | 'agent' | 'admin'

// Notification Types
export type NotificationRecipientType = 'agent' | 'seller' | 'staff' | 'admin'
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app'
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'opened'

// Email Template Types
export type EmailTemplateCategory =
  | 'general'
  | 'order'
  | 'scheduling'
  | 'delivery'
  | 'marketing'
  | 'reminder'

// Photographer Types
export type PhotographerSpecialty =
  | 'interior'
  | 'exterior'
  | 'drone'
  | 'commercial'
  | 'vacant_land'
  | 'twilight'
  | 'luxury'
  | 'video'

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'expert'

// Job Time Log Types
export type JobTimeEventType =
  | 'arrived'
  | 'started'
  | 'completed'
  | 'left'
  | 'break_start'
  | 'break_end'

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Convenience type aliases for enterprise tables
export type ShareLink = Tables<'share_links'>
export type ShareLinkInsert = TablesInsert<'share_links'>
export type SellerSchedule = Tables<'seller_schedules'>
export type SellerScheduleInsert = TablesInsert<'seller_schedules'>
export type ClientMessage = Tables<'client_messages'>
export type ClientMessageInsert = TablesInsert<'client_messages'>
export type ClientFeedback = Tables<'client_feedback'>
export type ClientFeedbackInsert = TablesInsert<'client_feedback'>
export type PortalSettings = Tables<'portal_settings'>
export type NotificationLog = Tables<'notification_logs'>
export type EmailTemplate = Tables<'email_templates'>
export type PhotographerSpecialtyRow = Tables<'photographer_specialties'>
export type JobTimeLog = Tables<'job_time_logs'>

// Phase 7 type aliases
export type AirspaceCheck = Tables<'airspace_checks'>
export type AirspaceCheckInsert = TablesInsert<'airspace_checks'>
export type MarketingCampaign = Tables<'marketing_campaigns'>
export type MarketingCampaignInsert = TablesInsert<'marketing_campaigns'>
export type CampaignSend = Tables<'campaign_sends'>
export type CampaignSendInsert = TablesInsert<'campaign_sends'>

// Phase 8 type aliases
export type JobTask = Tables<'job_tasks'>
export type JobTaskInsert = TablesInsert<'job_tasks'>
export type JobTaskUpdate = TablesUpdate<'job_tasks'>
export type JobNote = Tables<'job_notes'>
export type JobNoteInsert = TablesInsert<'job_notes'>
export type TaskComment = Tables<'task_comments'>
export type TaskCommentInsert = TablesInsert<'task_comments'>
export type TaskHistory = Tables<'task_history'>
export type TaskTemplate = Tables<'task_templates'>

// Task status types
export type TaskType = 'general' | 'photo_editing' | 'video_editing' | 'floor_plan' | 'virtual_staging' | 'drone_review' | 'qc_review' | 'delivery' | 'client_followup' | 'reshoot' | 'revision'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'
export type NoteType = 'general' | 'internal' | 'client_visible' | 'photographer' | 'editor' | 'qc' | 'scheduling' | 'issue' | 'resolution'

// Phase 9 type aliases - Edit Requests & Order Modifications
export type EditRequest = Tables<'edit_requests'>
export type EditRequestInsert = TablesInsert<'edit_requests'>
export type EditRequestUpdate = TablesUpdate<'edit_requests'>
export type EditRequestComment = Tables<'edit_request_comments'>
export type EditRequestCommentInsert = TablesInsert<'edit_request_comments'>
export type OrderModification = Tables<'order_modifications'>
export type OrderModificationInsert = TablesInsert<'order_modifications'>
export type ServiceCatalog = Tables<'service_catalog'>
export type ServiceCatalogInsert = TablesInsert<'service_catalog'>

// Edit request types
export type EditRequestType =
  | 'photo_retouching'
  | 'color_correction'
  | 'sky_replacement'
  | 'object_removal'
  | 'virtual_staging_revision'
  | 'video_edit'
  | 'floor_plan_correction'
  | 'crop_resize'
  | 'exposure_adjustment'
  | 'other'

export type EditRequestStatus =
  | 'pending'
  | 'reviewing'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'cancelled'

export type EditRequestPriority = 'low' | 'normal' | 'high' | 'urgent'

export type OrderModificationType = 'add_service' | 'remove_service' | 'price_adjustment' | 'discount'

export type ServiceCategory =
  | 'photography'
  | 'video'
  | 'drone'
  | 'floor_plan'
  | 'staging'
  | 'tour'
  | 'other'

// Phase 10 type aliases - Advanced Payments
export type SplitPayment = Tables<'split_payments'>
export type SplitPaymentInsert = TablesInsert<'split_payments'>
export type SplitPaymentUpdate = TablesUpdate<'split_payments'>
export type PaymentPortion = Tables<'payment_portions'>
export type PaymentPortionInsert = TablesInsert<'payment_portions'>
export type PaymentPortionUpdate = TablesUpdate<'payment_portions'>
export type InvoiceTemplate = Tables<'invoice_templates'>
export type InvoiceTemplateInsert = TablesInsert<'invoice_templates'>
export type InvoiceTemplateUpdate = TablesUpdate<'invoice_templates'>
export type GeneratedInvoice = Tables<'generated_invoices'>
export type GeneratedInvoiceInsert = TablesInsert<'generated_invoices'>
export type GeneratedInvoiceUpdate = TablesUpdate<'generated_invoices'>

// Split payment types
export type SplitType = 'even' | 'custom' | 'percentage'
export type SplitPaymentStatus = 'pending' | 'processing' | 'partial' | 'completed' | 'failed'
export type PaymentPortionStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'

// Invoice types
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
export type PaperSize = 'letter' | 'a4' | 'legal'

// Phase 11 type aliases - Packages & Templates
// Note: These are placeholder types until migration 20241228_005_phase11_packages_templates.sql
// is run and types are regenerated with `npx supabase gen types`

// Package types
export type PackageStatus = 'active' | 'inactive' | 'draft'

// Template condition types (defined before interfaces that use them)
export type ConditionType =
  | 'service_type'
  | 'order_value'
  | 'client_tier'
  | 'status'
  | 'custom'

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'

export type TemplateVariableCategory =
  | 'general'
  | 'agent'
  | 'order'
  | 'property'
  | 'payment'
  | 'delivery'

export interface ServicePackage {
  id: string
  name: string
  slug: string
  description: string | null
  features: string[]
  display_order: number
  is_featured: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ServicePackageInsert {
  id?: string
  name: string
  slug: string
  description?: string | null
  features?: string[]
  display_order?: number
  is_featured?: boolean
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export type ServicePackageUpdate = Partial<ServicePackageInsert>

export interface PackageItem {
  id: string
  package_id: string
  service_id: string
  is_optional: boolean
  quantity: number
  created_at: string
}

export interface PackageItemInsert {
  id?: string
  package_id: string
  service_id: string
  is_optional?: boolean
  quantity?: number
  created_at?: string
}

export interface PackageTier {
  id: string
  package_id: string
  tier_name: string
  min_sqft: number
  max_sqft: number | null
  price_cents: number
  created_at: string
}

export interface PackageTierInsert {
  id?: string
  package_id: string
  tier_name?: string
  min_sqft: number
  max_sqft?: number | null
  price_cents: number
  created_at?: string
}

export interface TemplateCondition {
  id: string
  template_id: string
  condition_type: ConditionType
  operator: ConditionOperator
  field: string
  value: string
  priority: number
  template_override: string | null
  is_active: boolean
  created_at: string
}

export interface TemplateConditionInsert {
  id?: string
  template_id: string
  condition_type: ConditionType
  operator: ConditionOperator
  field: string
  value: string
  priority?: number
  template_override?: string | null
  is_active?: boolean
  created_at?: string
}

export type TemplateConditionUpdate = Partial<TemplateConditionInsert>

export interface TemplateVariable {
  id: string
  key: string
  category: TemplateVariableCategory
  description: string
  example_value: string | null
  created_at: string
}

export interface TemplateVariableInsert {
  id?: string
  key: string
  category: TemplateVariableCategory
  description: string
  example_value?: string | null
  created_at?: string
}
