/**
 * Custom types for tables/views not in generated Supabase types
 *
 * These tables exist in the database but may not be in the generated types
 * due to RLS policies, views, or other reasons.
 */

// Proofing System Types
export interface ProofingSessionRow {
  id: string
  listing_id: string
  agent_id: string
  status: 'active' | 'finalized' | 'expired'
  token: string
  expires_at: string
  created_at: string
  finalized_at?: string
  max_selections?: number
  photo_ids: string[]
}

export interface ProofingSelectionRow {
  id: string
  session_id: string
  photo_id: string
  is_favorite: boolean
  selection_order?: number
  selected_at: string
}

export interface ProofingCommentRow {
  id: string
  session_id: string
  photo_id: string
  comment_text: string
  pin_x?: number
  pin_y?: number
  is_pinned: boolean
  author_type: 'agent' | 'seller'
  author_name?: string
  created_at: string
}

export interface ProofingShareRow {
  id: string
  session_id: string
  seller_email: string
  seller_name: string
  share_token: string
  can_comment: boolean
  can_select: boolean
  created_at: string
}

// Drip Campaign Types
export interface DripCampaignRow {
  id: string
  name: string
  description?: string
  trigger_type: 'new_customer' | 'delivery_complete' | 'lapsed_90_days' | 'lapsed_180_days' | 'booking_complete' | 'review_request' | 'manual'
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface DripCampaignStepRow {
  id: string
  campaign_id: string
  step_order: number
  delay_days: number
  delay_hours?: number
  subject: string
  template_id: string
  created_at: string
}

export interface DripEnrollmentRow {
  id: string
  campaign_id: string
  contact_id: string
  status: 'active' | 'paused' | 'completed' | 'unenrolled'
  current_step: number
  next_step_at?: string
  unenroll_reason?: string
  unenrolled_at?: string
  completed_at?: string
  created_at: string
}

// Waitlist Types
export interface WaitlistEntryRow {
  id: string
  client_email: string
  client_name: string
  territory_id: string
  requested_date: string
  listing_id?: string
  status: 'waiting' | 'notified' | 'booked' | 'expired' | 'cancelled'
  position: number
  flexible_dates?: boolean
  date_range_start?: string
  date_range_end?: string
  notification_count: number
  last_notified_at?: string
  created_at: string
}

export interface TerritoryAvailabilityRow {
  territory_id: string
  date: string
  has_opening: boolean
}

// Coupon Types
export interface CouponRow {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  is_active: boolean
  expires_at?: string
  max_uses?: number
  current_uses: number
  min_order_amount?: number
  one_per_user?: boolean
  first_order_only?: boolean
  description?: string
  total_discount_given?: number
  created_at: string
}

export interface CouponUsageRow {
  id: string
  coupon_id: string
  agent_id: string
  order_id: string
  discount_amount: number
  used_at: string
}

// Loyalty Types
export interface LoyaltyTierRow {
  id: string
  name: string
  slug: string
  min_points: number
  discount_percent: number
  perks: string[] | string // Can be JSONB array or JSON string
  badge_color: string
  badge_icon: string
  is_active: boolean
}

export interface LoyaltyPointsRow {
  id: string
  agent_id: string
  points: number
  type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'adjustment'
  source: string
  source_id?: string
  description?: string
  expires_at?: string
  is_expired: boolean
  created_at: string
}

export interface PunchCardRow {
  id: string
  agent_id: string
  card_type: string
  punches_required: number
  punches_earned: number
  reward_type: string
  reward_value?: string
  reward_used: boolean
  is_complete: boolean
  completed_at?: string
  expires_at?: string
  is_expired: boolean
  created_at: string
}

export interface PunchCardPunchRow {
  id: string
  punch_card_id: string
  order_id?: string
  description: string
  created_at: string
}

// Helper type for queries with relations
export type ProofingSessionWithSteps = ProofingSessionRow & {
  photos?: unknown[]
}

export type DripCampaignWithSteps = DripCampaignRow & {
  steps?: DripCampaignStepRow[]
}

export type DripEnrollmentWithCampaign = DripEnrollmentRow & {
  campaign?: DripCampaignWithSteps
}

// Integration Status Types (Cubicasa)
export type IntegrationStatus =
  | 'pending'
  | 'ordered'
  | 'processing'
  | 'completed'
  | 'delivered'
  | 'failed'
  | 'skipped'
  | 'not_ordered'
  | 'not_applicable'
  | 'needs_manual'

// Zillow 3D Status Types
export type Zillow3DStatus =
  | 'pending'
  | 'ordered'
  | 'scheduled'
  | 'scanned'
  | 'processing'
  | 'completed'
  | 'live'
  | 'delivered'
  | 'failed'
  | 'skipped'
  | 'not_ordered'
  | 'not_applicable'

// Community Types
export interface CommunityQuickFacts {
  population?: number
  founded?: string | number
  area_sqmi?: number
  median_income?: number
  median_age?: number
  homeownership_rate?: number
  avg_commute?: number
  zip_codes?: string[]
  nearby_cities?: string[]
  [key: string]: unknown
}

export interface CommunityMarketSnapshot {
  median_price?: number
  yoy_change?: number
  avg_dom?: number
  price_per_sqft?: number
  active_listings?: number
  sold_last_30?: number
  updated_at?: string
  [key: string]: unknown
}

export interface CommunitySubdivision {
  name: string
  description?: string
  image_url?: string
  homes_count?: number
  year_built?: string | number
  price_range?: string
  home_styles?: string[]
  [key: string]: unknown
}

export interface CommunitySchoolInfo {
  name: string
  type: 'elementary' | 'middle' | 'high' | 'private' | 'charter' | string
  rating?: number
  grades?: string
  enrollment?: number
  distance?: string
  [key: string]: unknown
}

export interface CommunitySchoolsInfo {
  elementary?: CommunitySchoolInfo[]
  middle?: CommunitySchoolInfo[]
  high?: CommunitySchoolInfo[]
  private?: CommunitySchoolInfo[]
  charter?: CommunitySchoolInfo[]
  [key: string]: unknown
}

export interface CommunityOverviewContentBlock {
  type: 'heading' | 'paragraph' | 'list'
  content?: string
  items?: string[]
}

export interface CommunityOverviewContent {
  blocks?: CommunityOverviewContentBlock[]
  highlights?: string[]
  [key: string]: unknown
}

// Generated Question Types
export interface GeneratedQuestion {
  id: string
  question: string
  category?: string
  answer?: string
  context?: string
  suggestedFollowUp?: string
}

// Carousel Types
export interface CarouselSlide {
  id: string
  type: 'image' | 'text' | 'stat' | 'map' | 'data'
  imageUrl?: string
  text?: string
  headline?: string
  subheadline?: string
  body?: string
  backgroundColor?: string
  textColor?: string
  data?: Record<string, unknown>
  position?: number
  background_image_url?: string
  text_position?: string
  overlay_style?: string
}

// Booking Session Types
export interface BookingSessionRow {
  id: string
  session_id: string
  current_step: number
  form_data: Record<string, unknown>
  pricing_snapshot?: Record<string, unknown>
  created_at: string
  last_activity_at: string
  expires_at?: string
  agent_id?: string
  converted_order_id?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

// Seller Schedule Types
export interface SellerScheduleRow {
  id: string
  listing_id: string
  share_link_id?: string | null
  seller_name: string | null
  seller_email: string | null
  seller_phone?: string | null
  available_slots: Record<string, unknown> // JSONB of TimeSlot[]
  selected_slot?: Record<string, unknown> | null
  status: 'pending' | 'submitted' | 'confirmed' | 'rescheduled' | 'cancelled'
  notes?: string | null
  submitted_at?: string | null
  confirmed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  arrival_window_minutes?: number | null
  flexible_timing?: boolean | null
  is_vacant_property?: boolean | null
  anytime_available?: boolean | null
  anytime_start_date?: string | null
  anytime_end_date?: string | null
  access_instructions?: string | null
  lockbox_code?: string | null
  gate_code?: string | null
}

// Share Link Types
export type ShareLinkType = 'media' | 'schedule' | 'status' | 'seller'

export interface ShareLinkRow {
  id: string
  listing_id: string
  agent_id: string | null
  link_type: ShareLinkType
  share_token: string
  client_name?: string | null
  client_email?: string | null
  is_active: boolean | null
  expires_at?: string | null
  access_count: number
  last_accessed_at?: string | null
  created_at: string | null
}

export interface ShareLinkInsert {
  listing_id: string
  agent_id?: string | null
  link_type?: ShareLinkType
  share_token: string
  client_name?: string | null
  client_email?: string | null
  is_active?: boolean | null
  expires_at?: string | null
}

// Portal Settings Types
export interface PortalSettingsRow {
  id: string
  agent_id: string
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  font_family?: string | null
  custom_css?: string | null
  welcome_message?: string | null
  footer_text?: string | null
  show_powered_by?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

// Seller Access Control Types
export interface SellerAccessControlRow {
  id: string
  listing_id: string
  media_access_enabled: boolean | null
  granted_by_payment: boolean | null
  granted_by_agent: boolean | null
  granted_by_admin: boolean | null
  granted_at?: string | null
  granted_by_user_id?: string | null
  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
}

// Reschedule Request Types
export interface RescheduleRequestRow {
  id: string
  listing_id: string
  share_link_id?: string | null
  requester_name?: string | null
  requester_email?: string | null
  requester_phone?: string | null
  original_date?: string | null
  requested_slots: Record<string, unknown>
  reason?: string | null
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  admin_notes?: string | null
  handled_by?: string | null
  handled_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

// Pay Period Types
export interface PayPeriodRow {
  id: string
  start_date: string
  end_date: string
  status: string | null
  total_hours: number | null
  total_pay_cents: number | null
  paid_at: string | null
  paid_by?: string
  notes?: string
  created_at?: string
}

// Time Entry Types
export interface TimeEntryRow {
  id: string
  staff_id: string
  pay_period_id?: string
  clock_in: string
  clock_out?: string
  hours_worked?: number
  hourly_rate: number
  total_pay?: number
  break_minutes?: number
  notes?: string
  approved_at?: string
  approved_by?: string
  created_at: string
}

// Payout Settings Types
export interface PayoutSettingsRow {
  id: string
  payout_type: 'job' | 'hourly' | 'flat'
  photographer_percent: number
  videographer_percent: number
  partner_percent: number
  video_editor_percent: number
  qc_percent: number
  operating_percent: number
  is_active: boolean
  created_at: string
  updated_at?: string
  updated_by?: string
}

// Company Pool Types
export interface CompanyPoolRow {
  id: string
  pool_type: 'video_editor' | 'qc_fund' | 'operating'
  amount: number
  source_order_id?: string
  source_job_id?: string
  allocated_to?: string
  allocated_at?: string
  notes?: string
  created_at: string
}

// Payout Idempotency Types
export interface PayoutIdempotencyRow {
  id: string
  idempotency_key: string
  order_id: string
  listing_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed'
  payout_results?: Record<string, unknown>
  error_message?: string
  created_at: string
  completed_at?: string
}

// Staff with payout info (for time-tracking queries)
export interface StaffWithPayoutInfo {
  id: string
  name: string
  email: string
  role: string
  payout_type: 'w2' | '1099' | 'hourly'
  hourly_rate?: number
  stripe_account_id?: string
}

// Staff Payout Types
export interface StaffPayoutRow {
  id: string
  staff_id: string
  order_id: string
  listing_id: string
  amount: number
  stripe_transfer_id?: string
  payout_type: 'photography' | 'videography' | 'editing' | 'qc'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  idempotency_key: string
  processed_at?: string
  error_message?: string
  created_at: string
}

// Partner Payout Types
export interface PartnerPayoutRow {
  id: string
  partner_id: string
  order_id: string
  listing_id: string
  amount: number
  stripe_transfer_id?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  idempotency_key: string
  processed_at?: string
  error_message?: string
  created_at: string
}

// Render Cache Types
export interface RenderCacheRow {
  id: string
  cache_key: string
  template_id: string
  listing_id?: string
  agent_id?: string
  rendered_urls: string[]
  expires_at: string
  created_at: string
}

// Render Template Types
export interface RenderTemplateRow {
  id: string
  name: string
  slug: string
  type: 'carousel' | 'story' | 'post' | 'thumbnail'
  category: string
  template_data: Record<string, unknown>
  is_active: boolean
  is_public: boolean
  created_by?: string
  created_at: string
  updated_at?: string
}

// Skill Execution Types
export interface SkillExecutionRow {
  id: string
  skill_id: string
  listing_id?: string
  agent_id?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  input: Record<string, unknown>
  output?: Record<string, unknown>
  error_message?: string
  duration_ms?: number
  created_at: string
  completed_at?: string
}

// Agent Activity Summary (View)
export interface AgentActivitySummaryRow {
  agent_id: string
  agent_name: string
  agent_email: string
  total_listings: number
  total_orders: number
  total_revenue: number
  last_order_at?: string
  last_login_at?: string
  days_since_last_order?: number
}

// Client Message Types
export interface ClientMessageRow {
  id: string
  listing_id: string
  share_link_id?: string | null
  sender_type: 'client' | 'seller' | 'agent' | 'admin'
  sender_id?: string | null
  sender_name?: string | null
  sender_email?: string | null
  content: string
  attachments?: Record<string, unknown>[] | null
  read_at?: string | null
  created_at?: string | null
}

// Package System Types (for service_packages, package_items, package_tiers)
export interface ServicePackageRow {
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

export interface PackageItemRow {
  id: string
  package_id: string
  service_id: string
  is_optional: boolean
  quantity: number
  created_at: string
}

export interface PackageTierRow {
  id: string
  package_id: string
  min_sqft: number
  max_sqft: number | null
  price_cents: number
  tier_name: string | null
  created_at: string
}

// Community Row Type (for communities table not in generated types)
export interface CommunityRow {
  id: string
  slug: string
  name: string
  tagline?: string | null
  description?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  lat: number
  lng: number
  hero_image_url?: string | null
  gallery_urls?: string[] | null
  is_published: boolean
  meta_title?: string | null
  meta_description?: string | null
  focus_keyword?: string | null
  secondary_keywords?: string[] | null
  quick_facts?: CommunityQuickFacts | null
  market_snapshot?: CommunityMarketSnapshot | null
  overview_content?: CommunityOverviewContent | null
  subdivisions?: CommunitySubdivision[] | null
  schools_info?: CommunitySchoolsInfo | null
  featured_agent_ids?: string[] | null
  created_at?: string
  updated_at?: string
}

// Agent Social Links JSONB type
export interface AgentSocialLinks {
  instagram?: string
  facebook?: string
  linkedin?: string
  twitter?: string
  youtube?: string
  tiktok?: string
  website?: string
}

// Extended Agent Row with social_links
export interface AgentRowExtended {
  id: string
  name: string
  email: string
  slug: string
  phone?: string | null
  bio?: string | null
  headshot_url?: string | null
  logo_url?: string | null
  brand_color?: string | null
  instagram_url?: string | null
  social_links?: AgentSocialLinks | null
  credit_balance?: number | null
  lifetime_credits?: number | null
  referral_code?: string | null
  referral_tier?: string | null
  referred_by_id?: string | null
  clerk_user_id?: string | null
  auth_user_id?: string | null
  aryeo_customer_id?: string | null
  last_contacted_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}
