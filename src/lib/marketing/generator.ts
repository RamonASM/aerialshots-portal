// Marketing Asset Generator using Bannerbear

import { createImage, type BannerbearModification } from '@/lib/integrations/bannerbear/client'
import { MARKETING_TEMPLATES, MARKETING_LAYERS, DEFAULT_TAGLINES, DEFAULT_CTAS, formatPrice, formatFeatures } from './templates'
import type {
  MarketingAssetType,
  MarketingAssetFormat,
  JustListedData,
  OpenHouseData,
  JustSoldData,
  PriceReductionData,
  MarketingGenerationOptions,
  MarketingGenerationResult,
} from './types'

// Build modifications for Just Listed graphic
function buildJustListedModifications(data: JustListedData): BannerbearModification[] {
  const modifications: BannerbearModification[] = [
    { name: MARKETING_LAYERS.background_image, image_url: data.photoUrl },
    { name: MARKETING_LAYERS.headline, text: 'JUST LISTED' },
    { name: MARKETING_LAYERS.address, text: data.address },
    { name: MARKETING_LAYERS.city_state, text: `${data.city}, ${data.state}` },
    { name: MARKETING_LAYERS.price, text: formatPrice(data.price) },
    { name: MARKETING_LAYERS.property_features, text: formatFeatures(data.beds, data.baths, data.sqft) },
    { name: MARKETING_LAYERS.agent_name, text: data.agentName },
    { name: MARKETING_LAYERS.tagline, text: data.tagline || DEFAULT_TAGLINES.just_listed },
    { name: MARKETING_LAYERS.call_to_action, text: DEFAULT_CTAS.just_listed },
  ]

  if (data.agentPhone) {
    modifications.push({ name: MARKETING_LAYERS.agent_phone, text: data.agentPhone })
  }

  if (data.agentLogoUrl) {
    modifications.push({ name: MARKETING_LAYERS.agent_logo, image_url: data.agentLogoUrl })
  }

  if (data.brokerageLogoUrl) {
    modifications.push({ name: MARKETING_LAYERS.brokerage_logo, image_url: data.brokerageLogoUrl })
  }

  if (data.brandColor) {
    modifications.push({ name: MARKETING_LAYERS.accent_color, color: data.brandColor })
  }

  return modifications
}

// Build modifications for Open House graphic
function buildOpenHouseModifications(data: OpenHouseData): BannerbearModification[] {
  const modifications: BannerbearModification[] = [
    { name: MARKETING_LAYERS.background_image, image_url: data.photoUrl },
    { name: MARKETING_LAYERS.headline, text: 'OPEN HOUSE' },
    { name: MARKETING_LAYERS.address, text: data.address },
    { name: MARKETING_LAYERS.city_state, text: `${data.city}, ${data.state}` },
    { name: MARKETING_LAYERS.event_date, text: data.date },
    { name: MARKETING_LAYERS.event_time, text: data.time },
    { name: MARKETING_LAYERS.agent_name, text: data.agentName },
    { name: MARKETING_LAYERS.call_to_action, text: DEFAULT_CTAS.open_house },
  ]

  if (data.agentPhone) {
    modifications.push({ name: MARKETING_LAYERS.agent_phone, text: data.agentPhone })
  }

  if (data.agentLogoUrl) {
    modifications.push({ name: MARKETING_LAYERS.agent_logo, image_url: data.agentLogoUrl })
  }

  if (data.brandColor) {
    modifications.push({ name: MARKETING_LAYERS.accent_color, color: data.brandColor })
  }

  return modifications
}

// Build modifications for Just Sold graphic
function buildJustSoldModifications(data: JustSoldData): BannerbearModification[] {
  const modifications: BannerbearModification[] = [
    { name: MARKETING_LAYERS.background_image, image_url: data.photoUrl },
    { name: MARKETING_LAYERS.headline, text: 'JUST SOLD' },
    { name: MARKETING_LAYERS.address, text: data.address },
    { name: MARKETING_LAYERS.city_state, text: `${data.city}, ${data.state}` },
    { name: MARKETING_LAYERS.price, text: formatPrice(data.soldPrice) },
    { name: MARKETING_LAYERS.agent_name, text: data.agentName },
    { name: MARKETING_LAYERS.call_to_action, text: DEFAULT_CTAS.just_sold },
  ]

  if (data.daysOnMarket !== undefined) {
    modifications.push({
      name: MARKETING_LAYERS.days_on_market,
      text: `${data.daysOnMarket} Days on Market`,
    })
  }

  if (data.agentLogoUrl) {
    modifications.push({ name: MARKETING_LAYERS.agent_logo, image_url: data.agentLogoUrl })
  }

  if (data.testimonial) {
    modifications.push({ name: MARKETING_LAYERS.testimonial, text: `"${data.testimonial}"` })
  }

  return modifications
}

// Build modifications for Price Reduction graphic
function buildPriceReductionModifications(data: PriceReductionData): BannerbearModification[] {
  const modifications: BannerbearModification[] = [
    { name: MARKETING_LAYERS.background_image, image_url: data.photoUrl },
    { name: MARKETING_LAYERS.headline, text: 'PRICE REDUCED' },
    { name: MARKETING_LAYERS.address, text: data.address },
    { name: MARKETING_LAYERS.city_state, text: data.city },
    { name: MARKETING_LAYERS.price, text: formatPrice(data.newPrice) },
    { name: MARKETING_LAYERS.original_price, text: formatPrice(data.originalPrice) },
    { name: MARKETING_LAYERS.savings, text: `Save ${formatPrice(data.savings)}` },
    { name: MARKETING_LAYERS.agent_name, text: data.agentName },
    { name: MARKETING_LAYERS.call_to_action, text: DEFAULT_CTAS.price_reduction },
  ]

  if (data.agentPhone) {
    modifications.push({ name: MARKETING_LAYERS.agent_phone, text: data.agentPhone })
  }

  if (data.brandColor) {
    modifications.push({ name: MARKETING_LAYERS.accent_color, color: data.brandColor })
  }

  return modifications
}

// Get modifications based on asset type
function getModifications(
  type: MarketingAssetType,
  data: JustListedData | OpenHouseData | JustSoldData | PriceReductionData
): BannerbearModification[] {
  switch (type) {
    case 'just_listed':
    case 'coming_soon':
      return buildJustListedModifications(data as JustListedData)
    case 'open_house':
      return buildOpenHouseModifications(data as OpenHouseData)
    case 'just_sold':
    case 'under_contract':
      return buildJustSoldModifications(data as JustSoldData)
    case 'price_reduction':
      return buildPriceReductionModifications(data as PriceReductionData)
    default:
      throw new Error(`Unknown marketing asset type: ${type}`)
  }
}

// Generate marketing assets
export async function generateMarketingAssets(
  options: MarketingGenerationOptions
): Promise<MarketingGenerationResult> {
  const { listingId, agentId, type, formats, data, webhookUrl } = options

  const results: MarketingGenerationResult['assets'] = []
  const errors: string[] = []

  const modifications = getModifications(type, data)

  for (const format of formats) {
    const templateId = MARKETING_TEMPLATES[type]?.[format]

    if (!templateId || templateId.includes('_TEMPLATE')) {
      errors.push(`Template not configured for ${type} ${format}`)
      continue
    }

    try {
      const metadata = JSON.stringify({
        listingId,
        agentId,
        assetType: type,
        format,
      })

      const image = await createImage(templateId, modifications, webhookUrl, metadata)

      results.push({
        format,
        bannerbearUid: image.uid,
        status: 'pending',
      })

      // Delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error(`Error generating ${type} ${format}:`, error)
      errors.push(`Failed to generate ${format}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    success: results.length > 0,
    assets: results,
    errors,
  }
}

// Generate Just Listed graphics for a delivered listing
export async function generateJustListedAssets(
  listingId: string,
  agentId: string,
  data: JustListedData,
  formats: MarketingAssetFormat[] = ['instagram_square', 'instagram_story'],
  webhookUrl?: string
): Promise<MarketingGenerationResult> {
  return generateMarketingAssets({
    listingId,
    agentId,
    type: 'just_listed',
    formats,
    data,
    webhookUrl,
  })
}

// Check if marketing generation is configured
export function isMarketingConfigured(): boolean {
  return !!process.env.BANNERBEAR_API_KEY
}

// Get available formats for an asset type
export function getAvailableFormats(type: MarketingAssetType): MarketingAssetFormat[] {
  const templates = MARKETING_TEMPLATES[type]
  return (Object.keys(templates) as MarketingAssetFormat[]).filter(
    format => !templates[format].includes('_TEMPLATE')
  )
}
