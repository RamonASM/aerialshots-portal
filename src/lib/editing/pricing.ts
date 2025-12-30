import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Types of photo edits available
 */
export type EditType =
  | 'sky_replacement'
  | 'object_removal'
  | 'virtual_twilight'
  | 'color_correction'
  | 'grass_green'
  | 'fire_replacement'
  | 'tv_screen'
  | 'advanced_retouch'

/**
 * Edit request item
 */
export interface EditItem {
  photo_id: string
  edit_type: EditType
  notes?: string
}

/**
 * Edit price calculation result
 */
export interface EditPriceResult {
  items: Array<{ photo_id: string; edit_type: EditType; price: number }>
  photo_count: number
  subtotal: number
  discount_percent?: number
  discount_amount?: number
  rush_fee?: number
  total: number
}

/**
 * Revision allowance for an order
 */
export interface RevisionAllowance {
  order_id: string
  free_revisions: number
  used_revisions: number
  remaining_free: number
  paid_revision_price: number
}

/**
 * Turnaround estimate
 */
export interface TurnaroundEstimate {
  hours: number
  business_days: number
  expected_completion?: string
}

/**
 * Base pricing for each edit type
 */
const EDIT_TYPE_PRICES: Record<EditType, number> = {
  sky_replacement: 15,
  object_removal: 20,
  virtual_twilight: 25,
  color_correction: 15,
  grass_green: 10,
  fire_replacement: 20,
  tv_screen: 15,
  advanced_retouch: 50,
}

/**
 * Rush fee as percentage of subtotal
 */
const RUSH_FEE_PERCENT = 0.5 // 50%

/**
 * Default revision settings
 */
const DEFAULT_FREE_REVISIONS = 2
const PAID_REVISION_PRICE = 25

/**
 * Get the base price for an edit type
 */
export function getEditTypePrice(editType: EditType): number {
  return EDIT_TYPE_PRICES[editType] || 0
}

/**
 * Get bulk discount percentage based on photo count
 */
export function getBulkEditDiscount(photoCount: number): number {
  if (photoCount >= 20) return 0.20 // 20% off
  if (photoCount >= 10) return 0.15 // 15% off
  if (photoCount >= 5) return 0.10 // 10% off
  return 0
}

/**
 * Calculate total price for edit request
 */
export function calculateEditPrice(params: {
  edits: EditItem[]
  is_rush?: boolean
  apply_bulk_discount?: boolean
}): EditPriceResult {
  const { edits, is_rush = false, apply_bulk_discount = false } = params

  // Build itemized list
  const items = edits.map((edit) => ({
    photo_id: edit.photo_id,
    edit_type: edit.edit_type,
    price: getEditTypePrice(edit.edit_type),
  }))

  // Count unique photos
  const uniquePhotos = new Set(edits.map((e) => e.photo_id))
  const photoCount = uniquePhotos.size

  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)

  // Calculate discount
  let discountPercent = 0
  let discountAmount = 0
  if (apply_bulk_discount) {
    discountPercent = getBulkEditDiscount(photoCount)
    discountAmount = subtotal * discountPercent
  }

  // Calculate rush fee
  const rushFee = is_rush ? subtotal * RUSH_FEE_PERCENT : 0

  // Calculate total
  const total = subtotal - discountAmount + rushFee

  return {
    items,
    photo_count: photoCount,
    subtotal,
    discount_percent: discountPercent > 0 ? discountPercent : undefined,
    discount_amount: discountAmount > 0 ? discountAmount : undefined,
    rush_fee: rushFee > 0 ? rushFee : undefined,
    total,
  }
}

/**
 * Get revision allowance for an order
 */
export async function getRevisionAllowance(orderId: string): Promise<RevisionAllowance> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('orders')
      .select('id, revision_count, max_free_revisions')
      .eq('id', orderId)
      .single() as {
        data: {
          id: string
          revision_count: number
          max_free_revisions: number
        } | null
      }

    const freeRevisions = data?.max_free_revisions ?? DEFAULT_FREE_REVISIONS
    const usedRevisions = data?.revision_count ?? 0
    const remainingFree = Math.max(0, freeRevisions - usedRevisions)

    return {
      order_id: orderId,
      free_revisions: freeRevisions,
      used_revisions: usedRevisions,
      remaining_free: remainingFree,
      paid_revision_price: PAID_REVISION_PRICE,
    }
  } catch (error) {
    console.error('[Editing] Error getting revision allowance:', error)
    return {
      order_id: orderId,
      free_revisions: DEFAULT_FREE_REVISIONS,
      used_revisions: 0,
      remaining_free: DEFAULT_FREE_REVISIONS,
      paid_revision_price: PAID_REVISION_PRICE,
    }
  }
}

/**
 * Check if order is within free revision allowance
 */
export async function isWithinFreeRevisions(orderId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('orders')
      .select('revision_count, max_free_revisions')
      .eq('id', orderId)
      .single() as {
        data: {
          revision_count: number
          max_free_revisions: number
        } | null
      }

    if (!data) return true // Default to free if no data

    const maxFree = data.max_free_revisions ?? DEFAULT_FREE_REVISIONS
    return data.revision_count < maxFree
  } catch (error) {
    console.error('[Editing] Error checking revisions:', error)
    return true // Default to free on error
  }
}

/**
 * Track revision usage for an order
 */
export async function trackRevisionUsage(orderId: string): Promise<{
  success: boolean
  new_count?: number
  now_requires_payment?: boolean
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // Get current count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: current } = await (supabase as any)
      .from('orders')
      .select('revision_count, max_free_revisions')
      .eq('id', orderId)
      .single() as {
        data: {
          revision_count: number
          max_free_revisions?: number
        } | null
      }

    const currentCount = current?.revision_count ?? 0
    const maxFree = current?.max_free_revisions ?? DEFAULT_FREE_REVISIONS
    const newCount = currentCount + 1

    // Update count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('orders')
      .update({ revision_count: newCount })
      .eq('id', orderId)
      .select('revision_count')
      .single() as {
        data: { revision_count: number } | null
        error: Error | null
      }

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to track revision usage.',
      }
    }

    return {
      success: true,
      new_count: data.revision_count,
      now_requires_payment: data.revision_count >= maxFree,
    }
  } catch (error) {
    console.error('[Editing] Error tracking revision:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get estimated turnaround time for edit request
 */
export function getEstimatedTurnaround(params: {
  edits: EditItem[]
  is_rush?: boolean
}): TurnaroundEstimate {
  const { edits, is_rush = false } = params

  // Rush orders have fixed 4-hour turnaround
  if (is_rush) {
    return {
      hours: 4,
      business_days: 0,
    }
  }

  // Check for complex edits
  const hasComplexEdits = edits.some(
    (e) => e.edit_type === 'advanced_retouch'
  )

  // Base turnaround based on complexity
  let baseHours = hasComplexEdits ? 48 : 24

  // Add time for bulk orders
  const editCount = edits.length
  if (editCount >= 10) {
    baseHours = Math.max(baseHours, 48)
  }
  if (editCount >= 20) {
    baseHours = Math.max(baseHours, 72)
  }

  // Convert to business days
  const businessDays = Math.ceil(baseHours / 24)

  return {
    hours: baseHours,
    business_days: businessDays,
  }
}

/**
 * Get all available edit types with their prices
 */
export function getEditTypeCatalog(): Array<{
  type: EditType
  name: string
  description: string
  price: number
}> {
  return [
    {
      type: 'sky_replacement',
      name: 'Sky Replacement',
      description: 'Replace overcast or dull skies with vibrant blue skies',
      price: EDIT_TYPE_PRICES.sky_replacement,
    },
    {
      type: 'object_removal',
      name: 'Object Removal',
      description: 'Remove unwanted objects, cars, or distractions from photos',
      price: EDIT_TYPE_PRICES.object_removal,
    },
    {
      type: 'virtual_twilight',
      name: 'Virtual Twilight',
      description: 'Transform daytime exteriors into stunning twilight shots',
      price: EDIT_TYPE_PRICES.virtual_twilight,
    },
    {
      type: 'color_correction',
      name: 'Color Correction',
      description: 'Professional color grading and white balance adjustment',
      price: EDIT_TYPE_PRICES.color_correction,
    },
    {
      type: 'grass_green',
      name: 'Grass Enhancement',
      description: 'Make lawns and grass appear lush and green',
      price: EDIT_TYPE_PRICES.grass_green,
    },
    {
      type: 'fire_replacement',
      name: 'Fire in Fireplace',
      description: 'Add realistic fire to fireplace photos',
      price: EDIT_TYPE_PRICES.fire_replacement,
    },
    {
      type: 'tv_screen',
      name: 'TV Screen Replacement',
      description: 'Replace TV screens with lifestyle imagery',
      price: EDIT_TYPE_PRICES.tv_screen,
    },
    {
      type: 'advanced_retouch',
      name: 'Advanced Retouching',
      description: 'Complex edits requiring extensive manual work',
      price: EDIT_TYPE_PRICES.advanced_retouch,
    },
  ]
}
