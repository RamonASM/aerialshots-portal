'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Search,
  MessageSquare,
  Sparkles,
  Image,
  Download,
  CheckCircle2,
  Loader2,
  Home,
  MapPin,
  Star,
  GraduationCap,
  Heart,
  Coins,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LISTINGLAUNCH_CREDITS, calculateCampaignCredits } from '@/lib/listinglaunch/credits'
import { fetchWithTimeout, FETCH_TIMEOUTS, isTimeoutError } from '@/lib/utils/fetch-with-timeout'
import type { Tables } from '@/lib/supabase/types'

type Campaign = Tables<'listing_campaigns'> & {
  listing: Tables<'listings'> & {
    media_assets: Tables<'media_assets'>[]
  }
  agent: Tables<'agents'>
  carousels: Tables<'listing_carousels'>[]
}

interface CampaignDashboardProps {
  campaign: Campaign
  creditBalance?: number
}

const STEPS = [
  { id: 'research', label: 'Research', icon: Search, description: 'Gathering neighborhood data' },
  { id: 'questions', label: 'Questions', icon: MessageSquare, description: 'Answer personalized questions' },
  { id: 'generate', label: 'Generate', icon: Sparkles, description: 'AI creates your content' },
  { id: 'carousels', label: 'Carousels', icon: Image, description: 'Review & customize' },
  { id: 'download', label: 'Download', icon: Download, description: 'Get your images' },
]

const CAROUSEL_TYPES = [
  { id: 'property_highlights', name: 'Property Highlights', icon: Home, description: 'Showcase key features' },
  { id: 'neighborhood_guide', name: 'Neighborhood Guide', icon: MapPin, description: 'Local area highlights' },
  { id: 'local_favorites', name: 'Local Favorites', icon: Star, description: 'Your personal recommendations' },
  { id: 'schools_families', name: 'Schools & Families', icon: GraduationCap, description: 'Family-focused content' },
  { id: 'lifestyle', name: 'Lifestyle', icon: Heart, description: 'Paint the lifestyle picture' },
]

function getStepIndex(status: string): number {
  switch (status) {
    case 'draft':
      return 0
    case 'researching':
      return 0
    case 'questions':
      return 1
    case 'generating':
      return 2
    case 'completed':
      return 4
    case 'published':
      return 4
    default:
      return 0
  }
}

export function CampaignDashboard({ campaign, creditBalance = 0 }: CampaignDashboardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    campaign.carousel_types || ['property_highlights', 'neighborhood_guide', 'local_favorites']
  )
  const [generationProgress, setGenerationProgress] = useState<string>('Starting...')
  const generationTriggered = useRef(false)

  const currentStepIndex = getStepIndex(campaign.status || 'draft')
  const listing = campaign.listing

  // Calculate estimated credits for campaign
  const estimatedCredits = calculateCampaignCredits(selectedTypes.length, true)
  const hasEnoughCredits = creditBalance >= LISTINGLAUNCH_CREDITS.RESEARCH

  // Trigger content generation when status is 'generating'
  useEffect(() => {
    if (campaign.status !== 'generating' || generationTriggered.current) return

    generationTriggered.current = true
    const controller = new AbortController()
    let isMounted = true

    const triggerGeneration = async () => {
      setGenerationProgress('Generating carousel content...')

      try {
        const response = await fetchWithTimeout(`/api/campaigns/${campaign.id}/generate`, {
          method: 'POST',
          signal: controller.signal,
          timeout: FETCH_TIMEOUTS.GENERATION,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to generate content')
        }

        if (isMounted) {
          setGenerationProgress('Content generated! Refreshing...')
          // Refresh the page to show completed status
          router.refresh()
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') return
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Generation failed')
          setGenerationProgress('Error occurred')
        }
      }
    }

    triggerGeneration()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [campaign.status, campaign.id, router])

  const retryGeneration = async () => {
    setError(null)
    setGenerationProgress('Retrying generation...')

    try {
      const response = await fetchWithTimeout(`/api/campaigns/${campaign.id}/generate`, {
        method: 'POST',
        timeout: FETCH_TIMEOUTS.GENERATION,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate content')
      }

      setGenerationProgress('Content generated! Refreshing...')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setGenerationProgress('Error occurred')
    }
  }
  const agent = campaign.agent

  const handleStartResearch = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchWithTimeout(`/api/campaigns/${campaign.id}/research`, {
        method: 'POST',
        timeout: FETCH_TIMEOUTS.GENERATION,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start research')
      }

      router.refresh()
    } catch (err) {
      if (isTimeoutError(err)) {
        setError('Research is taking longer than expected. Please check back in a moment.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to start research')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const toggleCarouselType = (typeId: string) => {
    setSelectedTypes(prev => {
      if (prev.includes(typeId)) {
        return prev.filter(t => t !== typeId)
      }
      return [...prev, typeId]
    })
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/delivery/${listing.id}`}
                className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back to Delivery</span>
              </Link>
            </div>
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Campaign Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
          <p className="mt-1 text-neutral-400">
            {listing.beds} beds, {listing.baths} baths, {listing.sqft?.toLocaleString()} sqft
            {listing.price && ` - $${listing.price.toLocaleString()}`}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex
              const isCurrent = index === currentStepIndex
              const Icon = step.icon

              return (
                <div key={step.id} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-orange-500 text-white'
                          : 'bg-neutral-800 text-neutral-500'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        isCompleted || isCurrent ? 'text-white' : 'text-neutral-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        index < currentStepIndex ? 'bg-green-500' : 'bg-neutral-800'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Current Step */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              {campaign.status === 'draft' && (
                <>
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Select Carousel Types
                  </h2>
                  <p className="text-neutral-400 mb-6">
                    Choose which types of carousels you want to generate for this listing.
                    We recommend at least 3 different types for maximum engagement.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {CAROUSEL_TYPES.map((type) => {
                      const isSelected = selectedTypes.includes(type.id)
                      const Icon = type.icon

                      return (
                        <button
                          key={type.id}
                          onClick={() => toggleCarouselType(type.id)}
                          className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500/10'
                              : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                              isSelected ? 'bg-orange-500' : 'bg-neutral-700'
                            }`}
                          >
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-white">{type.name}</div>
                            <div className="text-sm text-neutral-400">{type.description}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Credit Cost Preview */}
                  <div className="mt-6 rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-orange-400" />
                        <span className="text-sm font-medium text-white">Estimated Credit Cost</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-white">{estimatedCredits}</span>
                        <span className="text-sm text-neutral-400 ml-1">credits</span>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Research</span>
                        <span>{LISTINGLAUNCH_CREDITS.RESEARCH} credits</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Question Generation</span>
                        <span>{LISTINGLAUNCH_CREDITS.QUESTIONS} credits</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Carousel Generation ({selectedTypes.length}x)</span>
                        <span>{selectedTypes.length * LISTINGLAUNCH_CREDITS.CAROUSEL_GENERATION} credits</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Image Rendering ({selectedTypes.length}x)</span>
                        <span>{selectedTypes.length * LISTINGLAUNCH_CREDITS.CAROUSEL_RENDER} credits</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Blog Post</span>
                        <span>{LISTINGLAUNCH_CREDITS.BLOG_GENERATION} credits</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-neutral-700 flex items-center justify-between">
                      <span className="text-sm text-neutral-400">Your Balance</span>
                      <span className={`text-sm font-medium ${hasEnoughCredits ? 'text-green-400' : 'text-red-400'}`}>
                        {creditBalance} credits
                      </span>
                    </div>
                    {!hasEnoughCredits && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        <span>Insufficient credits to start. Need {LISTINGLAUNCH_CREDITS.RESEARCH - creditBalance} more.</span>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={handleStartResearch}
                      disabled={isLoading || selectedTypes.length === 0 || !hasEnoughCredits}
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Starting Research...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Start Neighborhood Research
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}

              {campaign.status === 'researching' && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping">
                      <Search className="h-12 w-12 text-orange-500/50" />
                    </div>
                    <Search className="h-12 w-12 text-orange-500" />
                  </div>
                  <h2 className="mt-6 text-xl font-semibold text-white">
                    Researching Neighborhood
                  </h2>
                  <p className="mt-2 text-neutral-400 text-center max-w-md">
                    We're gathering data about restaurants, coffee shops, parks, schools,
                    and more near this listing. This usually takes about 30 seconds.
                  </p>
                </div>
              )}

              {campaign.status === 'questions' && (
                <>
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Answer a Few Questions
                  </h2>
                  <p className="text-neutral-400 mb-6">
                    Based on our research, we have some quick questions to make your
                    content more personal and engaging.
                  </p>
                  <Link href={`/campaigns/${campaign.id}/questions`}>
                    <Button className="bg-gradient-to-r from-orange-500 to-red-500">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Answer Questions
                    </Button>
                  </Link>
                </>
              )}

              {campaign.status === 'generating' && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="absolute inset-0 animate-pulse">
                      <Sparkles className="h-12 w-12 text-orange-500/50" />
                    </div>
                    <Sparkles className="h-12 w-12 text-orange-500" />
                  </div>
                  <h2 className="mt-6 text-xl font-semibold text-white">
                    Generating Your Content
                  </h2>
                  <p className="mt-2 text-neutral-400 text-center max-w-md">
                    {generationProgress}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    This usually takes about 60 seconds.
                  </p>
                  {error && (
                    <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 max-w-md">
                      {error}
                      <Button
                        onClick={retryGeneration}
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        Try Again
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {(campaign.status === 'completed' || campaign.status === 'published') && (
                <>
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Your Content Is Ready!
                  </h2>
                  <p className="text-neutral-400 mb-6">
                    Review your generated carousels and SEO blog post.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/campaigns/${campaign.id}/carousels`}>
                      <Button className="bg-gradient-to-r from-orange-500 to-red-500">
                        <Image className="mr-2 h-4 w-4" />
                        View Carousels
                      </Button>
                    </Link>
                    <Link href={`/campaigns/${campaign.id}/blog`}>
                      <Button variant="outline" className="border-neutral-700">
                        <Download className="mr-2 h-4 w-4" />
                        SEO Blog Post
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column - Listing Preview */}
          <div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
              {/* Listing Image */}
              {listing.media_assets && listing.media_assets.length > 0 && (
                <div className="aspect-video relative">
                  <img
                    src={listing.media_assets[0].media_url || listing.media_assets[0].aryeo_url || ''}
                    alt={listing.address}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {/* Listing Details */}
              <div className="p-4">
                <h3 className="font-semibold text-white">{listing.address}</h3>
                <p className="text-sm text-neutral-400">
                  {listing.city}, {listing.state} {listing.zip}
                </p>
                <div className="mt-3 flex items-center gap-4 text-sm text-neutral-400">
                  <span>{listing.beds} beds</span>
                  <span>{listing.baths} baths</span>
                  <span>{listing.sqft?.toLocaleString()} sqft</span>
                </div>
                {listing.price && (
                  <p className="mt-2 text-lg font-semibold text-white">
                    ${listing.price.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Agent Info */}
              {agent && (
                <div className="border-t border-neutral-800 p-4">
                  <div className="flex items-center gap-3">
                    {agent.headshot_url ? (
                      <img
                        src={agent.headshot_url}
                        alt={agent.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-neutral-700 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {agent.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-white">{agent.name}</p>
                      <p className="text-sm text-neutral-400">{agent.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Count */}
              <div className="border-t border-neutral-800 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Photos Available</span>
                  <span className="font-medium text-white">
                    {listing.media_assets?.filter(a => a.type === 'photo').length || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
