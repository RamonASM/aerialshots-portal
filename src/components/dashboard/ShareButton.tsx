'use client'

import { useState, useRef, useEffect } from 'react'
import { Share2, Link2, Calendar, Eye, Copy, Check, X, Loader2 } from 'lucide-react'

interface ShareButtonProps {
  listingId: string
  agentId: string
  propertyAddress: string
  clientName?: string
  clientEmail?: string
  variant?: 'default' | 'compact'
}

type LinkType = 'media' | 'schedule' | 'status'

export function ShareButton({
  listingId,
  agentId,
  propertyAddress,
  clientName = '',
  clientEmail = '',
  variant = 'default',
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const generateLink = async (type: LinkType) => {
    setIsGenerating(true)
    setError(null)
    setGeneratedUrl(null)

    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30) // 30 days default

      const response = await fetch('/api/share-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          agent_id: agentId,
          link_type: type,
          client_name: clientName,
          client_email: clientEmail,
          expires_at: expiresAt.toISOString(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate link')
      }

      const data = await response.json()
      setGeneratedUrl(data.share_url)

      // Auto copy to clipboard
      await navigator.clipboard.writeText(data.share_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyLink = async () => {
    if (generatedUrl) {
      await navigator.clipboard.writeText(generatedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const linkOptions: { type: LinkType; label: string; icon: typeof Eye }[] = [
    { type: 'media', label: 'Share Media Portal', icon: Eye },
    { type: 'schedule', label: 'Send Scheduling Link', icon: Calendar },
    { type: 'status', label: 'Share Order Status', icon: Link2 },
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={
          variant === 'compact'
            ? 'p-2 hover:bg-white/5 rounded-lg transition-colors'
            : 'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-white/[0.08] bg-[#1c1c1e] text-white hover:bg-white/5 transition-colors'
        }
        title="Share with client"
      >
        <Share2 className="w-4 h-4" />
        {variant !== 'compact' && <span>Share</span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#1c1c1e] border border-white/[0.08] rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.08]">
            <p className="text-sm font-medium text-white">Share with Client</p>
            <p className="text-xs text-neutral-500 truncate">{propertyAddress}</p>
          </div>

          {generatedUrl ? (
            <div className="p-3">
              <div className="flex items-center gap-2 bg-neutral-800/50 rounded-lg p-2 mb-3">
                <input
                  type="text"
                  value={generatedUrl}
                  readOnly
                  className="flex-1 bg-transparent text-xs text-neutral-300 outline-none truncate"
                />
                <button
                  onClick={copyLink}
                  className="p-1 hover:bg-neutral-700 rounded transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-neutral-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-green-400 text-center mb-2">
                {copied ? 'Copied to clipboard!' : 'Link generated successfully'}
              </p>
              <button
                onClick={() => {
                  setGeneratedUrl(null)
                  setError(null)
                }}
                className="w-full text-xs text-neutral-400 hover:text-white transition-colors"
              >
                Generate another link
              </button>
            </div>
          ) : (
            <div className="p-2">
              {linkOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => generateLink(option.type)}
                  disabled={isGenerating}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <option.icon className="w-4 h-4" />
                  )}
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="px-3 pb-3">
              <p className="text-xs text-red-400 flex items-center gap-1">
                <X className="w-3 h-3" />
                {error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
