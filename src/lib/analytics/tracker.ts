// Client-side analytics tracking

// Generate or retrieve a persistent visitor ID
function getVisitorId(): string {
  if (typeof window === 'undefined') return ''

  let visitorId = localStorage.getItem('asm_visitor_id')
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    localStorage.setItem('asm_visitor_id', visitorId)
  }
  return visitorId
}

// Generate a session ID (expires after 30 min of inactivity)
function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  const SESSION_DURATION = 30 * 60 * 1000 // 30 minutes
  const now = Date.now()

  const storedSession = sessionStorage.getItem('asm_session')
  if (storedSession) {
    const { id, lastActivity } = JSON.parse(storedSession)
    if (now - lastActivity < SESSION_DURATION) {
      // Update last activity
      sessionStorage.setItem('asm_session', JSON.stringify({ id, lastActivity: now }))
      return id
    }
  }

  // Create new session
  const sessionId = `s_${now}_${Math.random().toString(36).substring(2, 9)}`
  sessionStorage.setItem('asm_session', JSON.stringify({ id: sessionId, lastActivity: now }))
  return sessionId
}

interface TrackPageViewOptions {
  listingId?: string
  agentId?: string
  pageType: 'property' | 'portfolio' | 'delivery'
}

interface TrackDownloadOptions {
  listingId?: string
  agentId?: string
  assetType: string
  fileName?: string
}

interface TrackLeadOptions {
  listingId?: string
  agentId?: string
  conversionType: 'contact_form' | 'phone_click' | 'email_click' | 'schedule_showing'
  leadName?: string
  leadEmail?: string
  leadPhone?: string
}

// Track page view
export async function trackPageView(options: TrackPageViewOptions): Promise<void> {
  try {
    const visitorId = getVisitorId()
    const sessionId = getSessionId()

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'page_view',
        ...options,
        visitorId,
        sessionId,
        referrer: document.referrer || null
      })
    })
  } catch (error) {
    // Silently fail - tracking shouldn't break the page
    console.debug('Analytics tracking failed:', error)
  }
}

// Track download
export async function trackDownload(options: TrackDownloadOptions): Promise<void> {
  try {
    const visitorId = getVisitorId()

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'download',
        ...options,
        visitorId
      })
    })
  } catch (error) {
    console.debug('Download tracking failed:', error)
  }
}

// Track lead conversion
export async function trackLead(options: TrackLeadOptions): Promise<void> {
  try {
    const visitorId = getVisitorId()

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'lead_conversion',
        ...options,
        visitorId
      })
    })
  } catch (error) {
    console.debug('Lead tracking failed:', error)
  }
}

// Track session end with duration and scroll depth
export async function trackSessionEnd(durationSeconds: number, scrollDepth: number): Promise<void> {
  try {
    const sessionId = getSessionId()

    // Use sendBeacon for reliability on page unload
    const data = JSON.stringify({
      eventType: 'session_end',
      sessionId,
      durationSeconds,
      scrollDepth
    })

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/track', data)
    } else {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true
      })
    }
  } catch (error) {
    console.debug('Session end tracking failed:', error)
  }
}

// Hook for tracking page view with session duration
export function usePageTracking(options: TrackPageViewOptions) {
  if (typeof window === 'undefined') return

  let startTime = Date.now()
  let maxScrollDepth = 0

  // Track page view on mount
  trackPageView(options)

  // Track scroll depth
  const handleScroll = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    if (scrollHeight > 0) {
      const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100)
      maxScrollDepth = Math.max(maxScrollDepth, scrollPercent)
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true })

  // Track session end on unload
  const handleUnload = () => {
    const duration = Math.round((Date.now() - startTime) / 1000)
    trackSessionEnd(duration, maxScrollDepth)
  }

  window.addEventListener('beforeunload', handleUnload)

  // Return cleanup function
  return () => {
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('beforeunload', handleUnload)
    handleUnload() // Send final stats on cleanup
  }
}
