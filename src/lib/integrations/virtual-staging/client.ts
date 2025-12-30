import { createAdminClient } from '@/lib/supabase/admin'

/**
 * AI Provider types
 */
export type StagingProvider = 'gemini' | 'stable_diffusion' | 'reimagine_home' | 'apply_design'

/**
 * Room types for staging
 */
export type RoomType =
  | 'living_room'
  | 'bedroom'
  | 'kitchen'
  | 'dining_room'
  | 'bathroom'
  | 'office'
  | 'nursery'
  | 'outdoor'

/**
 * Furniture styles
 */
export type StagingStyleId =
  | 'modern'
  | 'contemporary'
  | 'scandinavian'
  | 'traditional'
  | 'minimalist'
  | 'industrial'
  | 'coastal'
  | 'farmhouse'
  | 'mid_century'
  | 'bohemian'
  | 'luxury'

/**
 * Staging style definition
 */
export interface StagingStyle {
  id: StagingStyleId
  name: string
  description: string
  preview_url: string
  compatible_rooms?: RoomType[]
}

/**
 * Room type definition
 */
export interface RoomTypeInfo {
  id: RoomType
  name: string
  furniture_options: string[]
}

/**
 * Staging request
 */
export interface StagingRequest {
  image_url: string
  room_type: RoomType
  style: StagingStyleId
  rush?: boolean
  provider?: StagingProvider
  placement_hints?: string[]
  furniture_items?: string[]
  remove_existing_furniture?: boolean
  listing_id?: string
}

/**
 * Staging result
 */
export interface StagingResult {
  id: string
  original_url: string
  staged_url?: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout'
  progress?: number
  estimated_completion?: string
  error_message?: string
  room_type: RoomType
  style: StagingStyleId
  provider: StagingProvider
  processing_time?: number
  created_at: string
}

/**
 * Cost estimate
 */
export interface StagingCostEstimate {
  base_price: number
  rush_fee?: number
  removal_fee?: number
  discount?: number
  total: number
}

/**
 * Available staging styles
 */
const STAGING_STYLES: StagingStyle[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean lines, neutral colors, minimalist furniture',
    preview_url: '/staging/previews/modern.jpg',
    compatible_rooms: ['living_room', 'bedroom', 'office', 'dining_room'],
  },
  {
    id: 'contemporary',
    name: 'Contemporary',
    description: 'Current trends, mixed textures, bold accents',
    preview_url: '/staging/previews/contemporary.jpg',
    compatible_rooms: ['living_room', 'bedroom', 'office', 'dining_room'],
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    description: 'Light woods, white walls, cozy textiles',
    preview_url: '/staging/previews/scandinavian.jpg',
    compatible_rooms: ['living_room', 'bedroom', 'office', 'nursery'],
  },
  {
    id: 'traditional',
    name: 'Traditional',
    description: 'Classic furniture, rich colors, elegant details',
    preview_url: '/staging/previews/traditional.jpg',
    compatible_rooms: ['living_room', 'bedroom', 'dining_room'],
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Essential furniture only, maximum space',
    preview_url: '/staging/previews/minimalist.jpg',
    compatible_rooms: ['living_room', 'bedroom', 'office'],
  },
  {
    id: 'industrial',
    name: 'Industrial',
    description: 'Raw materials, exposed elements, urban feel',
    preview_url: '/staging/previews/industrial.jpg',
    compatible_rooms: ['living_room', 'office', 'kitchen'],
  },
  {
    id: 'coastal',
    name: 'Coastal',
    description: 'Beach-inspired, light blues, natural textures',
    preview_url: '/staging/previews/coastal.jpg',
    compatible_rooms: ['living_room', 'bedroom', 'bathroom'],
  },
  {
    id: 'farmhouse',
    name: 'Farmhouse',
    description: 'Rustic charm, reclaimed wood, vintage accents',
    preview_url: '/staging/previews/farmhouse.jpg',
    compatible_rooms: ['living_room', 'kitchen', 'dining_room', 'bedroom'],
  },
  {
    id: 'mid_century',
    name: 'Mid-Century Modern',
    description: 'Retro inspired, organic shapes, bold colors',
    preview_url: '/staging/previews/mid-century.jpg',
    compatible_rooms: ['living_room', 'office', 'dining_room'],
  },
  {
    id: 'bohemian',
    name: 'Bohemian',
    description: 'Eclectic mix, global influences, layered textiles',
    preview_url: '/staging/previews/bohemian.jpg',
    compatible_rooms: ['living_room', 'bedroom'],
  },
  {
    id: 'luxury',
    name: 'Luxury',
    description: 'High-end furnishings, premium materials, sophisticated',
    preview_url: '/staging/previews/luxury.jpg',
    compatible_rooms: ['living_room', 'bedroom', 'dining_room', 'bathroom'],
  },
]

/**
 * Available room types
 */
const ROOM_TYPES: RoomTypeInfo[] = [
  {
    id: 'living_room',
    name: 'Living Room',
    furniture_options: ['sofa', 'coffee_table', 'armchair', 'tv_stand', 'floor_lamp', 'rug', 'bookshelf', 'side_table'],
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    furniture_options: ['bed', 'nightstand', 'dresser', 'mirror', 'bench', 'rug', 'table_lamp', 'armchair'],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    furniture_options: ['bar_stools', 'pendant_lights', 'kitchen_island', 'dining_set'],
  },
  {
    id: 'dining_room',
    name: 'Dining Room',
    furniture_options: ['dining_table', 'dining_chairs', 'sideboard', 'chandelier', 'rug', 'artwork'],
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    furniture_options: ['vanity', 'mirror', 'towel_rack', 'plant', 'bath_accessories'],
  },
  {
    id: 'office',
    name: 'Home Office',
    furniture_options: ['desk', 'office_chair', 'bookshelf', 'desk_lamp', 'filing_cabinet', 'rug'],
  },
  {
    id: 'nursery',
    name: 'Nursery',
    furniture_options: ['crib', 'changing_table', 'rocking_chair', 'dresser', 'rug', 'mobile'],
  },
  {
    id: 'outdoor',
    name: 'Outdoor/Patio',
    furniture_options: ['outdoor_sofa', 'coffee_table', 'dining_set', 'umbrella', 'planters', 'fire_pit'],
  },
]

/**
 * Generate a staged image
 */
export async function generateStagedImage(request: StagingRequest): Promise<{
  success: boolean
  staging_id?: string
  staged_url?: string
  error?: string
}> {
  try {
    const supabase = createAdminClient()
    const provider = request.provider || 'gemini'

    // Create staging job record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('virtual_staging_jobs')
      .insert({
        original_url: request.image_url,
        room_type: request.room_type,
        style: request.style,
        provider,
        is_rush: request.rush || false,
        remove_existing: request.remove_existing_furniture || false,
        placement_hints: request.placement_hints,
        furniture_items: request.furniture_items,
        listing_id: request.listing_id,
        status: 'processing',
        created_at: new Date().toISOString(),
      })
      .select()
      .single() as { data: StagingResult | null; error: Error | null }

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to create staging job.',
      }
    }

    // In production, this would call the actual AI provider
    // For now, simulate async processing
    const stagedUrl = await processWithAIProvider(provider, {
      imageUrl: request.image_url,
      roomType: request.room_type,
      style: request.style,
      removeExisting: request.remove_existing_furniture,
      furnitureItems: request.furniture_items,
      placementHints: request.placement_hints,
    })

    if (!stagedUrl) {
      // Update job status to failed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('virtual_staging_jobs')
        .update({
          status: 'failed',
          error_message: 'AI processing failed',
        })
        .eq('id', data.id)

      return {
        success: false,
        staging_id: data.id,
        error: 'AI processing failed.',
      }
    }

    // Update job with result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('virtual_staging_jobs')
      .update({
        status: 'completed',
        staged_url: stagedUrl,
        completed_at: new Date().toISOString(),
      })
      .eq('id', data.id)

    return {
      success: true,
      staging_id: data.id,
      staged_url: stagedUrl,
    }
  } catch (error) {
    console.error('[VirtualStaging] Error generating staged image:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Process image with AI provider
 */
async function processWithAIProvider(
  provider: StagingProvider,
  params: {
    imageUrl: string
    roomType: RoomType
    style: StagingStyleId
    removeExisting?: boolean
    furnitureItems?: string[]
    placementHints?: string[]
  }
): Promise<string | null> {
  // This is where provider-specific logic would go
  // Each provider has different API interfaces

  const prompt = buildStagingPrompt(params)

  switch (provider) {
    case 'gemini':
      // Would call Google Gemini API
      // return await generateWithGemini(params.imageUrl, prompt)
      return `https://storage.example.com/staged/${Date.now()}.jpg`

    case 'stable_diffusion':
      // Would call Stable Diffusion with ControlNet
      return `https://storage.example.com/staged/${Date.now()}.jpg`

    case 'reimagine_home':
      // Would call REimagineHome API
      return `https://storage.example.com/staged/${Date.now()}.jpg`

    case 'apply_design':
      // Would call Apply Design API
      return `https://storage.example.com/staged/${Date.now()}.jpg`

    default:
      return null
  }
}

/**
 * Build staging prompt for AI
 */
function buildStagingPrompt(params: {
  roomType: RoomType
  style: StagingStyleId
  removeExisting?: boolean
  furnitureItems?: string[]
  placementHints?: string[]
}): string {
  const style = STAGING_STYLES.find((s) => s.id === params.style)
  const room = ROOM_TYPES.find((r) => r.id === params.roomType)

  let prompt = `Virtual stage this ${room?.name || params.roomType} with ${style?.name || params.style} style furniture. `

  if (params.removeExisting) {
    prompt += 'First remove any existing furniture. '
  }

  if (params.furnitureItems?.length) {
    prompt += `Include: ${params.furnitureItems.join(', ')}. `
  }

  if (params.placementHints?.length) {
    prompt += `Placement: ${params.placementHints.join('. ')}. `
  }

  prompt += 'Maintain photorealistic quality, proper lighting, and realistic shadows.'

  return prompt
}

/**
 * Get available staging styles
 */
export async function getStagingStyles(options: {
  room_type?: RoomType
} = {}): Promise<StagingStyle[]> {
  if (options.room_type) {
    return STAGING_STYLES.filter(
      (s) => !s.compatible_rooms || s.compatible_rooms.includes(options.room_type!)
    )
  }
  return STAGING_STYLES
}

/**
 * Get available room types
 */
export async function getRoomTypes(): Promise<RoomTypeInfo[]> {
  return ROOM_TYPES
}

/**
 * Get staging job status
 */
export async function getStagingStatus(stagingId: string): Promise<StagingResult | null> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('virtual_staging_jobs')
      .select('*')
      .eq('id', stagingId)
      .single() as { data: StagingResult | null; error: Error | null }

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error('[VirtualStaging] Error getting status:', error)
    return null
  }
}

/**
 * Get staging history for a listing
 */
export async function getStagingHistory(
  listingId: string,
  options: { status?: StagingResult['status'] } = {}
): Promise<StagingResult[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('virtual_staging_jobs')
      .select('*')
      .eq('listing_id', listingId)

    if (options.status) {
      query = query.eq('status', options.status)
    }

    const { data, error } = await query.order('created_at', { ascending: false }) as {
      data: StagingResult[] | null
      error: Error | null
    }

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[VirtualStaging] Error getting history:', error)
    return []
  }
}

/**
 * Retry a failed staging job
 */
export async function retryStaging(stagingId: string): Promise<{
  success: boolean
  new_staging_id?: string
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // Get original job
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: original } = await (supabase as any)
      .from('virtual_staging_jobs')
      .select('*')
      .eq('id', stagingId)
      .single() as { data: StagingResult | null }

    if (!original) {
      return {
        success: false,
        error: 'Staging job not found.',
      }
    }

    if (original.status !== 'failed' && original.status !== 'timeout') {
      return {
        success: false,
        error: 'Can only retry failed or timed out jobs.',
      }
    }

    // Create new job with same parameters
    const result = await generateStagedImage({
      image_url: original.original_url,
      room_type: original.room_type,
      style: original.style,
      provider: original.provider,
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      }
    }

    return {
      success: true,
      new_staging_id: result.staging_id,
    }
  } catch (error) {
    console.error('[VirtualStaging] Error retrying staging:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Estimate staging cost
 */
export function estimateStagingCost(params: {
  room_type: RoomType
  style: StagingStyleId
  rush?: boolean
  quantity?: number
  remove_existing?: boolean
}): StagingCostEstimate {
  const basePrice = 25 // $25 per image
  const rushFee = params.rush ? 25 : 0 // $25 rush fee
  const removalFee = params.remove_existing ? 10 : 0 // $10 for object removal

  const quantity = params.quantity || 1
  let discount = 0

  // Bulk discounts
  if (quantity >= 10) {
    discount = basePrice * quantity * 0.20 // 20% off
  } else if (quantity >= 5) {
    discount = basePrice * quantity * 0.10 // 10% off
  }

  const subtotal = (basePrice * quantity) + rushFee + removalFee
  const total = subtotal - discount

  return {
    base_price: basePrice,
    rush_fee: rushFee > 0 ? rushFee : undefined,
    removal_fee: removalFee > 0 ? removalFee : undefined,
    discount: discount > 0 ? Math.round(discount * 100) / 100 : undefined,
    total: Math.round(total * 100) / 100,
  }
}

/**
 * Delete a staging result
 */
export async function deleteStagingResult(stagingId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('virtual_staging_jobs')
      .delete()
      .eq('id', stagingId)

    if (error) {
      return {
        success: false,
        error: 'Failed to delete staging result.',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[VirtualStaging] Error deleting result:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}
