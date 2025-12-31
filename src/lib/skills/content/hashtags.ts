/**
 * Generate Hashtags Skill
 *
 * Generates platform-optimized hashtags for real estate social media content.
 */

import type { SkillDefinition, SkillResult, ValidationError } from '../types'
import type { HashtagsInput, HashtagsOutput, SocialPlatform } from './types'

// =====================
// HASHTAG DATABASES
// =====================

const REAL_ESTATE_HASHTAGS = {
  general: [
    '#realestate', '#realtor', '#home', '#property', '#realtorlife',
    '#forsale', '#househunting', '#dreamhome', '#homesforsale', '#luxuryrealestate',
  ],
  listing: [
    '#justlisted', '#newlisting', '#openhousesunday', '#homeforsale', '#pricereduced',
    '#comingsoon', '#justsold', '#offmarket', '#hotproperty', '#exclusivelisting',
  ],
  buyer: [
    '#homebuyer', '#firsttimehomebuyer', '#buyersmarket', '#househunting', '#homeownership',
    '#investmentproperty', '#realestateinvesting', '#buyingahome', '#homebuyertips',
  ],
  seller: [
    '#sellersmarket', '#sellinghomes', '#homeselling', '#listyourhome', '#soldproperty',
    '#homevalue', '#sellingahome', '#listingagent', '#sellersguide',
  ],
  luxury: [
    '#luxuryhomes', '#milliondollarlisting', '#luxuryliving', '#luxurylifestyle',
    '#estatehomes', '#mansions', '#highendrealestate', '#luxuryrealestate',
  ],
}

const LIFESTYLE_HASHTAGS = [
  '#homedesign', '#interiordesign', '#architecture', '#homedecor', '#modernhome',
  '#dreamhouse', '#homegoals', '#beautifulhomes', '#housegoals', '#lifestyle',
]

const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  instagram: 30,
  instagram_story: 10,
  facebook: 10,
  linkedin: 5,
  twitter: 5,
  tiktok: 15,
}

// =====================
// HELPER FUNCTIONS
// =====================

function formatHashtag(text: string): string {
  return '#' + text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 30)
}

function generateLocationHashtags(city?: string, state?: string): string[] {
  const tags: string[] = []

  if (city) {
    const cleanCity = city.replace(/\s+/g, '')
    tags.push(
      formatHashtag(city),
      formatHashtag(`${cleanCity}realestate`),
      formatHashtag(`${cleanCity}homes`),
      formatHashtag(`${cleanCity}realtor`),
    )
  }

  if (state) {
    const cleanState = state.replace(/\s+/g, '')
    tags.push(
      formatHashtag(`${cleanState}realestate`),
      formatHashtag(`${cleanState}homes`),
    )
  }

  if (city && state) {
    tags.push(formatHashtag(`${city.replace(/\s+/g, '')}${state.replace(/\s+/g, '')}`))
  }

  return [...new Set(tags)]
}

function getStoryTypeHashtags(storyType?: string): string[] {
  switch (storyType) {
    case 'just_listed':
      return ['#justlisted', '#newlisting', '#hotproperty', '#homeforsale']
    case 'just_sold':
      return ['#justsold', '#sold', '#closingday', '#success', '#congratulations']
    case 'open_house':
      return ['#openhouse', '#openhouseweekend', '#houseshowing', '#comesee']
    case 'price_reduction':
      return ['#pricereduced', '#pricedrop', '#greatdeal', '#valuebuyer']
    case 'coming_soon':
      return ['#comingsoon', '#sneakpeek', '#offmarket', '#exclusive']
    case 'neighborhood_guide':
      return ['#neighborhoodguide', '#localguide', '#communitylife', '#explorelegal']
    case 'local_favorites':
      return ['#localfavorites', '#supportlocal', '#localgems', '#hiddenspots']
    case 'lifestyle':
      return ['#lifestyle', '#livinglocal', '#lifehere', '#communityliving']
    case 'market_update':
      return ['#marketupdate', '#markettrends', '#realestatemarket', '#housingmarket']
    default:
      return []
  }
}

function getTrendingHashtags(): string[] {
  // These would typically be fetched from an API or updated periodically
  return [
    '#realestate2025', '#homeowner', '#investment', '#propertymarket',
    '#homesweethome', '#newhome', '#homebuying', '#realestateagent',
  ]
}

// =====================
// SKILL DEFINITION
// =====================

export const generateHashtagsSkill: SkillDefinition<HashtagsInput, HashtagsOutput> = {
  id: 'generate-hashtags',
  name: 'Generate Hashtags',
  description: 'Generate platform-optimized hashtags for real estate content',
  category: 'generate',
  version: '1.0.0',
  // No external provider - uses internal algorithm

  inputSchema: {
    type: 'object',
    properties: {
      property: { type: 'object' },
      storyType: { type: 'string' },
      city: { type: 'string' },
      state: { type: 'string' },
      platform: {
        type: 'string',
        enum: ['instagram', 'instagram_story', 'facebook', 'linkedin', 'twitter', 'tiktok'],
      },
      customTags: { type: 'array', items: { type: 'string' } },
      maxCount: { type: 'number' },
    },
    required: ['platform'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      hashtags: { type: 'array', items: { type: 'string' } },
      categorized: { type: 'object' },
      platform: { type: 'string' },
    },
    required: ['hashtags', 'categorized', 'platform'],
  },

  defaultConfig: {
    timeout: 5000,
    retries: 0,
  },

  validate: (input: HashtagsInput): ValidationError[] => {
    const errors: ValidationError[] = []

    if (!input.platform) {
      errors.push({
        field: 'platform',
        message: 'Platform is required',
        code: 'REQUIRED',
      })
    }

    if (input.maxCount && (input.maxCount < 1 || input.maxCount > 30)) {
      errors.push({
        field: 'maxCount',
        message: 'Max count must be between 1 and 30',
        code: 'INVALID_RANGE',
      })
    }

    return errors
  },

  execute: async (input, context): Promise<SkillResult<HashtagsOutput>> => {
    const startTime = Date.now()

    try {
      const platformLimit = PLATFORM_LIMITS[input.platform]
      const maxCount = Math.min(input.maxCount || 15, platformLimit)

      // Build location hashtags
      const city = input.city || input.property?.city
      const state = input.state || input.property?.state
      const locationTags = generateLocationHashtags(city, state)

      // Get story-type specific hashtags
      const storyTags = getStoryTypeHashtags(input.storyType)

      // Get general real estate hashtags
      const generalTags = [...REAL_ESTATE_HASHTAGS.general]

      // Add listing-specific tags
      if (['just_listed', 'just_sold', 'open_house', 'price_reduction', 'coming_soon'].includes(input.storyType || '')) {
        generalTags.push(...REAL_ESTATE_HASHTAGS.listing)
      }

      // Add lifestyle tags
      const lifestyleTags = [...LIFESTYLE_HASHTAGS.slice(0, 5)]

      // Add trending tags
      const trendingTags = getTrendingHashtags().slice(0, 3)

      // Add custom tags
      const customTags = (input.customTags || []).map(tag =>
        tag.startsWith('#') ? tag : `#${tag}`
      )

      // Categorize all tags
      const categorized = {
        location: locationTags,
        realestate: [...new Set([...storyTags, ...generalTags])].slice(0, 10),
        lifestyle: lifestyleTags,
        trending: trendingTags,
      }

      // Combine all tags, prioritizing location and story-specific
      const allTags = [
        ...locationTags.slice(0, 4),
        ...storyTags,
        ...customTags,
        ...generalTags,
        ...lifestyleTags,
        ...trendingTags,
      ]

      // Remove duplicates and limit to maxCount
      const uniqueTags = [...new Set(allTags)].slice(0, maxCount)

      return {
        success: true,
        data: {
          hashtags: uniqueTags,
          categorized,
          platform: input.platform,
        },
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        error: message,
        errorCode: 'HASHTAG_GENERATION_ERROR',
        metadata: { executionTimeMs: Date.now() - startTime },
      }
    }
  },

  estimateCost: async (): Promise<number> => {
    // No API cost for hashtag generation
    return 0
  },
}

export default generateHashtagsSkill
