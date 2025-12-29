import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import QRCode from 'qrcode'

interface QRCodeStyle {
  foreground?: string
  background?: string
  size?: number
  logo_url?: string
}

interface CreateQRCodeBody {
  target_url: string
  title?: string
  description?: string
  qr_type: 'listing' | 'portfolio' | 'contact' | 'review' | 'social' | 'custom'
  agent_id?: string
  listing_id?: string
  style?: QRCodeStyle
}

// Generate a unique short code
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// POST - Generate a new QR code
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

    const body: CreateQRCodeBody = await request.json()

    if (!body.target_url) {
      return NextResponse.json(
        { error: 'target_url is required' },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(body.target_url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    const style = body.style || {}
    const size = style.size || 256
    const foreground = style.foreground || '#000000'
    const background = style.background || '#ffffff'

    // Generate QR code as data URL
    const dataUrl = await QRCode.toDataURL(body.target_url, {
      width: size,
      margin: 2,
      color: {
        dark: foreground,
        light: background,
      },
      errorCorrectionLevel: 'M',
    })

    // Generate unique short code
    const code = generateShortCode()

    // Save to database (table may not exist yet, handle gracefully)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: qrCode, error: insertError } = await (supabase as any)
        .from('qr_codes')
        .insert({
          code,
          target_url: body.target_url,
          title: body.title,
          description: body.description,
          qr_type: body.qr_type,
          agent_id: body.agent_id,
          listing_id: body.listing_id,
          style: {
            foreground,
            background,
            size,
            logo_url: style.logo_url,
          },
        })
        .select()
        .single()

      if (insertError) {
        console.warn('Could not save QR code to database:', insertError)
        // Continue without saving - still return the generated QR code
      }

      return NextResponse.json({
        id: qrCode?.id,
        code,
        target_url: body.target_url,
        dataUrl,
      })
    } catch (dbError) {
      console.warn('Database operation failed:', dbError)
      // Return QR code even if database save fails
      return NextResponse.json({
        code,
        target_url: body.target_url,
        dataUrl,
      })
    }
  } catch (error) {
    console.error('Error generating QR code:', error)
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    )
  }
}

// GET - Get QR codes for user
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

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const listingId = searchParams.get('listing_id')
    const qrType = searchParams.get('type')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('qr_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    if (listingId) {
      query = query.eq('listing_id', listingId)
    }

    if (qrType) {
      query = query.eq('qr_type', qrType)
    }

    const { data: qrCodes, error } = await query.limit(100)

    if (error) {
      throw error
    }

    return NextResponse.json({ qrCodes: qrCodes || [] })
  } catch (error) {
    console.error('Error fetching QR codes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch QR codes' },
      { status: 500 }
    )
  }
}
