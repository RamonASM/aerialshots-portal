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

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
