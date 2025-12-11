'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Download, ChevronDown, ChevronUp, Lightbulb, Play, Maximize2 } from 'lucide-react'
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
  brandColor = '#ff4533',
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
    <section className="border-b border-neutral-800">
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-neutral-900/50 sm:px-6"
      >
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-sm text-neutral-400">{description}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-300">
            {assets.length} {assets.length === 1 ? 'file' : 'files'}
          </span>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-neutral-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-neutral-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-6 sm:px-6">
          {/* Tip */}
          {tip && (
            <div
              className="mb-4 flex items-start gap-3 rounded-lg p-4"
              style={{ backgroundColor: brandColor + '10' }}
            >
              <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: brandColor }} />
              <p className="text-sm text-neutral-300">{tip}</p>
            </div>
          )}

          {/* Download All Button */}
          {!isInteractive && assets.length > 1 && (
            <div className="mb-4">
              <Button
                onClick={handleDownloadAll}
                variant="outline"
                className="border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
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
                <div key={asset.id} className="overflow-hidden rounded-lg">
                  <iframe
                    src={asset.aryeo_url}
                    className="h-[400px] w-full sm:h-[500px]"
                    allowFullScreen
                    title={title}
                  />
                  <div className="mt-2 flex justify-end">
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
                  className="group relative overflow-hidden rounded-lg bg-neutral-900"
                >
                  <video
                    src={asset.aryeo_url}
                    controls
                    className="aspect-video w-full"
                    poster={asset.aryeo_url.replace(/\.[^/.]+$/, '-thumb.jpg')}
                  />
                  <button
                    onClick={() => handleDownload(asset)}
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-2 opacity-0 transition-opacity group-hover:opacity-100"
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
                  className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-900"
                >
                  <Image
                    src={asset.aryeo_url}
                    alt=""
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30" />
                  <button
                    onClick={() => handleDownload(asset)}
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-2 opacity-0 transition-opacity group-hover:opacity-100"
                    title="Download"
                  >
                    <Download className="h-4 w-4 text-white" />
                  </button>
                  <button
                    onClick={() => setSelectedAsset(asset)}
                    className="absolute bottom-2 right-2 rounded-full bg-black/70 p-2 opacity-0 transition-opacity group-hover:opacity-100"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedAsset(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-neutral-800 p-2 text-white hover:bg-neutral-700"
            onClick={() => setSelectedAsset(null)}
          >
            <ChevronUp className="h-6 w-6 rotate-45" />
          </button>
          <Image
            src={selectedAsset.aryeo_url}
            alt=""
            fill
            className="object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 flex gap-2">
            <Button onClick={() => handleDownload(selectedAsset)} variant="secondary">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
