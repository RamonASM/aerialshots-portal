'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Tag,
  Loader2,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBookingStore } from '@/stores/useBookingStore'

interface CouponCodeInputProps {
  subtotal: number
  onApply: (code: string, discount: number, type: 'percent' | 'fixed') => void
  onRemove: () => void
  className?: string
}

interface CouponValidationResult {
  valid: boolean
  discount: number
  type: 'percent' | 'fixed'
  message: string
  minOrder?: number
  expiresAt?: string
}

export function CouponCodeInput({
  subtotal,
  onApply,
  onRemove,
  className,
}: CouponCodeInputProps) {
  const [code, setCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const appliedCoupon = useBookingStore((s) => s.formData.couponCode)
  const couponDiscount = useBookingStore((s) => s.pricing.couponDiscount)

  const validateCoupon = useCallback(async () => {
    const trimmedCode = code.trim().toUpperCase()

    if (!trimmedCode) {
      setError('Please enter a coupon code')
      return
    }

    setIsValidating(true)
    setError(null)

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: trimmedCode,
          subtotal,
        }),
      })

      const result: CouponValidationResult = await response.json()

      if (!response.ok || !result.valid) {
        setError(result.message || 'Invalid coupon code')
        return
      }

      // Check minimum order
      if (result.minOrder && subtotal < result.minOrder) {
        setError(`Minimum order of $${result.minOrder} required`)
        return
      }

      // Apply the coupon
      onApply(trimmedCode, result.discount, result.type)
      setCode('')
    } catch {
      setError('Failed to validate coupon')
    } finally {
      setIsValidating(false)
    }
  }, [code, subtotal, onApply])

  const handleRemove = useCallback(() => {
    onRemove()
    setCode('')
    setError(null)
  }, [onRemove])

  // If coupon is already applied, show applied state
  if (appliedCoupon) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-500">
                {appliedCoupon}
              </p>
              <p className="text-xs text-green-400/70">
                Saving ${couponDiscount.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-green-500/70 hover:text-green-500 transition-colors"
            aria-label="Remove coupon"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <Input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            placeholder="Coupon code"
            className={cn(
              'pl-10 uppercase',
              error && 'border-red-500 focus-visible:ring-red-500'
            )}
            disabled={isValidating}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                validateCoupon()
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={validateCoupon}
          disabled={isValidating || !code.trim()}
          className="px-6"
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Apply'
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
