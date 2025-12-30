'use client'

import { useState, useEffect } from 'react'
import { MapPin, Car, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react'

interface TravelFeeDisplayProps {
  lat: number | null
  lng: number | null
  address?: string
  className?: string
  onFeeCalculated?: (feeCents: number) => void
}

interface TravelFeeResult {
  calculation: {
    distance_miles: number
    fee_cents: number
    fee_formatted: string
    distance_formatted: string
    is_within_free_radius: boolean
    is_round_trip: boolean
  }
  config: {
    free_radius_miles: number
    per_mile_rate: string
    maximum_fee: string
  }
  breakdown: {
    one_way_miles: number
    billable_miles: number
    capped_at_maximum: boolean
  }
}

export function TravelFeeDisplay({
  lat,
  lng,
  address,
  className = '',
  onFeeCalculated,
}: TravelFeeDisplayProps) {
  const [result, setResult] = useState<TravelFeeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTravelFee() {
      if (!lat || !lng) {
        setResult(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          lat: lat.toString(),
          lng: lng.toString(),
        })
        if (address) {
          params.set('address', address)
        }

        const response = await fetch(`/api/booking/travel-fee?${params}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to calculate travel fee')
        }

        setResult(data)
        onFeeCalculated?.(data.calculation.fee_cents)
      } catch (err) {
        console.error('Travel fee error:', err)
        setError(err instanceof Error ? err.message : 'Failed to calculate')
      } finally {
        setLoading(false)
      }
    }

    fetchTravelFee()
  }, [lat, lng, address, onFeeCalculated])

  if (!lat || !lng) {
    return null
  }

  if (loading) {
    return (
      <div
        className={`rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-white/[0.08]" />
          <div className="flex-1">
            <div className="mb-2 h-4 w-32 animate-pulse rounded bg-white/[0.08]" />
            <div className="h-3 w-48 animate-pulse rounded bg-white/[0.08]" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`rounded-xl border border-red-500/20 bg-red-500/10 p-4 ${className}`}
      >
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  if (!result) {
    return null
  }

  const { calculation, config, breakdown } = result
  const isFree = calculation.fee_cents === 0

  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              isFree ? 'bg-green-500/20' : 'bg-blue-500/20'
            }`}
          >
            {isFree ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <Car className="h-5 w-5 text-blue-400" />
            )}
          </div>
          <div>
            <h4 className="font-medium text-white">Travel Fee</h4>
            <p className="text-sm text-[#a1a1a6]">
              {calculation.distance_formatted} from our studio
              {calculation.is_round_trip && ' (round trip)'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span
            className={`text-lg font-semibold ${
              isFree ? 'text-green-400' : 'text-white'
            }`}
          >
            {calculation.fee_formatted}
          </span>
          {calculation.is_within_free_radius && (
            <p className="text-xs text-green-400">Within free zone</p>
          )}
        </div>
      </div>

      {!isFree && (
        <div className="mt-4 space-y-2 border-t border-white/[0.08] pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#8e8e93]">Distance</span>
            <span className="text-[#a1a1a6]">
              {breakdown.one_way_miles.toFixed(1)} mi one way
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#8e8e93]">Free radius</span>
            <span className="text-[#a1a1a6]">
              {config.free_radius_miles} mi
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#8e8e93]">Billable miles</span>
            <span className="text-[#a1a1a6]">
              {breakdown.billable_miles.toFixed(1)} mi × {config.per_mile_rate}
            </span>
          </div>
          {breakdown.capped_at_maximum && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#8e8e93]">Maximum fee applied</span>
              <span className="text-amber-400">{config.maximum_fee}</span>
            </div>
          )}
        </div>
      )}

      {calculation.is_within_free_radius && (
        <div className="mt-3 flex items-center gap-2 text-xs text-[#8e8e93]">
          <MapPin className="h-3.5 w-3.5" />
          <span>
            No travel fee for properties within {config.free_radius_miles} miles
          </span>
        </div>
      )}
    </div>
  )
}
