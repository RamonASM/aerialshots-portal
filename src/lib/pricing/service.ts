/**
 * Unified Pricing Service
 *
 * Ported from asm-agent-backend and consolidated with portal pricing config.
 * This is the single source of truth for ASM pricing logic.
 */

// ================================
// Square Footage Buckets
// ================================

export interface SqftBucket {
  id: string
  label: string
  photoPrice: number
  maxSqft: number
}

export const SQFT_BUCKETS: SqftBucket[] = [
  { id: 'lt1500', label: 'Under 1,500', photoPrice: 175, maxSqft: 1500 },
  { id: '1501_2500', label: '1,501 - 2,500', photoPrice: 225, maxSqft: 2500 },
  { id: '2501_3500', label: '2,501 - 3,500', photoPrice: 275, maxSqft: 3500 },
  { id: '3501_4000', label: '3,501 - 4,000', photoPrice: 350, maxSqft: 4000 },
  { id: '4001_5000', label: '4,001 - 5,000', photoPrice: 450, maxSqft: 5000 },
  { id: '5001_10000', label: '5,001 - 10,000', photoPrice: 550, maxSqft: 10000 },
]

// Maps bucket ID to package tier key
export const BUCKET_TO_TIER: Record<string, string> = {
  lt1500: 'under2000',
  '1501_2500': '_2001_2500',
  '2501_3500': '_2501_3500',
  '3501_4000': '_3501_5000',
  '4001_5000': '_3501_5000',
  '5001_10000': '_5001_10000',
}

// ================================
// Packages
// ================================

export interface Package {
  id: string
  label: string
  description: string
  includesIds: string[]
  priceByTier: Record<string, number>
}

export const PACKAGES: Record<string, Package> = {
  essentials: {
    id: 'essentials',
    label: 'Essentials (Zillow+)',
    description: 'Photos, Drone, Zillow 3D, Floor Plan, Virtual Staging, Virtual Twilight',
    includesIds: ['photos', 'droneAddOn', 'zillow3d', '2dFloor', 'stagingCoreAll', 'vtwilight'],
    priceByTier: {
      under2000: 315,
      _2001_2500: 375,
      _2501_3500: 425,
      _3501_5000: 485,
      _5001_10000: 580,
    },
  },
  signature: {
    id: 'signature',
    label: 'Signature (Social Pro+)',
    description: 'Essentials + Listing Video',
    includesIds: ['photos', 'droneAddOn', 'zillow3d', '2dFloor', 'stagingCoreAll', 'vtwilight', 'listingVideo'],
    priceByTier: {
      under2000: 449,
      _2001_2500: 529,
      _2501_3500: 579,
      _3501_5000: 619,
      _5001_10000: 700,
    },
  },
  luxury: {
    id: 'luxury',
    label: 'Luxury (All-in)',
    description: 'Signature + 3D Floor Plan, Cinematic Signature Video',
    includesIds: [
      'photos',
      'droneAddOn',
      'zillow3d',
      '2dFloor',
      'stagingCoreAll',
      'vtwilight',
      '3dFloor',
      'listingVideo',
      'signatureVid',
    ],
    priceByTier: {
      under2000: 649,
      _2001_2500: 729,
      _2501_3500: 819,
      _3501_5000: 899,
      _5001_10000: 1100,
    },
  },
}

// ================================
// A La Carte Services
// ================================

export interface AlaCarteService {
  id: string
  name: string
  price: number | 'varies' // 'varies' for sqft-based pricing like photos
  category: 'photography' | 'video' | 'tour' | 'staging' | 'floorplan'
}

export const A_LA_CARTE_SERVICES: AlaCarteService[] = [
  // Photography
  { id: 'photos', name: 'Listing Photography', price: 'varies', category: 'photography' },
  { id: 'droneOnly', name: 'Drone / Aerial (Standalone)', price: 150, category: 'photography' },
  { id: 'droneAddOn', name: 'Drone / Aerial (Add-On)', price: 75, category: 'photography' },
  { id: 'droneLocation', name: 'Additional Drone Location', price: 75, category: 'photography' },
  { id: 'vtwilight', name: 'Virtual Twilight (per photo)', price: 15, category: 'photography' },
  { id: 'realTwilight', name: 'Real Twilight Photography', price: 150, category: 'photography' },

  // Floor Plans
  { id: '2dFloor', name: '2D Floor Plan (Included)', price: 0, category: 'floorplan' },
  { id: '3dFloor', name: '3D Floor Plan', price: 75, category: 'floorplan' },

  // Tours
  { id: 'zillow3d', name: 'Zillow 3D Tour + Interactive Floor Plan', price: 150, category: 'tour' },

  // Staging
  { id: 'stagingCoreEa', name: 'Core Virtual Staging (per photo)', price: 12, category: 'staging' },
  { id: 'stagingPremEa', name: 'Premium Virtual Staging (per photo)', price: 25, category: 'staging' },
  { id: 'stagingCoreAll', name: 'Core Virtual Staging (Full Home)', price: 125, category: 'staging' },

  // Listing Videos
  { id: 'coreListingVideo', name: 'Core Listing Video', price: 200, category: 'video' },
  { id: 'listingVideo', name: 'Listing Video', price: 350, category: 'video' },
  { id: 'lifestyleVid', name: 'Lifestyle Listing Video', price: 425, category: 'video' },
  { id: 'dayToNight', name: 'Day-to-Night Video', price: 750, category: 'video' },
  { id: 'signatureVid', name: 'Cinematic Signature Video', price: 900, category: 'video' },
  { id: 'render3d', name: '3D Video Render', price: 250, category: 'video' },
  { id: 'lp2v30', name: 'Photos to Video (30s)', price: 95, category: 'video' },
  { id: 'lp2v60', name: 'Photos to Video (1 min)', price: 145, category: 'video' },
]

// ================================
// Content Branding Services
// ================================

export interface ContentService {
  id: string
  name: string
  price: number
  category: 'content' | 'subscription'
  minQuantity?: number
}

export const CONTENT_SERVICES: ContentService[] = [
  { id: 'educationalVideo', name: 'Educational Video', price: 125, category: 'content', minQuantity: 3 },
  { id: 'propertyTourVideo', name: 'Property Tour Video', price: 550, category: 'content' },
  { id: 'businessSpotlight', name: 'Business Spotlight Video', price: 450, category: 'content' },
  { id: 'closingVideo', name: 'Closing Celebration Video', price: 350, category: 'content' },
  { id: 'eventVideo', name: 'Event Video', price: 650, category: 'content' },
  { id: 'socialManagement', name: 'Social Media Management', price: 600, category: 'subscription' },
]

// ================================
// Content Retainer Packages (Monthly)
// ================================

export interface ContentRetainer {
  id: string
  name: string
  tier: number
  priceMonthly: number
  alaCarteValue: number
  savings: number
  videosPerMonth: number
  shootDaysPerMonth: number
  turnaroundHours: number | null
  features: string[]
  includedVideos: {
    educational: number
    propertyTour: number
    businessSpotlight: number
    closingEvent: number
  }
  isPopular?: boolean
}

export const CONTENT_RETAINERS: ContentRetainer[] = [
  {
    id: 'momentum',
    name: 'Momentum',
    tier: 1,
    priceMonthly: 1488,
    alaCarteValue: 1975,
    savings: 487,
    videosPerMonth: 8,
    shootDaysPerMonth: 2,
    turnaroundHours: null, // Standard
    features: [
      'Branding photoshoot',
      'Scripting assistance',
      'Teleprompter support',
      'Monthly strategy call',
      'Notion dashboard',
      'Slack support',
    ],
    includedVideos: { educational: 5, propertyTour: 1, businessSpotlight: 1, closingEvent: 1 },
  },
  {
    id: 'dominance',
    name: 'Dominance',
    tier: 2,
    priceMonthly: 2500,
    alaCarteValue: 2900,
    savings: 400,
    videosPerMonth: 12,
    shootDaysPerMonth: 3,
    turnaroundHours: 48,
    features: [
      'All Momentum features',
      'Priority scheduling',
      '48-hour priority edits',
      'Bi-weekly strategy calls',
      'Advanced analytics dashboard',
    ],
    includedVideos: { educational: 8, propertyTour: 2, businessSpotlight: 1, closingEvent: 1 },
    isPopular: true,
  },
  {
    id: 'elite',
    name: 'Elite',
    tier: 3,
    priceMonthly: 4500,
    alaCarteValue: 5500,
    savings: 1000,
    videosPerMonth: 20,
    shootDaysPerMonth: 4,
    turnaroundHours: 24,
    features: [
      'All Dominance features',
      'Dedicated account manager',
      'Weekly strategy calls',
      'Team training session',
      'Branding photos for entire team',
      '24-hour priority turnaround',
    ],
    includedVideos: { educational: 15, propertyTour: 3, businessSpotlight: 1, closingEvent: 1 },
  },
]

// ================================
// Travel Fee Tiers
// ================================

export interface TravelTier {
  minMiles: number
  maxMiles: number | null
  feePerMile: number
  description: string
}

export const TRAVEL_TIERS: TravelTier[] = [
  { minMiles: 0, maxMiles: 40, feePerMile: 0, description: 'Free - Within service area' },
  { minMiles: 41, maxMiles: 75, feePerMile: 1.5, description: '$1.50/mile' },
  { minMiles: 76, maxMiles: 150, feePerMile: 2, description: '$2.00/mile' },
  { minMiles: 151, maxMiles: null, feePerMile: 3, description: '$3.00/mile' },
]

/**
 * Calculates travel fee based on distance
 */
export function calculateTravelFee(miles: number): number {
  if (miles <= 40) return 0
  const tier = TRAVEL_TIERS.find(
    (t) => miles >= t.minMiles && (t.maxMiles === null || miles <= t.maxMiles)
  )
  if (!tier) return 0
  // Fee applies to miles beyond the free zone
  const chargeableMiles = miles - 40
  return chargeableMiles * tier.feePerMile
}

/**
 * Gets a content service by ID
 */
export function getContentService(serviceId: string): ContentService | undefined {
  return CONTENT_SERVICES.find((s) => s.id === serviceId)
}

/**
 * Gets a content retainer by ID
 */
export function getContentRetainer(retainerId: string): ContentRetainer | undefined {
  return CONTENT_RETAINERS.find((r) => r.id === retainerId)
}

// ================================
// Helper Functions
// ================================

/**
 * Determines the sqft bucket for a given square footage
 */
export function bucketFromSqft(sqft: number): string {
  if (sqft <= 1500) return 'lt1500'
  if (sqft <= 2500) return '1501_2500'
  if (sqft <= 3500) return '2501_3500'
  if (sqft <= 4000) return '3501_4000'
  if (sqft <= 5000) return '4001_5000'
  return '5001_10000'
}

/**
 * Gets the tier key from a bucket ID
 */
export function tierFromBucket(bucket: string): string {
  return BUCKET_TO_TIER[bucket] || 'under2000'
}

/**
 * Gets the base photo price for a given square footage
 */
export function getPhotoPrice(sqft: number): number {
  const bucket = bucketFromSqft(sqft)
  const bucketData = SQFT_BUCKETS.find((b) => b.id === bucket)
  return bucketData?.photoPrice ?? 175
}

/**
 * Gets the bucket data for a given sqft
 */
export function getBucketForSqft(sqft: number): SqftBucket | undefined {
  const bucketId = bucketFromSqft(sqft)
  return SQFT_BUCKETS.find((b) => b.id === bucketId)
}

/**
 * Gets a service by ID
 */
export function getService(serviceId: string): AlaCarteService | undefined {
  return A_LA_CARTE_SERVICES.find((s) => s.id === serviceId)
}

/**
 * Gets the price for a service
 */
export function getServicePrice(serviceId: string, sqft?: number): number {
  const service = getService(serviceId)
  if (!service) return 0
  if (service.price === 'varies') {
    return sqft ? getPhotoPrice(sqft) : 175
  }
  return service.price
}

// ================================
// Quote Calculation
// ================================

export interface QuoteItem {
  type: 'package' | 'addon' | 'service'
  id: string
  name: string
  price: number
}

export interface QuoteResult {
  bucket: string
  tierKey: string
  items: QuoteItem[]
  total: number
}

export interface ComputeQuoteOptions {
  sqft: number
  packageKey?: string
  services?: string[]
}

/**
 * Computes a quote for the given options
 */
export function computeQuote({ sqft, packageKey, services = [] }: ComputeQuoteOptions): QuoteResult {
  const bucket = bucketFromSqft(sqft)
  const tierKey = tierFromBucket(bucket)
  let total = 0
  const items: QuoteItem[] = []

  if (packageKey) {
    // Package-based quote
    const pkg = PACKAGES[packageKey]
    if (pkg) {
      const price = pkg.priceByTier[tierKey] ?? Object.values(pkg.priceByTier)[0]
      items.push({ type: 'package', id: packageKey, name: pkg.label, price })
      total += price

      // Add any services not included in the package
      services.forEach((serviceId) => {
        if (!pkg.includesIds.includes(serviceId)) {
          const service = getService(serviceId)
          if (service) {
            const price = getServicePrice(serviceId, sqft)
            items.push({ type: 'addon', id: serviceId, name: service.name, price })
            total += price
          }
        }
      })
    }
  } else {
    // A la carte quote
    services.forEach((serviceId) => {
      const service = getService(serviceId)
      if (service) {
        const price = getServicePrice(serviceId, sqft)
        items.push({ type: 'service', id: serviceId, name: service.name, price })
        total += price
      }
    })
  }

  return { bucket, tierKey, items, total }
}

/**
 * Gets the price for a package at a given sqft
 */
export function getPackagePrice(packageKey: string, sqft: number): number | undefined {
  const pkg = PACKAGES[packageKey]
  if (!pkg) return undefined
  const tierKey = tierFromBucket(bucketFromSqft(sqft))
  return pkg.priceByTier[tierKey]
}

/**
 * Gets all packages with their prices for a given sqft
 */
export function getPackagesForSqft(sqft: number): Array<Package & { price: number }> {
  const tierKey = tierFromBucket(bucketFromSqft(sqft))
  return Object.values(PACKAGES).map((pkg) => ({
    ...pkg,
    price: pkg.priceByTier[tierKey] ?? Object.values(pkg.priceByTier)[0],
  }))
}
