import { NextRequest, NextResponse } from 'next/server'
import { getStaffAccess } from '@/lib/auth/server-access'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    if (!await getStaffAccess()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createAdminClient()
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const platform = searchParams.get('platform')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('social_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (platform && platform !== 'all') {
      query = query.eq('platform', platform)
    }

    const { data, error } = await query

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ templates: [] })
      }
      throw error
    }

    return NextResponse.json({ templates: data || [] })
  } catch (error) {
    console.error('Error fetching social templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await getStaffAccess()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createAdminClient()
    const body = await request.json()
    const {
      name,
      description,
      category,
      platform,
      width,
      height,
      template_data,
      preview_url,
      is_active,
      is_featured,
    } = body

    if (!name || !category || !platform) {
      return NextResponse.json(
        { error: 'name, category, and platform are required' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('social_templates')
      .insert({
        name,
        description: description || null,
        category,
        platform,
        width: width || 1080,
        height: height || 1080,
        template_data: template_data || {},
        preview_url: preview_url || null,
        is_active: is_active ?? true,
        is_featured: is_featured ?? false,
      })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ template: data }, { status: 201 })
  } catch (error) {
    console.error('Error creating social template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
