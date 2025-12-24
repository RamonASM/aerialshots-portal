import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { checkRateLimit, createRateLimitKey } from '@/lib/utils/rate-limit'

// Rate limit: 100 events per IP per minute (generous for page views, but prevents abuse)
const ANALYTICS_RATE_LIMIT = { limit: 100, windowSeconds: 60 }

// Simple device detection from user agent
function getDeviceType(ua: string): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
  const lowerUA = ua.toLowerCase()
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(lowerUA)) {
    return 'mobile'
  }
  if (/tablet|ipad|playbook|silk/i.test(lowerUA)) {
    return 'tablet'
  }
  if (/mozilla|chrome|safari|firefox|edge|opera/i.test(lowerUA)) {
    return 'desktop'
  }
  return 'unknown'
}

// Extract browser name from user agent
function getBrowser(ua: string): string {
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
  return 'Other'
}

// Extract OS from user agent
function getOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  return 'Other'
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()

    // Get visitor IP for rate limiting
    const forwardedFor = headersList.get('x-forwarded-for')
    const visitorIp = forwardedFor?.split(',')[0].trim() || 'unknown'

    // Rate limit by IP
    const rateLimit = checkRateLimit(createRateLimitKey('analytics', 'ip', visitorIp), ANALYTICS_RATE_LIMIT)
    if (!rateLimit.allowed) {
      // Silently reject - don't reveal rate limiting to potential attackers
      return NextResponse.json({ success: true })
    }

    const body = await request.json()

    const {
      listingId,
      agentId,
      pageType,
      visitorId,
      sessionId,
      durationSeconds,
      scrollDepth,
      eventType = 'page_view',
      conversionType,
      assetType,
      fileName,
    } = body

    // Get visitor info from headers
    const userAgent = headersList.get('user-agent') || ''
    const referrer = headersList.get('referer') || body.referrer || null

    const supabase = await createClient()

    // Handle different event types
    switch (eventType) {
      case 'page_view': {
        if (!pageType) {
          return NextResponse.json({ error: 'pageType is required' }, { status: 400 })
        }

        // Use type assertion since table might not be in generated types yet
        const { error } = await (supabase as any)
          .from('page_views')
          .insert({
            listing_id: listingId || null,
            agent_id: agentId || null,
            page_type: pageType,
            visitor_id: visitorId || null,
            visitor_ip: visitorIp,
            user_agent: userAgent,
            referrer: referrer,
            session_id: sessionId || null,
            duration_seconds: durationSeconds || null,
            scroll_depth: scrollDepth || null,
            device_type: getDeviceType(userAgent),
            browser: getBrowser(userAgent),
            os: getOS(userAgent),
          })

        if (error) {
          console.error('Page view tracking error:', error)
          // Don't fail the request, tracking should be silent
        }
        break
      }

      case 'download': {
        if (!assetType) {
          return NextResponse.json({ error: 'assetType is required' }, { status: 400 })
        }

        const { error } = await (supabase as any)
          .from('media_downloads')
          .insert({
            listing_id: listingId || null,
            agent_id: agentId || null,
            asset_type: assetType,
            file_name: fileName || null,
            visitor_id: visitorId || null,
            visitor_ip: visitorIp,
          })

        if (error) {
          console.error('Download tracking error:', error)
        }
        break
      }

      case 'lead_conversion': {
        if (!conversionType) {
          return NextResponse.json({ error: 'conversionType is required' }, { status: 400 })
        }

        const { error } = await (supabase as any)
          .from('lead_conversions')
          .insert({
            listing_id: listingId || null,
            agent_id: agentId || null,
            conversion_type: conversionType,
            lead_name: body.leadName || null,
            lead_email: body.leadEmail || null,
            lead_phone: body.leadPhone || null,
          })

        if (error) {
          console.error('Lead conversion tracking error:', error)
        }
        break
      }

      case 'session_end': {
        // Update existing page view with duration and scroll depth
        if (sessionId && (durationSeconds || scrollDepth)) {
          const updateData: any = {}
          if (durationSeconds) updateData.duration_seconds = durationSeconds
          if (scrollDepth) updateData.scroll_depth = scrollDepth

          await (supabase as any)
            .from('page_views')
            .update(updateData)
            .eq('session_id', sessionId)
            .is('duration_seconds', null)
        }
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics tracking error:', error)
    // Return success even on error - tracking shouldn't block users
    return NextResponse.json({ success: true })
  }
}

// GET endpoint for testing/debugging
export async function GET() {
  return NextResponse.json({
    message: 'Analytics tracking API',
    endpoints: {
      POST: {
        description: 'Track analytics events',
        events: ['page_view', 'download', 'lead_conversion', 'session_end'],
      },
    },
  })
}
