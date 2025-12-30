import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Coupon type
 */
export type CouponType = 'percentage' | 'fixed'

/**
 * Coupon
 */
export interface Coupon {
  id: string
  code: string
  type: CouponType
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

/**
 * Coupon usage record
 */
export interface CouponUsage {
  id: string
  coupon_id: string
  agent_id: string
  order_id: string
  discount_amount: number
  used_at: string
}

/**
 * Coupon validation result
 */
export interface CouponValidationResult {
  valid: boolean
  coupon?: Coupon
  discount_amount?: number
  error?: string
}

/**
 * Coupon stats
 */
export interface CouponStats {
  total_uses: number
  total_discount: number
  unique_users: number
  avg_discount: number
}

/**
 * Get coupon by code
 */
export async function getCouponByCode(code: string): Promise<Coupon | null> {
  try {
    const supabase = createAdminClient()
    const normalizedCode = code.toUpperCase().trim()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('coupons')
      .select('*')
      .eq('code', normalizedCode)
      .single() as { data: Coupon | null; error: Error | null }

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error('[Coupons] Error getting coupon:', error)
    return null
  }
}

/**
 * Validate a coupon code
 */
export async function validateCoupon(
  code: string,
  options: {
    order_total: number
    agent_id?: string
    check_first_order?: boolean
  }
): Promise<CouponValidationResult> {
  const { order_total, agent_id, check_first_order = false } = options

  try {
    const supabase = createAdminClient()
    const normalizedCode = code.toUpperCase().trim()

    // Get coupon
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: coupon } = await (supabase as any)
      .from('coupons')
      .select('*')
      .eq('code', normalizedCode)
      .single() as { data: Coupon | null }

    if (!coupon) {
      return {
        valid: false,
        error: 'Coupon code not found.',
      }
    }

    // Check if active
    if (!coupon.is_active) {
      return {
        valid: false,
        error: 'This coupon is inactive.',
      }
    }

    // Check expiration
    if (coupon.expires_at) {
      const expiresAt = new Date(coupon.expires_at)
      if (expiresAt < new Date()) {
        return {
          valid: false,
          error: 'This coupon has expired.',
        }
      }
    }

    // Check max uses
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return {
        valid: false,
        error: 'This coupon has reached its usage limit.',
      }
    }

    // Check minimum order amount
    if (coupon.min_order_amount && order_total < coupon.min_order_amount) {
      return {
        valid: false,
        error: `Minimum order of $${coupon.min_order_amount} required.`,
      }
    }

    // Check first order only restriction
    if (coupon.first_order_only && check_first_order && agent_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: previousOrders } = await (supabase as any)
        .from('orders')
        .select('id')
        .eq('agent_id', agent_id)
        .eq('status', 'completed')
        .limit(1) as { data: Array<{ id: string }> | null }

      if (previousOrders && previousOrders.length > 0) {
        return {
          valid: false,
          error: 'This coupon is for first orders only.',
        }
      }
    }

    // Calculate discount
    let discountAmount: number
    if (coupon.type === 'percentage') {
      discountAmount = (order_total * coupon.value) / 100
    } else {
      discountAmount = coupon.value
    }

    // Cap discount at order total
    discountAmount = Math.min(discountAmount, order_total)

    return {
      valid: true,
      coupon,
      discount_amount: Math.round(discountAmount * 100) / 100,
    }
  } catch (error) {
    console.error('[Coupons] Error validating coupon:', error)
    return {
      valid: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Apply a coupon to an order
 */
export async function applyCoupon(params: {
  code: string
  order_id: string
  agent_id: string
  discount_amount: number
  check_one_per_user?: boolean
}): Promise<{
  success: boolean
  usage?: CouponUsage
  error?: string
}> {
  const { code, order_id, agent_id, discount_amount, check_one_per_user = false } = params

  try {
    const supabase = createAdminClient()
    const normalizedCode = code.toUpperCase().trim()

    // Get coupon
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: coupon } = await (supabase as any)
      .from('coupons')
      .select('*')
      .eq('code', normalizedCode)
      .single() as { data: Coupon | null }

    if (!coupon) {
      return {
        success: false,
        error: 'Coupon not found.',
      }
    }

    // Check one per user restriction
    if ((coupon.one_per_user || check_one_per_user) && agent_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: previousUsage } = await (supabase as any)
        .from('coupon_usages')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('agent_id', agent_id)
        .limit(1) as { data: Array<{ id: string }> | null }

      if (previousUsage && previousUsage.length > 0) {
        return {
          success: false,
          error: 'You have already used this coupon.',
        }
      }
    }

    // Record usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: usage, error: usageError } = await (supabase as any)
      .from('coupon_usages')
      .insert({
        coupon_id: coupon.id,
        agent_id,
        order_id,
        discount_amount,
        used_at: new Date().toISOString(),
      })
      .select()
      .single() as { data: CouponUsage | null; error: Error | null }

    if (usageError || !usage) {
      return {
        success: false,
        error: 'Failed to record coupon usage.',
      }
    }

    // Increment usage count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('coupons')
      .update({
        current_uses: coupon.current_uses + 1,
        total_discount_given: (coupon.total_discount_given || 0) + discount_amount,
      })
      .eq('id', coupon.id)

    return {
      success: true,
      usage,
    }
  } catch (error) {
    console.error('[Coupons] Error applying coupon:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Create a new coupon
 */
export async function createCoupon(params: {
  code: string
  type: CouponType
  value: number
  expires_at?: string
  max_uses?: number
  min_order_amount?: number
  one_per_user?: boolean
  first_order_only?: boolean
  description?: string
}): Promise<{
  success: boolean
  coupon?: Coupon
  error?: string
}> {
  const {
    code,
    type,
    value,
    expires_at,
    max_uses,
    min_order_amount,
    one_per_user,
    first_order_only,
    description,
  } = params

  try {
    const supabase = createAdminClient()
    const normalizedCode = code.toUpperCase().trim()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('coupons')
      .insert({
        code: normalizedCode,
        type,
        value,
        expires_at,
        max_uses,
        min_order_amount,
        one_per_user: one_per_user || false,
        first_order_only: first_order_only || false,
        description,
        is_active: true,
        current_uses: 0,
        total_discount_given: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single() as { data: Coupon | null; error: { code: string } | null }

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Coupon code already exists.',
        }
      }
      return {
        success: false,
        error: 'Failed to create coupon.',
      }
    }

    return {
      success: true,
      coupon: data!,
    }
  } catch (error) {
    console.error('[Coupons] Error creating coupon:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Deactivate a coupon
 */
export async function deactivateCoupon(couponId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('coupons')
      .update({ is_active: false })
      .eq('id', couponId)

    if (error) {
      return {
        success: false,
        error: 'Failed to deactivate coupon.',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Coupons] Error deactivating coupon:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get coupon usage history
 */
export async function getCouponUsage(couponId: string): Promise<CouponUsage[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('coupon_usages')
      .select('*')
      .eq('coupon_id', couponId)
      .order('used_at', { ascending: false }) as {
        data: CouponUsage[] | null
        error: Error | null
      }

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[Coupons] Error getting usage:', error)
    return []
  }
}

/**
 * Get coupon statistics
 */
export async function getCouponStats(couponId: string): Promise<CouponStats | null> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: coupon } = await (supabase as any)
      .from('coupons')
      .select('current_uses, total_discount_given')
      .eq('id', couponId)
      .single() as {
        data: { current_uses: number; total_discount_given: number } | null
      }

    if (!coupon) {
      return null
    }

    // Get unique users
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: usages } = await (supabase as any)
      .from('coupon_usages')
      .select('agent_id')
      .eq('coupon_id', couponId) as { data: Array<{ agent_id: string }> | null }

    const uniqueUsers = new Set(usages?.map((u) => u.agent_id) || []).size

    return {
      total_uses: coupon.current_uses,
      total_discount: coupon.total_discount_given,
      unique_users: uniqueUsers,
      avg_discount: coupon.current_uses > 0
        ? Math.round((coupon.total_discount_given / coupon.current_uses) * 100) / 100
        : 0,
    }
  } catch (error) {
    console.error('[Coupons] Error getting stats:', error)
    return null
  }
}

/**
 * Get all active coupons
 */
export async function getActiveCoupons(): Promise<Coupon[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false }) as {
        data: Coupon[] | null
        error: Error | null
      }

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[Coupons] Error getting active coupons:', error)
    return []
  }
}
