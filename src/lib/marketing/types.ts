// Marketing Asset Types

export type MarketingAssetType =
  | 'just_listed'
  | 'just_sold'
  | 'open_house'
  | 'price_reduction'
  | 'coming_soon'
  | 'under_contract'

export type MarketingAssetFormat =
  | 'instagram_square'    // 1080x1080
  | 'instagram_portrait'  // 1080x1350
  | 'instagram_story'     // 1080x1920
  | 'facebook_post'       // 1200x630

export interface MarketingAsset {
  id: string
  listingId: string
  agentId: string
  type: MarketingAssetType
  format: MarketingAssetFormat
  status: 'pending' | 'rendering' | 'completed' | 'failed'
  imageUrl: string | null
  bannerbearUid: string | null
  createdAt: string
  completedAt: string | null
}

export interface JustListedData {
  address: string
  city: string
  state: string
  price: number
  beds: number
  baths: number
  sqft: number
  photoUrl: string
  agentName: string
  agentPhone?: string
  agentLogoUrl?: string
  brokerageName?: string
  brokerageLogoUrl?: string
  brandColor?: string
  tagline?: string // e.g., "Your Dream Home Awaits"
}

export interface OpenHouseData {
  address: string
  city: string
  state: string
  date: string // e.g., "Saturday, December 28"
  time: string // e.g., "1:00 PM - 4:00 PM"
  photoUrl: string
  agentName: string
  agentPhone?: string
  agentLogoUrl?: string
  brandColor?: string
}

export interface JustSoldData {
  address: string
  city: string
  state: string
  soldPrice: number
  listPrice?: number
  daysOnMarket?: number
  photoUrl: string
  agentName: string
  agentLogoUrl?: string
  testimonial?: string
}

export interface PriceReductionData {
  address: string
  city: string
  newPrice: number
  originalPrice: number
  savings: number
  photoUrl: string
  agentName: string
  agentPhone?: string
  brandColor?: string
}

export interface MarketingGenerationOptions {
  listingId: string
  agentId: string
  type: MarketingAssetType
  formats: MarketingAssetFormat[]
  data: JustListedData | OpenHouseData | JustSoldData | PriceReductionData
  webhookUrl?: string
}

export interface MarketingGenerationResult {
  success: boolean
  assets: Array<{
    format: MarketingAssetFormat
    bannerbearUid: string
    status: 'pending'
  }>
  errors: string[]
}
