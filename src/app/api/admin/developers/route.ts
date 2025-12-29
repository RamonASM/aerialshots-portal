import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Check if user is admin
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff || staff.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    // Note: API keys table not yet implemented
    // Return placeholder data for now
    const apiKeys: Array<{
      id: string
      name: string
      key_prefix: string
      tier: string
      rate_limit: number
      is_active: boolean
      created_at: string
      agent: { name: string; email: string } | null
      usage: { total: number; byEndpoint: Record<string, number> }
    }> = []

    // Filter placeholder - in real implementation, query would be filtered
    let filteredKeys = apiKeys
    if (search) {
      filteredKeys = apiKeys.filter(
        k => k.name.toLowerCase().includes(search.toLowerCase()) ||
             k.key_prefix.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (status === 'active') {
      filteredKeys = filteredKeys.filter(k => k.is_active)
    } else if (status === 'suspended') {
      filteredKeys = filteredKeys.filter(k => !k.is_active)
    }

    return NextResponse.json({
      apiKeys: filteredKeys,
      stats: {
        totalKeys: 0,
        activeKeys: 0,
        totalRequests: 0,
      },
      message: 'API keys table not yet implemented',
    })
  } catch (error) {
    console.error('Error fetching developer keys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch developer keys' },
      { status: 500 }
    )
  }
}

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

    // Check if user is admin
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff || staff.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, tier = 'free' } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Note: API keys table not yet implemented
    // Return error for now
    return NextResponse.json(
      { error: 'API keys table not yet implemented. Please run database migrations.' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    )
  }
}
