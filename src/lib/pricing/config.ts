/**
 * ASM Pricing Configuration
 *
 * Two product lines:
 * 1. Listing Media - Per-property photography/video packages
 * 2. Content Retainers - Monthly video subscription for agents
 */

// Square footage tiers for listing media
export const SQFT_TIERS = [
  { id: 'lt2000', label: 'Under 2,000', shortLabel: '< 2K' },
  { id: '2001_3500', label: '2,001-3,500', shortLabel: '2K-3.5K' },
  { id: '3501_5000', label: '3,501-5,000', shortLabel: '3.5K-5K' },
  { id: '5001_6500', label: '5,001-6,500', shortLabel: '5K-6.5K' },
  { id: 'over6500', label: 'Over 6,500', shortLabel: '6.5K+' },
] as const

export type SqftTierId = typeof SQFT_TIERS[number]['id']

// Feature levels for styling
export type FeatureLevel = 'included' | 'standard' | 'basic' | 'enhanced' | 'premium' | 'not-included'

export interface PackageFeature {
  name: string
  value: string
  level: FeatureLevel
}

export interface ListingPackage {
  key: string
  name: string
  tagline: string
  recommended?: boolean
  pricing: Record<SqftTierId, number>
  features: PackageFeature[]
}

// Listing Media Packages
export const LISTING_PACKAGES: ListingPackage[] = [
  {
    key: 'essentials',
    name: 'Essentials',
    tagline: 'PERFECT START',
    pricing: {
      lt2000: 315,
      '2001_3500': 375,
      '3501_5000': 425,
      '5001_6500': 485,
      over6500: 580,
    },
    features: [
      { name: 'Professional Photography', value: 'Unlimited Photos', level: 'standard' },
      { name: 'Aerial/Drone Photography', value: '5-10 Photos', level: 'standard' },
      { name: 'Zillow 3D Tour', value: 'Included', level: 'included' },
      { name: '2D Floor Plans', value: 'Included', level: 'included' },
      { name: 'Virtual Staging', value: 'Core (All Rooms)', level: 'standard' },
      { name: 'Virtual Twilights', value: '3 Photos', level: 'basic' },
      { name: 'Property Website', value: 'Standard', level: 'standard' },
      { name: 'Custom Listing Domain', value: '-', level: 'not-included' },
      { name: 'Listing Video', value: '-', level: 'not-included' },
      { name: 'Social Media Reel', value: '-', level: 'not-included' },
      { name: 'Creative Video Direction', value: '-', level: 'not-included' },
      { name: '3D Floor Plans', value: '-', level: 'not-included' },
    ],
  },
  {
    key: 'signature',
    name: 'Signature',
    tagline: 'MOST POPULAR',
    recommended: true,
    pricing: {
      lt2000: 449,
      '2001_3500': 529,
      '3501_5000': 579,
      '5001_6500': 619,
      over6500: 700,
    },
    features: [
      { name: 'Professional Photography', value: 'Unlimited Photos', level: 'standard' },
      { name: 'Aerial/Drone Photography', value: '5-10 Photos', level: 'standard' },
      { name: 'Zillow 3D Tour', value: 'Included', level: 'included' },
      { name: '2D Floor Plans', value: 'Included', level: 'included' },
      { name: 'Virtual Staging', value: 'Core (All Rooms)', level: 'standard' },
      { name: 'Virtual Twilights', value: '5 Photos', level: 'enhanced' },
      { name: 'Property Website', value: 'Standard', level: 'standard' },
      { name: 'Custom Listing Domain', value: '-', level: 'not-included' },
      { name: 'Listing Video', value: 'Included', level: 'enhanced' },
      { name: 'Social Media Reel', value: '-', level: 'not-included' },
      { name: 'Creative Video Direction', value: '-', level: 'not-included' },
      { name: '3D Floor Plans', value: '-', level: 'not-included' },
    ],
  },
  {
    key: 'premier',
    name: 'Premier',
    tagline: 'COMPLETE PACKAGE',
    pricing: {
      lt2000: 649,
      '2001_3500': 729,
      '3501_5000': 819,
      '5001_6500': 899,
      over6500: 1100,
    },
    features: [
      { name: 'Professional Photography', value: 'Unlimited Photos', level: 'standard' },
      { name: 'Aerial/Drone Photography', value: '5-10 Photos', level: 'standard' },
      { name: 'Zillow 3D Tour', value: 'Included', level: 'included' },
      { name: '2D Floor Plans', value: 'Included', level: 'included' },
      { name: 'Virtual Staging', value: 'Core (All Rooms)', level: 'standard' },
      { name: 'Virtual Twilights', value: '10 Photos', level: 'premium' },
      { name: 'Property Website', value: 'Custom Domain', level: 'premium' },
      { name: 'Custom Listing Domain', value: 'Included', level: 'premium' },
      { name: 'Listing Video', value: 'Premium', level: 'premium' },
      { name: 'Social Media Reel', value: 'Included', level: 'premium' },
      { name: 'Creative Video Direction', value: 'Included', level: 'premium' },
      { name: '3D Floor Plans', value: 'Included', level: 'premium' },
    ],
  },
]

// Photo-only pricing tiers (for à la carte)
export const PHOTO_ONLY_PRICING = [
  { id: 'lt1500', label: 'Under 1,500', price: 175 },
  { id: '1501_2500', label: '1,501-2,500', price: 225 },
  { id: '2501_3500', label: '2,501-3,500', price: 275 },
  { id: '3501_4000', label: '3,501-4,000', price: 350 },
  { id: '4001_5000', label: '4,001-5,000', price: 450 },
  { id: '5001_10000', label: '5,001-10,000', price: 550 },
] as const

// ============================================
// À LA CARTE SERVICES
// ============================================

// Photography Add-Ons
export const PHOTOGRAPHY_ADDONS = [
  { id: 'drone_addon', name: 'Drone/Aerial (Add-On)', price: 75, note: 'When added to photo booking' },
  { id: 'drone_standalone', name: 'Drone/Aerial (Standalone)', price: 150, note: 'Without base photography' },
  { id: 'floor_plan_2d', name: '2D Floor Plan', price: 0, note: 'Included FREE with any photo booking' },
  { id: 'floor_plan_3d', name: '3D Floor Plan', price: 75, note: 'Interactive 3D floor plan' },
  { id: 'zillow_3d_tour', name: 'Zillow 3D Tour + Interactive Floor Plan', price: 150, note: 'Virtual tour with floor plan' },
  { id: 'virtual_twilight', name: 'Virtual Twilight', price: 15, note: 'Per photo - golden hour look without reshoot' },
  { id: 'real_twilight', name: 'Real Twilight Photography', price: 150, note: 'On-site twilight photo session' },
] as const

// Listing Video Services (for property marketing)
export const VIDEO_SERVICES = [
  { id: 'listing_video', name: 'Listing Video', price: 350, note: 'Script assist; agent optional on camera' },
  { id: 'lifestyle_video', name: 'Lifestyle Listing Video', price: 425, note: 'Adds 1-2 lifestyle locations' },
  { id: 'day_to_night', name: 'Day-to-Night Video', price: 750, note: 'Day-to-twilight cinematic' },
  { id: 'cinematic_signature', name: 'Cinematic Video (Signature)', price: 900, note: 'Premium cinematic production' },
  { id: 'video_3d_render', name: '3D Video Render', price: 250, note: '3D walkthrough showcase' },
] as const

// Virtual Staging Options
export const VIRTUAL_STAGING = [
  { id: 'staging_core_per_photo', name: 'Core Virtual Staging (per photo)', price: 12, note: 'Digital furniture & decor' },
  { id: 'staging_premium_per_photo', name: 'Premium Virtual Staging (per photo)', price: 25, note: 'Premium furniture set' },
  { id: 'staging_core_bundle', name: 'Core Virtual Staging (Full Home)', price: 125, note: 'All vacant areas staged' },
] as const

// Combined list of all à la carte services for booking/quoting
export const ALL_ALA_CARTE_SERVICES = [
  ...PHOTOGRAPHY_ADDONS,
  ...VIDEO_SERVICES,
  ...VIRTUAL_STAGING,
] as const

// Content Retainer Packages
export interface VideoBreakdown {
  type: string
  count: number
}

export interface ShootDay {
  label: string
  title: string
  duration: string
  items: string[]
}

export interface RetainerPackage {
  key: string
  name: string
  tier: string
  description: string
  price: number
  alaCarteValue: number
  savings: number
  shootDays: number | string
  videoCount: number
  turnaround: string
  recommended?: boolean
  videoBreakdown: VideoBreakdown[]
  shootSchedule: ShootDay[]
  includes: string[]
  tierBenefits: string[]
}

export const RETAINER_PACKAGES: RetainerPackage[] = [
  {
    key: 'momentum',
    name: 'Momentum',
    tier: 'TIER 1',
    description: 'Our most popular package for individual agents ready to build consistent content and establish their personal brand.',
    price: 1488,
    alaCarteValue: 1975,
    savings: 487,
    shootDays: 2,
    videoCount: 8,
    turnaround: 'Standard',
    videoBreakdown: [
      { type: 'Educational Videos', count: 5 },
      { type: 'Property Tour', count: 1 },
      { type: 'Business Spotlight', count: 1 },
      { type: 'Closing / Event Video', count: 1 },
    ],
    shootSchedule: [
      {
        label: 'Day 1',
        title: 'Content Shoot',
        duration: '4 hours',
        items: ['5 educational videos (30-45 min)', 'Branding photo shoot'],
      },
      {
        label: 'Day 2',
        title: 'On-Call Shoot',
        duration: '1 hour max',
        items: ['Closing, event, or lifestyle video', 'We come to you'],
      },
    ],
    includes: [
      'Branding photo shoot included',
      'All scripts written for you',
      'Teleprompter on set',
      'Scripts delivered 48hrs before',
      'Monthly strategy call',
      'Notion dashboard access',
      'Slack channel for communication',
    ],
    tierBenefits: [],
  },
  {
    key: 'dominance',
    name: 'Dominance',
    tier: 'TIER 2',
    description: 'For serious producers who want comprehensive coverage, higher volume, and faster turnaround times.',
    price: 2500,
    alaCarteValue: 2900,
    savings: 400,
    shootDays: 3,
    videoCount: 12,
    turnaround: '48-hour',
    recommended: true,
    videoBreakdown: [
      { type: 'Educational Videos', count: 8 },
      { type: 'Property Tours', count: 2 },
      { type: 'Business Spotlight', count: 1 },
      { type: 'Closing / Event Video', count: 1 },
    ],
    shootSchedule: [
      {
        label: 'Day 1',
        title: 'Content Shoot',
        duration: '4 hours',
        items: ['Educational videos', 'Branding photos'],
      },
      {
        label: 'Day 2',
        title: 'Property + Spotlight',
        duration: '2-3 hours',
        items: ['Property tours', 'Business spotlight'],
      },
      {
        label: 'Day 3',
        title: 'On-Call Shoot',
        duration: '1 hour',
        items: ['Closing or event video'],
      },
    ],
    includes: [
      'Branding photo shoot included',
      'All scripts written for you',
      'Teleprompter on set',
      'Scripts delivered 48hrs before',
      'Monthly strategy call',
      'Notion dashboard access',
      'Slack channel for communication',
    ],
    tierBenefits: ['Priority scheduling', '48-hour edit turnaround'],
  },
  {
    key: 'elite',
    name: 'Elite',
    tier: 'TIER 3',
    description: 'Built for teams of 3+ agents who want to completely own their market with maximum content volume.',
    price: 4500,
    alaCarteValue: 5500,
    savings: 1000,
    shootDays: '4+',
    videoCount: 20,
    turnaround: '24-hour',
    videoBreakdown: [
      { type: 'Educational Videos', count: 15 },
      { type: 'Property Tours', count: 3 },
      { type: 'Business Spotlight', count: 1 },
      { type: 'Closing / Event Video', count: 1 },
    ],
    shootSchedule: [
      {
        label: 'Flexible',
        title: 'Custom Schedule',
        duration: 'As needed',
        items: ['Tailored to your team', 'Dedicated shoot days'],
      },
    ],
    includes: [
      'Branding photos for entire team',
      'All scripts written for you',
      'Teleprompter on set',
      'Scripts delivered 48hrs before',
      'Notion dashboard access',
      'Slack channel for communication',
    ],
    tierBenefits: [
      'Dedicated account manager',
      '24-hour priority turnaround',
      'Weekly strategy calls',
      'Team training session',
    ],
  },
]

// À la carte video pricing
export const ALA_CARTE_VIDEOS = [
  { name: 'Educational Video', price: 125, note: '3 video minimum' },
  { name: 'Property Tour', price: 550, note: null },
  { name: 'Business Spotlight', price: 450, note: null },
  { name: 'Closing Video', price: 350, note: null },
  { name: 'Event Video', price: 650, note: null },
] as const

// Add-ons for retainers
export const RETAINER_ADDONS = [
  {
    name: 'Social Media Management',
    price: 600,
    period: 'mo',
    description: 'Full posting, scheduling, captions, and hashtags across all platforms.',
  },
] as const

// Helper functions
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

export function getPackagePrice(pkg: ListingPackage, tierId: SqftTierId): number {
  return pkg.pricing[tierId]
}

export function getLowestPrice(pkg: ListingPackage): number {
  return Math.min(...Object.values(pkg.pricing))
}

// External booking URLs (temporary until we build our own booking flow)
export const BOOKING_URLS = {
  listingMedia: 'https://portal.aerialshots.media/order-forms/0194d29e-75cb-737e-a3ad-78d798ce0161',
  contentRetainer: 'https://portal.aerialshots.media/order-forms/0194aa3b-e54d-7219-a396-60fec026e7bb',
  payAtClosing: 'https://www.gotitus.com/estimate/aerial-shots-media',
} as const
