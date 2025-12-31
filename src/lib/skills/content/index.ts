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
export { generateCarouselContentSkill } from './carousel-content'
export { generateHashtagsSkill } from './hashtags'
export { generateCarouselCaptionSkill } from './carousel-caption'

// Default exports as named
import listingDescriptionSkill from './listing-description'
import socialCaptionSkill from './social-caption'
import emailCopySkill from './email-copy'
import generateCarouselContentSkill from './carousel-content'
import generateHashtagsSkill from './hashtags'
import generateCarouselCaptionSkill from './carousel-caption'

/**
 * All content skills for registration
 */
export const contentSkills = [
  listingDescriptionSkill,
  socialCaptionSkill,
  emailCopySkill,
  generateCarouselContentSkill,
  generateHashtagsSkill,
  generateCarouselCaptionSkill,
]

export default contentSkills
