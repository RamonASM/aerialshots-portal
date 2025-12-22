import { z } from 'zod'
import { uuidSchema } from './common'

/**
 * Campaign/ListingLaunch-related validation schemas
 */

// Carousel types
export const carouselTypeSchema = z.enum([
  'property_highlights',
  'neighborhood_guide',
  'local_favorites',
  'schools_families',
  'lifestyle',
  'market_update',
  'open_house',
])

// Campaign creation
export const campaignCreateSchema = z.object({
  listingId: uuidSchema,
  agentId: uuidSchema,
})

// Campaign route params
export const campaignParamsSchema = z.object({
  campaignId: uuidSchema,
})

// Carousel route params
export const carouselParamsSchema = z.object({
  campaignId: uuidSchema,
  carouselId: uuidSchema,
})

// Agent answer submission
export const agentAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(1),
})

export const agentAnswersSubmissionSchema = z.object({
  answers: z
    .array(agentAnswerSchema)
    .min(3, 'At least 3 answers are required to generate quality content'),
})

// Carousel slide
export const carouselSlideSchema = z.object({
  headline: z.string().min(1).max(100, 'Headlines must be 100 characters or less'),
  body: z.string().max(500, 'Body text must be 500 characters or less').optional(),
  imageUrl: z.string().url().optional(),
  order: z.number().int().min(0).optional(),
})

// Slides update
export const slidesUpdateSchema = z.object({
  slides: z.array(carouselSlideSchema).min(1, 'At least one slide is required'),
})

// Caption update
export const captionUpdateSchema = z.object({
  caption: z.string().min(1).max(2200, 'Caption must be 2200 characters or less'),
  hashtags: z.array(z.string()).max(30).optional(),
})

// Carousel render request
export const carouselRenderSchema = z.object({
  carouselId: uuidSchema,
})

// Blog generation
export const blogGenerationSchema = z.object({
  topic: z.string().min(1).optional(),
  tone: z.enum(['professional', 'casual', 'informative', 'persuasive']).optional(),
})
