import { notFound } from 'next/navigation'
import { getListingById, organizeMediaByCategory, getCategoryInfo } from '@/lib/queries/listings'
import { DeliveryHeader, MediaSection, DownloadAllButton, DeliveryPageTracker } from '@/components/delivery'
import { DeliveryAIContent } from '@/components/delivery/DeliveryAIContent'
import { DeliveryVideos } from '@/components/delivery/DeliveryVideos'
import { LaunchCampaignButton } from '@/components/campaigns'
import { ShareButton } from '@/components/ui/share-button'
import { getListingSkillOutputs } from '@/lib/queries/skill-outputs'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ listingId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { listingId } = await params
  const listing = await getListingById(listingId)

  if (!listing) {
    return {
      title: 'Listing Not Found | Aerial Shots Media',
    }
  }

  return {
    title: `${listing.address} | Media Delivery | Aerial Shots Media`,
    description: `Download your professional real estate media for ${listing.address}`,
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function DeliveryPage({ params }: PageProps) {
  const { listingId } = await params

  // Fetch listing and skill outputs in parallel
  const [listing, skillOutputs] = await Promise.all([
    getListingById(listingId),
    getListingSkillOutputs(listingId),
  ])

  if (!listing) {
    notFound()
  }

  const mediaByCategory = organizeMediaByCategory(listing.media_assets)
  const brandColor = listing.agent?.brand_color ?? '#ff4533'

  // Order categories for display
  const categoryOrder = [
    'mls',
    'social_feed',
    'social_stories',
    'video',
    'floorplan',
    'matterport',
    'interactive',
    'print',
  ]

  return (
    <div className="min-h-screen bg-black">
      {/* Analytics Tracking */}
      <DeliveryPageTracker listingId={listing.id} agentId={listing.agent_id} />

      <DeliveryHeader listing={listing} agent={listing.agent} />

      {/* Actions Bar */}
      <div className="border-b border-white/[0.08] bg-[#0a0a0a]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-[13px] text-[#a1a1a6]">
              Your media is ready for download
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ShareButton
              title={`Media for ${listing.address}`}
              text="View your professional real estate media"
              variant="outline"
            />
            {listing.agent && (
              <LaunchCampaignButton
                listingId={listing.id}
                agentId={listing.agent.id}
                listingAddress={listing.address}
              />
            )}
            <DownloadAllButton assets={listing.media_assets} listingAddress={listing.address} />
          </div>
        </div>
      </div>

      {/* Media Sections */}
      <main className="mx-auto max-w-7xl">
        {categoryOrder.map((category) => {
          const assets = mediaByCategory[category]
          if (!assets || assets.length === 0) return null

          const info = getCategoryInfo(category)

          return (
            <MediaSection
              key={category}
              title={info.title}
              description={info.description}
              tip={info.tip}
              assets={assets}
              brandColor={brandColor}
            />
          )
        })}

        {/* AI-Generated Content Section */}
        {skillOutputs && (skillOutputs.descriptions || skillOutputs.socialCaptions || skillOutputs.videos) && (
          <section className="border-t border-white/[0.08] px-4 py-10 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white">AI-Generated Content</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Marketing content automatically generated for your listing
              </p>
            </div>

            <div className="space-y-6">
              {/* AI Videos */}
              {skillOutputs.videos && (
                <DeliveryVideos
                  videos={skillOutputs.videos}
                  brandColor={brandColor}
                />
              )}

              {/* AI Descriptions & Captions */}
              {(skillOutputs.descriptions || skillOutputs.socialCaptions) && (
                <DeliveryAIContent
                  descriptions={skillOutputs.descriptions}
                  captions={skillOutputs.socialCaptions}
                  brandColor={brandColor}
                  generatedAt={skillOutputs.generatedAt}
                />
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#0a0a0a]">
        <div className="mx-auto max-w-7xl px-4 py-10 text-center sm:px-6 lg:px-8">
          <p className="text-[13px] text-[#636366]">
            Delivered by{' '}
            <a
              href="https://www.aerialshots.media"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0077ff] hover:text-[#3395ff] transition-colors"
            >
              Aerial Shots Media
            </a>
          </p>
          <p className="mt-3 text-[12px] text-[#48484a]">
            Need help? Contact us at{' '}
            <a href="mailto:hello@aerialshots.media" className="hover:text-[#a1a1a6] transition-colors">
              hello@aerialshots.media
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
