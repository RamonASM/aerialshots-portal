/**
 * Content Skills Types
 *
 * Type definitions for Claude-powered content generation skills.
 */

/**
 * Writing style for content generation
 */
export type ContentStyle =
  | 'professional'
  | 'warm'
  | 'luxury'
  | 'casual'
  | 'formal'

/**
 * Social media platform
 */
export type SocialPlatform =
  | 'instagram'
  | 'instagram_story'
  | 'facebook'
  | 'linkedin'
  | 'twitter'
  | 'tiktok'

/**
 * Email type
 */
export type EmailType =
  | 'just_listed'
  | 'open_house'
  | 'price_reduction'
  | 'under_contract'
  | 'just_sold'
  | 'market_update'
  | 'newsletter'

/**
 * Property data for content generation
 */
export interface PropertyData {
  address: string
  city: string
  state: string
  zipCode?: string
  beds: number
  baths: number
  sqft: number
  price?: number
  yearBuilt?: number
  lotSize?: string
  propertyType?: 'single_family' | 'condo' | 'townhouse' | 'multi_family' | 'land'
  features?: string[]
  neighborhood?: string
  schoolDistrict?: string
  agentName?: string
  agentPhone?: string
  mlsNumber?: string
}

/**
 * Neighborhood data for enriching content
 */
export interface NeighborhoodData {
  name: string
  city: string
  state: string
  walkScore?: number
  transitScore?: number
  bikeScore?: number
  nearbyPlaces?: string[]
  demographics?: string
  vibe?: string
}

/**
 * Listing description input
 */
export interface ListingDescriptionInput {
  property: PropertyData
  neighborhood?: NeighborhoodData
  style?: ContentStyle
  length?: 'short' | 'medium' | 'long'
  includeCallToAction?: boolean
  customInstructions?: string
}

/**
 * Listing description output
 */
export interface ListingDescriptionOutput {
  description: string
  style: ContentStyle
  wordCount: number
  highlights: string[]
}

/**
 * Multiple descriptions output
 */
export interface ListingDescriptionsOutput {
  descriptions: ListingDescriptionOutput[]
  property: PropertyData
}

/**
 * Social caption input
 */
export interface SocialCaptionInput {
  property: PropertyData
  platform: SocialPlatform
  tone?: 'engaging' | 'informative' | 'urgent' | 'celebratory'
  includeHashtags?: boolean
  includeEmoji?: boolean
  customInstructions?: string
}

/**
 * Social caption output
 */
export interface SocialCaptionOutput {
  caption: string
  platform: SocialPlatform
  hashtags?: string[]
  characterCount: number
}

/**
 * Multi-platform captions output
 */
export interface SocialCaptionsOutput {
  captions: Record<SocialPlatform, SocialCaptionOutput>
  property: PropertyData
}

/**
 * Email copy input
 */
export interface EmailCopyInput {
  property: PropertyData
  emailType: EmailType
  recipientType?: 'sphere' | 'leads' | 'past_clients' | 'general'
  agentName: string
  agentBrokerage?: string
  eventDate?: string
  eventTime?: string
  customInstructions?: string
}

/**
 * Email copy output
 */
export interface EmailCopyOutput {
  subject: string
  previewText: string
  body: string
  callToAction: string
  emailType: EmailType
}

/**
 * Video script input
 */
export interface VideoScriptInput {
  property: PropertyData
  duration: number  // seconds
  style?: 'walkthrough' | 'lifestyle' | 'cinematic' | 'agent_intro'
  includeNarration?: boolean
  customInstructions?: string
}

/**
 * Video script scene
 */
export interface VideoScriptScene {
  timestamp: string
  location: string
  narration?: string
  shotNotes: string
  duration: number
}

/**
 * Video script output
 */
export interface VideoScriptOutput {
  title: string
  scenes: VideoScriptScene[]
  totalDuration: number
  style: string
}

// =====================
// CAROUSEL CONTENT TYPES
// =====================

/**
 * Story archetype for carousel content
 */
export type StoryArchetype =
  | 'just_listed'
  | 'just_sold'
  | 'open_house'
  | 'price_reduction'
  | 'coming_soon'
  | 'neighborhood_guide'
  | 'local_favorites'
  | 'lifestyle'
  | 'market_update'
  | 'agent_spotlight'
  | 'testimonial'
  | 'tips_advice'

/**
 * Carousel content generation input
 */
export interface CarouselContentInput {
  storyType: StoryArchetype
  property?: PropertyData
  neighborhood?: NeighborhoodData
  lifeHereData?: {
    score?: number
    label?: string
    dining?: Array<{ name: string; cuisine: string; rating: number }>
    schools?: Array<{ name: string; type: string; rating: number }>
    parks?: Array<{ name: string; type: string }>
    attractions?: Array<{ name: string; type: string }>
    commute?: { beach?: number; airport?: number; downtown?: number }
    events?: Array<{ name: string; date: string; venue: string }>
    highlights?: string[]
  }
  agentName?: string
  slideCount?: number // Default 7
  tone?: ContentStyle
  customPrompt?: string
}

/**
 * Single slide content
 */
export interface SlideContent {
  position: number
  slideType: 'hook' | 'narrative' | 'stats' | 'feature' | 'neighborhood' | 'testimonial' | 'cta'
  headline: string
  body?: string
  visualSuggestion?: string
  dataPoints?: Array<{ label: string; value: string }>
}

/**
 * Carousel content output
 */
export interface CarouselContentOutput {
  storyType: StoryArchetype
  slides: SlideContent[]
  theme: string
  targetAudience: string
}

/**
 * Hashtags generation input
 */
export interface HashtagsInput {
  property?: PropertyData
  storyType?: StoryArchetype
  city?: string
  state?: string
  platform: SocialPlatform
  customTags?: string[]
  maxCount?: number // Default 15
}

/**
 * Hashtags output
 */
export interface HashtagsOutput {
  hashtags: string[]
  categorized: {
    location: string[]
    realestate: string[]
    lifestyle: string[]
    trending: string[]
  }
  platform: SocialPlatform
}

/**
 * Carousel caption input
 */
export interface CarouselCaptionInput {
  storyType: StoryArchetype
  property?: PropertyData
  slides?: SlideContent[]
  agentName?: string
  platform: SocialPlatform
  tone?: 'engaging' | 'informative' | 'urgent' | 'celebratory'
  includeEmoji?: boolean
  callToAction?: string
}

/**
 * Carousel caption output
 */
export interface CarouselCaptionOutput {
  caption: string
  callToAction: string
  characterCount: number
  platform: SocialPlatform
}
