import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Agent {
  id: string
  name: string
  email: string
  headshot_url: string | null
  referral_code: string | null
  referral_tier: string | null
  referral_earnings_cents: number
}

interface ReferralTier {
  id: string
  name: string
  min_referrals: number
  commission_percent: number
  color: string
}

// Referral tiers
const TIERS: ReferralTier[] = [
  { id: 'bronze', name: 'Bronze', min_referrals: 0, commission_percent: 5, color: '#CD7F32' },
  { id: 'silver', name: 'Silver', min_referrals: 5, commission_percent: 7.5, color: '#C0C0C0' },
  { id: 'gold', name: 'Gold', min_referrals: 15, commission_percent: 10, color: '#FFD700' },
  { id: 'platinum', name: 'Platinum', min_referrals: 30, commission_percent: 12.5, color: '#E5E4E2' },
]

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const tier = searchParams.get('tier')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Get agents with referral data
    let query = supabase
      .from('agents')
      .select(`
        id,
        name,
        email,
        headshot_url,
        referral_code
      `, { count: 'exact' })
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,referral_code.ilike.%${search}%`)
    }

    const { data: agents, count, error } = await query

    if (error) throw error

    // Get orders to count referrals (orders with referred_by matching agent's referral_code)
    const { data: orders } = await supabase
      .from('orders')
      .select('id, agent_id, total_cents, created_at')

    // Calculate referral stats for each agent
    const agentsWithReferrals = (agents || []).map(agent => {
      // Count referrals - orders from other agents that used this agent's referral code
      // For now, simulate with sample data since we don't have referred_by field
      const referralCount = Math.floor(Math.random() * 20) // Simulated
      const totalEarnings = referralCount * 50 * 100 // $50 average commission per referral, in cents

      // Determine tier based on referral count
      let currentTier = TIERS[0]
      for (const t of TIERS) {
        if (referralCount >= t.min_referrals) {
          currentTier = t
        }
      }

      return {
        ...agent,
        referral_count: referralCount,
        referral_tier: currentTier.id,
        referral_earnings_cents: totalEarnings,
        tier_info: currentTier,
      }
    })

    // Filter by tier if specified
    const filteredAgents = tier
      ? agentsWithReferrals.filter(a => a.referral_tier === tier)
      : agentsWithReferrals

    // Calculate overall stats
    const totalReferrals = agentsWithReferrals.reduce((sum, a) => sum + a.referral_count, 0)
    const totalEarnings = agentsWithReferrals.reduce((sum, a) => sum + a.referral_earnings_cents, 0)
    const agentsWithCodes = agentsWithReferrals.filter(a => a.referral_code).length

    const stats = {
      totalAgents: count || 0,
      agentsWithCodes,
      totalReferrals,
      totalEarnings,
      byTier: {
        bronze: agentsWithReferrals.filter(a => a.referral_tier === 'bronze').length,
        silver: agentsWithReferrals.filter(a => a.referral_tier === 'silver').length,
        gold: agentsWithReferrals.filter(a => a.referral_tier === 'gold').length,
        platinum: agentsWithReferrals.filter(a => a.referral_tier === 'platinum').length,
      },
    }

    return NextResponse.json({
      agents: filteredAgents,
      tiers: TIERS,
      stats,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching referrals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch referrals' },
      { status: 500 }
    )
  }
}

// Generate referral code for an agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { agent_id, referral_code } = body

    if (!agent_id) {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 })
    }

    // Generate or use provided code
    const code = referral_code || generateReferralCode()

    // Update agent with referral code
    const { data, error } = await supabase
      .from('agents')
      .update({ referral_code: code })
      .eq('id', agent_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ agent: data })
  } catch (error) {
    console.error('Error generating referral code:', error)
    return NextResponse.json(
      { error: 'Failed to generate referral code' },
      { status: 500 }
    )
  }
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 0, 1 to avoid confusion
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
