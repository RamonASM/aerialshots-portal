/**
 * Skill Outputs Query Functions
 *
 * Fetches skill-generated content for listings
 */

import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CACHE_REVALIDATION, CACHE_TAGS } from '@/lib/utils/cache'

/**
 * Listing skill outputs structure
 */
export interface ListingSkillOutputs {
  descriptions?: {
    professional?: string
    warm?: string
    luxury?: string
  }
  socialCaptions?: {
    instagram?: string
    facebook?: string
    tiktok?: string
  }
  videos?: {
    slideshow?: {
      url: string
      thumbnailUrl?: string
      durationSeconds: number
    }
    socialReel?: {
      url: string
      thumbnailUrl?: string
      durationSeconds: number
    }
  }
  analysis?: {
    roomType?: string
    features?: string[]
    suggestions?: string[]
  }
  generatedAt?: string
}

/**
 * Get skill outputs for a listing
 */
export const getListingSkillOutputs = async (
  listingId: string
): Promise<ListingSkillOutputs | null> => {
  return unstable_cache(
    async (): Promise<ListingSkillOutputs | null> => {
      const supabase = await createClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('listing_skill_outputs')
        .select('skill_id, output_type, output_data, status, created_at')
        .eq('listing_id', listingId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Skill Outputs] Error fetching outputs:', error)
        return null
      }

      if (!data || data.length === 0) {
        return null
      }

      // Organize outputs by type
      const outputs: ListingSkillOutputs = {}

      for (const row of data) {
        const outputData = row.output_data as Record<string, unknown>

        switch (row.output_type) {
          case 'description': {
            if (!outputs.descriptions) outputs.descriptions = {}
            const style = outputData.style as string
            const content = outputData.content as string
            if (style && content) {
              outputs.descriptions[style as keyof typeof outputs.descriptions] = content
            }
            break
          }

          case 'social_caption': {
            if (!outputs.socialCaptions) outputs.socialCaptions = {}
            const platform = outputData.platform as string
            const caption = outputData.caption as string
            if (platform && caption) {
              outputs.socialCaptions[platform as keyof typeof outputs.socialCaptions] = caption
            }
            break
          }

          case 'slideshow_video': {
            if (!outputs.videos) outputs.videos = {}
            outputs.videos.slideshow = {
              url: outputData.videoUrl as string,
              thumbnailUrl: outputData.thumbnailUrl as string | undefined,
              durationSeconds: outputData.durationSeconds as number,
            }
            break
          }

          case 'social_reel': {
            if (!outputs.videos) outputs.videos = {}
            outputs.videos.socialReel = {
              url: outputData.videoUrl as string,
              thumbnailUrl: outputData.thumbnailUrl as string | undefined,
              durationSeconds: outputData.durationSeconds as number,
            }
            break
          }

          case 'analysis': {
            outputs.analysis = {
              roomType: outputData.roomType as string | undefined,
              features: outputData.features as string[] | undefined,
              suggestions: outputData.suggestions as string[] | undefined,
            }
            break
          }
        }

        // Track the most recent generation time
        if (!outputs.generatedAt || row.created_at > outputs.generatedAt) {
          outputs.generatedAt = row.created_at
        }
      }

      return outputs
    },
    [`listing-skill-outputs-${listingId}`],
    {
      revalidate: CACHE_REVALIDATION.LISTING,
      tags: [CACHE_TAGS.LISTINGS, `listing-${listingId}`],
    }
  )()
}

/**
 * Check if a listing has any skill outputs
 */
export async function hasSkillOutputs(listingId: string): Promise<boolean> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase as any)
    .from('listing_skill_outputs')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', listingId)
    .eq('status', 'completed')

  if (error) {
    console.error('[Skill Outputs] Error checking outputs:', error)
    return false
  }

  return (count || 0) > 0
}

/**
 * Get skill output counts for dashboard badges
 */
export async function getSkillOutputCounts(
  listingId: string
): Promise<{
  descriptions: number
  captions: number
  videos: number
}> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('listing_skill_outputs')
    .select('output_type')
    .eq('listing_id', listingId)
    .eq('status', 'completed')

  if (error || !data) {
    return { descriptions: 0, captions: 0, videos: 0 }
  }

  let descriptions = 0
  let captions = 0
  let videos = 0

  for (const row of data) {
    switch (row.output_type) {
      case 'description':
        descriptions++
        break
      case 'social_caption':
        captions++
        break
      case 'slideshow_video':
      case 'social_reel':
        videos++
        break
    }
  }

  return { descriptions, captions, videos }
}
