import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  LayoutGrid,
  View,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  RefreshCw,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IntegrationStatusBadge } from '@/components/admin/ops/IntegrationStatusBadge'
import type { IntegrationStatus, Zillow3DStatus } from '@/lib/supabase/types'

interface IntegrationMetrics {
  total: number
  pending: number
  processing: number
  delivered: number
  failed: number
}

async function getIntegrationMetrics(supabase: Awaited<ReturnType<typeof createClient>>) {
  // Get counts for each integration status
  const { data: listings } = await supabase
    .from('listings')
    .select(`
      id,
      cubicasa_status,
      zillow_3d_status
    `)

  const cubicasa: IntegrationMetrics = { total: 0, pending: 0, processing: 0, delivered: 0, failed: 0 }
  const zillow3d: IntegrationMetrics = { total: 0, pending: 0, processing: 0, delivered: 0, failed: 0 }

  listings?.forEach((listing) => {
    // Cubicasa metrics
    if (listing.cubicasa_status && listing.cubicasa_status !== 'not_applicable') {
      cubicasa.total++
      if (['pending'].includes(listing.cubicasa_status)) cubicasa.pending++
      if (['ordered', 'processing'].includes(listing.cubicasa_status)) cubicasa.processing++
      if (listing.cubicasa_status === 'delivered') cubicasa.delivered++
      if (listing.cubicasa_status === 'failed') cubicasa.failed++
    }

    // Zillow 3D metrics
    if (listing.zillow_3d_status && listing.zillow_3d_status !== 'not_applicable') {
      zillow3d.total++
      if (['pending'].includes(listing.zillow_3d_status)) zillow3d.pending++
      if (['scheduled', 'scanned', 'processing'].includes(listing.zillow_3d_status)) zillow3d.processing++
      if (listing.zillow_3d_status === 'live') zillow3d.delivered++
      if (listing.zillow_3d_status === 'failed') zillow3d.failed++
    }
  })

  return { cubicasa, zillow3d }
}

export default async function IntegrationsDashboardPage() {
  const supabase = await createClient()

  // Get metrics
  const metrics = await getIntegrationMetrics(supabase)

  // Get jobs that need attention (failed or pending)
  const { data: attentionNeeded } = await supabase
    .from('listings')
    .select(`
      id,
      address,
      city,
      state,
      cubicasa_status,
      zillow_3d_status,
      integration_error_message,
      ops_status,
      updated_at
    `)
    .or('cubicasa_status.eq.failed,zillow_3d_status.eq.failed')
    .order('updated_at', { ascending: false })
    .limit(10)

  // Get recently delivered integrations
  const { data: recentlyDelivered } = await supabase
    .from('listings')
    .select(`
      id,
      address,
      city,
      state,
      cubicasa_status,
      zillow_3d_status,
      last_integration_check
    `)
    .or('cubicasa_status.eq.delivered,zillow_3d_status.eq.live')
    .order('last_integration_check', { ascending: false })
    .limit(5)

  // Get actively processing
  const { data: processing } = await supabase
    .from('listings')
    .select(`
      id,
      address,
      city,
      state,
      cubicasa_status,
      zillow_3d_status,
      updated_at
    `)
    .or('cubicasa_status.in.(ordered,processing),zillow_3d_status.in.(scheduled,scanned,processing)')
    .order('updated_at', { ascending: false })
    .limit(10)

  const integrationCards = [
    {
      key: 'cubicasa',
      name: 'Cubicasa',
      description: '2D/3D Floor Plans',
      icon: LayoutGrid,
      color: 'bg-blue-500',
      metrics: metrics.cubicasa,
    },
    {
      key: 'zillow3d',
      name: 'Zillow 3D',
      description: '3D Virtual Tours',
      icon: View,
      color: 'bg-green-500',
      metrics: metrics.zillow3d,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Integration Status
          </h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Track third-party service integrations across all jobs
          </p>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {integrationCards.map((integration) => {
          const Icon = integration.icon
          const m = integration.metrics
          const successRate = m.total > 0 ? Math.round((m.delivered / m.total) * 100) : 0

          return (
            <div
              key={integration.key}
              className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${integration.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      {integration.name}
                    </h3>
                    <p className="text-sm text-neutral-500">{integration.description}</p>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="mt-6 grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">{m.pending}</p>
                  <p className="text-xs text-neutral-500">Pending</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-500">{m.processing}</p>
                  <p className="text-xs text-neutral-500">Processing</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">{m.delivered}</p>
                  <p className="text-xs text-neutral-500">Delivered</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{m.failed}</p>
                  <p className="text-xs text-neutral-500">Failed</p>
                </div>
              </div>

              {/* Success Rate Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Success Rate</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{successRate}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                  <div
                    className={`h-full ${integration.color}`}
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Attention Needed */}
      {attentionNeeded && attentionNeeded.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10">
          <div className="flex items-center gap-2 border-b border-red-200 p-4 dark:border-red-900/50">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="font-semibold text-red-700 dark:text-red-400">
              Needs Attention ({attentionNeeded.length})
            </h2>
          </div>
          <div className="divide-y divide-red-200 dark:divide-red-900/50">
            {attentionNeeded.map((listing) => (
              <Link
                key={listing.id}
                href={`/admin/ops/jobs/${listing.id}`}
                className="flex items-center justify-between p-4 transition-colors hover:bg-red-100 dark:hover:bg-red-900/20"
              >
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">{listing.address}</p>
                  <p className="text-sm text-neutral-500">
                    {listing.city}, {listing.state}
                  </p>
                  {listing.integration_error_message && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {listing.integration_error_message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {listing.cubicasa_status === 'failed' ? (
                    <IntegrationStatusBadge status={listing.cubicasa_status as IntegrationStatus} size="sm" />
                  ) : null}
                  {listing.zillow_3d_status === 'failed' ? (
                    <IntegrationStatusBadge status={listing.zillow_3d_status as Zillow3DStatus} size="sm" />
                  ) : null}
                  <ArrowRight className="h-4 w-4 text-neutral-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Two Columns: Processing and Recently Delivered */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Processing */}
        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-neutral-200 p-4 dark:border-neutral-800">
            <Clock className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold text-neutral-900 dark:text-white">
              Currently Processing
            </h2>
          </div>
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {processing && processing.length > 0 ? (
              processing.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/admin/ops/jobs/${listing.id}`}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {listing.address}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {listing.city}, {listing.state}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {listing.cubicasa_status && ['ordered', 'processing'].includes(listing.cubicasa_status) && (
                      <span className="flex items-center gap-1 text-xs text-blue-500">
                        <LayoutGrid className="h-3 w-3" />
                      </span>
                    )}
                    {listing.zillow_3d_status && ['scheduled', 'scanned', 'processing'].includes(listing.zillow_3d_status) && (
                      <span className="flex items-center gap-1 text-xs text-green-500">
                        <View className="h-3 w-3" />
                      </span>
                    )}
                    <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-neutral-500">
                No integrations currently processing
              </div>
            )}
          </div>
        </div>

        {/* Recently Delivered */}
        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-neutral-200 p-4 dark:border-neutral-800">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h2 className="font-semibold text-neutral-900 dark:text-white">
              Recently Delivered
            </h2>
          </div>
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {recentlyDelivered && recentlyDelivered.length > 0 ? (
              recentlyDelivered.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/admin/ops/jobs/${listing.id}`}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {listing.address}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {listing.city}, {listing.state}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {listing.cubicasa_status === 'delivered' && (
                      <span className="flex items-center gap-1 text-xs text-blue-500">
                        <LayoutGrid className="h-3 w-3" />
                        <CheckCircle className="h-3 w-3" />
                      </span>
                    )}
                    {listing.zillow_3d_status === 'live' && (
                      <span className="flex items-center gap-1 text-xs text-green-500">
                        <View className="h-3 w-3" />
                        <CheckCircle className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-neutral-500">
                No recent deliveries
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
