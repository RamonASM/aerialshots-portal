'use client'

import { useState } from 'react'
import { Share2, Link2, Calendar, Eye, Copy, Check, Mail, MessageSquare, ExternalLink, X } from 'lucide-react'

interface ShareLinkGeneratorProps {
  listingId: string
  agentId: string
  propertyAddress: string
  clientName?: string
  clientEmail?: string
}

type LinkType = 'media' | 'schedule' | 'status'

interface GeneratedLink {
  type: LinkType
  url: string
  token: string
  expiresAt: string
}

export function ShareLinkGenerator({
  listingId,
  agentId,
  propertyAddress,
  clientName = '',
  clientEmail = '',
}: ShareLinkGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([])
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<LinkType>('media')
  const [expiresInDays, setExpiresInDays] = useState(30)

  const linkTypeOptions: { type: LinkType; label: string; description: string; icon: typeof Eye }[] = [
    {
      type: 'media',
      label: 'Media Portal',
      description: 'Client can view and download photos',
      icon: Eye,
    },
    {
      type: 'schedule',
      label: 'Schedule Photo Shoot',
      description: 'Client picks available times',
      icon: Calendar,
    },
    {
      type: 'status',
      label: 'Order Status',
      description: 'Client tracks order progress',
      icon: Link2,
    },
  ]

  const generateLink = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)

      const response = await fetch('/api/share-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          agent_id: agentId,
          link_type: selectedType,
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

      setGeneratedLinks((prev) => [
        {
          type: selectedType,
          url: data.share_url,
          token: data.share_link.share_token,
          expiresAt: data.share_link.expires_at,
        },
        ...prev.filter((l) => l.type !== selectedType),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopiedLink(url)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const shareViaEmail = (url: string, type: LinkType) => {
    const subject = encodeURIComponent(`Your ${type === 'media' ? 'Photos' : type === 'schedule' ? 'Photo Shoot Scheduling' : 'Order Status'} - ${propertyAddress}`)
    const body = encodeURIComponent(`Hi,\n\nHere's your link to ${type === 'media' ? 'view and download your property photos' : type === 'schedule' ? 'schedule your photo shoot' : 'track your order status'}:\n\n${url}\n\nBest regards`)
    window.location.href = `mailto:${clientEmail}?subject=${subject}&body=${body}`
  }

  const shareViaSMS = (url: string, type: LinkType) => {
    const message = encodeURIComponent(`Your ${type === 'media' ? 'property photos' : type === 'schedule' ? 'photo shoot scheduling link' : 'order status'} for ${propertyAddress}: ${url}`)
    window.location.href = `sms:?body=${message}`
  }

  const currentLink = generatedLinks.find((l) => l.type === selectedType)

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Share2 className="w-5 h-5 text-blue-400" />
        Share with Client
      </h2>

      <p className="text-sm text-neutral-400 mb-4">
        Generate a secure link to share with your client.
      </p>

      {/* Link Type Selection */}
      <div className="space-y-2 mb-4">
        {linkTypeOptions.map((option) => (
          <button
            key={option.type}
            onClick={() => setSelectedType(option.type)}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all ${
              selectedType === option.type
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/50'
            }`}
          >
            <option.icon
              className={`w-5 h-5 mt-0.5 ${
                selectedType === option.type ? 'text-blue-400' : 'text-neutral-400'
              }`}
            />
            <div className="text-left">
              <p className={`font-medium ${selectedType === option.type ? 'text-white' : 'text-neutral-300'}`}>
                {option.label}
              </p>
              <p className="text-xs text-neutral-500">{option.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Expiration */}
      <div className="mb-4">
        <label className="block text-sm text-neutral-400 mb-2">Link expires in</label>
        <select
          value={expiresInDays}
          onChange={(e) => setExpiresInDays(Number(e.target.value))}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
          <option value={60}>60 days</option>
          <option value={90}>90 days</option>
        </select>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateLink}
        disabled={isGenerating}
        className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Link2 className="w-4 h-4" />
            Generate Link
          </>
        )}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-400 flex items-center gap-1">
          <X className="w-4 h-4" />
          {error}
        </p>
      )}

      {/* Generated Link */}
      {currentLink && (
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">
              {linkTypeOptions.find((o) => o.type === currentLink.type)?.label} Link
            </span>
            <span className="text-xs text-neutral-500">
              Expires {new Date(currentLink.expiresAt).toLocaleDateString()}
            </span>
          </div>

          {/* Link Display */}
          <div className="flex items-center gap-2 bg-neutral-800 rounded-lg p-2 mb-3">
            <input
              type="text"
              value={currentLink.url}
              readOnly
              className="flex-1 bg-transparent text-sm text-neutral-300 outline-none truncate"
            />
            <button
              onClick={() => copyToClipboard(currentLink.url)}
              className="p-1.5 hover:bg-neutral-700 rounded transition-colors"
              title="Copy link"
            >
              {copiedLink === currentLink.url ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-neutral-400" />
              )}
            </button>
            <a
              href={currentLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-neutral-700 rounded transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4 text-neutral-400" />
            </a>
          </div>

          {/* Share Options */}
          <div className="flex gap-2">
            <button
              onClick={() => shareViaEmail(currentLink.url, currentLink.type)}
              className="flex-1 py-2 px-3 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={() => shareViaSMS(currentLink.url, currentLink.type)}
              className="flex-1 py-2 px-3 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              SMS
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
