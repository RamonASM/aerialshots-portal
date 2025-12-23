'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Download, ChevronDown, ChevronUp, Lightbulb, Play, Maximize2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/types'

type MediaAsset = Database['public']['Tables']['media_assets']['Row']

interface MediaSectionProps {
  title: string
  description: string
  tip: string
  assets: MediaAsset[]
  brandColor?: string
}

export function MediaSection({
  title,
  description,
  tip,
  assets,
  brandColor = '#0077ff',
}: MediaSectionProps) {
  const [expanded, setExpanded] = useState(true)
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)

  if (assets.length === 0) return null

  const isVideo = assets[0]?.type === 'video'
  const isMatterport = assets[0]?.type === 'matterport'
  const isInteractive = assets[0]?.type === 'interactive' || isMatterport

  const handleDownload = async (asset: MediaAsset) => {
    try {
      const response = await fetch(asset.aryeo_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.toLowerCase().replace(/\s/g, '-')}-${asset.sort_order ?? 'file'}.${
        isVideo ? 'mp4' : 'jpg'
      }`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
      // Fallback: open in new tab
      window.open(asset.aryeo_url, '_blank')
    }
  }

  const handleDownloadAll = async () => {
    // Download all assets in this section
    for (const asset of assets) {
      await handleDownload(asset)
      // Small delay between downloads
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  return (
    <section className="border-b border-white/[0.08]">
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="group flex w-full items-center justify-between px-4 py-5 text-left transition-colors hover:bg-white/[0.02] sm:px-6 lg:px-8"
      >
        <div>
          <h2 className="text-[17px] font-semibold text-white">{title}</h2>
          <p className="text-[13px] text-[#636366]">{description}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-[#1c1c1e] border border-white/[0.08] px-3 py-1 text-[13px] text-[#a1a1a6]">
            {assets.length} {assets.length === 1 ? 'file' : 'files'}
          </span>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-[#636366] transition-colors group-hover:text-white" />
          ) : (
            <ChevronDown className="h-5 w-5 text-[#636366] transition-colors group-hover:text-white" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-8 sm:px-6 lg:px-8">
          {/* Tip */}
          {tip && (
            <div
              className="mb-6 flex items-start gap-3 rounded-xl p-4 border"
              style={{
                backgroundColor: brandColor + '10',
                borderColor: brandColor + '25'
              }}
            >
              <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: brandColor }} />
              <p className="text-[13px] text-[#a1a1a6] leading-relaxed">{tip}</p>
            </div>
          )}

          {/* Download All Button */}
          {!isInteractive && assets.length > 1 && (
            <div className="mb-6">
              <Button
                onClick={handleDownloadAll}
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Download All ({assets.length})
              </Button>
            </div>
          )}

          {/* Interactive Content (Matterport, 3D Tours) */}
          {isInteractive && (
            <div className="space-y-4">
              {assets.map((asset) => (
                <div key={asset.id} className="overflow-hidden rounded-xl border border-white/[0.08]">
                  <iframe
                    src={asset.aryeo_url}
                    className="h-[400px] w-full sm:h-[500px] lg:h-[600px]"
                    allowFullScreen
                    title={title}
                  />
                  <div className="flex justify-end bg-[#0a0a0a] p-3 border-t border-white/[0.08]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(asset.aryeo_url, '_blank')}
                    >
                      <Maximize2 className="mr-2 h-4 w-4" />
                      Open Fullscreen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Video Content */}
          {isVideo && !isInteractive && (
            <div className="grid gap-4 sm:grid-cols-2">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative overflow-hidden rounded-xl bg-[#0a0a0a] border border-white/[0.08]"
                >
                  <video
                    src={asset.aryeo_url}
                    controls
                    className="aspect-video w-full"
                    poster={asset.aryeo_url.replace(/\.[^/.]+$/, '-thumb.jpg')}
                  />
                  <button
                    onClick={() => handleDownload(asset)}
                    className="absolute right-3 top-3 rounded-full bg-black/70 backdrop-blur-sm p-2.5 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-black/90"
                    title="Download"
                  >
                    <Download className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Photo Grid */}
          {!isVideo && !isInteractive && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-[#0a0a0a] border border-white/[0.08]"
                >
                  <Image
                    src={asset.aryeo_url}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/30" />
                  <button
                    onClick={() => handleDownload(asset)}
                    className="absolute right-2 top-2 rounded-full bg-black/70 backdrop-blur-sm p-2 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-black/90"
                    title="Download"
                  >
                    <Download className="h-4 w-4 text-white" />
                  </button>
                  <button
                    onClick={() => setSelectedAsset(asset)}
                    className="absolute bottom-2 right-2 rounded-full bg-black/70 backdrop-blur-sm p-2 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-black/90"
                    title="View Full Size"
                  >
                    <Maximize2 className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {selectedAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
          onClick={() => setSelectedAsset(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-[#1c1c1e] border border-white/[0.08] p-2.5 text-white transition-colors hover:bg-[#2c2c2e]"
            onClick={() => setSelectedAsset(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <Image
            src={selectedAsset.aryeo_url}
            alt=""
            fill
            className="object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-6 flex gap-3">
            <Button onClick={() => handleDownload(selectedAsset)}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
