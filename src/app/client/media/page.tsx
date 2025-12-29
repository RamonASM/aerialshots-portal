'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  Image as ImageIcon,
  Video,
  Box,
  Home,
  Download,
  ExternalLink,
  Eye,
  Grid3x3,
  LayoutList,
  Search,
  Filter,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface MediaListing {
  id: string
  share_token: string
  address: string
  city: string
  status: string
  delivered_at: string | null
  created_at: string
  media_counts: {
    photos: number
    videos: number
    tours: number
    floorplans: number
  }
  thumbnail_url: string | null
}

interface MediaAsset {
  id: string
  type: 'photo' | 'video' | 'matterport' | 'floorplan'
  aryeo_url: string
  download_url?: string
  position: number
}

type ViewMode = 'grid' | 'list'

export default function ClientMediaPage() {
  const [listings, setListings] = useState<MediaListing[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedListing, setSelectedListing] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxAssets, setLightboxAssets] = useState<MediaAsset[]>([])

  useEffect(() => {
    fetchMedia()
  }, [])

  async function fetchMedia() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get client account
    // Note: client_accounts table exists but types need regeneration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: client } = await (supabase as any)
      .from('client_accounts')
      .select('email')
      .eq('auth_user_id', user.id)
      .single() as { data: { email: string } | null }

    if (!client?.email) {
      setLoading(false)
      return
    }

    // Get share links with listing data
    const { data: shareLinks } = await supabase
      .from('share_links')
      .select(`
        id,
        share_token,
        created_at,
        listing:listings(
          id,
          address,
          city,
          ops_status,
          delivered_at
        )
      `)
      .eq('client_email', client.email)
      .order('created_at', { ascending: false })

    if (!shareLinks) {
      setLoading(false)
      return
    }

    // Get media counts for each listing
    const listingIds = shareLinks
      .map(sl => (sl.listing as { id?: string })?.id)
      .filter(Boolean) as string[]

    const { data: mediaAssets } = listingIds.length > 0
      ? await supabase
          .from('media_assets')
          .select('listing_id, type, aryeo_url')
          .in('listing_id', listingIds)
      : { data: [] }

    // Build media listings
    const mediaListings: MediaListing[] = shareLinks
      .filter(sl => (sl.listing as { id?: string })?.id)
      .map(sl => {
        const listing = sl.listing as {
          id: string
          address: string
          city: string
          ops_status: string
          delivered_at: string | null
        }
        const listingMedia = mediaAssets?.filter(ma => ma.listing_id === listing.id) || []
        const thumbnail = listingMedia.find(m => m.type === 'photo')?.aryeo_url || null

        return {
          id: listing.id,
          share_token: sl.share_token,
          address: listing.address,
          city: listing.city,
          status: listing.ops_status,
          delivered_at: listing.delivered_at,
          created_at: sl.created_at,
          media_counts: {
            photos: listingMedia.filter(m => m.type === 'photo').length,
            videos: listingMedia.filter(m => m.type === 'video').length,
            tours: listingMedia.filter(m => m.type === 'matterport').length,
            floorplans: listingMedia.filter(m => m.type === 'floorplan').length,
          },
          thumbnail_url: thumbnail,
        }
      })

    setListings(mediaListings)
    setLoading(false)
  }

  async function openLightbox(listingId: string, startIndex: number = 0) {
    const supabase = createClient()
    const { data } = await supabase
      .from('media_assets')
      .select('id, type, aryeo_url')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: true })

    if (data) {
      const assets: MediaAsset[] = data.map((item, idx) => ({
        id: item.id,
        type: item.type as MediaAsset['type'],
        aryeo_url: item.aryeo_url,
        position: idx,
      }))
      setLightboxAssets(assets)
      setLightboxIndex(startIndex)
      setLightboxOpen(true)
    }
  }

  const filteredListings = listings.filter(listing =>
    listing.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.city.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalMedia = listings.reduce((acc, l) => ({
    photos: acc.photos + l.media_counts.photos,
    videos: acc.videos + l.media_counts.videos,
    tours: acc.tours + l.media_counts.tours,
    floorplans: acc.floorplans + l.media_counts.floorplans,
  }), { photos: 0, videos: 0, tours: 0, floorplans: 0 })

  if (loading) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-[#1c1c1e] rounded-lg w-48" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-[#1c1c1e] rounded-xl" />
              ))}
            </div>
            <div className="h-64 bg-[#1c1c1e] rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">My Media</h1>
            <p className="text-[#a1a1a6]">Access photos, videos, and virtual tours from your shoots.</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={ImageIcon} label="Photos" count={totalMedia.photos} color="text-blue-400" />
          <StatCard icon={Video} label="Videos" count={totalMedia.videos} color="text-purple-400" />
          <StatCard icon={Box} label="3D Tours" count={totalMedia.tours} color="text-green-400" />
          <StatCard icon={Home} label="Floor Plans" count={totalMedia.floorplans} color="text-orange-400" />
        </div>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e93]" />
            <input
              type="text"
              placeholder="Search by address or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#1c1c1e] border border-white/[0.08] rounded-xl text-white placeholder:text-[#8e8e93] focus:outline-none focus:border-[#0077ff] transition-colors"
            />
          </div>
          <div className="flex gap-1 p-1 bg-[#1c1c1e] rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[#0a0a0a] text-white' : 'text-[#8e8e93] hover:text-white'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-[#0a0a0a] text-white' : 'text-[#8e8e93] hover:text-white'
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Listings */}
        {filteredListings.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map((listing) => (
                <MediaListingCard
                  key={listing.id}
                  listing={listing}
                  onViewGallery={() => openLightbox(listing.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredListings.map((listing) => (
                <MediaListingRow
                  key={listing.id}
                  listing={listing}
                  onViewGallery={() => openLightbox(listing.id)}
                />
              ))}
            </div>
          )
        ) : (
          <EmptyState hasSearch={searchQuery.length > 0} />
        )}

        {/* Lightbox */}
        {lightboxOpen && lightboxAssets.length > 0 && (
          <Lightbox
            assets={lightboxAssets}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
            onNavigate={setLightboxIndex}
          />
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  count,
  color
}: {
  icon: typeof ImageIcon
  label: string
  count: number
  color: string
}) {
  return (
    <div className="p-4 bg-[#1c1c1e] rounded-xl border border-white/[0.08]">
      <div className="flex items-center gap-3">
        <div className={`p-2 bg-white/[0.05] rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{count}</p>
          <p className="text-[#8e8e93] text-sm">{label}</p>
        </div>
      </div>
    </div>
  )
}

function MediaListingCard({
  listing,
  onViewGallery
}: {
  listing: MediaListing
  onViewGallery: () => void
}) {
  const isReady = listing.status === 'delivered'

  return (
    <div className="bg-[#1c1c1e] rounded-xl border border-white/[0.08] overflow-hidden hover:border-white/[0.12] transition-colors group">
      {/* Thumbnail */}
      <div className="relative h-48 bg-[#0a0a0a]">
        {listing.thumbnail_url ? (
          <img
            src={listing.thumbnail_url}
            alt={listing.address}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-12 h-12 text-[#636366]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white font-semibold truncate">{listing.address}</p>
          <p className="text-white/70 text-sm">{listing.city}</p>
        </div>
        <span className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${
          isReady ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {isReady ? 'Ready' : 'Processing'}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Media Counts */}
        <div className="flex items-center gap-4 text-sm text-[#a1a1a6] mb-4">
          {listing.media_counts.photos > 0 && (
            <span className="flex items-center gap-1">
              <ImageIcon className="w-4 h-4" />
              {listing.media_counts.photos}
            </span>
          )}
          {listing.media_counts.videos > 0 && (
            <span className="flex items-center gap-1">
              <Video className="w-4 h-4" />
              {listing.media_counts.videos}
            </span>
          )}
          {listing.media_counts.tours > 0 && (
            <span className="flex items-center gap-1">
              <Box className="w-4 h-4" />
              {listing.media_counts.tours}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onViewGallery}
            disabled={!isReady}
            className="flex-1 py-2 bg-[#0077ff] text-white rounded-lg text-sm font-medium hover:bg-[#0066dd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            View Gallery
          </button>
          <Link
            href={`/portal/${listing.share_token}`}
            className="py-2 px-3 text-[#a1a1a6] rounded-lg text-sm hover:bg-white/[0.05] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function MediaListingRow({
  listing,
  onViewGallery
}: {
  listing: MediaListing
  onViewGallery: () => void
}) {
  const isReady = listing.status === 'delivered'

  return (
    <div className="bg-[#1c1c1e] rounded-xl border border-white/[0.08] p-4 hover:border-white/[0.12] transition-colors">
      <div className="flex items-center gap-4">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-xl bg-[#0a0a0a] overflow-hidden flex-shrink-0">
          {listing.thumbnail_url ? (
            <img
              src={listing.thumbnail_url}
              alt={listing.address}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home className="w-8 h-8 text-[#636366]" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-white font-semibold truncate">{listing.address}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
              isReady ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {isReady ? 'Ready' : 'Processing'}
            </span>
          </div>
          <p className="text-[#8e8e93] text-sm mb-2">{listing.city}</p>
          <div className="flex items-center gap-4 text-sm text-[#636366]">
            {listing.media_counts.photos > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" />
                {listing.media_counts.photos} photos
              </span>
            )}
            {listing.media_counts.videos > 0 && (
              <span className="flex items-center gap-1">
                <Video className="w-3.5 h-3.5" />
                {listing.media_counts.videos} videos
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onViewGallery}
            disabled={!isReady}
            className="py-2 px-4 bg-[#0077ff] text-white rounded-lg text-sm font-medium hover:bg-[#0066dd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
          <Link
            href={`/portal/${listing.share_token}`}
            className="p-2 text-[#a1a1a6] rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function Lightbox({
  assets,
  currentIndex,
  onClose,
  onNavigate
}: {
  assets: MediaAsset[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}) {
  const currentAsset = assets[currentIndex]
  const isPhoto = currentAsset?.type === 'photo'

  function handlePrev() {
    onNavigate(currentIndex === 0 ? assets.length - 1 : currentIndex - 1)
  }

  function handleNext() {
    onNavigate(currentIndex === assets.length - 1 ? 0 : currentIndex + 1)
  }

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 text-white/70 text-sm">
        {currentIndex + 1} / {assets.length}
      </div>

      {/* Download button */}
      {currentAsset?.aryeo_url && (
        <a
          href={currentAsset.aryeo_url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white text-sm hover:bg-white/20 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download
        </a>
      )}

      {/* Navigation */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Content */}
      <div className="max-w-5xl max-h-[80vh] w-full px-4">
        {isPhoto ? (
          <img
            src={currentAsset.aryeo_url}
            alt={`Photo ${currentIndex + 1}`}
            className="w-full h-auto max-h-[80vh] object-contain mx-auto"
          />
        ) : (
          <div className="aspect-video bg-[#0a0a0a] rounded-xl flex items-center justify-center">
            <Video className="w-12 h-12 text-[#636366]" />
          </div>
        )}
      </div>

      {/* Thumbnails */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[80vw] pb-2">
        {assets.slice(0, 10).map((asset, i) => (
          <button
            key={asset.id}
            onClick={() => onNavigate(i)}
            className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
              i === currentIndex ? 'border-white' : 'border-transparent opacity-50 hover:opacity-100'
            }`}
          >
            {asset.type === 'photo' ? (
              <img src={asset.aryeo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#1c1c1e] flex items-center justify-center">
                <Video className="w-4 h-4 text-[#636366]" />
              </div>
            )}
          </button>
        ))}
        {assets.length > 10 && (
          <div className="w-16 h-16 rounded-lg bg-[#1c1c1e] flex items-center justify-center flex-shrink-0 text-white/50 text-sm">
            +{assets.length - 10}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-[#1c1c1e] rounded-full flex items-center justify-center mx-auto mb-6">
        <ImageIcon className="w-10 h-10 text-[#8e8e93]" />
      </div>
      {hasSearch ? (
        <>
          <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
          <p className="text-[#8e8e93] max-w-sm mx-auto">
            Try adjusting your search to find what you&apos;re looking for.
          </p>
        </>
      ) : (
        <>
          <h3 className="text-xl font-semibold text-white mb-2">No Media Yet</h3>
          <p className="text-[#8e8e93] mb-6 max-w-sm mx-auto">
            Your delivered photos, videos, and virtual tours will appear here.
          </p>
          <Link
            href="/book/listing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0077ff] text-white rounded-xl font-medium hover:bg-[#0066dd] transition-colors"
          >
            Book a Shoot
          </Link>
        </>
      )}
    </div>
  )
}
