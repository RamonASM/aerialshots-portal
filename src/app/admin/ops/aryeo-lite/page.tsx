import { Metadata } from 'next'
import { Globe, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Zillow Showcase | Admin',
  description: 'Upload photos to Zillow Showcase via Aryeo Lite',
}

/**
 * Aryeo Lite Embed Page
 *
 * Provides access to Aryeo Lite for uploading photos to Zillow Showcase.
 * Aryeo Lite is the only platform that delivers media for Zillow Showcase listings.
 *
 * Note: Aryeo Lite (free tier) uses a web interface rather than API.
 * For API access, upgrade to Aryeo Enterprise.
 */
export default function AryeoLitePage() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <Globe className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Zillow Showcase</h1>
            <p className="text-sm text-neutral-400">
              Upload photos to Zillow Showcase via Aryeo Lite
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          asChild
        >
          <a
            href="https://app.aryeo.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in New Tab
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </header>

      {/* Embed Container */}
      <div className="flex-1 bg-neutral-900">
        <iframe
          src="https://app.aryeo.com"
          className="h-full w-full border-0"
          title="Aryeo Lite - Zillow Showcase"
          allow="clipboard-write; clipboard-read"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>

      {/* Help Footer */}
      <footer className="border-t border-white/10 bg-black/40 px-6 py-3">
        <p className="text-xs text-neutral-500">
          Aryeo Lite is the exclusive platform for delivering media to Zillow Showcase.
          After uploading, copy the Zillow URL back to the listing for tracking.
        </p>
      </footer>
    </div>
  )
}
