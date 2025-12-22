import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, aiPrompts } from '@/lib/ai/client'
import { requireAgent } from '@/lib/middleware/auth'
import {
  handleApiError,
  badRequest,
  insufficientCredits,
  serverError,
} from '@/lib/utils/errors'
import { z } from 'zod'

const CREDIT_COST = 25

/**
 * Listing description request schema
 */
const listingDescriptionSchema = z.object({
  listing_id: z.string().uuid().optional(),
  address: z.string().min(1, 'Address is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  beds: z.number().min(0, 'Beds is required'),
  baths: z.number().min(0, 'Baths is required'),
  sqft: z.number().min(1, 'Square footage is required'),
  features: z.array(z.string()).optional(),
  neighborhood: z.string().optional(),
})

/**
 * Generate AI listing description
 * POST /api/ai/listing-description
 *
 * Requires agent authentication
 * Costs 25 credits per generation
 */
export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const supabase = await createClient()

    // Require agent authentication
    const { agent } = await requireAgent(supabase)

    // Check credits
    const balance = agent.credit_balance || 0
    if (balance < CREDIT_COST) {
      throw insufficientCredits(CREDIT_COST, balance, 'Listing Description Generator')
    }

    const body = await request.json()

    // Validate request body
    const result = listingDescriptionSchema.safeParse(body)
    if (!result.success) {
      const firstError = result.error.issues[0]
      throw badRequest(firstError.message)
    }

    const { listing_id, address, city, state, beds, baths, sqft, features, neighborhood } =
      result.data

    // Generate content
    const prompt = aiPrompts.listingDescription({
      address,
      city: city || 'Central Florida',
      state: state || 'FL',
      beds,
      baths,
      sqft,
      features,
      neighborhood,
    })

    const aiResult = await generateWithAI({ prompt, maxTokens: 2000 })

    // Parse the JSON response
    let descriptions: string[]
    try {
      descriptions = JSON.parse(aiResult.content)
    } catch {
      // If not valid JSON, try to extract from text
      const match = aiResult.content.match(/\[[\s\S]*\]/)
      if (match) {
        try {
          descriptions = JSON.parse(match[0])
        } catch {
          descriptions = [aiResult.content]
        }
      } else {
        descriptions = [aiResult.content]
      }
    }

    if (!descriptions || descriptions.length === 0) {
      throw serverError('Failed to generate descriptions')
    }

    // Deduct credits
    const newBalance = balance - CREDIT_COST
    await supabase
      .from('agents')
      .update({ credit_balance: newBalance })
      .eq('id', agent.id)

    // Log credit transaction
    await supabase.from('credit_transactions').insert({
      agent_id: agent.id,
      amount: -CREDIT_COST,
      type: 'redemption',
      description: 'Listing Description Generator',
    })

    // Log AI tool usage
    await supabase.from('ai_tool_usage').insert({
      agent_id: agent.id,
      listing_id: listing_id || null,
      tool_type: 'listing_description',
      input: { address, beds, baths, sqft },
      output: { descriptions },
      tokens_used: aiResult.tokensUsed,
    })

    return NextResponse.json({
      descriptions,
      creditsUsed: CREDIT_COST,
      newBalance,
    })
  })
}
