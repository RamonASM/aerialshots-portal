// AI-powered carousel content generation for ListingLaunch
// Generates slide content, captions, and hashtags for each carousel type

import { generateWithAI } from '@/lib/ai/client'

interface PlaceData {
  name: string
  rating?: number
  types?: string[]
  [key: string]: unknown
}

interface EventData {
  name: string
  date?: string
  venue?: string
  [key: string]: unknown
}

interface CuratedItemData {
  title: string
  [key: string]: unknown
}

interface NeighborhoodResearchData {
  overview?: string
  dining?: PlaceData[]
  shopping?: PlaceData[]
  fitness?: PlaceData[]
  entertainment?: PlaceData[]
  services?: PlaceData[]
  education?: PlaceData[]
  events?: EventData[]
  curatedItems?: CuratedItemData[]
  demographics?: Record<string, unknown>
  walkScore?: number
  researchedAt?: string
  [key: string]: unknown
}

interface CarouselSlide {
  position: number
  headline: string
  body: string
  background_image_id?: string | null
  background_image_url?: string | null
  text_position: 'top_left' | 'top_center' | 'top_right' | 'center_left' | 'center' | 'center_right' | 'bottom_left' | 'bottom_center' | 'bottom_right'
  overlay_style: 'gradient_bottom' | 'gradient_top' | 'solid' | 'none'
}

interface GeneratedQuestion {
  id: string
  question: string
  category?: string
  answer?: string
}

interface ListingContext {
  address: string
  city: string
  state: string
  beds: number
  baths: number
  sqft: number
  price?: number
}

interface AgentContext {
  name: string
  brandColor?: string
}

interface CarouselContent {
  carouselType: string
  slides: CarouselSlide[]
  caption: string
  hashtags: string[]
  tokensUsed: number
}

interface GenerationResult {
  carousels: CarouselContent[]
  totalTokensUsed: number
}

// Main function to generate all carousel content
export async function generateAllCarouselContent(
  listing: ListingContext,
  agent: AgentContext,
  neighborhoodData: NeighborhoodResearchData,
  questions: GeneratedQuestion[],
  answers: Record<string, string>,
  carouselTypes: string[]
): Promise<GenerationResult> {
  const carousels: CarouselContent[] = []
  let totalTokensUsed = 0

  // Generate content for each carousel type in parallel
  const contentPromises = carouselTypes.map(async (type) => {
    try {
      const content = await generateCarouselContent(
        type,
        listing,
        agent,
        neighborhoodData,
        questions,
        answers
      )
      return content
    } catch (error) {
      console.error(`Error generating ${type} carousel:`, error)
      // Return fallback content on error
      return generateFallbackContent(type, listing, agent)
    }
  })

  const results = await Promise.all(contentPromises)

  for (const result of results) {
    carousels.push(result)
    totalTokensUsed += result.tokensUsed
  }

  return { carousels, totalTokensUsed }
}

// Generate content for a single carousel type
async function generateCarouselContent(
  carouselType: string,
  listing: ListingContext,
  agent: AgentContext,
  neighborhoodData: NeighborhoodResearchData,
  questions: GeneratedQuestion[],
  answers: Record<string, string>
): Promise<CarouselContent> {
  const prompt = buildCarouselPrompt(
    carouselType,
    listing,
    agent,
    neighborhoodData,
    questions,
    answers
  )

  const response = await generateWithAI({
    prompt,
    maxTokens: 2500,
    temperature: 0.8,
  })

  const content = parseCarouselResponse(response.content, carouselType)

  return {
    ...content,
    carouselType,
    tokensUsed: response.tokensUsed,
  }
}

function buildCarouselPrompt(
  carouselType: string,
  listing: ListingContext,
  agent: AgentContext,
  neighborhoodData: NeighborhoodResearchData,
  questions: GeneratedQuestion[],
  answers: Record<string, string>
): string {
  // Format agent answers with their questions
  const answersContext = questions
    .filter(q => answers[q.id]?.trim())
    .map(q => `Q: ${q.question}\nA: ${answers[q.id]}`)
    .join('\n\n')

  // Get relevant neighborhood data based on carousel type
  const neighborhoodContext = buildNeighborhoodContext(carouselType, neighborhoodData)

  const carouselTypeInstructions = getCarouselTypeInstructions(carouselType)

  return `You are an expert real estate social media content creator. Create engaging Instagram carousel content for a property listing.

PROPERTY DETAILS:
- Address: ${listing.address}, ${listing.city}, ${listing.state}
- ${listing.beds} beds, ${listing.baths} baths, ${listing.sqft.toLocaleString()} sqft
${listing.price ? `- Price: $${listing.price.toLocaleString()}` : ''}

AGENT: ${agent.name}

AGENT'S PERSONAL INSIGHTS:
${answersContext || 'No personal insights provided'}

NEIGHBORHOOD DATA:
${neighborhoodContext}

CAROUSEL TYPE: ${carouselType}
${carouselTypeInstructions}

REQUIREMENTS:
1. Create exactly 7 slides for the carousel
2. Each slide needs a punchy HEADLINE (max 8 words) and BODY text (max 40 words)
3. Slide 1 should be a hook that grabs attention
4. Slide 7 should be a call-to-action with agent info
5. Use the agent's personal insights to add authenticity
6. Reference SPECIFIC places/businesses from neighborhood data
7. Write in an engaging, conversational tone
8. Avoid generic real estate clichés

PHOTO SUGGESTIONS:
For each slide, suggest what type of photo would work best:
- exterior_front, exterior_back, exterior_drone
- kitchen, living_room, primary_bedroom, bathroom
- backyard, pool, patio, garage
- neighborhood, street_view

RESPONSE FORMAT (JSON):
{
  "slides": [
    {
      "position": 1,
      "headline": "Short punchy headline",
      "body": "Engaging body text that tells a story",
      "suggested_photo": "exterior_front",
      "text_position": "bottom_left"
    }
  ],
  "caption": "Full Instagram caption with emoji and call-to-action (150-200 words)",
  "hashtags": ["relevanthashtag1", "relevanthashtag2"]
}

Generate the carousel content now:`
}

function getCarouselTypeInstructions(type: string): string {
  const instructions: Record<string, string> = {
    property_highlights: `
FOCUS: Showcase the property's best features
TONE: Excited, highlighting unique selling points
SLIDES SHOULD COVER:
- Slide 1: Eye-catching hook about the property
- Slides 2-5: Key features (kitchen, primary suite, outdoor space, etc.)
- Slide 6: A unique or standout feature
- Slide 7: CTA - "DM me for a tour" or similar`,

    neighborhood_guide: `
FOCUS: Sell the lifestyle and location
TONE: Local expert, insider knowledge
SLIDES SHOULD COVER:
- Slide 1: Hook about living in this neighborhood
- Slides 2-3: Best restaurants and coffee spots (use specific names!)
- Slide 4: Parks, trails, or outdoor activities
- Slide 5: Shopping, entertainment, or nightlife
- Slide 6: Commute/accessibility highlights
- Slide 7: CTA - "Want to live here? Let's talk"`,

    local_favorites: `
FOCUS: Agent's personal recommendations
TONE: Personal, authentic, like a friend's advice
SLIDES SHOULD COVER:
- Slide 1: "My local favorites near [address]"
- Slides 2-6: Specific recommendations with personal touch
  (e.g., "My go-to brunch spot", "Where I grab coffee before showings")
- Slide 7: CTA inviting engagement
Use agent's answers to add authentic personal details!`,

    schools_families: `
FOCUS: Family-friendly features and schools
TONE: Warm, practical, reassuring
SLIDES SHOULD COVER:
- Slide 1: Hook for families looking in the area
- Slide 2: Nearby schools (if available)
- Slide 3: Parks and playgrounds
- Slide 4: Kid-friendly activities
- Slide 5: Safe neighborhood features
- Slide 6: Family-friendly dining/entertainment
- Slide 7: CTA for families`,

    lifestyle: `
FOCUS: Paint a picture of daily life
TONE: Aspirational, storytelling
SLIDES SHOULD COVER:
- Slide 1: Hook painting the lifestyle vision
- Slides 2-6: Day-in-the-life moments:
  - Morning routine (coffee spot, walking the dog)
  - Work from home potential
  - Evening activities
  - Weekend adventures
  - Entertaining friends
- Slide 7: "This could be your life" CTA`,
  }

  return instructions[type] || instructions.property_highlights
}

function buildNeighborhoodContext(
  carouselType: string,
  data: NeighborhoodResearchData
): string {
  const parts: string[] = []

  if (data.dining?.length) {
    const topDining = data.dining.slice(0, 5)
    parts.push(`TOP RESTAURANTS: ${topDining.map(p => `${p.name} (${p.rating || 'N/A'}★)`).join(', ')}`)
  }

  if (data.fitness?.length) {
    const fitness = data.fitness.slice(0, 4)
    parts.push(`FITNESS/PARKS: ${fitness.map(p => p.name).join(', ')}`)
  }

  if (data.shopping?.length) {
    const shopping = data.shopping.slice(0, 3)
    parts.push(`SHOPPING: ${shopping.map(p => p.name).join(', ')}`)
  }

  if (data.entertainment?.length) {
    const entertainment = data.entertainment.slice(0, 3)
    parts.push(`ENTERTAINMENT: ${entertainment.map(p => p.name).join(', ')}`)
  }

  if (carouselType === 'schools_families' && data.education?.length) {
    const schools = data.education.slice(0, 4)
    parts.push(`SCHOOLS: ${schools.map(p => p.name).join(', ')}`)
  }

  if (data.events?.length) {
    const events = data.events.slice(0, 3)
    parts.push(`UPCOMING EVENTS: ${events.map(e => `${e.name} (${e.date})`).join(', ')}`)
  }

  if (data.curatedItems?.length) {
    parts.push(`WHAT'S NEW: ${data.curatedItems.map(c => c.title).join(', ')}`)
  }

  return parts.join('\n') || 'No specific neighborhood data available'
}

function parseCarouselResponse(
  content: string,
  carouselType: string
): { slides: CarouselSlide[]; caption: string; hashtags: string[] } {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in response')
      return generateFallbackSlides(carouselType)
    }

    const parsed = JSON.parse(jsonMatch[0])

    const slides: CarouselSlide[] = (parsed.slides || []).map((s: {
      position?: number
      headline?: string
      body?: string
      suggested_photo?: string
      text_position?: string
    }, i: number) => ({
      position: s.position || i + 1,
      headline: s.headline || '',
      body: s.body || '',
      background_image_id: null,
      background_image_url: null,
      text_position: (s.text_position as CarouselSlide['text_position']) || 'bottom_left',
      overlay_style: 'gradient_bottom' as const,
    }))

    return {
      slides,
      caption: parsed.caption || '',
      hashtags: parsed.hashtags || [],
    }
  } catch (error) {
    console.error('Error parsing carousel response:', error)
    return generateFallbackSlides(carouselType)
  }
}

function generateFallbackSlides(carouselType: string): {
  slides: CarouselSlide[]
  caption: string
  hashtags: string[]
} {
  return {
    slides: [
      { position: 1, headline: 'Welcome Home', body: 'Your dream property awaits', text_position: 'bottom_left', overlay_style: 'gradient_bottom' },
      { position: 2, headline: 'Stunning Kitchen', body: 'Perfect for entertaining', text_position: 'bottom_left', overlay_style: 'gradient_bottom' },
      { position: 3, headline: 'Spacious Living', body: 'Room to grow and thrive', text_position: 'bottom_left', overlay_style: 'gradient_bottom' },
      { position: 4, headline: 'Primary Suite', body: 'Your peaceful retreat', text_position: 'bottom_left', overlay_style: 'gradient_bottom' },
      { position: 5, headline: 'Outdoor Oasis', body: 'Enjoy Florida living', text_position: 'bottom_left', overlay_style: 'gradient_bottom' },
      { position: 6, headline: 'Great Location', body: 'Close to everything', text_position: 'bottom_left', overlay_style: 'gradient_bottom' },
      { position: 7, headline: "Let's Connect", body: 'DM me for more details!', text_position: 'bottom_left', overlay_style: 'gradient_bottom' },
    ],
    caption: 'New listing alert! Check out this amazing property. DM me for details or to schedule a showing!',
    hashtags: ['justlisted', 'realestate', 'dreamhome', 'floridarealestate'],
  }
}

function generateFallbackContent(
  carouselType: string,
  listing: ListingContext,
  agent: AgentContext
): CarouselContent {
  const fallback = generateFallbackSlides(carouselType)

  return {
    carouselType,
    slides: fallback.slides,
    caption: `Just listed: ${listing.address}! ${listing.beds} beds, ${listing.baths} baths, ${listing.sqft.toLocaleString()} sqft. Contact ${agent.name} for more details!`,
    hashtags: fallback.hashtags,
    tokensUsed: 0,
  }
}

// Generate a single carousel (for regeneration)
export async function regenerateCarousel(
  carouselType: string,
  listing: ListingContext,
  agent: AgentContext,
  neighborhoodData: NeighborhoodResearchData,
  questions: GeneratedQuestion[],
  answers: Record<string, string>
): Promise<CarouselContent> {
  return generateCarouselContent(
    carouselType,
    listing,
    agent,
    neighborhoodData,
    questions,
    answers
  )
}
