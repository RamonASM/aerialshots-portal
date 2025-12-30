'use client'

import { useState } from 'react'
import { Download, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resolveMediaUrl } from '@/lib/storage/resolve-url'
import type { Database } from '@/lib/supabase/types'

type MediaAsset = Database['public']['Tables']['media_assets']['Row']

interface DownloadAllButtonProps {
  assets: MediaAsset[]
  listingAddress: string
}

export function DownloadAllButton({ assets, listingAddress }: DownloadAllButtonProps) {
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState(0)
  const [completed, setCompleted] = useState(false)

  const downloadableAssets = assets.filter(
    (a) => a.type !== 'matterport' && a.type !== 'interactive' && resolveMediaUrl(a)
  )

  const handleDownloadAll = async () => {
    if (downloading) return

    setDownloading(true)
    setProgress(0)
    setCurrentFile(0)
    setCompleted(false)

    try {
      // For simplicity, we'll download files one by one
      // In production, you might want to use a ZIP library like JSZip
      for (let i = 0; i < downloadableAssets.length; i++) {
        const asset = downloadableAssets[i]
        const assetUrl = resolveMediaUrl(asset)
        if (!assetUrl) continue
        setCurrentFile(i + 1)
        try {
          const response = await fetch(assetUrl)
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url

          // Determine file extension based on type
          const ext = asset.type === 'video' ? 'mp4' : asset.type === 'floorplan' ? 'pdf' : 'jpg'
          const fileName = `${listingAddress.replace(/[^a-zA-Z0-9]/g, '-')}-${asset.category ?? asset.type}-${i + 1}.${ext}`

          a.download = fileName
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)

          setProgress(Math.round(((i + 1) / downloadableAssets.length) * 100))

          // Small delay between downloads to prevent browser throttling
          await new Promise((resolve) => setTimeout(resolve, 300))
        } catch (error) {
          console.error(`Failed to download asset ${asset.id}:`, error)
        }
      }
      setCompleted(true)
      // Reset after 3 seconds
      setTimeout(() => {
        setCompleted(false)
        setProgress(0)
        setCurrentFile(0)
      }, 3000)
    } finally {
      setDownloading(false)
    }
  }

  if (downloadableAssets.length === 0) return null

  // Show progress panel when downloading
  if (downloading || completed) {
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4 min-w-[280px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {completed ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-[#0077ff]" />
              )}
              <span className="text-[13px] font-medium text-white">
                {completed ? 'Download Complete!' : 'Downloading...'}
              </span>
            </div>
            <span className="text-[13px] font-medium text-[#0077ff]">{progress}%</span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                completed ? 'bg-green-500' : 'bg-[#0077ff]'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {!completed && (
            <p className="mt-2 text-[11px] text-[#636366]">
              File {currentFile} of {downloadableAssets.length}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <Button
      onClick={handleDownloadAll}
      disabled={downloading}
      size="lg"
    >
      <Download className="mr-2 h-5 w-5" />
      Download All ({downloadableAssets.length} files)
    </Button>
  )
}
