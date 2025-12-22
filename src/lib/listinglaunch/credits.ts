// ListingLaunch credit costs
// These are deducted from the agent's credit balance

export const LISTINGLAUNCH_CREDITS = {
  // Research phase - neighborhood data gathering
  RESEARCH: 25,

  // Question generation - AI personalized questions
  QUESTIONS: 10,

  // Carousel content generation - per carousel type
  CAROUSEL_GENERATION: 30,

  // Blog post generation
  BLOG_GENERATION: 50,

  // Image rendering via Bannerbear - per carousel
  CAROUSEL_RENDER: 20,
} as const

// Calculate total credits for a campaign
export function calculateCampaignCredits(
  carouselCount: number,
  includeBlog: boolean
): number {
  let total = LISTINGLAUNCH_CREDITS.RESEARCH + LISTINGLAUNCH_CREDITS.QUESTIONS
  total += carouselCount * (LISTINGLAUNCH_CREDITS.CAROUSEL_GENERATION + LISTINGLAUNCH_CREDITS.CAROUSEL_RENDER)
  if (includeBlog) {
    total += LISTINGLAUNCH_CREDITS.BLOG_GENERATION
  }
  return total
}

// Estimate credits for a typical campaign
export function getEstimatedCampaignCredits(): { min: number; max: number; typical: number } {
  return {
    min: calculateCampaignCredits(1, false),  // 1 carousel, no blog
    max: calculateCampaignCredits(5, true),   // 5 carousels + blog
    typical: calculateCampaignCredits(3, true), // 3 carousels + blog
  }
}
