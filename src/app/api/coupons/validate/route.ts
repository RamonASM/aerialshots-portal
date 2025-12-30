import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const validateSchema = z.object({
  code: z.string().min(1).max(50),
  subtotal: z.number().min(0),
})

type CouponData = {
  expires_at: string | null
  max_uses: number | null
  current_uses: number
  min_order_cents: number | null
  discount_type: string
  discount_value: number
  max_discount_cents: number | null
  description: string | null
}

/**
 * POST /api/coupons/validate
 * Validate a coupon code and return discount info
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parseResult = validateSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { valid: false, message: 'Invalid request' },
        { status: 400 }
      )
    }

    const { code, subtotal } = parseResult.data
    const supabase = createAdminClient()

    // Look up the coupon - use any to bypass type check for missing table type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('discount_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

    const coupon = data as CouponData | null

    if (error || !coupon) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid coupon code',
      })
    }

    // Check if expired
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        message: 'This coupon has expired',
      })
    }

    // Check usage limit
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return NextResponse.json({
        valid: false,
        message: 'This coupon has reached its usage limit',
      })
    }

    // Check minimum order
    if (coupon.min_order_cents && subtotal * 100 < coupon.min_order_cents) {
      const minOrder = coupon.min_order_cents / 100
      return NextResponse.json({
        valid: false,
        message: `Minimum order of $${minOrder} required`,
        minOrder,
      })
    }

    // Calculate discount
    let discount = 0
    if (coupon.discount_type === 'percent') {
      discount = coupon.discount_value
      // Cap percentage discounts if there's a max
      if (coupon.max_discount_cents) {
        const calculatedDiscount = Math.round(subtotal * (coupon.discount_value / 100))
        const maxDiscount = coupon.max_discount_cents / 100
        discount = Math.min(calculatedDiscount / subtotal * 100, coupon.discount_value)
      }
    } else {
      // Fixed amount
      discount = coupon.discount_value / 100 // Convert cents to dollars
    }

    return NextResponse.json({
      valid: true,
      discount,
      type: coupon.discount_type as 'percent' | 'fixed',
      message: coupon.description || 'Coupon applied!',
      minOrder: coupon.min_order_cents ? coupon.min_order_cents / 100 : undefined,
      expiresAt: coupon.expires_at,
    })
  } catch (error) {
    console.error('Coupon validation error:', error)
    return NextResponse.json(
      { valid: false, message: 'Failed to validate coupon' },
      { status: 500 }
    )
  }
}
