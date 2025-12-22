'use client'

import { useEffect, useRef, useState } from 'react'
import { Instagram, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InstagramEmbed {
  url: string
  html?: string
  thumbnailUrl?: string
}

interface InstagramFeedProps {
  agentId: string
  instagramUrl?: string
  postUrls?: string[]
  maxPosts?: number
}

// Extend Window interface for Instagram embed script
declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void
      }
    }
  }
}

// Load Instagram embed.js script
function loadInstagramScript() {
  if (typeof window === 'undefined') return

  // Check if already loaded
  if (document.getElementById('instagram-embed-script')) {
    // Re-process embeds
    if (window.instgrm?.Embeds?.process) {
      window.instgrm.Embeds.process()
    }
    return
  }

  const script = document.createElement('script')
  script.id = 'instagram-embed-script'
  script.src = 'https://www.instagram.com/embed.js'
  script.async = true
  document.body.appendChild(script)
}

export function InstagramFeed({
  agentId,
  instagramUrl,
  postUrls = [],
  maxPosts = 6,
}: InstagramFeedProps) {
  const [embeds, setEmbeds] = useState<InstagramEmbed[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchEmbeds() {
      if (postUrls.length === 0) {
        setIsLoading(false)
        return
      }

      try {
        // Fetch embed data from our API
        const response = await fetch('/api/instagram/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: postUrls.slice(0, maxPosts) }),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch embeds')
        }

        const data = await response.json()
        setEmbeds(data.embeds || [])
      } catch (err) {
        console.error('Error fetching Instagram embeds:', err)
        // Fall back to basic embeds
        setEmbeds(postUrls.slice(0, maxPosts).map(url => ({ url })))
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmbeds()
  }, [postUrls, maxPosts])

  useEffect(() => {
    // Load Instagram embed script after embeds are rendered
    if (!isLoading && embeds.length > 0) {
      loadInstagramScript()
    }
  }, [isLoading, embeds])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (embeds.length === 0) {
    return null
  }

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Instagram className="h-5 w-5 text-pink-500" />
          <h2 className="text-xl font-bold text-neutral-900">Latest on Instagram</h2>
        </div>
        {instagramUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Follow
            </a>
          </Button>
        )}
      </div>

      {/* Grid of embeds */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {embeds.map((embed, index) => (
          <div key={embed.url || index} className="instagram-embed-wrapper">
            {embed.html ? (
              <div
                dangerouslySetInnerHTML={{ __html: embed.html }}
                className="instagram-embed"
              />
            ) : (
              // Fallback to basic blockquote
              <blockquote
                className="instagram-media"
                data-instgrm-captioned
                data-instgrm-permalink={embed.url}
                data-instgrm-version="14"
                style={{
                  background: '#FFF',
                  border: 0,
                  borderRadius: '3px',
                  boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)',
                  margin: '1px',
                  maxWidth: '540px',
                  minWidth: '326px',
                  padding: 0,
                  width: '100%',
                }}
              >
                <div style={{ padding: '16px' }}>
                  <a
                    href={embed.url}
                    style={{
                      background: '#FFFFFF',
                      lineHeight: 0,
                      padding: '0 0',
                      textAlign: 'center',
                      textDecoration: 'none',
                      width: '100%',
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View this post on Instagram
                  </a>
                </div>
              </blockquote>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Simple placeholder for when no posts are configured
export function InstagramFeedPlaceholder({ instagramUrl }: { instagramUrl?: string }) {
  if (!instagramUrl) return null

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center">
      <Instagram className="mx-auto h-12 w-12 text-neutral-400" />
      <p className="mt-4 text-neutral-600">
        Check out my latest posts on Instagram
      </p>
      <Button className="mt-4" asChild>
        <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
          <Instagram className="mr-2 h-4 w-4" />
          Visit Instagram
        </a>
      </Button>
    </div>
  )
}
