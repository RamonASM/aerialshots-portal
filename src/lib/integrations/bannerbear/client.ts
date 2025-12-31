// Bannerbear API Client for carousel image rendering
// Documentation: https://developers.bannerbear.com/

import { integrationLogger } from '@/lib/logger'

const logger = integrationLogger.child({ integration: 'bannerbear' })

const BANNERBEAR_API_BASE = 'https://api.bannerbear.com/v2'

interface BannerbearModification {
  name: string
  text?: string
  image_url?: string
  color?: string
}

interface BannerbearImageRequest {
  template: string
  modifications: BannerbearModification[]
  webhook_url?: string
  metadata?: string
}

interface BannerbearImage {
  uid: string
  status: 'pending' | 'completed' | 'failed'
  image_url: string | null
  image_url_png: string | null
  image_url_jpg: string | null
  created_at: string
  updated_at: string
  render_time_ms?: number
  metadata?: string
}

interface BannerbearCollectionRequest {
  template_set: string
  modifications: BannerbearModification[][]
  webhook_url?: string
  metadata?: string
}

interface BannerbearCollection {
  uid: string
  status: 'pending' | 'completed' | 'failed'
  images: BannerbearImage[]
  created_at: string
  updated_at: string
  metadata?: string
}

function getApiKey(): string {
  const apiKey = process.env.BANNERBEAR_API_KEY
  if (!apiKey) {
    throw new Error('BANNERBEAR_API_KEY not configured')
  }
  return apiKey
}

// Create a single image from a template
export async function createImage(
  templateId: string,
  modifications: BannerbearModification[],
  webhookUrl?: string,
  metadata?: string
): Promise<BannerbearImage> {
  const apiKey = getApiKey()

  const response = await fetch(`${BANNERBEAR_API_BASE}/images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      template: templateId,
      modifications,
      webhook_url: webhookUrl,
      metadata,
    } as BannerbearImageRequest),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error({ status: response.status, error: errorText }, 'Bannerbear API error')
    throw new Error('Failed to create Bannerbear image')
  }

  return response.json()
}

// Create a collection of images (for carousel slides)
export async function createCollection(
  templateSetId: string,
  modificationsPerSlide: BannerbearModification[][],
  webhookUrl?: string,
  metadata?: string
): Promise<BannerbearCollection> {
  const apiKey = getApiKey()

  const response = await fetch(`${BANNERBEAR_API_BASE}/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      template_set: templateSetId,
      modifications: modificationsPerSlide,
      webhook_url: webhookUrl,
      metadata,
    } as BannerbearCollectionRequest),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error({ status: response.status, error: errorText }, 'Bannerbear API error')
    throw new Error('Failed to create Bannerbear collection')
  }

  return response.json()
}

// Get image status
export async function getImage(imageUid: string): Promise<BannerbearImage> {
  const apiKey = getApiKey()

  const response = await fetch(`${BANNERBEAR_API_BASE}/images/${imageUid}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Bannerbear image')
  }

  return response.json()
}

// Get collection status
export async function getCollection(collectionUid: string): Promise<BannerbearCollection> {
  const apiKey = getApiKey()

  const response = await fetch(`${BANNERBEAR_API_BASE}/collections/${collectionUid}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Bannerbear collection')
  }

  return response.json()
}

// Helper to build modifications for a carousel slide
export function buildSlideModifications(
  headline: string,
  body: string,
  backgroundImageUrl: string,
  agentLogoUrl?: string,
  brandColor?: string,
  slideNumber?: number,
  totalSlides?: number
): BannerbearModification[] {
  const modifications: BannerbearModification[] = [
    { name: 'background_image', image_url: backgroundImageUrl },
    { name: 'headline', text: headline },
    { name: 'body_text', text: body },
  ]

  if (agentLogoUrl) {
    modifications.push({ name: 'agent_logo', image_url: agentLogoUrl })
  }

  if (brandColor) {
    modifications.push({ name: 'accent_bar', color: brandColor })
  }

  if (slideNumber !== undefined && totalSlides !== undefined) {
    modifications.push({ name: 'slide_number', text: `${slideNumber}/${totalSlides}` })
  }

  return modifications
}

export type { BannerbearImage, BannerbearCollection, BannerbearModification }
