/**
 * Delivery AI Content
 *
 * Displays AI-generated descriptions and social captions on delivery page
 */

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface DeliveryAIContentProps {
  descriptions?: {
    professional?: string
    warm?: string
    luxury?: string
  }
  captions?: {
    instagram?: string
    facebook?: string
    tiktok?: string
  }
  brandColor?: string
  generatedAt?: string
}

type ContentTab = 'descriptions' | 'captions'

const descriptionLabels: Record<string, string> = {
  professional: 'Professional',
  warm: 'Warm & Friendly',
  luxury: 'Luxury',
}

const captionLabels: Record<string, { label: string; icon: string }> = {
  instagram: { label: 'Instagram', icon: '📸' },
  facebook: { label: 'Facebook', icon: '👥' },
  tiktok: { label: 'TikTok', icon: '🎵' },
}

export function DeliveryAIContent({
  descriptions,
  captions,
  brandColor = '#0077ff',
  generatedAt,
}: DeliveryAIContentProps) {
  const [activeTab, setActiveTab] = useState<ContentTab>(
    descriptions ? 'descriptions' : 'captions'
  )
  const [activeDescStyle, setActiveDescStyle] = useState<string>(
    descriptions?.professional ? 'professional' : descriptions?.warm ? 'warm' : 'luxury'
  )
  const [activePlatform, setActivePlatform] = useState<string>(
    captions?.instagram ? 'instagram' : captions?.facebook ? 'facebook' : 'tiktok'
  )
  const [copied, setCopied] = useState(false)

  const hasDescriptions = descriptions && Object.keys(descriptions).length > 0
  const hasCaptions = captions && Object.keys(captions).length > 0

  if (!hasDescriptions && !hasCaptions) {
    return null
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const currentDescription = descriptions?.[activeDescStyle as keyof typeof descriptions]
  const currentCaption = captions?.[activePlatform as keyof typeof captions]

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/[0.08] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: `${brandColor}20` }}
            >
              ✨
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">AI-Generated Content</h3>
              <p className="text-xs text-neutral-400">
                Ready-to-use marketing copy for your listing
              </p>
            </div>
          </div>
          {generatedAt && (
            <span className="text-[10px] text-neutral-500">
              Generated {new Date(generatedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Tabs */}
        {hasDescriptions && hasCaptions && (
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setActiveTab('descriptions')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                activeTab === 'descriptions'
                  ? 'text-white'
                  : 'text-neutral-400 hover:text-neutral-300'
              )}
              style={activeTab === 'descriptions' ? { backgroundColor: `${brandColor}20`, color: brandColor } : {}}
            >
              Descriptions
            </button>
            <button
              onClick={() => setActiveTab('captions')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                activeTab === 'captions'
                  ? 'text-white'
                  : 'text-neutral-400 hover:text-neutral-300'
              )}
              style={activeTab === 'captions' ? { backgroundColor: `${brandColor}20`, color: brandColor } : {}}
            >
              Social Captions
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Descriptions */}
        {activeTab === 'descriptions' && hasDescriptions && (
          <div>
            {/* Style selector */}
            <div className="flex items-center gap-2 mb-4">
              {Object.entries(descriptions || {}).map(([style, content]) => {
                if (!content) return null
                return (
                  <button
                    key={style}
                    onClick={() => setActiveDescStyle(style)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                      activeDescStyle === style
                        ? 'border-transparent text-white'
                        : 'border-white/[0.08] text-neutral-400 hover:text-neutral-300 hover:border-white/[0.16]'
                    )}
                    style={activeDescStyle === style ? { backgroundColor: brandColor } : {}}
                  >
                    {descriptionLabels[style] || style}
                  </button>
                )
              })}
            </div>

            {/* Description text */}
            {currentDescription && (
              <div className="relative">
                <div className="p-4 rounded-xl bg-black/30 border border-white/[0.04]">
                  <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {currentDescription}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(currentDescription)}
                  className={cn(
                    'absolute top-3 right-3 px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                    copied
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/[0.08] text-neutral-400 hover:bg-white/[0.12] hover:text-white'
                  )}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Social Captions */}
        {activeTab === 'captions' && hasCaptions && (
          <div>
            {/* Platform selector */}
            <div className="flex items-center gap-2 mb-4">
              {Object.entries(captions || {}).map(([platform, content]) => {
                if (!content) return null
                const info = captionLabels[platform]
                return (
                  <button
                    key={platform}
                    onClick={() => setActivePlatform(platform)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors flex items-center gap-1',
                      activePlatform === platform
                        ? 'border-transparent text-white'
                        : 'border-white/[0.08] text-neutral-400 hover:text-neutral-300 hover:border-white/[0.16]'
                    )}
                    style={activePlatform === platform ? { backgroundColor: brandColor } : {}}
                  >
                    {info?.icon} {info?.label || platform}
                  </button>
                )
              })}
            </div>

            {/* Caption text */}
            {currentCaption && (
              <div className="relative">
                <div className="p-4 rounded-xl bg-black/30 border border-white/[0.04]">
                  <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {currentCaption}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(currentCaption)}
                  className={cn(
                    'absolute top-3 right-3 px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                    copied
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/[0.08] text-neutral-400 hover:bg-white/[0.12] hover:text-white'
                  )}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
