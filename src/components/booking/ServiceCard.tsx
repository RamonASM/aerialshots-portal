'use client'

import { Plus, Minus, Check, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/pricing/config'

interface ServiceCardProps {
  id: string
  name: string
  description: string
  price: number
  priceType: 'flat' | 'per_unit'
  unit?: string
  duration?: number // in minutes
  popular?: boolean
  isSelected: boolean
  quantity: number
  onToggle: () => void
  onQuantityChange: (quantity: number) => void
}

export function ServiceCard({
  name,
  description,
  price,
  priceType,
  unit,
  duration,
  popular,
  isSelected,
  quantity,
  onToggle,
  onQuantityChange,
}: ServiceCardProps) {
  return (
    <div
      className={cn(
        'relative border transition-all',
        isSelected
          ? 'border-[#A29991] bg-[#A29991]/[0.04]'
          : 'border-white/[0.08] hover:border-white/[0.16]'
      )}
    >
      {popular && (
        <div className="absolute -top-px left-6 px-3 py-1 bg-[#A29991] text-black text-[10px] uppercase tracking-[0.15em] font-medium">
          Popular
        </div>
      )}

      <button
        onClick={onToggle}
        className="w-full p-6 text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-medium text-white mb-1">{name}</h3>
            <p className="text-[14px] text-[#8A847F] leading-relaxed">{description}</p>

            {duration && (
              <div className="flex items-center gap-1.5 mt-3 text-[13px] text-[#6a6765]">
                <Clock className="w-3.5 h-3.5" />
                <span>{duration} min</span>
              </div>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="text-[17px] font-medium text-white">
              {formatCurrency(price)}
            </div>
            {priceType === 'per_unit' && unit && (
              <div className="text-[13px] text-[#6a6765]">per {unit}</div>
            )}
          </div>
        </div>

        {/* Selection indicator */}
        <div
          className={cn(
            'absolute top-6 right-6 w-5 h-5 border flex items-center justify-center transition-colors',
            isSelected
              ? 'bg-[#A29991] border-[#A29991]'
              : 'border-white/[0.24]'
          )}
        >
          {isSelected && <Check className="w-3.5 h-3.5 text-black" />}
        </div>
      </button>

      {/* Quantity controls (for per_unit items when selected) */}
      {isSelected && priceType === 'per_unit' && (
        <div className="px-6 pb-6 pt-0">
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
            <span className="text-[14px] text-[#B5ADA6]">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (quantity > 1) onQuantityChange(quantity - 1)
                }}
                disabled={quantity <= 1}
                className={cn(
                  'w-8 h-8 flex items-center justify-center border transition-colors',
                  quantity <= 1
                    ? 'border-white/[0.06] text-[#6a6765] cursor-not-allowed'
                    : 'border-white/[0.12] text-white hover:border-[#A29991] hover:text-[#A29991]'
                )}
              >
                <Minus className="w-4 h-4" />
              </button>

              <span className="w-8 text-center text-[17px] font-medium text-white">
                {quantity}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onQuantityChange(quantity + 1)
                }}
                className="w-8 h-8 flex items-center justify-center border border-white/[0.12] text-white hover:border-[#A29991] hover:text-[#A29991] transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
