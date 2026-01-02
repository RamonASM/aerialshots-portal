// SEO Blog Post Generator for ListingLaunch
// Generates SEO-optimized blog content from listing and neighborhood data

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
  description?: string
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
  transitScore?: number
  bikeScore?: number
  researchedAt?: string
  [key: string]: unknown
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
  zip?: string
  beds: number
  baths: number
  sqft: number
  price?: number
  features?: string[]
}

interface AgentContext {
  name: string
  phone?: string
  email?: string
}

interface BlogContent {
  title: string
  metaDescription: string
  slug: string
  sections: {
    title: string
    content: string
    keywords?: string[]
  }[]
  seoKeywords: string[]
  estimatedReadTime: number
  tokensUsed: number
}

// Generate SEO blog post content
export async function generateBlogPost(
  listing: ListingContext,
  agent: AgentContext,
  neighborhoodData: NeighborhoodResearchData,
  questions: GeneratedQuestion[],
  answers: Record<string, string>
): Promise<BlogContent> {
  const prompt = buildBlogPrompt(listing, agent, neighborhoodData, questions, answers)

  const response = await generateWithAI({
    prompt,
    maxTokens: 4000,
    temperature: 0.7,
  })

  const content = parseBlogResponse(response.content, listing, agent)

  return {
    ...content,
    tokensUsed: response.tokensUsed,
  }
}

function buildBlogPrompt(
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

  // Build neighborhood context
  const neighborhoodContext = buildNeighborhoodContext(neighborhoodData)

  return `You are an expert real estate content writer specializing in SEO-optimized blog posts.

Create a comprehensive, SEO-friendly blog post for a property listing that will help it rank on Google and attract potential buyers.

PROPERTY DETAILS:
- Address: ${listing.address}, ${listing.city}, ${listing.state}${listing.zip ? ` ${listing.zip}` : ''}
- ${listing.beds} bedrooms, ${listing.baths} bathrooms
- ${listing.sqft.toLocaleString()} square feet
${listing.price ? `- Listed at $${listing.price.toLocaleString()}` : ''}
${listing.features ? `- Key Features: ${listing.features.join(', ')}` : ''}

LISTING AGENT: ${agent.name}
${agent.phone ? `- Phone: ${agent.phone}` : ''}
${agent.email ? `- Email: ${agent.email}` : ''}

NEIGHBORHOOD RESEARCH:
${neighborhoodContext}

AGENT'S LOCAL INSIGHTS:
${answersContext || 'No additional insights provided'}

REQUIREMENTS:
1. Create an engaging, informative blog post (1000-1500 words)
2. Include the following sections:
   - Compelling introduction with property highlights
   - Property features and benefits (2-3 paragraphs)
   - Neighborhood & lifestyle section (3-4 paragraphs with specific places)
   - For Families section (if applicable)
   - Getting Around section (walkability, transit)
   - Call to action with agent contact info

3. SEO Requirements:
   - Include target keywords naturally throughout
   - Write for humans first, search engines second
   - Use H2 and H3 headings for structure
   - Include internal linking suggestions
   - Keep paragraphs 3-4 sentences max

4. Incorporate agent's personal insights for authenticity
5. Mention specific businesses/places from neighborhood research

RESPONSE FORMAT (JSON):
{
  "title": "SEO-optimized title (50-60 characters ideal)",
  "metaDescription": "Compelling meta description (150-160 characters)",
  "slug": "url-friendly-slug",
  "sections": [
    {
      "title": "Section Heading",
      "content": "Full paragraph content with markdown formatting...",
      "keywords": ["keyword1", "keyword2"]
    }
  ],
  "seoKeywords": ["primary keyword", "secondary keywords..."],
  "estimatedReadTime": 5
}

Generate the blog post now:`
}

function buildNeighborhoodContext(data: NeighborhoodResearchData): string {
  const parts: string[] = []

  if (data.dining?.length) {
    const topDining = data.dining.slice(0, 5)
    parts.push(`RESTAURANTS: ${topDining.map(p => `${p.name} (${p.rating || 'N/A'}★)`).join(', ')}`)
  }

  if (data.fitness?.length) {
    const parks = data.fitness.filter(p => p.types?.includes('park'))
    const gyms = data.fitness.filter(p => p.types?.includes('gym'))
    if (parks.length) parts.push(`PARKS: ${parks.map(p => p.name).join(', ')}`)
    if (gyms.length) parts.push(`FITNESS: ${gyms.map(p => p.name).join(', ')}`)
  }

  if (data.shopping?.length) {
    parts.push(`SHOPPING: ${data.shopping.slice(0, 3).map(p => p.name).join(', ')}`)
  }

  if (data.education?.length) {
    parts.push(`SCHOOLS: ${data.education.slice(0, 3).map(p => p.name).join(', ')}`)
  }

  if (data.walkScore) parts.push(`Walk Score: ${data.walkScore}`)
  if (data.transitScore) parts.push(`Transit Score: ${data.transitScore}`)
  if (data.bikeScore) parts.push(`Bike Score: ${data.bikeScore}`)

  if (data.events?.length) {
    parts.push(`UPCOMING EVENTS: ${data.events.slice(0, 3).map(e => e.name).join(', ')}`)
  }

  if (data.curatedItems?.length) {
    parts.push(`WHAT'S NEW: ${data.curatedItems.map(c => c.title).join(', ')}`)
  }

  return parts.join('\n') || 'No specific neighborhood data available'
}

function parseBlogResponse(
  content: string,
  listing: ListingContext,
  agent: AgentContext
): Omit<BlogContent, 'tokensUsed'> {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return generateFallbackBlog(listing, agent)
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      title: parsed.title || `${listing.beds} Bed Home in ${listing.city}`,
      metaDescription: parsed.metaDescription || `Discover this beautiful ${listing.beds} bedroom home in ${listing.city}. Contact ${agent.name} for details.`,
      slug: parsed.slug || generateSlug(listing),
      sections: parsed.sections || [],
      seoKeywords: parsed.seoKeywords || generateDefaultKeywords(listing),
      estimatedReadTime: parsed.estimatedReadTime || 5,
    }
  } catch (error) {
    console.error('Error parsing blog response:', error)
    return generateFallbackBlog(listing, agent)
  }
}

function generateSlug(listing: ListingContext): string {
  const parts = [
    listing.address.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    listing.city.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    listing.state.toLowerCase(),
  ]
  return parts.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function generateDefaultKeywords(listing: ListingContext): string[] {
  return [
    `${listing.city} homes for sale`,
    `${listing.beds} bedroom ${listing.city}`,
    `${listing.city} ${listing.state} real estate`,
    `homes in ${listing.city}`,
    `${listing.city} neighborhoods`,
  ]
}

function generateFallbackBlog(
  listing: ListingContext,
  agent: AgentContext
): Omit<BlogContent, 'tokensUsed'> {
  return {
    title: `Beautiful ${listing.beds} Bedroom Home in ${listing.city}, ${listing.state}`,
    metaDescription: `Discover this stunning ${listing.beds} bed, ${listing.baths} bath home with ${listing.sqft.toLocaleString()} sqft in ${listing.city}. Contact ${agent.name} for a showing.`,
    slug: generateSlug(listing),
    sections: [
      {
        title: 'Welcome Home',
        content: `Located in the heart of ${listing.city}, this ${listing.beds} bedroom, ${listing.baths} bathroom home offers ${listing.sqft.toLocaleString()} square feet of living space. Contact ${agent.name} to schedule your private showing.`,
        keywords: [`${listing.city} homes`, `${listing.beds} bedroom`],
      },
    ],
    seoKeywords: generateDefaultKeywords(listing),
    estimatedReadTime: 3,
  }
}

// Export blog as markdown
export function exportBlogAsMarkdown(blog: BlogContent): string {
  let markdown = `# ${blog.title}\n\n`

  for (const section of blog.sections) {
    markdown += `## ${section.title}\n\n`
    markdown += `${section.content}\n\n`
  }

  markdown += `---\n\n`
  markdown += `**Keywords:** ${blog.seoKeywords.join(', ')}\n`
  markdown += `**Meta Description:** ${blog.metaDescription}\n`

  return markdown
}

// Export blog as HTML
export function exportBlogAsHTML(blog: BlogContent): string {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="description" content="${blog.metaDescription}">
  <meta name="keywords" content="${blog.seoKeywords.join(', ')}">
  <title>${blog.title}</title>
</head>
<body>
  <article>
    <h1>${blog.title}</h1>
`

  for (const section of blog.sections) {
    html += `    <section>
      <h2>${section.title}</h2>
      <p>${section.content.replace(/\n/g, '</p>\n      <p>')}</p>
    </section>
`
  }

  html += `  </article>
</body>
</html>`

  return html
}
