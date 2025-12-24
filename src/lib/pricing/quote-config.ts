/**
 * Quote Wizard Configuration
 *
 * Two flows based on service type:
 * 1. Listing Media - Property-focused questions
 * 2. Content Retainer - Full qualifier for ongoing partnerships
 */

export type ServiceType = 'listing' | 'retainer'

export interface QuoteFormData {
  // Common fields
  serviceType: ServiceType
  name: string
  email: string
  phone: string

  // Listing Media specific
  propertyAddress?: string
  propertyType?: string
  approximateSqft?: string
  timeline?: string
  interestedPackage?: string
  additionalServices?: string[]

  // Content Retainer specific
  businessName?: string
  currentSocialPresence?: string
  contentGoals?: string[]
  monthlyBudget?: string
  teamSize?: string
  biggestChallenge?: string
  howDidYouHear?: string

  // Optional for both
  additionalNotes?: string
}

// Property types for listing media
export const PROPERTY_TYPES = [
  { value: 'single-family', label: 'Single Family Home' },
  { value: 'condo', label: 'Condo / Townhouse' },
  { value: 'luxury', label: 'Luxury Estate ($1M+)' },
  { value: 'multi-family', label: 'Multi-Family' },
  { value: 'commercial', label: 'Commercial Property' },
  { value: 'land', label: 'Land / Lot' },
] as const

// Sqft ranges
export const SQFT_RANGES = [
  { value: 'under-1500', label: 'Under 1,500 sqft' },
  { value: '1500-2500', label: '1,500 - 2,500 sqft' },
  { value: '2500-3500', label: '2,500 - 3,500 sqft' },
  { value: '3500-5000', label: '3,500 - 5,000 sqft' },
  { value: '5000-plus', label: '5,000+ sqft' },
  { value: 'not-sure', label: "I'm not sure" },
] as const

// Timeline options
export const TIMELINE_OPTIONS = [
  { value: 'asap', label: 'ASAP - Within a week', emoji: '🔥' },
  { value: '1-2-weeks', label: '1-2 weeks', emoji: '📅' },
  { value: '2-4-weeks', label: '2-4 weeks', emoji: '🗓️' },
  { value: 'flexible', label: 'Flexible / Just exploring', emoji: '🤔' },
] as const

// Package interest
export const PACKAGE_OPTIONS = [
  { value: 'essentials', label: 'Essentials', description: 'Photos, drone, 3D tour, floor plan' },
  { value: 'signature', label: 'Signature', description: 'Everything + listing video', recommended: true },
  { value: 'premier', label: 'Premier', description: 'Full package with custom domain' },
  { value: 'photo-only', label: 'Photo Only', description: 'Just professional photos' },
  { value: 'not-sure', label: 'Help me decide', description: "I'll need a recommendation" },
] as const

// Additional services
export const ADDITIONAL_SERVICES = [
  { value: 'virtual-staging', label: 'Virtual Staging' },
  { value: 'twilight', label: 'Twilight Photos' },
  { value: 'aerial-video', label: 'Aerial Video' },
  { value: 'social-reels', label: 'Social Media Reels' },
  { value: 'rush-delivery', label: 'Rush Delivery (24hr)' },
] as const

// Content Retainer - Social presence
export const SOCIAL_PRESENCE_OPTIONS = [
  { value: 'none', label: "Just getting started", description: "No social media presence yet" },
  { value: 'minimal', label: "Posting occasionally", description: "A few posts per month" },
  { value: 'active', label: "Actively posting", description: "Several times per week" },
  { value: 'strong', label: "Strong presence", description: "Daily content, engaged audience" },
] as const

// Content goals
export const CONTENT_GOALS = [
  { value: 'brand-awareness', label: 'Build brand awareness' },
  { value: 'generate-leads', label: 'Generate more leads' },
  { value: 'showcase-listings', label: 'Showcase listings better' },
  { value: 'become-expert', label: 'Position as local expert' },
  { value: 'grow-following', label: 'Grow social following' },
  { value: 'save-time', label: 'Save time on content' },
] as const

// Monthly budget ranges
export const BUDGET_RANGES = [
  { value: 'under-1000', label: 'Under $1,000/mo' },
  { value: '1000-2000', label: '$1,000 - $2,000/mo' },
  { value: '2000-3500', label: '$2,000 - $3,500/mo' },
  { value: '3500-5000', label: '$3,500 - $5,000/mo' },
  { value: '5000-plus', label: '$5,000+/mo' },
  { value: 'not-sure', label: 'Not sure yet' },
] as const

// Team size
export const TEAM_SIZE_OPTIONS = [
  { value: 'solo', label: 'Solo agent' },
  { value: 'small', label: 'Small team (2-4)' },
  { value: 'medium', label: 'Medium team (5-10)' },
  { value: 'large', label: 'Large team (10+)' },
  { value: 'brokerage', label: 'Brokerage-wide' },
] as const

// Biggest challenges
export const CHALLENGE_OPTIONS = [
  { value: 'no-time', label: "No time to create content" },
  { value: 'no-ideas', label: "Don't know what to post" },
  { value: 'consistency', label: "Staying consistent" },
  { value: 'quality', label: "Quality isn't professional" },
  { value: 'camera-shy', label: "Uncomfortable on camera" },
  { value: 'strategy', label: "No clear strategy" },
] as const

// How did you hear about us
export const REFERRAL_SOURCES = [
  { value: 'google', label: 'Google Search' },
  { value: 'social', label: 'Social Media' },
  { value: 'referral', label: 'Agent Referral' },
  { value: 'past-client', label: 'Previous Client' },
  { value: 'event', label: 'Networking Event' },
  { value: 'other', label: 'Other' },
] as const
