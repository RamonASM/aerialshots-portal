// Marketing Asset Template Configurations for Bannerbear

import type { MarketingAssetType, MarketingAssetFormat } from './types'

// Template IDs from Bannerbear (set via environment variables)
export const MARKETING_TEMPLATES: Record<MarketingAssetType, Record<MarketingAssetFormat, string>> = {
  just_listed: {
    instagram_square: process.env.BANNERBEAR_JUST_LISTED_SQUARE || 'JUST_LISTED_SQUARE',
    instagram_portrait: process.env.BANNERBEAR_JUST_LISTED_PORTRAIT || 'JUST_LISTED_PORTRAIT',
    instagram_story: process.env.BANNERBEAR_JUST_LISTED_STORY || 'JUST_LISTED_STORY',
    facebook_post: process.env.BANNERBEAR_JUST_LISTED_FB || 'JUST_LISTED_FB',
  },
  just_sold: {
    instagram_square: process.env.BANNERBEAR_JUST_SOLD_SQUARE || 'JUST_SOLD_SQUARE',
    instagram_portrait: process.env.BANNERBEAR_JUST_SOLD_PORTRAIT || 'JUST_SOLD_PORTRAIT',
    instagram_story: process.env.BANNERBEAR_JUST_SOLD_STORY || 'JUST_SOLD_STORY',
    facebook_post: process.env.BANNERBEAR_JUST_SOLD_FB || 'JUST_SOLD_FB',
  },
  open_house: {
    instagram_square: process.env.BANNERBEAR_OPEN_HOUSE_SQUARE || 'OPEN_HOUSE_SQUARE',
    instagram_portrait: process.env.BANNERBEAR_OPEN_HOUSE_PORTRAIT || 'OPEN_HOUSE_PORTRAIT',
    instagram_story: process.env.BANNERBEAR_OPEN_HOUSE_STORY || 'OPEN_HOUSE_STORY',
    facebook_post: process.env.BANNERBEAR_OPEN_HOUSE_FB || 'OPEN_HOUSE_FB',
  },
  price_reduction: {
    instagram_square: process.env.BANNERBEAR_PRICE_REDUCTION_SQUARE || 'PRICE_REDUCTION_SQUARE',
    instagram_portrait: process.env.BANNERBEAR_PRICE_REDUCTION_PORTRAIT || 'PRICE_REDUCTION_PORTRAIT',
    instagram_story: process.env.BANNERBEAR_PRICE_REDUCTION_STORY || 'PRICE_REDUCTION_STORY',
    facebook_post: process.env.BANNERBEAR_PRICE_REDUCTION_FB || 'PRICE_REDUCTION_FB',
  },
  coming_soon: {
    instagram_square: process.env.BANNERBEAR_COMING_SOON_SQUARE || 'COMING_SOON_SQUARE',
    instagram_portrait: process.env.BANNERBEAR_COMING_SOON_PORTRAIT || 'COMING_SOON_PORTRAIT',
    instagram_story: process.env.BANNERBEAR_COMING_SOON_STORY || 'COMING_SOON_STORY',
    facebook_post: process.env.BANNERBEAR_COMING_SOON_FB || 'COMING_SOON_FB',
  },
  under_contract: {
    instagram_square: process.env.BANNERBEAR_UNDER_CONTRACT_SQUARE || 'UNDER_CONTRACT_SQUARE',
    instagram_portrait: process.env.BANNERBEAR_UNDER_CONTRACT_PORTRAIT || 'UNDER_CONTRACT_PORTRAIT',
    instagram_story: process.env.BANNERBEAR_UNDER_CONTRACT_STORY || 'UNDER_CONTRACT_STORY',
    facebook_post: process.env.BANNERBEAR_UNDER_CONTRACT_FB || 'UNDER_CONTRACT_FB',
  },
}

// Format dimensions
export const FORMAT_DIMENSIONS: Record<MarketingAssetFormat, { width: number; height: number }> = {
  instagram_square: { width: 1080, height: 1080 },
  instagram_portrait: { width: 1080, height: 1350 },
  instagram_story: { width: 1080, height: 1920 },
  facebook_post: { width: 1200, height: 630 },
}

// Layer names used in Bannerbear templates
export const MARKETING_LAYERS = {
  // Common layers
  background_image: 'background_image',
  overlay: 'overlay',
  headline: 'headline',
  subheadline: 'subheadline',

  // Property info
  address: 'address',
  city_state: 'city_state',
  price: 'price',
  beds: 'beds',
  baths: 'baths',
  sqft: 'sqft',
  property_features: 'property_features',

  // Agent info
  agent_name: 'agent_name',
  agent_phone: 'agent_phone',
  agent_logo: 'agent_logo',
  brokerage_logo: 'brokerage_logo',

  // Event-specific
  event_date: 'event_date',
  event_time: 'event_time',
  original_price: 'original_price',
  savings: 'savings',
  days_on_market: 'days_on_market',
  testimonial: 'testimonial',

  // Branding
  accent_color: 'accent_color',
  tagline: 'tagline',
  call_to_action: 'call_to_action',
}

// Default taglines for each asset type
export const DEFAULT_TAGLINES: Record<MarketingAssetType, string> = {
  just_listed: 'Your Dream Home Awaits',
  just_sold: 'Another Happy Client',
  open_house: 'Come See Your New Home',
  price_reduction: 'New Price Alert',
  coming_soon: 'Exciting Opportunity Coming',
  under_contract: 'Moving Fast',
}

// Default call-to-action text
export const DEFAULT_CTAS: Record<MarketingAssetType, string> = {
  just_listed: 'Schedule a Showing Today',
  just_sold: 'Let Me Help You Next',
  open_house: 'See You There!',
  price_reduction: 'Don\'t Miss Out',
  coming_soon: 'Get Exclusive Preview Access',
  under_contract: 'More Homes Coming Soon',
}

// Helper to format price
export function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(price % 1000000 === 0 ? 0 : 1)}M`
  }
  return `$${price.toLocaleString()}`
}

// Helper to format property features
export function formatFeatures(beds: number, baths: number, sqft: number): string {
  return `${beds} Bed | ${baths} Bath | ${sqft.toLocaleString()} SqFt`
}
