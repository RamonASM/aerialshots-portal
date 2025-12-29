/**
 * Cubicasa Integration Types
 *
 * Type definitions for the Cubicasa floor plan API.
 * Documentation: https://app.cubi.casa/api/integrate/v3
 */

/**
 * Order status enum
 */
export type CubicasaOrderStatus =
  | 'draft'
  | 'pending'
  | 'scanning'
  | 'processing'
  | 'delivered'
  | 'failed'
  | 'cancelled'

/**
 * Floor plan types
 */
export type FloorPlanType =
  | '2d_basic'
  | '2d_branded'
  | '3d_basic'
  | '3d_branded'

/**
 * Configuration for Cubicasa client
 */
export interface CubicasaConfig {
  apiKey: string
  webhookSecret?: string
  environment: 'staging' | 'production'
  timeout?: number
}

/**
 * Property address for order creation
 */
export interface CubicasaAddress {
  street: string
  city: string
  state: string
  postal_code: string
  country?: string
}

/**
 * Request to create a Cubicasa order
 */
export interface CreateOrderRequest {
  address: CubicasaAddress
  property_type?: 'residential' | 'commercial'
  estimated_sqft?: number
  floor_count?: number
  floor_plan_types?: FloorPlanType[]
  webhook_url?: string
  reference_id?: string
  notes?: string
}

/**
 * Response after creating an order
 */
export interface CreateOrderResponse {
  order_id: string
  status: CubicasaOrderStatus
  go_to_scan_url: string
  created_at: string
}

/**
 * Order details
 */
export interface CubicasaOrder {
  order_id: string
  reference_id?: string
  status: CubicasaOrderStatus
  address: CubicasaAddress
  property_type: string
  floor_count?: number
  estimated_sqft?: number
  measured_sqft?: number
  floor_plan_2d_url?: string
  floor_plan_3d_url?: string
  room_count?: number
  created_at: string
  delivered_at?: string
  model_version?: number
}

/**
 * List orders response
 */
export interface ListOrdersResponse {
  orders: CubicasaOrder[]
  total: number
  page: number
  per_page: number
}

/**
 * GoToScan link for mobile scanning app
 */
export interface GoToScanLink {
  url: string
  expires_at: string
  qr_code_url?: string
}

/**
 * Webhook payload from Cubicasa
 */
export interface CubicasaWebhookPayload {
  event: 'delivered' | 'deleted' | 'model_modified'
  order_id: string
  project_id?: string
  timestamp: string
  data?: {
    floor_plan_url?: string
    floor_plan_2d_url?: string
    floor_plan_3d_url?: string
    square_footage?: number
    room_count?: number
    model_version?: number
  }
}

/**
 * Download format options
 */
export type DownloadFormat =
  | 'pdf'
  | 'png'
  | 'jpg'
  | 'svg'

/**
 * Download request
 */
export interface DownloadRequest {
  order_id: string
  format: DownloadFormat
  floor_plan_type?: '2d' | '3d'
  branded?: boolean
}

/**
 * Redraw/change request
 */
export interface RedrawRequest {
  order_id: string
  notes: string
  areas_to_fix?: string[]
  priority?: 'normal' | 'rush'
}

/**
 * Redraw response
 */
export interface RedrawResponse {
  change_request_id: string
  status: 'pending' | 'in_progress' | 'completed'
  estimated_completion?: string
}
