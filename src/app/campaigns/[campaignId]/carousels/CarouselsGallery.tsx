'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Sparkles,
  Copy,
  Check,
  Download,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  Star,
  GraduationCap,
  Heart,
  Loader2,
  Instagram,
  Image as ImageIcon,
  ExternalLink,
  Pencil,
  X,
  Save,
  RefreshCw,
  Coins,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchWithTimeout, FETCH_TIMEOUTS, isTimeoutError } from '@/lib/utils/fetch-with-timeout'
import type { CarouselSlide } from '@/lib/supabase/types'

interface Carousel {
  id: string
  carousel_type: string
  slides: CarouselSlide[]
  caption: string | null
  hashtags: string[] | null
  render_status: string
  rendered_image_urls: string[] | null
}

interface MediaAsset {
  id: string
  type: string
  category: string | null
  aryeo_url: string
}

interface Agent {
  id: string
  name: string
  headshot_url: string | null
  logo_url: string | null
  brand_color: string | null
}

interface CarouselsGalleryProps {
  campaignId: string
  campaignName: string
  listingAddress: string
  carousels: Carousel[]
  mediaAssets: MediaAsset[]
  agent: Agent
  hasInstagramConnection?: boolean
  creditBalance?: number
}

const CAROUSEL_TYPE_INFO: Record<string, { name: string; icon: typeof Home }> = {
  property_highlights: { name: 'Property Highlights', icon: Home },
  neighborhood_guide: { name: 'Neighborhood Guide', icon: MapPin },
  local_favorites: { name: 'Local Favorites', icon: Star },
  schools_families: { name: 'Schools & Families', icon: GraduationCap },
  lifestyle: { name: 'Lifestyle', icon: Heart },
}

export function CarouselsGallery({
  campaignId,
  campaignName,
  listingAddress,
  carousels: initialCarousels,
  mediaAssets,
  agent,
  hasInstagramConnection = false,
  creditBalance = 0,
}: CarouselsGalleryProps) {
  const [carousels, setCarousels] = useState(initialCarousels)
  const [activeCarousel, setActiveCarousel] = useState(0)
  const [activeSlide, setActiveSlide] = useState(0)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [copiedHashtags, setCopiedHashtags] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)
  // Slide editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editedSlides, setEditedSlides] = useState<CarouselSlide[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  // Caption editing state
  const [isEditingCaption, setIsEditingCaption] = useState(false)
  const [editedCaption, setEditedCaption] = useState('')
  const [editedHashtags, setEditedHashtags] = useState<string[]>([])
  const [isSavingCaption, setIsSavingCaption] = useState(false)
  const [captionEditError, setCaptionEditError] = useState<string | null>(null)
  // Polling timeout state
  const [pollingTimedOut, setPollingTimedOut] = useState(false)
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null)

  const currentCarousel = carousels[activeCarousel]
  const slides = (currentCarousel?.slides as CarouselSlide[]) || []
  const currentSlide = slides[activeSlide]
  const typeInfo = CAROUSEL_TYPE_INFO[currentCarousel?.carousel_type] || {
    name: currentCarousel?.carousel_type || 'Carousel',
    icon: Home,
  }
  const TypeIcon = typeInfo.icon
  const renderedUrls = currentCarousel?.rendered_image_urls || []
  const isCarouselRendered = currentCarousel?.render_status === 'completed' && renderedUrls.length > 0

  // Get photo for slide (use rendered if available, otherwise original)
  const getSlidePhoto = useCallback((slideIndex: number): string | null => {
    // Use rendered image if available
    if (renderedUrls[slideIndex]) {
      return renderedUrls[slideIndex]
    }
    // Fall back to original photos
    const photos = mediaAssets.filter(a => a.type === 'photo')
    if (photos.length === 0) return null
    return photos[slideIndex % photos.length]?.aryeo_url || null
  }, [renderedUrls, mediaAssets])

  // Poll for render status with AbortController and timeout
  const POLL_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes max polling time

  useEffect(() => {
    if (currentCarousel?.render_status !== 'rendering') {
      // Reset timeout state when not rendering
      setPollingTimedOut(false)
      setPollingStartTime(null)
      return
    }

    // Initialize polling start time
    const startTime = pollingStartTime || Date.now()
    if (!pollingStartTime) {
      setPollingStartTime(startTime)
    }

    const controller = new AbortController()
    let pollInterval: NodeJS.Timeout | null = null

    const pollRenderStatus = async () => {
      // Check if polling has timed out
      if (Date.now() - startTime > POLL_TIMEOUT_MS) {
        setPollingTimedOut(true)
        if (pollInterval) clearInterval(pollInterval)
        return
      }

      try {
        const response = await fetchWithTimeout(
          `/api/campaigns/${campaignId}/carousels/${currentCarousel.id}/render`,
          { signal: controller.signal, timeout: FETCH_TIMEOUTS.QUICK }
        )
        if (response.ok) {
          const data = await response.json()
          if (data.status === 'completed' || data.status === 'failed') {
            // Refresh the page to get updated data
            window.location.reload()
          }
        }
      } catch (error) {
        // Ignore abort errors and timeout errors during polling
        if (error instanceof Error && error.name === 'AbortError') return
        if (isTimeoutError(error)) return // Skip this poll cycle, try again
        console.error('Error polling render status:', error)
      }
    }

    pollInterval = setInterval(pollRenderStatus, 5000) // Poll every 5 seconds

    return () => {
      controller.abort()
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [currentCarousel?.render_status, currentCarousel?.id, campaignId, pollingStartTime])

  const handleCopyCaption = async () => {
    if (currentCarousel?.caption) {
      await navigator.clipboard.writeText(currentCarousel.caption)
      setCopiedCaption(true)
      setTimeout(() => setCopiedCaption(false), 2000)
    }
  }

  const handleCopyHashtags = async () => {
    if (currentCarousel?.hashtags) {
      const hashtags = currentCarousel.hashtags.map(h => `#${h}`).join(' ')
      await navigator.clipboard.writeText(hashtags)
      setCopiedHashtags(true)
      setTimeout(() => setCopiedHashtags(false), 2000)
    }
  }

  const nextSlide = () => {
    if (activeSlide < slides.length - 1) {
      setActiveSlide(prev => prev + 1)
    }
  }

  const prevSlide = () => {
    if (activeSlide > 0) {
      setActiveSlide(prev => prev - 1)
    }
  }

  const handleRenderCarousel = async () => {
    setIsRendering(true)
    setRenderError(null)

    try {
      const response = await fetchWithTimeout(
        `/api/campaigns/${campaignId}/carousels/${currentCarousel.id}/render`,
        { method: 'POST', timeout: FETCH_TIMEOUTS.RENDER }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start rendering')
      }

      // Update local state to show rendering status
      setCarousels(prev => prev.map((c, i) =>
        i === activeCarousel ? { ...c, render_status: 'rendering' } : c
      ))
    } catch (error) {
      if (isTimeoutError(error)) {
        setRenderError('Rendering is taking longer than expected. Please try again.')
      } else {
        setRenderError(error instanceof Error ? error.message : 'Failed to render')
      }
    } finally {
      setIsRendering(false)
    }
  }

  const handlePublishToInstagram = async () => {
    setIsPublishing(true)
    setPublishError(null)
    setPublishSuccess(null)

    try {
      const response = await fetchWithTimeout('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carouselId: currentCarousel.id,
          agentId: agent.id,
        }),
        timeout: FETCH_TIMEOUTS.RENDER, // Publishing can take a bit
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish')
      }

      setPublishSuccess(data.permalink || 'Published successfully!')
    } catch (error) {
      if (isTimeoutError(error)) {
        setPublishError('Publishing is taking longer than expected. Check your Instagram to see if it posted.')
      } else {
        setPublishError(error instanceof Error ? error.message : 'Failed to publish')
      }
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDownloadAll = () => {
    if (!isCarouselRendered) return

    // Download each image
    renderedUrls.forEach((url, index) => {
      if (url) {
        const a = document.createElement('a')
        a.href = url
        a.download = `${currentCarousel.carousel_type}_slide_${index + 1}.jpg`
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    })
  }

  // Start editing mode
  const handleStartEditing = () => {
    setEditedSlides([...slides])
    setIsEditing(true)
    setEditError(null)
  }

  // Cancel editing
  const handleCancelEditing = () => {
    setIsEditing(false)
    setEditedSlides([])
    setEditError(null)
  }

  // Update a slide field while editing
  const handleSlideChange = (slideIndex: number, field: 'headline' | 'body', value: string) => {
    setEditedSlides(prev => prev.map((slide, i) =>
      i === slideIndex ? { ...slide, [field]: value } : slide
    ))
  }

  // Save edited slides
  const handleSaveEdits = async () => {
    setIsSaving(true)
    setEditError(null)

    try {
      const response = await fetchWithTimeout(
        `/api/campaigns/${campaignId}/carousels/${currentCarousel.id}/slides`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slides: editedSlides }),
          timeout: FETCH_TIMEOUTS.DEFAULT,
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save changes')
      }

      // Update local state with edited slides
      setCarousels(prev => prev.map((c, i) =>
        i === activeCarousel
          ? {
              ...c,
              slides: editedSlides,
              // Reset render status if it was completed
              render_status: data.renderStatusReset ? 'pending' : c.render_status,
              rendered_image_urls: data.renderStatusReset ? [] : c.rendered_image_urls,
            }
          : c
      ))

      setIsEditing(false)
      setEditedSlides([])
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  // Get the current slide content (edited or original)
  const getDisplaySlide = (index: number): CarouselSlide | undefined => {
    if (isEditing && editedSlides[index]) {
      return editedSlides[index]
    }
    return slides[index]
  }

  const displaySlide = getDisplaySlide(activeSlide)

  // Caption editing functions
  const handleStartEditingCaption = () => {
    setEditedCaption(currentCarousel?.caption || '')
    setEditedHashtags(currentCarousel?.hashtags || [])
    setIsEditingCaption(true)
    setCaptionEditError(null)
  }

  const handleCancelEditingCaption = () => {
    setIsEditingCaption(false)
    setEditedCaption('')
    setEditedHashtags([])
    setCaptionEditError(null)
  }

  const handleAddHashtag = (tag: string) => {
    const cleanTag = tag.replace(/^#/, '').trim()
    if (cleanTag && !editedHashtags.includes(cleanTag)) {
      setEditedHashtags([...editedHashtags, cleanTag])
    }
  }

  const handleRemoveHashtag = (tag: string) => {
    setEditedHashtags(editedHashtags.filter(t => t !== tag))
  }

  const handleSaveCaption = async () => {
    setIsSavingCaption(true)
    setCaptionEditError(null)

    try {
      const response = await fetchWithTimeout(
        `/api/campaigns/${campaignId}/carousels/${currentCarousel.id}/caption`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caption: editedCaption, hashtags: editedHashtags }),
          timeout: FETCH_TIMEOUTS.DEFAULT,
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save caption')
      }

      // Update local state
      setCarousels(prev => prev.map((c, i) =>
        i === activeCarousel
          ? { ...c, caption: editedCaption, hashtags: editedHashtags }
          : c
      ))

      setIsEditingCaption(false)
      setEditedCaption('')
      setEditedHashtags([])
    } catch (error) {
      setCaptionEditError(error instanceof Error ? error.message : 'Failed to save caption')
    } finally {
      setIsSavingCaption(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/campaigns/${campaignId}`}
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-4">
              {/* Credit Balance */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/50 border border-neutral-700">
                <Coins className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-medium text-white">{creditBalance}</span>
                <span className="text-xs text-neutral-400">credits</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-500" />
                <span className="font-semibold text-white">ListingLaunch</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Your Carousels</h1>
          <p className="mt-1 text-neutral-400">{listingAddress}</p>
        </div>

        {/* Carousel Type Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {carousels.map((carousel, index) => {
            const info = CAROUSEL_TYPE_INFO[carousel.carousel_type] || {
              name: carousel.carousel_type,
              icon: Home,
            }
            const Icon = info.icon
            const isActive = index === activeCarousel
            const isRendered = carousel.render_status === 'completed'

            return (
              <button
                key={carousel.id}
                onClick={() => {
                  setActiveCarousel(index)
                  setActiveSlide(0)
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-orange-500 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{info.name}</span>
                {isRendered && (
                  <Check className="h-3 w-3 text-green-400" />
                )}
              </button>
            )
          })}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Slide Preview */}
          <div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
              {/* Slide Preview Area */}
              <div className="relative aspect-[4/5] bg-neutral-800">
                {/* Background Image */}
                {getSlidePhoto(activeSlide) && (
                  <img
                    src={getSlidePhoto(activeSlide)!}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}

                {/* Only show overlay if NOT rendered */}
                {!isCarouselRendered && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Content (only show when not rendered) */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6">
                      {agent.logo_url && (
                        <div className="absolute top-4 right-4">
                          <img
                            src={agent.logo_url}
                            alt={agent.name}
                            className="h-10 w-auto"
                          />
                        </div>
                      )}

                      <div className="absolute top-4 left-4 bg-black/50 rounded-full px-3 py-1 text-xs text-white">
                        {activeSlide + 1} / {slides.length}
                      </div>

                      {/* Editable Content */}
                      {isEditing ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={displaySlide?.headline || ''}
                            onChange={(e) => handleSlideChange(activeSlide, 'headline', e.target.value)}
                            placeholder="Headline"
                            maxLength={100}
                            className="w-full bg-black/50 border border-white/30 rounded-lg px-3 py-2 text-xl font-bold text-white placeholder-white/50 focus:border-orange-500 focus:outline-none"
                          />
                          <textarea
                            value={displaySlide?.body || ''}
                            onChange={(e) => handleSlideChange(activeSlide, 'body', e.target.value)}
                            placeholder="Body text"
                            maxLength={500}
                            rows={3}
                            className="w-full bg-black/50 border border-white/30 rounded-lg px-3 py-2 text-white/90 placeholder-white/50 focus:border-orange-500 focus:outline-none resize-none"
                          />
                          <p className="text-xs text-white/50">
                            {displaySlide?.headline?.length || 0}/100 headline · {displaySlide?.body?.length || 0}/500 body
                          </p>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">
                            {displaySlide?.headline || 'Headline'}
                          </h3>
                          <p className="text-white/90 text-lg">
                            {displaySlide?.body || 'Body text'}
                          </p>
                        </div>
                      )}

                      <div
                        className="absolute bottom-0 left-0 right-0 h-1"
                        style={{ backgroundColor: agent.brand_color || '#ff4533' }}
                      />
                    </div>
                  </>
                )}

                {/* Rendered badge */}
                {isCarouselRendered && (
                  <div className="absolute top-4 right-4 bg-green-500 rounded-full px-3 py-1 text-xs text-white font-medium">
                    Rendered
                  </div>
                )}

                {/* Navigation Arrows */}
                <button
                  onClick={prevSlide}
                  disabled={activeSlide === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-2 text-white disabled:opacity-30 hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextSlide}
                  disabled={activeSlide === slides.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-2 text-white disabled:opacity-30 hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              {/* Slide Thumbnails */}
              <div className="p-4 flex gap-2 overflow-x-auto">
                {slides.map((slide, index) => (
                  <button
                    key={`slide-thumb-${slide.position || index}`}
                    onClick={() => setActiveSlide(index)}
                    className={`relative h-16 w-12 rounded-lg overflow-hidden shrink-0 transition-all ${
                      index === activeSlide
                        ? 'ring-2 ring-orange-500'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    {getSlidePhoto(index) ? (
                      <img
                        src={getSlidePhoto(index)!}
                        alt={`Slide ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-neutral-700" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-medium text-white">
                      {index + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Caption & Actions */}
          <div className="space-y-6">
            {/* Current Carousel Info */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: agent.brand_color || '#ff4533' }}
                >
                  <TypeIcon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{typeInfo.name}</h3>
                  <p className="text-sm text-neutral-400">
                    {slides.length} slides
                    {currentCarousel?.render_status === 'completed' && (
                      <span className="text-green-400 ml-2">Ready to post</span>
                    )}
                    {currentCarousel?.render_status === 'rendering' && (
                      <span className="text-orange-400 ml-2">Rendering...</span>
                    )}
                  </p>
                </div>
                {/* Edit Button */}
                {!isCarouselRendered && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartEditing}
                    className="border-neutral-700"
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit Slides
                  </Button>
                )}
              </div>

              {/* Edit Mode Actions */}
              {isEditing && (
                <div className="space-y-3 pt-3 border-t border-neutral-700">
                  <p className="text-sm text-neutral-400">
                    Editing slides - changes will require re-rendering images
                  </p>
                  {editError && (
                    <p className="text-sm text-red-400">{editError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveEdits}
                      disabled={isSaving}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelEditing}
                      disabled={isSaving}
                      className="border-neutral-700"
                    >
                      <X className="mr-1 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Caption & Hashtags */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Caption & Hashtags</h3>
                {!isEditingCaption ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStartEditingCaption}
                      className="border-neutral-700"
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCaption}
                      className="border-neutral-700"
                    >
                      {copiedCaption ? (
                        <>
                          <Check className="mr-1 h-3 w-3 text-green-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-3 w-3" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveCaption}
                      disabled={isSavingCaption}
                      size="sm"
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      {isSavingCaption ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="mr-1 h-3 w-3" />
                      )}
                      {isSavingCaption ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditingCaption}
                      disabled={isSavingCaption}
                      className="border-neutral-700"
                    >
                      <X className="mr-1 h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {captionEditError && (
                <p className="text-sm text-red-400 mb-3">{captionEditError}</p>
              )}

              {isEditingCaption ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Caption</label>
                    <textarea
                      value={editedCaption}
                      onChange={(e) => setEditedCaption(e.target.value)}
                      placeholder="Enter your caption..."
                      rows={4}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-orange-500 focus:outline-none resize-none"
                    />
                    <p className="text-xs text-neutral-500 mt-1">{editedCaption.length} characters</p>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Hashtags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editedHashtags.map((tag) => (
                        <span
                          key={`edit-hashtag-${tag}`}
                          className="flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-800 text-neutral-300 text-sm"
                        >
                          #{tag}
                          <button
                            onClick={() => handleRemoveHashtag(tag)}
                            className="ml-1 text-neutral-500 hover:text-red-400"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Type a hashtag and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault()
                          handleAddHashtag(e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Press Enter to add hashtag</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-neutral-300 text-sm whitespace-pre-wrap">
                    {currentCarousel?.caption || 'No caption generated'}
                  </p>
                  {currentCarousel?.hashtags && currentCarousel.hashtags.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-neutral-400">Hashtags</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyHashtags}
                          className="h-6 px-2 text-xs"
                        >
                          {copiedHashtags ? (
                            <>
                              <Check className="mr-1 h-3 w-3 text-green-500" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1 h-3 w-3" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentCarousel.hashtags.map((tag) => (
                          <span
                            key={`hashtag-${tag}`}
                            className="px-2 py-1 rounded-full bg-neutral-800 text-neutral-300 text-sm"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Render & Download Section */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <h3 className="font-semibold text-white mb-4">Images</h3>

              {currentCarousel?.render_status === 'rendering' && pollingTimedOut ? (
                <div className="text-center py-4">
                  <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
                    <RefreshCw className="h-6 w-6 text-orange-500" />
                  </div>
                  <p className="text-neutral-400 text-sm mb-2">
                    Rendering is taking longer than expected.
                  </p>
                  <p className="text-neutral-500 text-xs mb-3">
                    The render may still be in progress. You can check back later or refresh.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="border-neutral-700"
                    >
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Refresh Status
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setPollingTimedOut(false)
                        setPollingStartTime(Date.now())
                      }}
                      className="bg-gradient-to-r from-orange-500 to-red-500"
                    >
                      Continue Waiting
                    </Button>
                  </div>
                </div>
              ) : currentCarousel?.render_status === 'rendering' ? (
                <div className="text-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-3" />
                  <p className="text-neutral-400 text-sm">
                    Rendering your carousel images...
                  </p>
                  <p className="text-neutral-500 text-xs mt-1">
                    This usually takes about {slides.length * 10} seconds
                  </p>
                </div>
              ) : currentCarousel?.render_status === 'failed' ? (
                <div className="text-center py-4">
                  <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                    <X className="h-6 w-6 text-red-500" />
                  </div>
                  <p className="text-neutral-400 text-sm mb-3">
                    Rendering failed. Please try again.
                  </p>
                  <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    onClick={handleRenderCarousel}
                    disabled={isRendering}
                  >
                    {isRendering ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {isRendering ? 'Starting...' : 'Retry Render'}
                  </Button>
                </div>
              ) : isCarouselRendered ? (
                <>
                  <p className="text-neutral-400 text-sm mb-4">
                    Your carousel images are ready! Download them or post directly to Instagram.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                      onClick={handleDownloadAll}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download All Slides
                    </Button>

                    {hasInstagramConnection ? (
                      <Button
                        variant="outline"
                        className="w-full border-pink-500/50 text-pink-400 hover:bg-pink-500/10"
                        onClick={handlePublishToInstagram}
                        disabled={isPublishing}
                      >
                        {isPublishing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Instagram className="mr-2 h-4 w-4" />
                        )}
                        {isPublishing ? 'Publishing...' : 'Post to Instagram'}
                      </Button>
                    ) : (
                      <Link href="/dashboard/settings">
                        <Button
                          variant="outline"
                          className="w-full border-neutral-700"
                        >
                          <Instagram className="mr-2 h-4 w-4" />
                          Connect Instagram to Post
                        </Button>
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-neutral-400 text-sm mb-4">
                    Render your carousel images with text overlays and branding.
                  </p>
                  <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    onClick={handleRenderCarousel}
                    disabled={isRendering}
                  >
                    {isRendering ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ImageIcon className="mr-2 h-4 w-4" />
                    )}
                    {isRendering ? 'Starting...' : 'Render Images'}
                  </Button>
                  <p className="mt-3 text-xs text-neutral-500 text-center">
                    Requires Bannerbear API key to be configured
                  </p>
                </>
              )}

              {renderError && (
                <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400 text-center mb-2">
                    {renderError}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={handleRenderCarousel}
                    disabled={isRendering}
                  >
                    {isRendering ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-3 w-3" />
                    )}
                    {isRendering ? 'Retrying...' : 'Retry Render'}
                  </Button>
                </div>
              )}

              {publishError && (
                <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400 text-center mb-2">
                    {publishError}
                  </p>
                  {hasInstagramConnection && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={handlePublishToInstagram}
                      disabled={isPublishing}
                    >
                      {isPublishing ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-3 w-3" />
                      )}
                      {isPublishing ? 'Retrying...' : 'Retry Publish'}
                    </Button>
                  )}
                </div>
              )}

              {publishSuccess && (
                <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-green-400 text-center">
                    Published to Instagram!
                    {publishSuccess.startsWith('http') && (
                      <a
                        href={publishSuccess}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center text-green-300 hover:underline"
                      >
                        View Post <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* All Slides Overview */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-white mb-4">All Slides</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {slides.map((slide, index) => (
              <div
                key={`slide-card-${slide.position || index}`}
                className="rounded-lg border border-neutral-800 bg-neutral-900/50 overflow-hidden cursor-pointer hover:border-orange-500/50 transition-colors"
                onClick={() => setActiveSlide(index)}
              >
                <div className="relative aspect-[4/5] bg-neutral-800">
                  {getSlidePhoto(index) && (
                    <img
                      src={getSlidePhoto(index)!}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                  {!isCarouselRendered && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-sm font-semibold text-white line-clamp-2">
                          {slide.headline}
                        </p>
                        <p className="text-xs text-white/70 mt-1 line-clamp-2">
                          {slide.body}
                        </p>
                      </div>
                    </>
                  )}
                  <div className="absolute top-2 left-2 bg-black/50 rounded-full px-2 py-0.5 text-xs text-white">
                    {index + 1}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
