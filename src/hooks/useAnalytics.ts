'use client'

import { useEffect, useRef } from 'react'

interface TrackPageViewOptions {
  listingId?: string
  agentId?: string
  pageType: 'property' | 'portfolio' | 'delivery'
}

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
    try {
      const { id, lastActivity } = JSON.parse(storedSession)
      if (now - lastActivity < SESSION_DURATION) {
        sessionStorage.setItem('asm_session', JSON.stringify({ id, lastActivity: now }))
        return id
      }
    } catch {
      // Invalid session data, create new
    }
  }

  const sessionId = `s_${now}_${Math.random().toString(36).substring(2, 9)}`
  sessionStorage.setItem('asm_session', JSON.stringify({ id: sessionId, lastActivity: now }))
  return sessionId
}

export function usePageTracking(options: TrackPageViewOptions) {
  const startTimeRef = useRef<number>(Date.now())
  const maxScrollDepthRef = useRef<number>(0)
  const trackedRef = useRef<boolean>(false)

  useEffect(() => {
    // Only track once per mount
    if (trackedRef.current) return
    trackedRef.current = true

    const visitorId = getVisitorId()
    const sessionId = getSessionId()

    // Track initial page view
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'page_view',
        ...options,
        visitorId,
        sessionId,
        referrer: document.referrer || null
      })
    }).catch(() => {
      // Silent fail
    })

    // Track scroll depth
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      if (scrollHeight > 0) {
        const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100)
        maxScrollDepthRef.current = Math.max(maxScrollDepthRef.current, scrollPercent)
      }
    }

    // Send session end data
    const sendSessionEnd = () => {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
      const data = JSON.stringify({
        eventType: 'session_end',
        sessionId,
        durationSeconds: duration,
        scrollDepth: maxScrollDepthRef.current
      })

      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/track', data)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('beforeunload', sendSessionEnd)
    window.addEventListener('pagehide', sendSessionEnd)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeunload', sendSessionEnd)
      window.removeEventListener('pagehide', sendSessionEnd)
    }
  }, [options.listingId, options.agentId, options.pageType])
}

export function useDownloadTracking() {
  const trackDownload = (options: {
    listingId?: string
    agentId?: string
    assetType: string
    fileName?: string
  }) => {
    const visitorId = getVisitorId()

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'download',
        ...options,
        visitorId
      })
    }).catch(() => {
      // Silent fail
    })
  }

  return { trackDownload }
}

export function useLeadTracking() {
  const trackLead = (options: {
    listingId?: string
    agentId?: string
    conversionType: 'contact_form' | 'phone_click' | 'email_click' | 'schedule_showing'
    leadName?: string
    leadEmail?: string
    leadPhone?: string
  }) => {
    const visitorId = getVisitorId()

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'lead_conversion',
        ...options,
        visitorId
      })
    }).catch(() => {
      // Silent fail
    })
  }

  return { trackLead }
}
