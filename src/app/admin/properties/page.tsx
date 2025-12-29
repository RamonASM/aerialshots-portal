'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Home,
  Search,
  ExternalLink,
  Eye,
  Image,
  Globe,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MapPin,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Package,
  MoreVertical,
} from 'lucide-react'

interface Listing {
  id: string
  address: string
  city: string
  state: string
  zip: string
  price: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  ops_status: string
  website_slug: string | null
  website_published: boolean
  website_views: number
  created_at: string
  delivered_at: string | null
  agents: {
    id: string
    name: string
    company: string
  } | null
  mediaCount: number
}

interface PropertiesData {
  listings: Listing[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  uploading: { label: 'Uploading', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  editing: { label: 'Editing', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  staged: { label: 'Staged', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  ready_for_qc: { label: 'Ready for QC', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  in_qc: { label: 'In QC', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
}

export default function PropertiesPage() {
  const [data, setData] = useState<PropertiesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [hasWebsite, setHasWebsite] = useState('all')
  const [page, setPage] = useState(1)

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (status !== 'all') params.set('status', status)
      if (hasWebsite !== 'all') params.set('hasWebsite', hasWebsite)

      const response = await fetch(`/api/admin/properties?${params}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search, status, hasWebsite])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  useEffect(() => {
    setPage(1)
  }, [search, status, hasWebsite])

  const formatPrice = (price: number | null) => {
    if (!price) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Properties</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Manage property listings and websites
          </p>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{data.total}</p>
                <p className="text-sm text-neutral-500">Total Properties</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.listings.filter(l => l.ops_status === 'delivered').length}
                </p>
                <p className="text-sm text-neutral-500">Delivered</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                <Globe className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.listings.filter(l => l.website_published).length}
                </p>
                <p className="text-sm text-neutral-500">Published Sites</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900/30">
                <Eye className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.listings.reduce((sum, l) => sum + (l.website_views || 0), 0).toLocaleString()}
                </p>
                <p className="text-sm text-neutral-500">Total Views</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by address or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="editing">Editing</option>
            <option value="ready_for_qc">Ready for QC</option>
            <option value="delivered">Delivered</option>
          </select>
          <select
            value={hasWebsite}
            onChange={(e) => setHasWebsite(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            <option value="all">All Properties</option>
            <option value="true">Has Website</option>
            <option value="false">No Website</option>
          </select>
          <button
            onClick={fetchProperties}
            className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Properties Grid */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      ) : data?.listings.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center text-neutral-500">
          <Home className="mb-2 h-12 w-12 text-neutral-300" />
          <p>No properties found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.listings.map((listing) => (
            <div
              key={listing.id}
              className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
            >
              {/* Property Image Placeholder */}
              <div className="relative h-40 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Home className="h-12 w-12 text-neutral-300 dark:text-neutral-700" />
                </div>
                {/* Status Badge */}
                <div className="absolute left-3 top-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      STATUS_LABELS[listing.ops_status]?.color || 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {STATUS_LABELS[listing.ops_status]?.label || listing.ops_status}
                  </span>
                </div>
                {/* Website Badge */}
                {listing.website_published && (
                  <div className="absolute right-3 top-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white">
                      <Globe className="h-3 w-3" />
                      Live
                    </span>
                  </div>
                )}
                {/* Media Count */}
                <div className="absolute bottom-3 left-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
                    <Image className="h-3 w-3" />
                    {listing.mediaCount}
                  </span>
                </div>
              </div>

              {/* Property Details */}
              <div className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {listing.address}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {listing.city}, {listing.state} {listing.zip}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="mb-3 flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                  {listing.price && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatPrice(listing.price)}
                    </span>
                  )}
                  {listing.beds && (
                    <span>{listing.beds} bd</span>
                  )}
                  {listing.baths && (
                    <span>{listing.baths} ba</span>
                  )}
                  {listing.sqft && (
                    <span>{listing.sqft.toLocaleString()} sqft</span>
                  )}
                </div>

                {/* Agent */}
                {listing.agents && (
                  <div className="mb-3 rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {listing.agents.name}
                    </p>
                    <p className="text-xs text-neutral-500">{listing.agents.company}</p>
                  </div>
                )}

                {/* Website Stats */}
                {listing.website_slug && (
                  <div className="mb-3 flex items-center justify-between rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <Eye className="h-4 w-4" />
                      {listing.website_views || 0} views
                    </div>
                    <a
                      href={`/property/${listing.website_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/admin/ops/jobs/${listing.id}`}
                    className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-center text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    View Job
                  </Link>
                  {listing.ops_status === 'delivered' && (
                    <Link
                      href={`/delivery/${listing.id}`}
                      className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
                    >
                      View Delivery
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Showing {(page - 1) * data.limit + 1} to{' '}
            {Math.min(page * data.limit, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
