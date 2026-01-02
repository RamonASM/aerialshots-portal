import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const validateSchema = z.object({
  code: z.string().min(1).max(50),
  subtotal: z.number().min(0),
})

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

    // Look up the coupon
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: coupon, error } = await (supabase as any)
      .from('discount_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

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
    if (coupon.discount_type === 'percentage') {
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
      type: coupon.discount_type,
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
