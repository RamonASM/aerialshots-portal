'use client'

import { Clock, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/pricing/config'
import { cn } from '@/lib/utils'

interface RunningTotalProps {
  breakdown: Array<{ name: string; price: number; quantity?: number }>
  subtotal: number
  travelFee?: number
  couponDiscount?: number
  loyaltyDiscount?: number
  total: number
  estimatedDuration?: number // in minutes
  canProceed: boolean
  onContinue: () => void
  isLastStep?: boolean
  className?: string
}

export function RunningTotal({
  breakdown,
  subtotal,
  travelFee = 0,
  couponDiscount = 0,
  loyaltyDiscount = 0,
  total,
  estimatedDuration,
  canProceed,
  onContinue,
  isLastStep = false,
  className,
}: RunningTotalProps) {
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const hasItems = breakdown.length > 0

  return (
    <div
      className={cn(
        'border border-white/[0.08] bg-[#0a0a0a]',
        className
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-white/[0.06]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-1">
          Order Summary
        </p>
        {estimatedDuration && estimatedDuration > 0 && (
          <div className="flex items-center gap-2 text-[13px] text-[#6a6765] mt-2">
            <Clock className="w-3.5 h-3.5" />
            <span>Est. {formatDuration(estimatedDuration)} on-site</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="p-6 space-y-3 max-h-64 overflow-y-auto">
        {hasItems ? (
          breakdown
            .filter((item) => item.price !== 0)
            .map((item, index) => (
              <div key={index} className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <span className="text-[14px] text-[#B5ADA6] block truncate">
                    {item.name}
                  </span>
                  {item.quantity && item.quantity > 1 && (
                    <span className="text-[12px] text-[#6a6765]">
                      x{item.quantity}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[14px] shrink-0',
                    item.price < 0 ? 'text-green-400' : 'text-white'
                  )}
                >
                  {item.price < 0 ? '- ' : ''}
                  {formatCurrency(Math.abs(item.price))}
                </span>
              </div>
            ))
        ) : (
          <p className="text-[14px] text-[#6a6765] text-center py-4">
            No items selected yet
          </p>
        )}
      </div>

      {/* Totals */}
      {hasItems && (
        <div className="p-6 border-t border-white/[0.06] space-y-3">
          <div className="flex justify-between text-[14px]">
            <span className="text-[#8A847F]">Subtotal</span>
            <span className="text-white">{formatCurrency(subtotal)}</span>
          </div>

          {travelFee > 0 && (
            <div className="flex justify-between text-[14px]">
              <span className="text-[#8A847F]">Travel Fee</span>
              <span className="text-white">{formatCurrency(travelFee)}</span>
            </div>
          )}

          {couponDiscount > 0 && (
            <div className="flex justify-between text-[14px]">
              <span className="text-[#8A847F]">Discount</span>
              <span className="text-green-400">-{formatCurrency(couponDiscount)}</span>
            </div>
          )}

          {loyaltyDiscount > 0 && (
            <div className="flex justify-between text-[14px]">
              <span className="text-[#8A847F]">Loyalty Points</span>
              <span className="text-green-400">-{formatCurrency(loyaltyDiscount)}</span>
            </div>
          )}

          <div className="pt-3 border-t border-white/[0.06]">
            <div className="flex justify-between items-baseline">
              <span className="text-[15px] font-medium text-white">Total</span>
              <span className="font-serif text-2xl text-white">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CTA Button */}
      <div className="p-6 pt-0">
        <button
          onClick={onContinue}
          disabled={!canProceed}
          className={cn(
            'w-full h-12 flex items-center justify-center gap-2 text-[15px] font-medium transition-colors',
            canProceed
              ? 'bg-[#A29991] hover:bg-[#B5ADA6] text-black'
              : 'bg-white/[0.06] text-[#6a6765] cursor-not-allowed'
          )}
        >
          {isLastStep ? 'Complete Booking' : 'Continue'}
          {!isLastStep && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
