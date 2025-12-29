/**
 * Cubicasa Client
 *
 * API client for the Cubicasa floor plan service.
 * Handles order creation, status checking, and floor plan downloads.
 *
 * Documentation: https://app.cubi.casa/api/integrate/v3
 */

import { apiLogger, formatError } from '@/lib/logger'
import type {
  CubicasaConfig,
  CreateOrderRequest,
  CreateOrderResponse,
  CubicasaOrder,
  ListOrdersResponse,
  GoToScanLink,
  DownloadFormat,
  RedrawRequest,
  RedrawResponse,
} from './types'

// API base URLs
const CUBICASA_STAGING_URL = 'https://staging-api.cubi.casa/api/v3'
const CUBICASA_PRODUCTION_URL = 'https://api.cubi.casa/api/v3'

// Default timeout
const DEFAULT_TIMEOUT = 30000

export class CubicasaClient {
  private config: Required<Omit<CubicasaConfig, 'webhookSecret'>> & { webhookSecret?: string }
  private baseUrl: string

  constructor(config?: Partial<CubicasaConfig>) {
    const environment = config?.environment || process.env.CUBICASA_ENVIRONMENT || 'production'

    this.config = {
      apiKey: config?.apiKey || process.env.CUBICASA_API_KEY || '',
      webhookSecret: config?.webhookSecret || process.env.CUBICASA_WEBHOOK_SECRET,
      environment: environment as 'staging' | 'production',
      timeout: config?.timeout || DEFAULT_TIMEOUT,
    }

    this.baseUrl = environment === 'production'
      ? CUBICASA_PRODUCTION_URL
      : CUBICASA_STAGING_URL
  }

  /**
   * Check if Cubicasa is configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey
  }

  /**
   * Make authenticated API request to Cubicasa
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        apiLogger.error(
          { endpoint, status: response.status, error: errorText },
          'Cubicasa API error'
        )
        throw new Error(`Cubicasa API error: ${response.status} - ${errorText}`)
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Cubicasa request timeout after ${this.config.timeout}ms`)
      }

      throw error
    }
  }

  /**
   * Create a new floor plan order
   */
  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    const webhookUrl = request.webhook_url ||
      process.env.CUBICASA_WEBHOOK_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cubicasa`

    const payload = {
      address: {
        street: request.address.street,
        city: request.address.city,
        state: request.address.state,
        postal_code: request.address.postal_code,
        country: request.address.country || 'US',
      },
      property_type: request.property_type || 'residential',
      estimated_sqft: request.estimated_sqft,
      floor_count: request.floor_count || 1,
      floor_plan_types: request.floor_plan_types || ['2d_basic'],
      webhook_url: webhookUrl,
      reference_id: request.reference_id,
      notes: request.notes,
    }

    apiLogger.info(
      {
        address: request.address.street,
        city: request.address.city,
        referenceId: request.reference_id,
      },
      'Creating Cubicasa order'
    )

    const response = await this.request<CreateOrderResponse>('POST', '/orders', payload)

    apiLogger.info(
      {
        orderId: response.order_id,
        goToScanUrl: response.go_to_scan_url,
      },
      'Cubicasa order created'
    )

    return response
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<CubicasaOrder> {
    return this.request<CubicasaOrder>('GET', `/orders/${orderId}`)
  }

  /**
   * List orders with optional filters
   */
  async listOrders(options: {
    status?: string
    reference_id?: string
    page?: number
    per_page?: number
  } = {}): Promise<ListOrdersResponse> {
    const params = new URLSearchParams()

    if (options.status) params.append('status', options.status)
    if (options.reference_id) params.append('reference_id', options.reference_id)
    if (options.page) params.append('page', String(options.page))
    if (options.per_page) params.append('per_page', String(options.per_page))

    const queryString = params.toString()
    const endpoint = queryString ? `/orders?${queryString}` : '/orders'

    return this.request<ListOrdersResponse>('GET', endpoint)
  }

  /**
   * Generate GoToScan link for mobile scanning
   */
  async generateGoToScanLink(orderId: string): Promise<GoToScanLink> {
    const response = await this.request<GoToScanLink>(
      'POST',
      `/orders/${orderId}/go-to-scan`
    )

    apiLogger.info(
      {
        orderId,
        expiresAt: response.expires_at,
      },
      'GoToScan link generated'
    )

    return response
  }

  /**
   * Get floor plan download URL
   */
  async getDownloadUrl(
    orderId: string,
    format: DownloadFormat = 'png',
    floorPlanType: '2d' | '3d' = '2d',
    branded = false
  ): Promise<{ url: string; expires_at: string }> {
    const params = new URLSearchParams({
      format,
      type: floorPlanType,
      branded: String(branded),
    })

    return this.request<{ url: string; expires_at: string }>(
      'GET',
      `/orders/${orderId}/download?${params.toString()}`
    )
  }

  /**
   * Request a redraw/modification
   */
  async requestRedraw(request: RedrawRequest): Promise<RedrawResponse> {
    apiLogger.info(
      {
        orderId: request.order_id,
        priority: request.priority,
      },
      'Requesting Cubicasa redraw'
    )

    const response = await this.request<RedrawResponse>(
      'POST',
      `/orders/${request.order_id}/redraw`,
      {
        notes: request.notes,
        areas_to_fix: request.areas_to_fix,
        priority: request.priority || 'normal',
      }
    )

    return response
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<void>('DELETE', `/orders/${orderId}`)

      apiLogger.info({ orderId }, 'Cubicasa order cancelled')

      return { success: true, message: 'Order cancelled' }
    } catch (error) {
      apiLogger.warn({ orderId, error: formatError(error) }, 'Failed to cancel Cubicasa order')
      return { success: false, message: 'Failed to cancel order' }
    }
  }

  /**
   * Create order for a listing and return GoToScan link
   */
  async createOrderForListing(listing: {
    id: string
    address: string
    city: string
    state: string
    zip: string
    sqft?: number
    beds?: number
  }): Promise<{
    orderId: string
    goToScanUrl: string
    status: string
  }> {
    const response = await this.createOrder({
      address: {
        street: listing.address,
        city: listing.city,
        state: listing.state,
        postal_code: listing.zip,
      },
      estimated_sqft: listing.sqft,
      floor_count: listing.beds && listing.beds > 3 ? 2 : 1, // Estimate floors from beds
      reference_id: listing.id,
      floor_plan_types: ['2d_basic', '3d_basic'],
    })

    return {
      orderId: response.order_id,
      goToScanUrl: response.go_to_scan_url,
      status: response.status,
    }
  }
}

// Singleton instance
let cubicasaClient: CubicasaClient | null = null

/**
 * Get the singleton Cubicasa client instance
 */
export function getCubicasaClient(): CubicasaClient {
  if (!cubicasaClient) {
    cubicasaClient = new CubicasaClient()
  }
  return cubicasaClient
}

/**
 * Create a new Cubicasa client with custom configuration
 */
export function createCubicasaClient(config: Partial<CubicasaConfig>): CubicasaClient {
  return new CubicasaClient(config)
}
