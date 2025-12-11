// Aryeo API Types
// Based on https://docs.aryeo.com/api/aryeo

export interface AryeoAddress {
  id: string
  latitude: number | null
  longitude: number | null
  street_number: string | null
  street_name: string | null
  unit_number: string | null
  postal_code: string | null
  city: string | null
  city_region: string | null
  county_or_parish: string | null
  state_or_province: string | null
  state_or_province_region: string | null
  country: string | null
  country_region: string | null
  unparsed_address: string | null
  unparsed_address_part_one: string | null
  unparsed_address_part_two: string | null
  is_map_dirty: boolean
}

export interface AryeoBuilding {
  bedrooms: number | null
  bathrooms: number | null
  square_feet: number | null
  year_built: number | null
  bedrooms_formatted: string | null
  bathrooms_formatted: string | null
  square_feet_formatted: string | null
}

export interface AryeoAgent {
  id: string
  object: 'GROUP'
  name: string | null
  email: string | null
  phone: string | null
  website_url: string | null
  logo_url: string | null
  office_name: string | null
  avatar_url: string | null
}

export interface AryeoImage {
  id: string
  thumbnail_url: string
  large_thumbnail_url: string
  original_url: string
  index: number | null
  caption: string | null
  display_in_gallery: boolean
}

export interface AryeoVideo {
  id: string
  title: string | null
  duration: number | null
  display_type: string
  source_type: string
  thumbnail_url: string | null
  playback_url: string | null
  download_url: string | null
  branded_playback_url: string | null
  branded_download_url: string | null
  unbranded_playback_url: string | null
  unbranded_download_url: string | null
}

export interface AryeoFloorPlan {
  id: string
  object: 'FLOOR_PLAN'
  original_url: string
  large_url: string
  thumbnail_url: string
  title: string | null
  index: number | null
}

export interface AryeoInteractiveContent {
  id: string
  title: string | null
  display_type: string
  content_type: string
  url: string
  branded_url: string | null
  unbranded_url: string | null
  thumbnail_url: string | null
}

export interface AryeoPropertyWebsite {
  id: string
  branded_url: string | null
  unbranded_url: string | null
}

export interface AryeoCustomer {
  id: string
  object: 'GROUP'
  name: string | null
  email: string | null
  phone: string | null
  website_url: string | null
  logo_url: string | null
  office_name: string | null
  avatar_url: string | null
}

export interface AryeoListing {
  id: string
  object: 'LISTING'
  address: AryeoAddress
  mls_number: string | null
  type: string | null
  sub_type: string | null
  status: string | null
  standard_status: string | null
  description: string | null
  lot: {
    size_acres: number | null
    open_parking_spaces: number | null
  } | null
  building: AryeoBuilding | null
  price: {
    list_price: number | null
    list_price_formatted: string | null
  } | null
  list_agent: AryeoAgent | null
  co_list_agent: AryeoAgent | null
  images: AryeoImage[]
  videos: AryeoVideo[]
  floor_plans: AryeoFloorPlan[]
  interactive_content: AryeoInteractiveContent[]
  property_website: AryeoPropertyWebsite | null
  downloads_enabled: boolean
  delivery_status: 'DELIVERED' | 'UNDELIVERED' | 'SCHEDULED'
  has_high_resolution_images: boolean
  has_zillow_imx_tour: boolean
  thumbnail_url: string | null
  large_thumbnail_url: string | null
  created_at: string | null
  updated_at: string | null
}

export interface AryeoOrderItem {
  id: string
  title: string | null
  amount: number | null
  quantity: number | null
}

export interface AryeoOrder {
  id: string
  object: 'ORDER'
  identifier: string | null
  number: number | null
  title: string | null
  status: string | null
  order_status: string | null
  fulfillment_status: string | null
  payment_status: string | null
  is_ghost: boolean
  fulfilled_at: string | null
  total_amount: number | null
  balance_amount: number | null
  currency: string | null
  address: AryeoAddress | null
  customer: AryeoCustomer | null
  listing: AryeoListing | null
  items: AryeoOrderItem[]
  downloads_allowed: boolean
  created_at: string | null
  updated_at: string | null
}

export interface AryeoAppointment {
  id: string
  status: string | null
  title: string | null
  start_at: string | null
  end_at: string | null
  duration: number | null
  order: AryeoOrder | null
  address: AryeoAddress | null
}

// API Response Types
export interface AryeoListingResponse {
  status: string
  data: AryeoListing
}

export interface AryeoListingsResponse {
  status: string
  data: AryeoListing[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export interface AryeoOrderResponse {
  status: string
  data: AryeoOrder
}

export interface AryeoOrdersResponse {
  status: string
  data: AryeoOrder[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

// Webhook Event Types (from Zapier)
export type WebhookEventType =
  | 'order.created'
  | 'order.fulfilled'
  | 'order.paid'
  | 'appointment.scheduled'
  | 'appointment.canceled'
  | 'appointment.rescheduled'
  | 'customer.created'
  | 'customer.updated'

export interface WebhookPayload {
  event_type: WebhookEventType
  event_id: string
  timestamp: string
  data: {
    order_id?: string
    listing_id?: string
    customer_id?: string
    appointment_id?: string
    [key: string]: unknown
  }
}
