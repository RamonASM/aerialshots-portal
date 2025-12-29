'use client'

import { useState } from 'react'
import {
  Camera,
  LayoutGrid,
  View,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Clock,
} from 'lucide-react'
import { IntegrationStatusBadge } from './IntegrationStatusBadge'
import { Button } from '@/components/ui/button'
import type { IntegrationStatus, Zillow3DStatus } from '@/lib/supabase/types'

interface IntegrationData {
  fotello: {
    status: IntegrationStatus
    external_id: string | null
  }
  cubicasa: {
    status: IntegrationStatus
    external_id: string | null
  }
  zillow_3d: {
    status: Zillow3DStatus
    external_id: string | null
  }
}

interface IntegrationConfig {
  key: 'fotello' | 'cubicasa' | 'zillow_3d'
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  externalUrl?: (id: string) => string
  statuses: string[]
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    key: 'fotello',
    name: 'Fotello',
    description: 'AI Photo Editing',
    icon: Camera,
    statuses: ['pending', 'ordered', 'processing', 'delivered', 'needs_manual', 'failed', 'not_applicable'],
  },
  {
    key: 'cubicasa',
    name: 'Cubicasa',
    description: '2D/3D Floor Plans',
    icon: LayoutGrid,
    externalUrl: (id) => `https://app.cubi.casa/order/${id}`,
    statuses: ['pending', 'ordered', 'processing', 'delivered', 'failed', 'not_applicable'],
  },
  {
    key: 'zillow_3d',
    name: 'Zillow 3D',
    description: '3D Virtual Tour',
    icon: View,
    statuses: ['pending', 'scheduled', 'scanned', 'processing', 'live', 'failed', 'not_applicable'],
  },
]

interface IntegrationStatusPanelProps {
  listingId: string
  integrations: IntegrationData
  errorMessage?: string | null
  lastCheck?: string | null
  onStatusUpdate?: (integration: string, newStatus: string) => Promise<void>
  onOrderIntegration?: (integration: string) => Promise<void>
  isUpdating?: boolean
}

export function IntegrationStatusPanel({
  listingId,
  integrations,
  errorMessage,
  lastCheck,
  onStatusUpdate,
  onOrderIntegration,
  isUpdating = false,
}: IntegrationStatusPanelProps) {
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null)
  const [updatingIntegration, setUpdatingIntegration] = useState<string | null>(null)

  const handleStatusChange = async (integration: string, newStatus: string) => {
    if (!onStatusUpdate) return

    setUpdatingIntegration(integration)
    try {
      await onStatusUpdate(integration, newStatus)
    } finally {
      setUpdatingIntegration(null)
    }
  }

  const handleOrder = async (integration: string) => {
    if (!onOrderIntegration) return

    setUpdatingIntegration(integration)
    try {
      await onOrderIntegration(integration)
    } finally {
      setUpdatingIntegration(null)
    }
  }

  const formatLastCheck = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
        <div>
          <h3 className="font-semibold text-neutral-900 dark:text-white">
            Third-Party Integrations
          </h3>
          {lastCheck && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
              <Clock className="h-3 w-3" />
              Last updated: {formatLastCheck(lastCheck)}
            </p>
          )}
        </div>
        {isUpdating && (
          <RefreshCw className="h-4 w-4 animate-spin text-neutral-400" />
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Integrations List */}
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {INTEGRATIONS.map((config) => {
          const integration = integrations[config.key]
          const isExpanded = expandedIntegration === config.key
          const isUpdatingThis = updatingIntegration === config.key
          const Icon = config.icon

          return (
            <div key={config.key} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <Icon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {config.name}
                    </p>
                    <p className="text-xs text-neutral-500">{config.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <IntegrationStatusBadge
                    status={integration.status}
                    size="md"
                  />

                  {/* External Link */}
                  {integration.external_id && config.externalUrl && (
                    <a
                      href={config.externalUrl(integration.external_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}

                  {/* Expand Button */}
                  {onStatusUpdate && (
                    <button
                      onClick={() => setExpandedIntegration(isExpanded ? null : config.key)}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Actions */}
              {isExpanded && (
                <div className="mt-4 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
                  <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Update Status
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {config.statuses.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(config.key, status)}
                        disabled={isUpdatingThis || integration.status === status}
                        className={`
                          rounded-md px-2 py-1 text-xs font-medium transition-colors
                          ${
                            integration.status === status
                              ? 'bg-blue-500 text-white'
                              : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'
                          }
                          disabled:opacity-50
                        `}
                      >
                        {status.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Order Button for pending integrations */}
                  {integration.status === 'pending' && onOrderIntegration && (
                    <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                      <Button
                        size="sm"
                        onClick={() => handleOrder(config.key)}
                        disabled={isUpdatingThis}
                      >
                        {isUpdatingThis ? (
                          <>
                            <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                            Ordering...
                          </>
                        ) : (
                          <>Order {config.name}</>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* External ID */}
                  {integration.external_id && (
                    <p className="mt-2 text-xs text-neutral-500">
                      ID: <code className="rounded bg-neutral-200 px-1 dark:bg-neutral-700">{integration.external_id}</code>
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
