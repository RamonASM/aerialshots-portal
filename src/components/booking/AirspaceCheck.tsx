'use client'

import { useState, useEffect } from 'react'
import { Plane, CheckCircle2, AlertTriangle, XCircle, Info, MapPin, Shield } from 'lucide-react'
import type { AirspaceCheckResult, FlightStatus } from '@/lib/integrations/faa/types'

interface AirspaceCheckProps {
  latitude?: number
  longitude?: number
  address?: string
  onResult?: (result: AirspaceCheckResult) => void
  compact?: boolean
}

const STATUS_CONFIG: Record<FlightStatus, {
  color: string
  bgColor: string
  borderColor: string
  icon: typeof CheckCircle2
  label: string
}> = {
  clear: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle2,
    label: 'Clear to Fly',
  },
  caution: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: AlertTriangle,
    label: 'Caution Required',
  },
  restricted: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertTriangle,
    label: 'Authorization Required',
  },
  prohibited: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
    label: 'No Fly Zone',
  },
}

export function AirspaceCheck({
  latitude,
  longitude,
  address,
  onResult,
  compact = false,
}: AirspaceCheckProps) {
  const [result, setResult] = useState<AirspaceCheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (latitude && longitude) {
      checkAirspace()
    }
  }, [latitude, longitude])

  const checkAirspace = async () => {
    if (!latitude || !longitude) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/airspace/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, address }),
      })

      if (!response.ok) {
        throw new Error('Failed to check airspace')
      }

      const data: AirspaceCheckResult = await response.json()
      setResult(data)
      onResult?.(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!latitude || !longitude) {
    return null
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-sm' : ''} text-neutral-500`}>
        <Plane className="h-4 w-4 animate-pulse" />
        <span>Checking drone airspace...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm">
        <AlertTriangle className="h-4 w-4" />
        <span>Unable to check airspace</span>
      </div>
    )
  }

  if (!result) {
    return null
  }

  const config = STATUS_CONFIG[result.status]
  const StatusIcon = config.icon

  if (compact) {
    return (
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color} ${config.borderColor} border`}
      >
        <StatusIcon className="h-3 w-3" />
        {config.label}
      </button>
    )
  }

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${config.bgColor}`}>
            <StatusIcon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <h4 className={`font-semibold ${config.color}`}>{config.label}</h4>
            <p className="text-sm text-neutral-600">
              Class {result.airspaceClass} Airspace
              {result.maxAltitude > 0 && ` • Max ${result.maxAltitude}ft`}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
        >
          <Info className="h-4 w-4" />
          {showDetails ? 'Hide' : 'Details'}
        </button>
      </div>

      {/* Authorization Message */}
      {result.authorization.required && (
        <div className="mt-3 p-3 bg-white/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-neutral-900">
                {result.authorization.type} Authorization Required
              </p>
              <p className="text-xs text-neutral-600 mt-0.5">
                {result.authorization.instructions}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nearby Airports */}
      {result.nearbyAirports.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-neutral-700 mb-1.5">
            Nearby Airports ({result.nearbyAirports.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.nearbyAirports.slice(0, 3).map((airport) => (
              <span
                key={airport.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded text-xs text-neutral-600"
              >
                <Plane className="h-3 w-3" />
                {airport.icao} ({airport.distance}mi)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Restrictions */}
      {result.restrictions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-neutral-700 mb-1.5">
            Active Restrictions
          </p>
          <div className="space-y-1">
            {result.restrictions.map((restriction) => (
              <div
                key={restriction.id}
                className="flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded p-2"
              >
                <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">{restriction.name}</span>
                  <span className="text-red-600"> • {restriction.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <h5 className="text-xs font-medium text-neutral-700 mb-2">Advisories</h5>
          <ul className="space-y-1">
            {result.advisories.map((advisory, i) => (
              <li key={i} className="text-xs text-neutral-600 flex items-start gap-1.5">
                <span className="text-neutral-400">•</span>
                {advisory}
              </li>
            ))}
          </ul>

          {/* Coordinates */}
          <div className="mt-3 flex items-center gap-1 text-xs text-neutral-500">
            <MapPin className="h-3 w-3" />
            {result.coordinates.latitude.toFixed(4)}, {result.coordinates.longitude.toFixed(4)}
          </div>

          {/* Cache info */}
          <p className="text-xs text-neutral-400 mt-2">
            Checked: {new Date(result.checkedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}

// Simple badge version for lists
export function AirspaceStatusBadge({
  status,
  className = '',
}: {
  status: FlightStatus
  className?: string
}) {
  const config = STATUS_CONFIG[status]
  const StatusIcon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color} ${className}`}
    >
      <StatusIcon className="h-3 w-3" />
      {config.label}
    </span>
  )
}
