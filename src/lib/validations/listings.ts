import { z } from 'zod'
import { uuidSchema, emailSchema, phoneSchema } from './common'

/**
 * Listing-related validation schemas
 */

// Property details
export const propertyDetailsSchema = z.object({
  beds: z.number().int().min(0).max(20),
  baths: z.number().min(0).max(20),
  sqft: z.number().int().min(100).max(100000),
  price: z.number().int().min(0).optional(),
})

// Listing description input
export const listingDescriptionInputSchema = z.object({
  listing_id: uuidSchema.optional(),
  address: z.string().min(1, 'Address is required'),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  beds: z.number().int().min(0).max(20),
  baths: z.number().min(0).max(20),
  sqft: z.number().int().min(100).max(100000),
  features: z.array(z.string()).optional(),
  neighborhood: z.string().optional(),
})

// Buyer personas input
export const buyerPersonasInputSchema = z.object({
  listing_id: uuidSchema.optional(),
  address: z.string().optional(),
  beds: z.number().int().min(0).max(20),
  baths: z.number().min(0).max(20),
  sqft: z.number().int().min(100).max(100000),
  price: z.number().int().min(0).optional(),
  style: z.string().optional(),
  neighborhood: z.string().optional(),
})

// Neighborhood guide input
export const neighborhoodGuideInputSchema = z.object({
  listing_id: uuidSchema.optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2).optional(),
  neighborhood: z.string().optional(),
  nearbyPlaces: z.array(z.string()).optional(),
})

// Social captions input
export const socialCaptionsInputSchema = z.object({
  listing_id: uuidSchema.optional(),
  address: z.string().optional(),
  beds: z.number().int().min(0).max(20).optional(),
  baths: z.number().min(0).max(20).optional(),
  sqft: z.number().int().min(100).max(100000).optional(),
  price: z.number().int().min(0).optional(),
  highlights: z.array(z.string()).optional(),
  style: z.enum(['professional', 'casual', 'luxury', 'informative']).optional(),
})

// Video script input
export const videoScriptInputSchema = z.object({
  listing_id: uuidSchema.optional(),
  address: z.string().min(1, 'Address is required'),
  beds: z.number().int().min(0).max(20),
  baths: z.number().min(0).max(20),
  sqft: z.number().int().min(100).max(100000),
  price: z.number().int().min(0).optional(),
  highlights: z.array(z.string()).optional(),
  duration: z.enum(['30', '60', '90']).default('60'),
})

// Lead submission
export const leadSubmissionSchema = z.object({
  listing_id: uuidSchema.optional(),
  agent_id: uuidSchema.optional(),
  name: z.string().min(1, 'Name is required'),
  email: emailSchema,
  phone: phoneSchema,
  message: z.string().optional(),
})

// Lead query params
export const leadQuerySchema = z.object({
  agent_id: uuidSchema,
  status: z.enum(['new', 'contacted', 'qualified', 'lost']).optional(),
})
