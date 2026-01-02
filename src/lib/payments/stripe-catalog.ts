/**
 * Stripe Product Catalog Sync Module
 *
 * Syncs pricing from database to Stripe product catalog.
 * Creates products and prices for:
 * - Listing packages (with tier-based pricing)
 * - A la carte services
 * - Content retainer subscriptions
 */

import Stripe from 'stripe'
import { getStripe, toCents } from './stripe'
import { createClient } from '@/lib/supabase/server'
import { LISTING_PACKAGES, SQFT_TIERS, RETAINER_PACKAGES } from '@/lib/pricing/config'

export interface SyncResult {
  success: boolean
  created: number
  updated: number
  errors: string[]
  details: {
    packages?: ProductSyncDetail[]
    services?: ProductSyncDetail[]
    retainers?: ProductSyncDetail[]
  }
}

export interface ProductSyncDetail {
  name: string
  productId: string
  priceIds: string[]
  action: 'created' | 'updated' | 'skipped'
}

/**
 * Sync all pricing to Stripe
 */
export async function syncAllToStripe(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    created: 0,
    updated: 0,
    errors: [],
    details: {},
  }

  try {
    // Sync packages
    const packagesResult = await syncPackagesToStripe()
    result.details.packages = packagesResult.details
    result.created += packagesResult.created
    result.updated += packagesResult.updated
    result.errors.push(...packagesResult.errors)

    // Sync services
    const servicesResult = await syncServicesToStripe()
    result.details.services = servicesResult.details
    result.created += servicesResult.created
    result.updated += servicesResult.updated
    result.errors.push(...servicesResult.errors)

    // Sync retainers
    const retainersResult = await syncRetainersToStripe()
    result.details.retainers = retainersResult.details
    result.created += retainersResult.created
    result.updated += retainersResult.updated
    result.errors.push(...retainersResult.errors)

    result.success = result.errors.length === 0
  } catch (error) {
    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error during sync')
  }

  return result
}

/**
 * Sync listing packages to Stripe
 * Creates one product per package with multiple prices (one per sqft tier)
 */
export async function syncPackagesToStripe(): Promise<{
  created: number
  updated: number
  errors: string[]
  details: ProductSyncDetail[]
}> {
  const stripe = getStripe()
  const supabase = await createClient()

  const result = {
    created: 0,
    updated: 0,
    errors: [] as string[],
    details: [] as ProductSyncDetail[],
  }

  for (const pkg of LISTING_PACKAGES) {
    try {
      const productKey = `pkg_${pkg.key}`

      // Check if product exists
      const existingProducts = await stripe.products.search({
        query: `metadata['asm_key']:'${productKey}'`,
      })

      let product: Stripe.Product
      let action: 'created' | 'updated' = 'created'

      if (existingProducts.data.length > 0) {
        // Update existing product
        product = await stripe.products.update(existingProducts.data[0].id, {
          name: `${pkg.name} Package`,
          description: pkg.tagline,
          metadata: {
            asm_key: productKey,
            package_key: pkg.key,
            type: 'listing_package',
          },
        })
        action = 'updated'
        result.updated++
      } else {
        // Create new product
        product = await stripe.products.create({
          name: `${pkg.name} Package`,
          description: pkg.tagline,
          metadata: {
            asm_key: productKey,
            package_key: pkg.key,
            type: 'listing_package',
          },
        })
        result.created++
      }

      // Create/update prices for each tier
      const priceIds: string[] = []

      for (const tier of SQFT_TIERS) {
        const tierId = tier.id
        const amount = pkg.pricing[tierId]
        const priceKey = `${productKey}_${tierId}`

        // Check if price exists
        const existingPrices = await stripe.prices.search({
          query: `metadata['asm_key']:'${priceKey}'`,
        })

        let price: Stripe.Price

        if (existingPrices.data.length > 0) {
          // Prices can't be updated in Stripe, so we check if amount matches
          const existingPrice = existingPrices.data[0]
          if (existingPrice.unit_amount === toCents(amount)) {
            priceIds.push(existingPrice.id)
            continue
          }
          // Archive old price and create new one
          await stripe.prices.update(existingPrice.id, { active: false })
        }

        // Create new price
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: toCents(amount),
          currency: 'usd',
          metadata: {
            asm_key: priceKey,
            package_key: pkg.key,
            tier_id: tierId,
            tier_label: tier.label,
            type: 'listing_package_price',
          },
        })
        priceIds.push(price.id)
      }

      // Store in database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any
      await client
        .from('packages')
        .update({ stripe_product_id: product.id })
        .eq('key', pkg.key)

      result.details.push({
        name: `${pkg.name} Package`,
        productId: product.id,
        priceIds,
        action,
      })
    } catch (error) {
      result.errors.push(`Failed to sync package ${pkg.key}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return result
}

/**
 * Sync services to Stripe
 * Creates one product per service with a single price
 */
export async function syncServicesToStripe(): Promise<{
  created: number
  updated: number
  errors: string[]
  details: ProductSyncDetail[]
}> {
  const stripe = getStripe()
  const supabase = await createClient()

  const result = {
    created: 0,
    updated: 0,
    errors: [] as string[],
    details: [] as ProductSyncDetail[],
  }

  // Get services from database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any
  const { data: services, error } = await client
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (error || !services) {
    result.errors.push(`Failed to fetch services: ${error?.message || 'No data'}`)
    return result
  }

  for (const service of services) {
    try {
      // Skip free services
      if (service.base_price === 0) continue

      const productKey = `svc_${service.key}`

      // Check if product exists
      const existingProducts = await stripe.products.search({
        query: `metadata['asm_key']:'${productKey}'`,
      })

      let product: Stripe.Product
      let action: 'created' | 'updated' = 'created'

      if (existingProducts.data.length > 0) {
        product = await stripe.products.update(existingProducts.data[0].id, {
          name: service.name,
          description: service.description || undefined,
          metadata: {
            asm_key: productKey,
            service_key: service.key,
            category: service.category,
            type: 'service',
          },
        })
        action = 'updated'
        result.updated++
      } else {
        product = await stripe.products.create({
          name: service.name,
          description: service.description || undefined,
          metadata: {
            asm_key: productKey,
            service_key: service.key,
            category: service.category,
            type: 'service',
          },
        })
        result.created++
      }

      // Create/update price
      const priceKey = `${productKey}_price`
      const existingPrices = await stripe.prices.search({
        query: `metadata['asm_key']:'${priceKey}'`,
      })

      let priceId: string

      if (existingPrices.data.length > 0) {
        const existingPrice = existingPrices.data[0]
        if (existingPrice.unit_amount === toCents(service.base_price)) {
          priceId = existingPrice.id
        } else {
          await stripe.prices.update(existingPrice.id, { active: false })
          const newPrice = await stripe.prices.create({
            product: product.id,
            unit_amount: toCents(service.base_price),
            currency: 'usd',
            metadata: {
              asm_key: priceKey,
              service_key: service.key,
              type: 'service_price',
            },
          })
          priceId = newPrice.id
        }
      } else {
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: toCents(service.base_price),
          currency: 'usd',
          metadata: {
            asm_key: priceKey,
            service_key: service.key,
            type: 'service_price',
          },
        })
        priceId = price.id
      }

      // Store in database
      await client
        .from('services')
        .update({
          stripe_product_id: product.id,
          stripe_price_id: priceId,
        })
        .eq('key', service.key)

      result.details.push({
        name: service.name,
        productId: product.id,
        priceIds: [priceId],
        action,
      })
    } catch (error) {
      result.errors.push(`Failed to sync service ${service.key}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return result
}

/**
 * Sync content retainers to Stripe
 * Creates recurring subscription products
 */
export async function syncRetainersToStripe(): Promise<{
  created: number
  updated: number
  errors: string[]
  details: ProductSyncDetail[]
}> {
  const stripe = getStripe()
  const supabase = await createClient()

  const result = {
    created: 0,
    updated: 0,
    errors: [] as string[],
    details: [] as ProductSyncDetail[],
  }

  for (const retainer of RETAINER_PACKAGES) {
    try {
      const productKey = `retainer_${retainer.key}`

      // Check if product exists
      const existingProducts = await stripe.products.search({
        query: `metadata['asm_key']:'${productKey}'`,
      })

      let product: Stripe.Product
      let action: 'created' | 'updated' = 'created'

      if (existingProducts.data.length > 0) {
        product = await stripe.products.update(existingProducts.data[0].id, {
          name: `${retainer.name} Content Retainer`,
          description: retainer.description,
          metadata: {
            asm_key: productKey,
            retainer_key: retainer.key,
            tier: retainer.tier,
            videos_per_month: String(retainer.videoCount),
            shoot_days: String(retainer.shootDays),
            type: 'content_retainer',
          },
        })
        action = 'updated'
        result.updated++
      } else {
        product = await stripe.products.create({
          name: `${retainer.name} Content Retainer`,
          description: retainer.description,
          metadata: {
            asm_key: productKey,
            retainer_key: retainer.key,
            tier: retainer.tier,
            videos_per_month: String(retainer.videoCount),
            shoot_days: String(retainer.shootDays),
            type: 'content_retainer',
          },
        })
        result.created++
      }

      // Create/update recurring price
      const priceKey = `${productKey}_monthly`
      const existingPrices = await stripe.prices.search({
        query: `metadata['asm_key']:'${priceKey}'`,
      })

      let priceId: string

      if (existingPrices.data.length > 0) {
        const existingPrice = existingPrices.data[0]
        if (existingPrice.unit_amount === toCents(retainer.price)) {
          priceId = existingPrice.id
        } else {
          await stripe.prices.update(existingPrice.id, { active: false })
          const newPrice = await stripe.prices.create({
            product: product.id,
            unit_amount: toCents(retainer.price),
            currency: 'usd',
            recurring: {
              interval: 'month',
            },
            metadata: {
              asm_key: priceKey,
              retainer_key: retainer.key,
              type: 'retainer_price',
            },
          })
          priceId = newPrice.id
        }
      } else {
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: toCents(retainer.price),
          currency: 'usd',
          recurring: {
            interval: 'month',
          },
          metadata: {
            asm_key: priceKey,
            retainer_key: retainer.key,
            type: 'retainer_price',
          },
        })
        priceId = price.id
      }

      // Store in database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any
      await client
        .from('content_retainers')
        .update({
          stripe_product_id: product.id,
          stripe_price_id: priceId,
        })
        .eq('key', retainer.key)

      result.details.push({
        name: `${retainer.name} Content Retainer`,
        productId: product.id,
        priceIds: [priceId],
        action,
      })
    } catch (error) {
      result.errors.push(`Failed to sync retainer ${retainer.key}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return result
}

/**
 * Get sync status - check which products exist in Stripe
 */
export async function getStripeSyncStatus(): Promise<{
  packages: { key: string; synced: boolean; productId?: string }[]
  services: { key: string; synced: boolean; productId?: string }[]
  retainers: { key: string; synced: boolean; productId?: string }[]
}> {
  const stripe = getStripe()

  // Get all ASM products from Stripe
  const products = await stripe.products.list({
    limit: 100,
    active: true,
  })

  const asmProducts = products.data.filter(p => p.metadata?.asm_key)
  const productMap = new Map(asmProducts.map(p => [p.metadata.asm_key, p.id]))

  // Check packages
  const packages = LISTING_PACKAGES.map(pkg => ({
    key: pkg.key,
    synced: productMap.has(`pkg_${pkg.key}`),
    productId: productMap.get(`pkg_${pkg.key}`),
  }))

  // Check retainers
  const retainers = RETAINER_PACKAGES.map(retainer => ({
    key: retainer.key,
    synced: productMap.has(`retainer_${retainer.key}`),
    productId: productMap.get(`retainer_${retainer.key}`),
  }))

  // Services would need database query
  const services: { key: string; synced: boolean; productId?: string }[] = []

  return { packages, services, retainers }
}
