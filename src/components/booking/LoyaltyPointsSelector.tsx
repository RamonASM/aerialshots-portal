'use client'

import { useState, useEffect, useCallback } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import {
  Star,
  Gift,
  Info,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBookingStore } from '@/stores/useBookingStore'

interface LoyaltyPointsSelectorProps {
  maxPoints: number
  pointsValue: number // Value in dollars per point (e.g., 0.01 = 1 cent per point)
  orderTotal: number
  onPointsChange: (points: number, value: number) => void
  className?: string
}

export function LoyaltyPointsSelector({
  maxPoints,
  pointsValue,
  orderTotal,
  onPointsChange,
  className,
}: LoyaltyPointsSelectorProps) {
  const [selectedPoints, setSelectedPoints] = useState(0)
  const [isApplied, setIsApplied] = useState(false)

  const appliedPoints = useBookingStore((s) => s.formData.loyaltyPointsToRedeem)
  const appliedValue = useBookingStore((s) => s.formData.loyaltyPointsValue)

  // Calculate max redeemable (can't exceed order total)
  const maxRedeemableValue = Math.min(
    maxPoints * pointsValue,
    orderTotal * 0.5 // Max 50% of order with points
  )
  const maxRedeemablePoints = Math.floor(maxRedeemableValue / pointsValue)

  // Calculate value for selected points
  const selectedValue = selectedPoints * pointsValue

  // Check if already applied
  useEffect(() => {
    if (appliedPoints && appliedPoints > 0) {
      setSelectedPoints(appliedPoints)
      setIsApplied(true)
    }
  }, [appliedPoints])

  const handleApply = useCallback(() => {
    if (selectedPoints > 0) {
      onPointsChange(selectedPoints, selectedValue)
      setIsApplied(true)
    }
  }, [selectedPoints, selectedValue, onPointsChange])

  const handleRemove = useCallback(() => {
    onPointsChange(0, 0)
    setSelectedPoints(0)
    setIsApplied(false)
  }, [onPointsChange])

  // No points available
  if (maxPoints <= 0) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-400" />
          <span className="font-medium text-foreground">Loyalty Points</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {maxPoints.toLocaleString()} pts available
        </span>
      </div>

      {isApplied ? (
        // Applied state
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                <Gift className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-amber-400">
                  {appliedPoints?.toLocaleString()} points applied
                </p>
                <p className="text-sm text-amber-400/70">
                  Saving ${appliedValue?.toFixed(2)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/20"
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        // Selection state
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          {/* Points slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Points to redeem:</span>
              <span className="font-medium text-foreground">
                {selectedPoints.toLocaleString()} pts
              </span>
            </div>

            <Slider
              value={[selectedPoints]}
              onValueChange={([value]) => setSelectedPoints(value)}
              max={maxRedeemablePoints}
              step={100}
              className="w-full"
            />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>0 pts</span>
              <span>{maxRedeemablePoints.toLocaleString()} pts</span>
            </div>
          </div>

          {/* Value preview */}
          <div className="flex items-center justify-between rounded-lg bg-neutral-800/50 px-4 py-3">
            <span className="text-sm text-muted-foreground">Discount value:</span>
            <span className="text-lg font-semibold text-green-400">
              -${selectedValue.toFixed(2)}
            </span>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>
              Points can cover up to 50% of your order.
              Each point = ${pointsValue.toFixed(2)} in savings.
            </span>
          </div>

          {/* Apply button */}
          <Button
            onClick={handleApply}
            disabled={selectedPoints === 0}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Apply {selectedPoints.toLocaleString()} Points
          </Button>
        </div>
      )}
    </div>
  )
}

// Hook to fetch user's loyalty points
export function useLoyaltyPoints() {
  const [points, setPoints] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const response = await fetch('/api/loyalty/points')
        if (response.ok) {
          const data = await response.json()
          setPoints(data.points || 0)
        }
      } catch (err) {
        console.error('Failed to fetch loyalty points:', err)
        setError('Failed to load points')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPoints()
  }, [])

  return { points, isLoading, error }
}
