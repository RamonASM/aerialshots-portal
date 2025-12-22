// AI-powered personalized question generation for ListingLaunch
// Generates questions based on neighborhood research data

import { generateWithAI } from '@/lib/ai/client'
import type { NeighborhoodResearchData, GeneratedQuestion } from '@/lib/supabase/types'

interface ListingContext {
  address: string
  city: string
  state: string
  beds: number
  baths: number
  sqft: number
  price?: number
}

interface QuestionGenerationResult {
  questions: GeneratedQuestion[]
  tokensUsed: number
}

// Generate personalized questions based on neighborhood research
export async function generatePersonalizedQuestions(
  listing: ListingContext,
  neighborhoodData: NeighborhoodResearchData,
  carouselTypes: string[]
): Promise<QuestionGenerationResult> {
  const prompt = buildQuestionPrompt(listing, neighborhoodData, carouselTypes)

  const response = await generateWithAI({
    prompt,
    maxTokens: 2000,
    temperature: 0.7,
  })

  // Parse the JSON response
  const questions = parseQuestionsResponse(response.content)

  return {
    questions,
    tokensUsed: response.tokensUsed,
  }
}

function buildQuestionPrompt(
  listing: ListingContext,
  neighborhoodData: NeighborhoodResearchData,
  carouselTypes: string[]
): string {
  // Extract top places for context
  const topDining = neighborhoodData.dining?.slice(0, 3) || []
  const topCoffee = neighborhoodData.dining?.filter(p =>
    p.types?.includes('cafe') || p.name.toLowerCase().includes('coffee')
  ).slice(0, 2) || []
  const topFitness = neighborhoodData.fitness?.slice(0, 2) || []
  const topParks = neighborhoodData.fitness?.filter(p =>
    p.types?.includes('park')
  ).slice(0, 2) || []
  const topSchools = neighborhoodData.education?.slice(0, 2) || []
  const topEvents = neighborhoodData.events?.slice(0, 3) || []
  const curatedItems = neighborhoodData.curatedItems?.slice(0, 3) || []

  // Build context strings
  const diningContext = topDining.length > 0
    ? `Top-rated restaurants nearby: ${topDining.map(p => `${p.name} (${p.rating}★)`).join(', ')}`
    : ''

  const coffeeContext = topCoffee.length > 0
    ? `Coffee shops nearby: ${topCoffee.map(p => p.name).join(', ')}`
    : ''

  const fitnessContext = topFitness.length > 0
    ? `Fitness options: ${topFitness.map(p => p.name).join(', ')}`
    : ''

  const parksContext = topParks.length > 0
    ? `Parks nearby: ${topParks.map(p => p.name).join(', ')}`
    : ''

  const schoolsContext = topSchools.length > 0
    ? `Schools nearby: ${topSchools.map(p => p.name).join(', ')}`
    : ''

  const eventsContext = topEvents.length > 0
    ? `Upcoming events: ${topEvents.map(e => `${e.name} at ${e.venue}`).join(', ')}`
    : ''

  const curatedContext = curatedItems.length > 0
    ? `What's new in the area: ${curatedItems.map(c => c.title).join(', ')}`
    : ''

  const carouselContext = carouselTypes.map(type => {
    switch (type) {
      case 'property_highlights':
        return 'Property Highlights carousel (showcasing key features)'
      case 'neighborhood_guide':
        return 'Neighborhood Guide carousel (local area highlights)'
      case 'local_favorites':
        return 'Local Favorites carousel (agent\'s personal recommendations)'
      case 'schools_families':
        return 'Schools & Families carousel (family-focused content)'
      case 'lifestyle':
        return 'Lifestyle carousel (painting the lifestyle picture)'
      default:
        return type
    }
  }).join(', ')

  return `You are a real estate marketing expert helping an agent create personalized carousel content for Instagram/Facebook.

PROPERTY INFORMATION:
- Address: ${listing.address}, ${listing.city}, ${listing.state}
- ${listing.beds} beds, ${listing.baths} baths, ${listing.sqft.toLocaleString()} sqft
${listing.price ? `- Listed at $${listing.price.toLocaleString()}` : ''}

NEIGHBORHOOD RESEARCH FINDINGS:
${diningContext}
${coffeeContext}
${fitnessContext}
${parksContext}
${schoolsContext}
${eventsContext}
${curatedContext}

CAROUSEL TYPES TO CREATE: ${carouselContext}

YOUR TASK:
Generate 5-7 personalized questions for the listing agent. These questions will help gather the personal touch needed to make the carousel content authentic and engaging.

QUESTION REQUIREMENTS:
1. Each question should reference SPECIFIC places/businesses from the research when relevant
2. Questions should be conversational and easy to answer quickly
3. Aim for questions that reveal personal preferences and local expertise
4. Mix questions between: property-specific, neighborhood lifestyle, personal recommendations
5. Questions should help create content for the selected carousel types
6. Avoid generic questions - make them specific to THIS neighborhood

EXAMPLE GOOD QUESTIONS (based on research):
- "We found Grillsmith is highly rated nearby. What's your go-to order there?"
- "The neighborhood has great walkability. What do buyers typically love about being able to walk places here?"
- "There's a farmers market on Saturdays at Lake Eola. Have you been? Any vendor recommendations?"

RESPONSE FORMAT (JSON):
{
  "questions": [
    {
      "id": "q1",
      "question": "The specific question to ask the agent?",
      "context": "Brief context about why this question is relevant (based on research)",
      "category": "dining|lifestyle|property|neighborhood|schools|activities",
      "suggestedFollowUp": "Optional follow-up if they give an interesting answer"
    }
  ]
}

Generate 5-7 questions now:`
}

function parseQuestionsResponse(content: string): GeneratedQuestion[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in response:', content)
      return getDefaultQuestions()
    }

    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      console.error('Invalid questions format:', parsed)
      return getDefaultQuestions()
    }

    return parsed.questions.map((q: GeneratedQuestion, index: number) => ({
      id: q.id || `q${index + 1}`,
      question: q.question,
      context: q.context,
      category: q.category,
      suggestedFollowUp: q.suggestedFollowUp,
    }))
  } catch (error) {
    console.error('Error parsing questions response:', error, content)
    return getDefaultQuestions()
  }
}

// Fallback questions if AI fails
function getDefaultQuestions(): GeneratedQuestion[] {
  return [
    {
      id: 'q1',
      question: 'What\'s your favorite local restaurant or coffee shop near this listing?',
      context: 'Helps personalize neighborhood content',
      category: 'dining',
    },
    {
      id: 'q2',
      question: 'What do you think buyers will love most about this property?',
      context: 'Highlights key selling points',
      category: 'property',
    },
    {
      id: 'q3',
      question: 'How would you describe the vibe of this neighborhood in 2-3 words?',
      context: 'Sets the tone for lifestyle content',
      category: 'neighborhood',
    },
    {
      id: 'q4',
      question: 'What\'s a hidden gem nearby that locals know about?',
      context: 'Adds authenticity and local expertise',
      category: 'lifestyle',
    },
    {
      id: 'q5',
      question: 'Who do you see as the ideal buyer for this home?',
      context: 'Helps target content to the right audience',
      category: 'property',
    },
  ]
}

// Generate additional questions for specific carousel types
export async function generateCarouselTypeQuestions(
  carouselType: string,
  neighborhoodData: NeighborhoodResearchData
): Promise<GeneratedQuestion[]> {
  const typePrompts: Record<string, string> = {
    property_highlights: `Generate 2 questions about the property's best features and what makes it unique.`,
    neighborhood_guide: `Generate 2 questions about what makes this neighborhood special and the local lifestyle.`,
    local_favorites: `Generate 2 questions asking for personal recommendations for restaurants, cafes, and activities.`,
    schools_families: `Generate 2 questions about family life in the area, schools, parks, and kid-friendly activities.`,
    lifestyle: `Generate 2 questions that will help paint a picture of daily life in this home and neighborhood.`,
  }

  const prompt = typePrompts[carouselType] || typePrompts.neighborhood_guide

  const response = await generateWithAI({
    prompt: `${prompt}

Context - Nearby places found: ${JSON.stringify(neighborhoodData.dining?.slice(0, 3).map(p => p.name) || [])}

Format response as JSON: {"questions": [{"id": "...", "question": "...", "category": "${carouselType}"}]}`,
    maxTokens: 500,
    temperature: 0.7,
  })

  return parseQuestionsResponse(response.content)
}
