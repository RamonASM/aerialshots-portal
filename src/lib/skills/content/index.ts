/**
 * Content Skills Index
 *
 * Claude-powered content generation skills for real estate marketing.
 */

// Types
export * from './types'

// Provider
export { generateWithClaude, parseJsonResponse, parseArrayResponse } from './claude-provider'

// Skills
export { listingDescriptionSkill, generateMultipleDescriptions } from './listing-description'
export { socialCaptionSkill, generateMultipleCaptions } from './social-caption'
export { emailCopySkill, generateEmailVariations } from './email-copy'

// Default exports as named
import listingDescriptionSkill from './listing-description'
import socialCaptionSkill from './social-caption'
import emailCopySkill from './email-copy'

/**
 * All content skills for registration
 */
export const contentSkills = [
  listingDescriptionSkill,
  socialCaptionSkill,
  emailCopySkill,
]

export default contentSkills
