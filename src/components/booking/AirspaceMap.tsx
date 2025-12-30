'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  MapPin,
  Plane,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AirspaceCheckResult, AirspaceRestriction } from '@/lib/integrations/aloft/types'

interface AirspaceMapProps {
  lat: number
  lng: number
  address?: string
  onStatusChange?: (canFly: boolean, details: AirspaceCheckResult) => void
  className?: string
}

type AirspaceStatus = 'loading' | 'clear' | 'restricted' | 'prohibited' | 'error'

const statusConfig: Record<AirspaceStatus, {
  icon: typeof CheckCircle2
  color: string
  bgColor: string
  borderColor: string
  label: string
}> = {
  loading: {
    icon: Loader2,
    color: 'text-neutral-400',
    bgColor: 'bg-neutral-500/10',
    borderColor: 'border-neutral-500/20',
    label: 'Checking airspace...',
  },
  clear: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    label: 'Clear for drone operations',
  },
  restricted: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    label: 'Authorization required',
  },
  prohibited: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    label: 'No-fly zone',
  },
  error: {
    icon: Info,
    color: 'text-neutral-400',
    bgColor: 'bg-neutral-500/10',
    borderColor: 'border-neutral-500/20',
    label: 'Unable to verify',
  },
}

export function AirspaceMap({
  lat,
  lng,
  address,
  onStatusChange,
  className,
}: AirspaceMapProps) {
  const [status, setStatus] = useState<AirspaceStatus>('loading')
  const [result, setResult] = useState<AirspaceCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkAirspace = useCallback(async () => {
    if (!lat || !lng) return

    setStatus('loading')
    setError(null)

    try {
      const response = await fetch('/api/airspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      })

      if (!response.ok) {
        throw new Error('Failed to check airspace')
      }

      const data = await response.json()
      setResult(data)

      // Determine status from result
      if (!data.can_fly) {
        setStatus('prohibited')
      } else if (data.needs_authorization) {
        setStatus('restricted')
      } else {
        setStatus('clear')
      }

      onStatusChange?.(data.can_fly, data)
    } catch (err) {
      console.error('Airspace check error:', err)
      setError('Unable to verify airspace status')
      setStatus('error')
    }
  }, [lat, lng, onStatusChange])

  useEffect(() => {
    checkAirspace()
  }, [checkAirspace])

  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <div className={cn('space-y-4', className)}>
      {/* Status Card */}
      <div
        className={cn(
          'rounded-xl border p-4 transition-all duration-300',
          config.bgColor,
          config.borderColor
        )}
      >
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div
            className={cn(
              'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full',
              status === 'loading' ? 'bg-neutral-500/20' : config.bgColor
            )}
          >
            <StatusIcon
              className={cn(
                'h-6 w-6',
                config.color,
                status === 'loading' && 'animate-spin'
              )}
            />
          </div>

          {/* Status Info */}
          <div className="flex-1 min-w-0">
            <h3 className={cn('font-semibold', config.color)}>
              {config.label}
            </h3>

            {result && (
              <div className="mt-1 space-y-1">
                <p className="text-sm text-muted-foreground">
                  Class {result.airspace_class} airspace
                  {result.max_altitude_ft > 0 && (
                    <> • Clear to {result.max_altitude_ft}ft</>
                  )}
                </p>

                {result.laanc_available && (
                  <div className="flex items-center gap-1.5 text-xs text-green-400">
                    <Clock className="h-3 w-3" />
                    <span>LAANC instant approval available</span>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            )}
          </div>
        </div>

        {/* Warnings */}
        {result?.warnings && result.warnings.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
            {result.warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-amber-400">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Airspace Visual */}
      <div className="relative rounded-xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden">
        {/* Map Placeholder - would use actual map in production */}
        <div className="relative h-48 bg-gradient-to-br from-[#0a1929] to-[#0a0a0a]">
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />

          {/* Airspace rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Outer ring */}
            <div
              className={cn(
                'absolute h-40 w-40 rounded-full border-2 opacity-20',
                status === 'clear' && 'border-green-500',
                status === 'restricted' && 'border-amber-500',
                status === 'prohibited' && 'border-red-500',
                (status === 'loading' || status === 'error') && 'border-neutral-500'
              )}
            />
            {/* Middle ring */}
            <div
              className={cn(
                'absolute h-28 w-28 rounded-full border opacity-30',
                status === 'clear' && 'border-green-500',
                status === 'restricted' && 'border-amber-500',
                status === 'prohibited' && 'border-red-500',
                (status === 'loading' || status === 'error') && 'border-neutral-500'
              )}
            />
            {/* Inner ring */}
            <div
              className={cn(
                'absolute h-16 w-16 rounded-full border opacity-40',
                status === 'clear' && 'border-green-500',
                status === 'restricted' && 'border-amber-500',
                status === 'prohibited' && 'border-red-500',
                (status === 'loading' || status === 'error') && 'border-neutral-500'
              )}
            />
            {/* Center marker */}
            <div
              className={cn(
                'relative z-10 flex h-8 w-8 items-center justify-center rounded-full',
                status === 'clear' && 'bg-green-500',
                status === 'restricted' && 'bg-amber-500',
                status === 'prohibited' && 'bg-red-500',
                (status === 'loading' || status === 'error') && 'bg-neutral-500'
              )}
            >
              <MapPin className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Nearby airport indicators */}
          {result?.nearby_airports?.map((airport, i) => {
            const angle = (i * 120) * (Math.PI / 180)
            const distance = Math.min(airport.distance_nm * 15, 70)
            const x = Math.cos(angle) * distance
            const y = Math.sin(angle) * distance

            return (
              <div
                key={airport.icao_code}
                className="absolute flex items-center justify-center"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="relative group">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 border border-blue-500/40">
                    <Plane className="h-3 w-3 text-blue-400" />
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                    <div className="rounded bg-neutral-900 px-2 py-1 text-xs whitespace-nowrap">
                      {airport.icao_code}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Address label */}
          {address && (
            <div className="absolute bottom-3 left-3 right-3">
              <div className="rounded-lg bg-black/60 backdrop-blur-sm px-3 py-2">
                <p className="text-xs text-muted-foreground truncate">{address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="border-t border-white/[0.08] px-4 py-3">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Clear</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Restricted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Prohibited</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Plane className="h-3 w-3 text-blue-400" />
              <span className="text-muted-foreground">Airport</span>
            </div>
          </div>
        </div>
      </div>

      {/* Restrictions List */}
      {result?.restrictions && result.restrictions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Nearby Restrictions</h4>
          <div className="space-y-2">
            {result.restrictions.map((restriction, i) => (
              <RestrictionItem key={i} restriction={restriction} />
            ))}
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground rounded-lg bg-neutral-500/5 p-3">
        <Shield className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <span>
          Aerial Shots Media is Part 107 certified. We handle all FAA authorization
          and LAANC approvals at no additional cost.
        </span>
      </div>
    </div>
  )
}

function RestrictionItem({ restriction }: { restriction: AirspaceRestriction }) {
  const iconMap = {
    airport: Plane,
    tfr: AlertTriangle,
    sua: Shield,
    notam: Info,
    national_park: MapPin,
    stadium: MapPin,
    other: Info,
  }

  const Icon = iconMap[restriction.type] || Info

  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/[0.08] bg-[#1c1c1e] p-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-500/10">
        <Icon className="h-4 w-4 text-neutral-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{restriction.name}</p>
        {restriction.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{restriction.description}</p>
        )}
        {restriction.distance_ft && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {(restriction.distance_ft / 5280).toFixed(1)} miles away
          </p>
        )}
      </div>
      {restriction.affects_operation && (
        <span className="flex-shrink-0 text-xs text-amber-400 font-medium px-2 py-0.5 rounded-full bg-amber-500/10">
          Affects flight
        </span>
      )}
    </div>
  )
}

// Hook to use airspace data
export function useAirspace(lat: number | undefined, lng: number | undefined) {
  const [data, setData] = useState<AirspaceCheckResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lat || !lng) return

    const check = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/airspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        })

        if (!response.ok) throw new Error('Failed to check')

        const result = await response.json()
        setData(result)
      } catch (err) {
        setError('Unable to check airspace')
      } finally {
        setIsLoading(false)
      }
    }

    check()
  }, [lat, lng])

  return { data, isLoading, error, canFly: data?.can_fly ?? false }
}
