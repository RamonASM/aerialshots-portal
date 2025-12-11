// AI client for generating real estate content
// Supports both OpenAI and Anthropic

interface AIGenerateOptions {
  prompt: string
  maxTokens?: number
  temperature?: number
}

interface AIResponse {
  content: string
  tokensUsed: number
}

export async function generateWithAI(options: AIGenerateOptions): Promise<AIResponse> {
  const { prompt, maxTokens = 1000, temperature = 0.7 } = options

  // Try Anthropic first, fallback to OpenAI
  if (process.env.ANTHROPIC_API_KEY) {
    return generateWithAnthropic(prompt, maxTokens, temperature)
  } else if (process.env.OPENAI_API_KEY) {
    return generateWithOpenAI(prompt, maxTokens, temperature)
  } else {
    throw new Error('No AI API key configured')
  }
}

async function generateWithAnthropic(
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<AIResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Anthropic API error:', error)
    throw new Error('Failed to generate content')
  }

  const data = await response.json()
  return {
    content: data.content[0].text,
    tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens || 0,
  }
}

async function generateWithOpenAI(
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<AIResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('OpenAI API error:', error)
    throw new Error('Failed to generate content')
  }

  const data = await response.json()
  return {
    content: data.choices[0].message.content,
    tokensUsed: data.usage?.total_tokens || 0,
  }
}

// Prompt templates for different AI tools
export const aiPrompts = {
  listingDescription: (property: {
    address: string
    city: string
    state: string
    beds: number
    baths: number
    sqft: number
    features?: string[]
    neighborhood?: string
  }) => `You are a real estate copywriter specializing in MLS listings. Generate 3 different MLS-ready listing descriptions for this property.

Property Details:
- Address: ${property.address}, ${property.city}, ${property.state}
- Bedrooms: ${property.beds}
- Bathrooms: ${property.baths}
- Square Feet: ${property.sqft.toLocaleString()}
${property.features ? `- Key Features: ${property.features.join(', ')}` : ''}
${property.neighborhood ? `- Neighborhood: ${property.neighborhood}` : ''}

Requirements:
1. Each description should be 150-200 words
2. Use compelling, descriptive language
3. Highlight key selling points
4. Include a call to action
5. Avoid clichés and generic phrases
6. Format: Return as JSON array with 3 descriptions: ["desc1", "desc2", "desc3"]

Generate 3 unique descriptions with different tones: Professional, Warm/Inviting, and Luxury/Aspirational.`,

  socialCaptions: (property: {
    address: string
    city: string
    beds: number
    baths: number
    sqft: number
    price?: number
    features?: string[]
  }) => `You are a social media expert for real estate agents. Generate 5 engaging social media captions for this listing.

Property:
- Address: ${property.address}, ${property.city}
- ${property.beds} bed, ${property.baths} bath, ${property.sqft.toLocaleString()} sqft
${property.price ? `- Price: $${property.price.toLocaleString()}` : ''}
${property.features ? `- Features: ${property.features.join(', ')}` : ''}

Generate captions for:
1. Instagram Post (engaging, with relevant hashtags)
2. Instagram Story (short, punchy with emoji)
3. Facebook Post (conversational, longer)
4. LinkedIn Post (professional tone)
5. Twitter/X Post (280 chars max with hashtags)

Format as JSON: {"instagram": "...", "story": "...", "facebook": "...", "linkedin": "...", "twitter": "..."}`,

  neighborhoodGuide: (location: {
    city: string
    state: string
    neighborhood?: string
    nearbyPlaces?: string[]
  }) => `You are a local area expert. Create a neighborhood guide for real estate marketing.

Location: ${location.neighborhood || location.city}, ${location.state}
${location.nearbyPlaces ? `Nearby: ${location.nearbyPlaces.join(', ')}` : ''}

Create a neighborhood guide including:
1. Overview (2-3 sentences about the area vibe)
2. Best For (who would love living here)
3. Local Favorites (restaurants, coffee shops, parks)
4. Schools (general info about school quality)
5. Commute Info (access to major roads/highways)
6. Hidden Gems (insider tips)

Format as JSON with sections: {"overview": "...", "bestFor": "...", "localFavorites": "...", "schools": "...", "commute": "...", "hiddenGems": "..."}`,

  buyerPersonas: (property: {
    address: string
    beds: number
    baths: number
    sqft: number
    price?: number
    style?: string
    neighborhood?: string
  }) => `You are a real estate marketing strategist. Create 3 ideal buyer personas for this property.

Property:
- ${property.beds} bed, ${property.baths} bath, ${property.sqft.toLocaleString()} sqft
${property.price ? `- Price: $${property.price.toLocaleString()}` : ''}
${property.style ? `- Style: ${property.style}` : ''}
${property.neighborhood ? `- Area: ${property.neighborhood}` : ''}

For each persona include:
1. Name and brief background
2. Demographics (age range, income, occupation)
3. Motivations (why they'd buy this property)
4. Pain points (what they're escaping or avoiding)
5. Marketing message (how to appeal to them)

Format as JSON array: [{"name": "...", "demographics": "...", "motivations": "...", "painPoints": "...", "marketingMessage": "..."}]`,

  videoScript: (property: {
    address: string
    city: string
    beds: number
    baths: number
    sqft: number
    features?: string[]
    duration?: number
  }) => `You are a video producer for real estate. Create a walkthrough video script.

Property:
- ${property.address}, ${property.city}
- ${property.beds} bed, ${property.baths} bath, ${property.sqft.toLocaleString()} sqft
${property.features ? `- Features: ${property.features.join(', ')}` : ''}
Target Duration: ${property.duration || 60} seconds

Create a video script with:
1. Opening hook (5-10 seconds)
2. Room-by-room highlights
3. Key features to emphasize
4. Closing call-to-action

Format as JSON with timestamps: {"scenes": [{"timestamp": "0:00-0:10", "location": "Exterior", "narration": "...", "shotNotes": "..."}]}`,

  openHouseEmail: (property: {
    address: string
    city: string
    beds: number
    baths: number
    date: string
    time: string
    agentName: string
  }) => `You are an email marketing expert. Create an open house invitation email.

Property: ${property.address}, ${property.city}
Details: ${property.beds} bed, ${property.baths} bath
Open House: ${property.date} at ${property.time}
Agent: ${property.agentName}

Create an email with:
1. Compelling subject line
2. Preview text
3. Email body (inviting, informative)
4. Clear CTA

Format as JSON: {"subject": "...", "preview": "...", "body": "...", "cta": "..."}`,

  justListedAnnouncement: (property: {
    address: string
    city: string
    beds: number
    baths: number
    sqft: number
    price: number
    agentName: string
  }) => `Create a "Just Listed" announcement for multiple marketing channels.

Property:
- ${property.address}, ${property.city}
- ${property.beds} bed, ${property.baths} bath, ${property.sqft.toLocaleString()} sqft
- Listed at $${property.price.toLocaleString()}
- Agent: ${property.agentName}

Generate announcements for:
1. Email blast to sphere
2. Postcard copy (front and back)
3. Social media post

Format as JSON: {"email": {"subject": "...", "body": "..."}, "postcard": {"front": "...", "back": "..."}, "social": "..."}`,
}
