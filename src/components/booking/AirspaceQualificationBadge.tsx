'use client'

import { useState, useEffect } from 'react'
import {
  Plane,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Loader2,
  Clock,
  Info,
} from 'lucide-react'

interface AirspaceQualificationBadgeProps {
  lat: number | null
  lng: number | null
  address?: string
  hasDroneServices: boolean
  listingId?: string
  onQualificationChange?: (qualified: boolean, requiresAuth: boolean) => void
  className?: string
  showDetails?: boolean
}

interface Restriction {
  type: string
  name: string
  description?: string
  distance_ft?: number
  affects_operation: boolean
}

interface QualificationResult {
  success: boolean
  cached: boolean
  qualification: {
    qualified: boolean
    requires_authorization: boolean
    laanc_available: boolean
    estimated_approval_time?: string
    airspace_summary?: string
    warnings: string[]
    restrictions: Restriction[]
    checked_at: string
  }
  recommendation: {
    action: 'proceed' | 'warning' | 'remove_drone' | 'contact_us'
    message: string
    severity: 'success' | 'warning' | 'error'
  }
}

export function AirspaceQualificationBadge({
  lat,
  lng,
  address,
  hasDroneServices,
  listingId,
  onQualificationChange,
  className = '',
  showDetails = true,
}: AirspaceQualificationBadgeProps) {
  const [result, setResult] = useState<QualificationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function checkAirspace() {
      if (!lat || !lng) {
        setResult(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/booking/airspace-qualify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat,
            lng,
            address,
            listingId,
            hasDroneServices,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to check airspace')
        }

        setResult(data)
        onQualificationChange?.(
          data.qualification.qualified,
          data.qualification.requires_authorization
        )
      } catch (err) {
        console.error('Airspace qualification error:', err)
        setError(err instanceof Error ? err.message : 'Failed to check')
      } finally {
        setLoading(false)
      }
    }

    checkAirspace()
  }, [lat, lng, address, hasDroneServices, listingId, onQualificationChange])

  // Don't show anything if no coordinates or no drone services
  if (!lat || !lng) {
    return null
  }

  if (!hasDroneServices) {
    return (
      <div
        className={`rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4 ${className}`}
      >
        <div className="flex items-center gap-3 text-[#8e8e93]">
          <Plane className="h-5 w-5" />
          <span className="text-sm">
            No drone services selected - airspace check not required
          </span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div
        className={`rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4 ${className}`}
      >
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          <span className="text-sm text-[#a1a1a6]">
            Checking drone airspace authorization...
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 ${className}`}
      >
        <div className="flex items-center gap-3 text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <span className="text-sm font-medium">Unable to verify airspace</span>
            <p className="text-xs text-amber-400/70">
              We'll check this manually before your shoot
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!result) {
    return null
  }

  const { qualification, recommendation } = result

  // Status styling
  const statusStyles = {
    success: {
      border: 'border-green-500/20',
      bg: 'bg-green-500/10',
      iconBg: 'bg-green-500/20',
      icon: CheckCircle2,
      iconColor: 'text-green-400',
      title: 'Clear to Fly',
    },
    warning: {
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/10',
      iconBg: 'bg-amber-500/20',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      title: 'Authorization Required',
    },
    error: {
      border: 'border-red-500/20',
      bg: 'bg-red-500/10',
      iconBg: 'bg-red-500/20',
      icon: XCircle,
      iconColor: 'text-red-400',
      title: 'Restricted Airspace',
    },
  }

  const style = statusStyles[recommendation.severity]
  const StatusIcon = style.icon

  return (
    <div
      className={`rounded-xl border ${style.border} ${style.bg} p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${style.iconBg}`}
          >
            <StatusIcon className={`h-5 w-5 ${style.iconColor}`} />
          </div>
          <div>
            <h4 className={`font-medium ${style.iconColor}`}>{style.title}</h4>
            {qualification.airspace_summary && (
              <p className="text-sm text-[#a1a1a6]">
                {qualification.airspace_summary}
              </p>
            )}
          </div>
        </div>

        {showDetails && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-[#8e8e93] hover:text-white transition-colors"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Recommendation Message */}
      <div className="mt-3 text-sm text-[#a1a1a6]">{recommendation.message}</div>

      {/* LAANC/Authorization Info */}
      {qualification.requires_authorization && qualification.laanc_available && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2">
          <Shield className="h-4 w-4 text-blue-400" />
          <span className="text-xs text-[#a1a1a6]">
            LAANC authorization available - typically approved instantly
          </span>
        </div>
      )}

      {qualification.estimated_approval_time &&
        qualification.estimated_approval_time !== 'instant' &&
        qualification.estimated_approval_time !== 'not_available' && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-[#a1a1a6]">
              Estimated approval time: {qualification.estimated_approval_time}
            </span>
          </div>
        )}

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 space-y-3 border-t border-white/[0.08] pt-4">
          {/* Warnings */}
          {qualification.warnings.length > 0 && (
            <div>
              <h5 className="mb-2 text-xs font-medium uppercase text-[#8e8e93]">
                Warnings
              </h5>
              <ul className="space-y-1.5">
                {qualification.warnings.map((warning, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-amber-400"
                  >
                    <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Restrictions */}
          {qualification.restrictions.length > 0 && (
            <div>
              <h5 className="mb-2 text-xs font-medium uppercase text-[#8e8e93]">
                Nearby Restrictions
              </h5>
              <ul className="space-y-1.5">
                {qualification.restrictions.map((restriction, i) => (
                  <li
                    key={i}
                    className={`flex items-start gap-2 text-xs ${
                      restriction.affects_operation
                        ? 'text-red-400'
                        : 'text-[#a1a1a6]'
                    }`}
                  >
                    <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                    <span>
                      <strong>{restriction.name}</strong>
                      {restriction.description && ` - ${restriction.description}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Check info */}
          <p className="text-[10px] text-[#8e8e93]">
            Checked: {new Date(qualification.checked_at).toLocaleString()}
            {result.cached && ' (cached)'}
          </p>
        </div>
      )}

      {/* Action hint for problematic airspace */}
      {recommendation.action === 'remove_drone' && (
        <div className="mt-4 flex items-center gap-2 border-t border-white/[0.08] pt-4">
          <button className="flex-1 rounded-lg bg-white/[0.08] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]">
            Remove Drone Services
          </button>
          <button className="flex-1 rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/30">
            Contact Us
          </button>
        </div>
      )}
    </div>
  )
}

// Compact badge version for use in lists/cards
export function AirspaceStatusBadge({
  status,
  className = '',
}: {
  status: 'approved' | 'pending' | 'restricted' | 'unchecked'
  className?: string
}) {
  const configs = {
    approved: {
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      icon: CheckCircle2,
      label: 'Clear to Fly',
    },
    pending: {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      icon: Clock,
      label: 'Auth Needed',
    },
    restricted: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      icon: XCircle,
      label: 'Restricted',
    },
    unchecked: {
      bg: 'bg-white/[0.08]',
      text: 'text-[#8e8e93]',
      icon: Plane,
      label: 'Not Checked',
    },
  }

  const config = configs[status]
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}
