/**
 * Pricing Query Module
 *
 * Unified pricing data fetching from Supabase.
 * Single source of truth for all pricing across portal and AI agent backend.
 */

import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { CACHE_REVALIDATION } from '@/lib/utils/cache'

// Types for pricing data
export interface PricingTier {
  id: string
  tier_key: string
  label: string
  min_sqft: number
  max_sqft: number | null
  photo_price: number
  package_tier: string
  created_at: string
  updated_at: string
}

export interface Package {
  id: string
  key: string
  name: string
  description: string | null
  included_services: string[]
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
  pricing?: PackagePricing[]
}

export interface PackagePricing {
  id: string
  package_id: string
  tier_id: string
  price: number
  created_at: string
}

export interface Service {
  id: string
  key: string
  name: string
  description: string | null
  base_price: number
  price_label: string | null
  duration_minutes: number
  is_active: boolean
  category: 'core' | 'addon' | 'standalone' | 'video'
  display_order: number
  created_at: string
  updated_at: string
}

export interface PricingData {
  tiers: PricingTier[]
  packages: Package[]
  services: Service[]
}

/**
 * Get all pricing data with caching
 * Note: Uses explicit type assertions since pricing tables are created via migration
 * and may not be in generated types until regenerated.
 */
export const getPricing = unstable_cache(
  async (): Promise<PricingData> => {
    const supabase = await createClient()

    // Use explicit any casts for tables that may not be in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any

    const [tiersResult, packagesResult, servicesResult] = await Promise.all([
      client
        .from('pricing_tiers')
        .select('*')
        .order('min_sqft', { ascending: true }),
      client
        .from('packages')
        .select('*, pricing:package_pricing(*)')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      client
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
    ])

    return {
      tiers: (tiersResult.data as PricingTier[]) || [],
      packages: (packagesResult.data as Package[]) || [],
      services: (servicesResult.data as Service[]) || [],
    }
  },
  ['pricing'],
  { revalidate: CACHE_REVALIDATION.AI_AGENT, tags: ['pricing'] }
)

/**
 * Get tier for a specific square footage
 */
export async function getTierForSqft(sqft: number): Promise<PricingTier | null> {
  const { tiers } = await getPricing()

  for (const tier of tiers) {
    if (sqft >= tier.min_sqft && (tier.max_sqft === null || sqft <= tier.max_sqft)) {
      return tier
    }
  }

  return null
}

/**
 * Get package price for a specific tier
 */
export function getPackagePrice(
  pkg: Package,
  tier: PricingTier
): number | null {
  const pricing = pkg.pricing?.find((p) => p.tier_id === tier.id)
  return pricing?.price ?? null
}

/**
 * Calculate total price for package + add-ons
 */
export async function calculateQuote(
  sqft: number,
  packageKey: string,
  addonKeys: string[] = []
): Promise<{
  tier: PricingTier
  package: Package
  packagePrice: number
  addons: Array<{ service: Service; price: number }>
  total: number
} | null> {
  const { tiers, packages, services } = await getPricing()

  // Find tier
  const tier = tiers.find(
    (t) => sqft >= t.min_sqft && (t.max_sqft === null || sqft <= t.max_sqft)
  )
  if (!tier) return null

  // Find package
  const pkg = packages.find((p) => p.key === packageKey)
  if (!pkg) return null

  // Get package price
  const packagePrice = getPackagePrice(pkg, tier)
  if (packagePrice === null) return null

  // Calculate addons (exclude services already in package)
  const includedServices = new Set(pkg.included_services)
  const addons = addonKeys
    .filter((key) => !includedServices.has(key))
    .map((key) => {
      const service = services.find((s) => s.key === key)
      if (!service) return null
      return { service, price: service.base_price }
    })
    .filter((a): a is { service: Service; price: number } => a !== null)

  const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0)

  return {
    tier,
    package: pkg,
    packagePrice,
    addons,
    total: packagePrice + addonsTotal,
  }
}

/**
 * Get services by category
 */
export async function getServicesByCategory(
  category: Service['category']
): Promise<Service[]> {
  const { services } = await getPricing()
  return services.filter((s) => s.category === category)
}

/**
 * Calculate shoot duration based on services
 */
export function calculateDuration(
  sqft: number,
  serviceKeys: string[],
  services: Service[]
): number {
  // Base duration based on sqft
  const baseDuration = sqft >= 3500 ? 90 : 75

  // Add duration for each service
  const serviceDuration = serviceKeys.reduce((total, key) => {
    const service = services.find((s) => s.key === key)
    return total + (service?.duration_minutes || 0)
  }, 0)

  return baseDuration + serviceDuration
}
