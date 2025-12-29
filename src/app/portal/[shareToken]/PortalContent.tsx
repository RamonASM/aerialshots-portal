'use client'

import { useState } from 'react'
import Image from 'next/image'
import { StatusTimeline } from '@/components/portal/StatusTimeline'
import { ClientMessenger } from '@/components/portal/ClientMessenger'
import { FeedbackForm } from '@/components/portal/FeedbackForm'

interface MediaAsset {
  id: string
  aryeo_url: string
  type: string
  category: string | null
  sort_order: number | null
  tip_text: string | null
}

interface StatusEvent {
  id: string
  event_type: string
  created_at: string
  new_value: Record<string, unknown> | null
}

interface PortalContentProps {
  listing: {
    id: string
    address: string
    city: string
    state: string
    zip: string
    beds: number | null
    baths: number | null
    sqft: number | null
    price: number | null
    ops_status: string
    scheduled_at: string | null
    delivered_at: string | null
  }
  agent: {
    id: string
    name: string
    email: string
    phone: string | null
    logo_url: string | null
    headshot_url: string | null
    brand_color: string
    bio: string | null
  } | null
  mediaAssets: MediaAsset[]
  statusHistory: StatusEvent[]
  portalSettings: {
    logo_url: string | null
    primary_color: string
    secondary_color: string
    font_family: string
    custom_css: string | null
    welcome_message: string | null
    footer_text: string | null
  } | null
  brandColor: string
  showPoweredBy: boolean
  clientName: string | null
  clientEmail: string | null
  shareLinkId: string
  welcomeMessage: string | null
}

const CATEGORY_ORDER = [
  'mls_ready',
  'social_media',
  'social_stories',
  'print_ready',
  'video',
  'floor_plan',
  'matterport',
  'zillow_3d',
]

const CATEGORY_LABELS: Record<string, string> = {
  mls_ready: 'MLS Ready Photos',
  social_media: 'Social Media',
  social_stories: 'Instagram Stories',
  print_ready: 'Print Ready',
  video: 'Property Video',
  floor_plan: 'Floor Plans',
  matterport: '3D Virtual Tour',
  zillow_3d: 'Zillow 3D Home',
}

export function PortalContent({
  listing,
  agent,
  mediaAssets,
  statusHistory,
  portalSettings,
  brandColor,
  showPoweredBy,
  clientName,
  clientEmail,
  shareLinkId,
  welcomeMessage,
}: PortalContentProps) {
  const [selectedImage, setSelectedImage] = useState<MediaAsset | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  // Group assets by category
  const assetsByCategory = mediaAssets.reduce((acc, asset) => {
    const category = asset.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(asset)
    return acc
  }, {} as Record<string, MediaAsset[]>)

  // Sort categories
  const sortedCategories = Object.keys(assetsByCategory).sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a)
    const bIndex = CATEGORY_ORDER.indexOf(b)
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  const handleDownload = async (asset: MediaAsset) => {
    const link = document.createElement('a')
    link.href = asset.aryeo_url
    link.download = `${listing.address}-${asset.category || 'photo'}.jpg`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadAll = async () => {
    setDownloading(true)
    const downloadableAssets = mediaAssets.filter(
      a => a.type === 'image' || a.type === 'photo'
    )

    for (let i = 0; i < downloadableAssets.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300))
      handleDownload(downloadableAssets[i])
    }

    setDownloading(false)
    // Show feedback form after download
    setShowFeedback(true)
  }

  const photoCount = mediaAssets.filter(a => a.type === 'image' || a.type === 'photo').length
  const hasVideos = mediaAssets.some(a => a.type === 'video')
  const has3DTour = mediaAssets.some(a => a.category === 'matterport' || a.category === 'zillow_3d')

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {portalSettings?.logo_url || agent?.logo_url ? (
                <img
                  src={portalSettings?.logo_url || agent?.logo_url || ''}
                  alt={agent?.name || 'Logo'}
                  className="h-10 w-auto object-contain"
                />
              ) : agent?.headshot_url ? (
                <img
                  src={agent.headshot_url}
                  alt={agent.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : null}
              <div>
                <h1 className="text-lg font-semibold text-neutral-900">
                  {listing.address}
                </h1>
                <p className="text-sm text-neutral-500">
                  {listing.city}, {listing.state} {listing.zip}
                </p>
              </div>
            </div>
            {photoCount > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={downloading}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-opacity disabled:opacity-70"
                style={{ backgroundColor: brandColor }}
              >
                {downloading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download All ({photoCount})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Welcome Message */}
        {(welcomeMessage || clientName) && (
          <div
            className="rounded-xl p-4 mb-6"
            style={{ backgroundColor: `${brandColor}10` }}
          >
            <p className="text-neutral-800">
              {clientName && <span className="font-medium">Hi {clientName}! </span>}
              {welcomeMessage || 'Your property media is ready. Browse and download your photos below.'}
            </p>
          </div>
        )}

        {/* Status Timeline */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Order Status</h2>
          <StatusTimeline
            currentStatus={listing.ops_status}
            scheduledAt={listing.scheduled_at}
            deliveredAt={listing.delivered_at}
            statusHistory={statusHistory}
            brandColor={brandColor}
          />
        </div>

        {/* Property Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Photos"
            value={photoCount.toString()}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            brandColor={brandColor}
          />
          {hasVideos && (
            <StatCard
              label="Video"
              value="Included"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
              brandColor={brandColor}
            />
          )}
          {has3DTour && (
            <StatCard
              label="3D Tour"
              value="Included"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              }
              brandColor={brandColor}
            />
          )}
          {listing.sqft && (
            <StatCard
              label="Sq Ft"
              value={listing.sqft.toLocaleString()}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              }
              brandColor={brandColor}
            />
          )}
        </div>

        {/* Media Sections */}
        {sortedCategories.map(category => (
          <MediaSection
            key={category}
            title={CATEGORY_LABELS[category] || category}
            assets={assetsByCategory[category]}
            onImageClick={setSelectedImage}
            onDownload={handleDownload}
            brandColor={brandColor}
          />
        ))}

        {/* Mobile Download All Button */}
        {photoCount > 0 && (
          <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-neutral-200">
            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-white"
              style={{ backgroundColor: brandColor }}
            >
              {downloading ? 'Downloading...' : `Download All Photos (${photoCount})`}
            </button>
          </div>
        )}

        {/* Feedback Section */}
        {showFeedback && (
          <div className="mt-8 max-w-md mx-auto">
            <FeedbackForm
              listingId={listing.id}
              shareLinkId={shareLinkId}
              agentName={agent?.name}
              brandColor={brandColor}
              onSubmitted={() => setShowFeedback(false)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-6 mt-8 mb-20 sm:mb-0">
        <div className="max-w-6xl mx-auto px-4">
          {agent && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              {agent.headshot_url && (
                <img
                  src={agent.headshot_url}
                  alt={agent.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <div>
                <p className="font-medium text-neutral-900">{agent.name}</p>
                <div className="flex flex-wrap gap-4 text-sm text-neutral-500">
                  <a href={`mailto:${agent.email}`} className="hover:text-neutral-700">
                    {agent.email}
                  </a>
                  {agent.phone && (
                    <a href={`tel:${agent.phone}`} className="hover:text-neutral-700">
                      {agent.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
          {portalSettings?.footer_text && (
            <p className="text-sm text-neutral-500 mb-4">{portalSettings.footer_text}</p>
          )}
          {showPoweredBy && (
            <p className="text-xs text-neutral-400">
              Powered by Aerial Shots Media
            </p>
          )}
        </div>
      </footer>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
            onClick={(e) => {
              e.stopPropagation()
              handleDownload(selectedImage)
            }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
          <img
            src={selectedImage.aryeo_url}
            alt=""
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Client Messenger */}
      <ClientMessenger
        listingId={listing.id}
        shareLinkId={shareLinkId}
        clientName={clientName}
        clientEmail={clientEmail}
        brandColor={brandColor}
        agentName={agent?.name}
        agentHeadshot={agent?.headshot_url}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  brandColor,
}: {
  label: string
  value: string
  icon: React.ReactNode
  brandColor: string
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
        style={{ backgroundColor: `${brandColor}15`, color: brandColor }}
      >
        {icon}
      </div>
      <p className="text-2xl font-semibold text-neutral-900">{value}</p>
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  )
}

function MediaSection({
  title,
  assets,
  onImageClick,
  onDownload,
  brandColor,
}: {
  title: string
  assets: MediaAsset[]
  onImageClick: (asset: MediaAsset) => void
  onDownload: (asset: MediaAsset) => void
  brandColor: string
}) {
  const images = assets.filter(a => a.type === 'image' || a.type === 'photo')
  const videos = assets.filter(a => a.type === 'video')
  const iframes = assets.filter(a => a.type === 'iframe' || a.category === 'matterport' || a.category === 'zillow_3d')

  if (assets.length === 0) return null

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-neutral-900 mb-4">{title}</h3>

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((asset) => (
            <div
              key={asset.id}
              className="relative aspect-[4/3] rounded-lg overflow-hidden bg-neutral-100 group cursor-pointer"
              onClick={() => onImageClick(asset)}
            >
              <img
                src={asset.aryeo_url}
                alt=""
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              <button
                className="absolute bottom-2 right-2 p-2 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  onDownload(asset)
                }}
              >
                <svg className="w-4 h-4 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Videos */}
      {videos.map((asset) => (
        <div key={asset.id} className="mt-4">
          <video
            src={asset.aryeo_url}
            controls
            className="w-full rounded-lg"
            poster={images[0]?.aryeo_url}
          />
        </div>
      ))}

      {/* Iframes (3D Tours) */}
      {iframes.map((asset) => (
        <div key={asset.id} className="mt-4 aspect-video rounded-lg overflow-hidden">
          <iframe
            src={asset.aryeo_url}
            className="w-full h-full"
            allowFullScreen
          />
        </div>
      ))}
    </div>
  )
}
