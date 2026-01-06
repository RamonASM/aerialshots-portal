import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

export async function GET(request: NextRequest) {
  try {
    await requireStaffAccess()
    const supabase = createAdminClient()

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('email_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (category && category !== 'all') {
      query = query.eq('category', category as 'general' | 'order' | 'scheduling' | 'delivery' | 'marketing' | 'reminder')
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,subject.ilike.%${search}%`)
    }

    const { data: templates, error } = await query

    if (error) throw error

    // Group by category for easier display
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byCategory: Record<string, any[]> = {}
    templates?.forEach((template: { category: string }) => {
      if (!byCategory[template.category]) {
        byCategory[template.category] = []
      }
      byCategory[template.category].push(template)
    })

    return NextResponse.json({
      templates: templates || [],
      byCategory,
      total: templates?.length || 0,
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaffAccess()
    const supabase = createAdminClient()

    const body = await request.json()
    const { name, slug, subject, body_html, body_text, category, variables, conditions, is_active } = body

    // Validate required fields
    if (!name || !slug || !subject || !body_html) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug, subject, body_html' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: template, error } = await (supabase as any)
      .from('email_templates')
      .insert({
        name,
        slug,
        subject,
        body_html,
        body_text: body_text || null,
        category: category || 'general',
        variables: variables || [],
        conditions: conditions || {},
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A template with this slug already exists' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
