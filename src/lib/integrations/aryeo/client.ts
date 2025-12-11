// Aryeo API Client
// Documentation: https://docs.aryeo.com/api/aryeo

import type {
  AryeoListing,
  AryeoListingResponse,
  AryeoListingsResponse,
  AryeoOrder,
  AryeoOrderResponse,
  AryeoOrdersResponse,
} from './types'

const ARYEO_API_BASE = 'https://api.aryeo.com/v1'

interface AryeoClientOptions {
  apiKey: string
}

interface ListingsQueryParams {
  include?: string[]
  filter?: {
    search?: string
    address?: string
    list_agent?: string
    status?: string
    active?: boolean
    price_gte?: number
    price_lte?: number
  }
  sort?: string
  per_page?: number
  page?: number
}

interface OrdersQueryParams {
  include?: string[]
  filter?: {
    search?: string
    status?: string
    fulfillment_status?: string
    payment_status?: string
  }
  sort?: string
  per_page?: number
  page?: number
}

export class AryeoClient {
  private apiKey: string

  constructor(options: AryeoClientOptions) {
    this.apiKey = options.apiKey
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${ARYEO_API_BASE}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Aryeo API error (${response.status}): ${error}`)
    }

    return response.json()
  }

  // Listings
  async getListings(params: ListingsQueryParams = {}): Promise<AryeoListingsResponse> {
    const searchParams = new URLSearchParams()

    if (params.include?.length) {
      searchParams.set('include', params.include.join(','))
    }

    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(`filter[${key}]`, String(value))
        }
      })
    }

    if (params.sort) searchParams.set('sort', params.sort)
    if (params.per_page) searchParams.set('per_page', String(params.per_page))
    if (params.page) searchParams.set('page', String(params.page))

    const query = searchParams.toString()
    const endpoint = `/listings${query ? `?${query}` : ''}`

    return this.request<AryeoListingsResponse>(endpoint)
  }

  async getListing(
    listingId: string,
    include?: string[]
  ): Promise<AryeoListingResponse> {
    const searchParams = new URLSearchParams()

    if (include?.length) {
      searchParams.set('include', include.join(','))
    }

    const query = searchParams.toString()
    const endpoint = `/listings/${listingId}${query ? `?${query}` : ''}`

    return this.request<AryeoListingResponse>(endpoint)
  }

  async getListingWithMedia(listingId: string): Promise<AryeoListing> {
    const response = await this.getListing(listingId, [
      'list_agent',
      'images',
      'videos',
      'floor_plans',
      'interactive_content',
      'property_website',
    ])
    return response.data
  }

  // Orders
  async getOrders(params: OrdersQueryParams = {}): Promise<AryeoOrdersResponse> {
    const searchParams = new URLSearchParams()

    if (params.include?.length) {
      searchParams.set('include', params.include.join(','))
    }

    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(`filter[${key}]`, String(value))
        }
      })
    }

    if (params.sort) searchParams.set('sort', params.sort)
    if (params.per_page) searchParams.set('per_page', String(params.per_page))
    if (params.page) searchParams.set('page', String(params.page))

    const query = searchParams.toString()
    const endpoint = `/orders${query ? `?${query}` : ''}`

    return this.request<AryeoOrdersResponse>(endpoint)
  }

  async getOrder(
    orderId: string,
    include?: string[]
  ): Promise<AryeoOrderResponse> {
    const searchParams = new URLSearchParams()

    if (include?.length) {
      searchParams.set('include', include.join(','))
    }

    const query = searchParams.toString()
    const endpoint = `/orders/${orderId}${query ? `?${query}` : ''}`

    return this.request<AryeoOrderResponse>(endpoint)
  }

  async getOrderWithDetails(orderId: string): Promise<AryeoOrder> {
    const response = await this.getOrder(orderId, [
      'customer',
      'listing',
      'items',
      'address',
    ])
    return response.data
  }

  // Fetch all delivered listings (for initial sync)
  async getAllDeliveredListings(): Promise<AryeoListing[]> {
    const allListings: AryeoListing[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const response = await this.getListings({
        include: ['list_agent', 'images', 'videos', 'floor_plans', 'interactive_content', 'property_website'],
        filter: { active: true },
        per_page: 100,
        page,
        sort: '-updated_at',
      })

      allListings.push(...response.data)

      if (page >= response.meta.last_page) {
        hasMore = false
      } else {
        page++
      }
    }

    return allListings
  }
}

// Singleton instance
let aryeoClient: AryeoClient | null = null

export function getAryeoClient(): AryeoClient {
  if (!aryeoClient) {
    const apiKey = process.env.ARYEO_API_KEY
    if (!apiKey) {
      throw new Error('ARYEO_API_KEY environment variable is not set')
    }
    aryeoClient = new AryeoClient({ apiKey })
  }
  return aryeoClient
}
