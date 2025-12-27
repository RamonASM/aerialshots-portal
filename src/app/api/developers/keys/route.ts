// API Key Management Routes
// POST /api/developers/keys - Create a new API key
// GET /api/developers/keys - List user's API keys

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateApiKey, hashApiKey } from '@/lib/api/middleware/api-key'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 })
    }

    // Generate new API key
    const apiKey = generateApiKey()
    const keyHash = await hashApiKey(apiKey)

    // Store the key (only the hash, not the actual key)
    const { data, error } = await supabase.from('api_keys').insert({
      user_id: user.id,
      key_hash: keyHash,
      key_prefix: apiKey.slice(0, 12), // Store prefix for display (lh_live_xxxx)
      name: name.trim(),
      tier: 'free',
      monthly_limit: 3000, // 100/day * 30 days
      is_active: true,
    }).select().single()

    if (error) {
      console.error('Error creating API key:', error)
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
    }

    // Return the full key only once - it won't be stored or retrievable again
    return NextResponse.json({
      success: true,
      key: apiKey,
      data: {
        id: data.id,
        name: data.name,
        tier: data.tier,
        monthly_limit: data.monthly_limit,
        created_at: data.created_at,
      },
    })
  } catch (error) {
    console.error('API key creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, tier, monthly_limit, is_active, created_at, last_used_at, requests_this_month')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API key fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
