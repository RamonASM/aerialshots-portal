// Storywork story types and prompts

export const storyTypes = {
  against_the_odds: {
    name: 'Against the Odds',
    description: 'Difficult transactions, bidding wars, challenges overcome',
    arc: 'Challenge → Obstacles → Strategy → Victory',
    questions: [
      'What was the initial challenge or obstacle your client faced?',
      'What made this situation particularly difficult or competitive?',
      'What strategy or approach did you take to overcome it?',
      'What was the outcome? How did it feel to win?',
      'What lesson or takeaway would you share with other buyers/sellers?',
    ],
  },
  fresh_drop: {
    name: 'Fresh Drop',
    description: 'New listings, coming soon properties, market reveals',
    arc: 'Reveal → Features → Neighborhood → CTA',
    questions: [
      'What makes this property special or unique?',
      'What are the top 3 features buyers will love?',
      'Describe the neighborhood and lifestyle it offers.',
      'Who is the ideal buyer for this home?',
      'What would you say to someone considering this property?',
    ],
  },
  behind_the_deal: {
    name: 'Behind the Deal',
    description: 'Just closed, testimonials, success stories',
    arc: 'Surface → Hidden Challenge → Resolution → Lesson',
    questions: [
      'Tell us about the client and their initial goals.',
      'What hidden challenge or surprise came up during the transaction?',
      'How did you navigate and resolve the challenge?',
      'What was the final outcome for your client?',
      'What insight would you share from this experience?',
    ],
  },
}

export const detectStoryTypePrompt = (input: string) => `You are a real estate storytelling expert. Analyze this real estate story and determine which narrative archetype fits best.

Story Input:
"""
${input}
"""

Story Types:
1. AGAINST_THE_ODDS - Stories about overcoming challenges, bidding wars, difficult negotiations, or unlikely wins
2. FRESH_DROP - Stories about new listings, property reveals, or showcasing homes/neighborhoods
3. BEHIND_THE_DEAL - Stories about completed transactions, client success stories, or lessons learned

Analyze the story and respond with ONLY a JSON object:
{
  "detected_type": "against_the_odds" | "fresh_drop" | "behind_the_deal",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this type fits"
}`

export const generateStoryContentPrompt = (
  storyType: string,
  answers: Record<string, string>,
  agentName: string
) => {
  const type = storyTypes[storyType as keyof typeof storyTypes]
  if (!type) {
    return ''
  }

  const answersFormatted = type.questions
    .map((q, i) => `Q: ${q}\nA: ${answers[`q${i}`] || 'Not provided'}`)
    .join('\n\n')

  return `You are an expert real estate social media content creator. Create carousel content for this "${type.name}" story.

Agent Name: ${agentName}
Story Type: ${type.name}
Narrative Arc: ${type.arc}

Story Details:
${answersFormatted}

Create carousel slide content following this structure:
- Slide 1: Hook (attention-grabbing opening, pose a question or bold statement)
- Slide 2: Setup (introduce the situation/property)
- Slide 3-5: Story beats (key moments following the ${type.arc} arc)
- Slide 6: Resolution/Outcome
- Slide 7: CTA (call-to-action, soft sell)

For each slide provide:
1. Headline (max 8 words, punchy)
2. Body text (max 40 words, conversational)
3. Visual suggestion (what image/graphic would work)

Respond with ONLY a JSON object:
{
  "slides": [
    {
      "headline": "...",
      "body": "...",
      "visual_suggestion": "..."
    }
  ],
  "hashtags": ["#relevant", "#hashtags"],
  "caption": "Instagram caption for the carousel post (max 150 words)"
}`
}

export const transcribeToStoryPrompt = (transcription: string) => `You are a real estate story extractor. Take this raw transcription from a real estate agent and extract the key story elements.

Transcription:
"""
${transcription}
"""

Extract and organize the story into clear narrative elements. Clean up any filler words, repetition, or rambling.

Respond with a JSON object:
{
  "summary": "2-3 sentence summary of the story",
  "story_type_suggestion": "against_the_odds" | "fresh_drop" | "behind_the_deal",
  "key_elements": {
    "challenge": "The main challenge or hook",
    "context": "Background and setup",
    "action": "What was done to address it",
    "outcome": "The result",
    "lesson": "Key takeaway"
  },
  "characters": ["Client name/type", "Other parties involved"],
  "emotional_beats": ["Key emotional moments in the story"]
}`
