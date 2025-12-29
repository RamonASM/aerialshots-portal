'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  ExternalLink,
  Image as ImageIcon,
  Video,
  MapPin,
  Home,
  Layers,
  Globe,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Palette,
  FileText,
  Settings,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SortableMediaGrid } from '@/components/cms/media/SortableMediaGrid'
import { SkeletonCard } from '@/components/ui/skeleton'

interface MediaAsset {
  id: string
  aryeo_url: string
  type: string
  category: string | null
  sort_order: number | null
  tip_text: string | null
  qc_status: string
  qc_notes: string | null
  created_at: string
}

interface Listing {
  id: string
  address: string
  city: string | null
  state: string
  zip: string | null
  price: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  ops_status: string
  template_id: string | null
  delivered_at: string | null
  agent: {
    id: string
    name: string
    email: string
    brand_color: string | null
    headshot_url: string | null
    logo_url: string | null
  } | null
}

interface PropertyData {
  listing: Listing
  mediaByCategory: Record<string, MediaAsset[]>
}

const CATEGORY_INFO: Record<string, { title: string; description: string; icon: typeof ImageIcon }> = {
  mls: {
    title: 'MLS Ready',
    description: 'High-resolution photos for MLS listings',
    icon: ImageIcon,
  },
  social_feed: {
    title: 'Social Feed',
    description: 'Square/landscape for Instagram & Facebook posts',
    icon: ImageIcon,
  },
  social_stories: {
    title: 'Social Stories',
    description: '9:16 vertical format for Stories & Reels',
    icon: ImageIcon,
  },
  print: {
    title: 'Print Ready',
    description: 'High-resolution for brochures and flyers',
    icon: FileText,
  },
  video: {
    title: 'Property Video',
    description: 'Cinematic walkthrough videos',
    icon: Video,
  },
  floorplan: {
    title: 'Floor Plans',
    description: '2D and 3D floor plan layouts',
    icon: Layers,
  },
  matterport: {
    title: '3D Virtual Tour',
    description: 'Interactive Matterport tour',
    icon: Globe,
  },
  interactive: {
    title: 'Interactive Content',
    description: 'Zillow 3D Home tours and more',
    icon: Globe,
  },
}

const TEMPLATES = [
  { id: 'minimal', name: 'Minimal', description: 'Clean, simple design' },
  { id: 'modern', name: 'Modern', description: 'Contemporary with bold typography' },
  { id: 'luxury', name: 'Luxury', description: 'Elegant with premium feel' },
  { id: 'classic', name: 'Classic', description: 'Traditional real estate style' },
]

export default function PropertyEditorPage({
  params,
}: {
  params: Promise<{ listingId: string }>
}) {
  const resolvedParams = use(params)
  const [data, setData] = useState<PropertyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('media')
  const [selectedCategory, setSelectedCategory] = useState('mls')
  const [pendingChanges, setPendingChanges] = useState<{
    template_id?: string
    media_updates?: { id: string; sort_order?: number; tip_text?: string; category?: string }[]
  }>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/content/properties/${resolvedParams.listingId}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.listingId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async () => {
    if (!data) return
    try {
      setSaving(true)
      const res = await fetch(`/api/admin/content/properties/${resolvedParams.listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingChanges),
      })
      if (!res.ok) throw new Error('Failed to save')
      setHasUnsavedChanges(false)
      setPendingChanges({})
      await fetchData()
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleTemplateChange = (templateId: string) => {
    setPendingChanges((prev) => ({ ...prev, template_id: templateId }))
    setHasUnsavedChanges(true)
  }

  const handleMediaReorder = (category: string, items: { id: string; url: string; type: string; name?: string; category?: string }[]) => {
    if (!data) return

    // Update local state
    const newMediaByCategory = { ...data.mediaByCategory }
    newMediaByCategory[category] = items.map((item, index) => {
      const original = data.mediaByCategory[category].find((m) => m.id === item.id)
      return original ? { ...original, sort_order: index } : null
    }).filter(Boolean) as MediaAsset[]
    setData({ ...data, mediaByCategory: newMediaByCategory })

    // Track changes
    const updates = items.map((item, index) => ({
      id: item.id,
      sort_order: index,
    }))
    setPendingChanges((prev) => ({
      ...prev,
      media_updates: [...(prev.media_updates || []).filter((u) => !updates.find((nu) => nu.id === u.id)), ...updates],
    }))
    setHasUnsavedChanges(true)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SkeletonCard />
          </div>
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <Home className="mb-4 h-12 w-12 text-neutral-300" />
        <p className="text-lg font-medium text-neutral-900 dark:text-white">Property not found</p>
        <Link href="/admin/content">
          <Button variant="outline" className="mt-4">
            Back to Content Hub
          </Button>
        </Link>
      </div>
    )
  }

  const { listing, mediaByCategory } = data
  const totalAssets = Object.values(mediaByCategory).reduce((sum, arr) => sum + arr.length, 0)
  const approvedAssets = Object.values(mediaByCategory).flat().filter((a) => a.qc_status === 'approved').length
  const pendingAssets = Object.values(mediaByCategory).flat().filter((a) => a.qc_status === 'pending').length
  const rejectedAssets = Object.values(mediaByCategory).flat().filter((a) => a.qc_status === 'rejected').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/content">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{listing.address}</h1>
            <p className="flex items-center gap-1 text-sm text-neutral-500">
              <MapPin className="h-3 w-3" />
              {[listing.city, listing.state, listing.zip].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {listing.template_id && (
            <Link href={`/property/${listing.id}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Website
              </Button>
            </Link>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
            className="gap-2"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
              <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{totalAssets}</p>
              <p className="text-xs text-neutral-500">Total Assets</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{approvedAssets}</p>
              <p className="text-xs text-neutral-500">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{pendingAssets}</p>
              <p className="text-xs text-neutral-500">Pending QC</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{rejectedAssets}</p>
              <p className="text-xs text-neutral-500">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Column - Main Editor */}
        <div className="lg:col-span-3 space-y-6">
          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'media'
                  ? 'bg-white text-neutral-900 shadow dark:bg-neutral-900 dark:text-white'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="mr-2 inline-block h-4 w-4" />
              Media Manager
            </button>
            <button
              onClick={() => setActiveTab('website')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'website'
                  ? 'bg-white text-neutral-900 shadow dark:bg-neutral-900 dark:text-white'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <Globe className="mr-2 inline-block h-4 w-4" />
              Website Settings
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'seo'
                  ? 'bg-white text-neutral-900 shadow dark:bg-neutral-900 dark:text-white'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <Settings className="mr-2 inline-block h-4 w-4" />
              SEO
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'media' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Media Categories</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(mediaByCategory)
                      .filter(([, assets]) => assets.length > 0)
                      .map(([category, assets]) => {
                        const info = CATEGORY_INFO[category] || { title: category, icon: ImageIcon }
                        const Icon = info.icon
                        return (
                          <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                              selectedCategory === category
                                ? 'bg-blue-600 text-white'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                            }`}
                          >
                            <Icon className="h-3 w-3" />
                            {info.title}
                            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                              {assets.length}
                            </span>
                          </button>
                        )
                      })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {CATEGORY_INFO[selectedCategory] && (
                  <p className="mb-4 text-sm text-neutral-500">
                    {CATEGORY_INFO[selectedCategory].description}
                  </p>
                )}
                <SortableMediaGrid
                  items={(mediaByCategory[selectedCategory] || []).map((asset) => ({
                    id: asset.id,
                    url: asset.aryeo_url,
                    type: asset.type === 'video' ? 'video' : 'image',
                    name: asset.tip_text || undefined,
                    category: asset.category || undefined,
                    isFeatured: asset.sort_order === 0,
                    isApproved: asset.qc_status === 'approved' ? true : asset.qc_status === 'rejected' ? false : undefined,
                  }))}
                  onReorder={(items) => handleMediaReorder(selectedCategory, items)}
                  showQcActions={false}
                  showActions={true}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'website' && (
            <Card>
              <CardHeader>
                <CardTitle>Website Template</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateChange(template.id)}
                      className={`rounded-lg border-2 p-4 text-left transition-all ${
                        (pendingChanges.template_id || listing.template_id) === template.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 p-3 dark:from-neutral-800 dark:to-neutral-900">
                          <Palette className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">{template.name}</p>
                          <p className="text-sm text-neutral-500">{template.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800/50">
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-white">Agent Branding</h4>
                  {listing.agent ? (
                    <div className="mt-3 flex items-center gap-3">
                      {listing.agent.headshot_url ? (
                        <img
                          src={listing.agent.headshot_url}
                          alt={listing.agent.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
                          <span className="text-lg font-medium text-neutral-600 dark:text-neutral-400">
                            {listing.agent.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">{listing.agent.name}</p>
                        <p className="text-sm text-neutral-500">{listing.agent.email}</p>
                      </div>
                      {listing.agent.brand_color && (
                        <div className="ml-auto flex items-center gap-2">
                          <div
                            className="h-8 w-8 rounded-full border-2 border-white shadow"
                            style={{ backgroundColor: listing.agent.brand_color }}
                          />
                          <span className="text-xs text-neutral-500">{listing.agent.brand_color}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-neutral-500">No agent assigned</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'seo' && (
            <Card>
              <CardHeader>
                <CardTitle>SEO Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Page Title
                  </label>
                  <Input
                    placeholder={`${listing.address} | Aerial Shots Media`}
                    defaultValue=""
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    Recommended: 50-60 characters
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Meta Description
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
                    rows={3}
                    placeholder={`Explore ${listing.beds || ''}bd/${listing.baths || ''}ba home at ${listing.address}. Professional photography by Aerial Shots Media.`}
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    Recommended: 150-160 characters
                  </p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800/50">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Google Preview</p>
                  <div className="font-medium text-blue-600 dark:text-blue-400">
                    {listing.address} | Property Website
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-500">
                    aerialshots.media/property/{listing.id.substring(0, 8)}...
                  </div>
                  <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    Explore this stunning {listing.beds || ''}bd/{listing.baths || ''}ba home featuring professional photography and virtual tour.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Property Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {listing.price && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Price</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    ${listing.price.toLocaleString()}
                  </span>
                </div>
              )}
              {listing.beds && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Bedrooms</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{listing.beds}</span>
                </div>
              )}
              {listing.baths && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Bathrooms</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{listing.baths}</span>
                </div>
              )}
              {listing.sqft && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Square Feet</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {listing.sqft.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-500">Status</span>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {listing.ops_status}
                </span>
              </div>
              {listing.delivered_at && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Delivered</span>
                  <span className="text-neutral-900 dark:text-white">
                    {new Date(listing.delivered_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/admin/ops/jobs/${listing.id}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Eye className="mr-2 h-4 w-4" />
                  View Job Details
                </Button>
              </Link>
              <Link href={`/delivery/${listing.id}`} target="_blank" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Delivery Page
                </Button>
              </Link>
              <Link href={`/admin/qc/live?listing=${listing.id}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  QC Review
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
