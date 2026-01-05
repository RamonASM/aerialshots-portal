import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Room types for virtual staging
 */
export type RoomType =
  | 'living_room'
  | 'bedroom'
  | 'master_bedroom'
  | 'kitchen'
  | 'dining_room'
  | 'home_office'
  | 'bathroom'
  | 'outdoor_patio'

/**
 * Furniture styles for virtual staging
 */
export type FurnitureStyle =
  | 'modern'
  | 'contemporary'
  | 'traditional'
  | 'farmhouse'
  | 'mid_century'
  | 'scandinavian'
  | 'coastal'
  | 'luxury'

/**
 * Staging order status
 */
export type StagingOrderStatus =
  | 'draft'
  | 'submitted'
  | 'processing'
  | 'completed'
  | 'cancelled'

/**
 * Staging order item
 */
export interface StagingItem {
  id: string
  order_id: string
  photo_id: string
  photo_url?: string
  room_type: RoomType
  furniture_style: FurnitureStyle
  status: 'pending' | 'processing' | 'completed' | 'failed'
  staged_url?: string
  notes?: string
  created_at: string
}

/**
 * Staging order
 */
export interface StagingOrder {
  id: string
  listing_id: string
  agent_id: string
  status: StagingOrderStatus
  is_rush: boolean
  subtotal: number
  discount_amount?: number
  total: number
  items?: StagingItem[]
  submitted_at?: string
  completed_at?: string
  created_at: string
}

/**
 * Price calculation result
 */
export interface StagingPriceResult {
  photo_count: number
  per_photo_price: number
  subtotal: number
  discount_percent?: number
  discount_amount?: number
  total: number
  turnaround_hours: number
}

/**
 * Pricing constants
 */
const STANDARD_PRICE = 25
const RUSH_PRICE = 50
const STANDARD_TURNAROUND = 24 // hours
const RUSH_TURNAROUND = 4 // hours

/**
 * Get available room types
 */
export function getRoomTypes(): Array<{ id: RoomType; name: string; description: string }> {
  return [
    { id: 'living_room', name: 'Living Room', description: 'Main living area with sofa, chairs, and tables' },
    { id: 'bedroom', name: 'Bedroom', description: 'Standard bedroom with bed, nightstands, and dresser' },
    { id: 'master_bedroom', name: 'Master Bedroom', description: 'Large bedroom with king bed and sitting area' },
    { id: 'kitchen', name: 'Kitchen', description: 'Kitchen with decor, appliances, and accessories' },
    { id: 'dining_room', name: 'Dining Room', description: 'Dining table, chairs, and buffet/sideboard' },
    { id: 'home_office', name: 'Home Office', description: 'Desk, chair, bookshelves, and decor' },
    { id: 'bathroom', name: 'Bathroom', description: 'Towels, accessories, and decorative elements' },
    { id: 'outdoor_patio', name: 'Outdoor/Patio', description: 'Outdoor furniture and landscaping elements' },
  ]
}

/**
 * Get available furniture styles
 */
export function getStagingStyles(): Array<{ id: FurnitureStyle; name: string; description: string }> {
  return [
    { id: 'modern', name: 'Modern', description: 'Clean lines, minimal decor, neutral colors' },
    { id: 'contemporary', name: 'Contemporary', description: 'Current trends with bold accents' },
    { id: 'traditional', name: 'Traditional', description: 'Classic furniture with warm wood tones' },
    { id: 'farmhouse', name: 'Farmhouse', description: 'Rustic elements with modern touches' },
    { id: 'mid_century', name: 'Mid-Century Modern', description: 'Retro 1950s-60s inspired design' },
    { id: 'scandinavian', name: 'Scandinavian', description: 'Light woods, white tones, minimal clutter' },
    { id: 'coastal', name: 'Coastal', description: 'Beach-inspired with blues and natural textures' },
    { id: 'luxury', name: 'Luxury', description: 'High-end furnishings and premium finishes' },
  ]
}

/**
 * Calculate staging price
 */
export function calculateStagingPrice(params: {
  items: Array<{ photo_id: string; room_type: RoomType; style: FurnitureStyle }>
  is_rush?: boolean
}): StagingPriceResult {
  const { items, is_rush = false } = params

  const photoCount = items.length
  const perPhotoPrice = is_rush ? RUSH_PRICE : STANDARD_PRICE
  const subtotal = photoCount * perPhotoPrice

  // Calculate discount
  let discountPercent = 0
  if (photoCount >= 10) {
    discountPercent = 15
  } else if (photoCount >= 5) {
    discountPercent = 10
  }

  const discountAmount = subtotal * (discountPercent / 100)
  const total = subtotal - discountAmount
  const turnaroundHours = is_rush ? RUSH_TURNAROUND : STANDARD_TURNAROUND

  return {
    photo_count: photoCount,
    per_photo_price: perPhotoPrice,
    subtotal,
    discount_percent: discountPercent > 0 ? discountPercent : undefined,
    discount_amount: discountAmount > 0 ? discountAmount : undefined,
    total,
    turnaround_hours: turnaroundHours,
  }
}

/**
 * Create a new staging order
 */
export async function createStagingOrder(params: {
  listing_id: string
  agent_id: string
  is_rush?: boolean
}): Promise<{
  success: boolean
  order?: StagingOrder
  error?: string
}> {
  const { listing_id, agent_id, is_rush = false } = params

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('staging_orders' as any)
      .insert({
        listing_id,
        agent_id,
        status: 'draft' as StagingOrderStatus,
        is_rush,
        subtotal: 0,
        total: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
      .returns<StagingOrder>()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to create staging order.',
      }
    }

    return {
      success: true,
      order: data,
    }
  } catch (error) {
    console.error('[Staging] Error creating order:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get a staging order by ID
 */
export async function getStagingOrder(orderId: string): Promise<StagingOrder | null> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('staging_orders' as any)
      .select('*, items:staging_order_items(*)')
      .eq('id', orderId)
      .single()
      .returns<StagingOrder>()

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error('[Staging] Error getting order:', error)
    return null
  }
}

/**
 * Add a photo to a staging order
 */
export async function addStagingItem(params: {
  order_id: string
  photo_id: string
  photo_url?: string
  room_type: RoomType
  furniture_style: FurnitureStyle
  notes?: string
  check_duplicate?: boolean
}): Promise<{
  success: boolean
  item?: StagingItem
  error?: string
}> {
  const {
    order_id,
    photo_id,
    photo_url,
    room_type,
    furniture_style,
    notes,
    check_duplicate = false,
  } = params

  try {
    const supabase = createAdminClient()

    // Check for duplicate if requested
    if (check_duplicate) {
      const { data: existing } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('staging_order_items' as any)
        .select('id, photo_id')
        .eq('order_id', order_id)
        .eq('photo_id', photo_id)
        .returns<Array<{ id: string; photo_id: string }>>()

      if (existing && existing.length > 0) {
        return {
          success: false,
          error: 'This photo is already in the order.',
        }
      }
    }

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('staging_order_items' as any)
      .insert({
        order_id,
        photo_id,
        photo_url,
        room_type,
        furniture_style,
        notes,
        status: 'pending' as StagingItem['status'],
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
      .returns<StagingItem>()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to add photo to order.',
      }
    }

    return {
      success: true,
      item: data,
    }
  } catch (error) {
    console.error('[Staging] Error adding item:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Remove a photo from a staging order
 */
export async function removeStagingItem(
  orderId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('staging_order_items' as any)
      .delete()
      .eq('id', itemId)
      .eq('order_id', orderId)

    if (error) {
      return {
        success: false,
        error: 'Failed to remove item from order.',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Staging] Error removing item:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Update staging item style
 */
export async function updateStagingItemStyle(
  itemId: string,
  updates: {
    room_type?: RoomType
    furniture_style?: FurnitureStyle
    notes?: string
  }
): Promise<{
  success: boolean
  item?: StagingItem
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('staging_order_items' as any)
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()
      .returns<StagingItem>()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to update item.',
      }
    }

    return {
      success: true,
      item: data,
    }
  } catch (error) {
    console.error('[Staging] Error updating item:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Submit staging order for processing
 */
export async function submitStagingOrder(orderId: string): Promise<{
  success: boolean
  order?: StagingOrder
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // Get order with items
    const { data: order } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('staging_orders' as any)
      .select('*, items:staging_order_items(*)')
      .eq('id', orderId)
      .single()
      .returns<StagingOrder & { items: StagingItem[] }>()

    if (!order) {
      return {
        success: false,
        error: 'Order not found.',
      }
    }

    if (order.status !== 'draft') {
      return {
        success: false,
        error: 'Order is already submitted.',
      }
    }

    if (!order.items || order.items.length === 0) {
      return {
        success: false,
        error: 'At least one item is required to submit.',
      }
    }

    // Calculate pricing
    const pricing = calculateStagingPrice({
      items: order.items.map((item) => ({
        photo_id: item.photo_id,
        room_type: item.room_type,
        style: item.furniture_style,
      })),
      is_rush: order.is_rush,
    })

    // Update order status and pricing
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('staging_orders' as any)
      .update({
        status: 'submitted' as StagingOrderStatus,
        subtotal: pricing.subtotal,
        discount_amount: pricing.discount_amount || 0,
        total: pricing.total,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single()
      .returns<StagingOrder>()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to submit order.',
      }
    }

    return {
      success: true,
      order: data,
    }
  } catch (error) {
    console.error('[Staging] Error submitting order:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get all staging orders for a listing
 */
export async function getStagingOrdersForListing(listingId: string): Promise<StagingOrder[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('staging_orders' as any)
      .select('*, items:staging_order_items(*)')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .returns<StagingOrder[]>()

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[Staging] Error getting orders:', error)
    return []
  }
}
