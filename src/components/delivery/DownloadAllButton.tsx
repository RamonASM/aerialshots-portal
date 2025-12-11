'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/types'

type MediaAsset = Database['public']['Tables']['media_assets']['Row']

interface DownloadAllButtonProps {
  assets: MediaAsset[]
  listingAddress: string
}

export function DownloadAllButton({ assets, listingAddress }: DownloadAllButtonProps) {
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleDownloadAll = async () => {
    if (downloading) return

    setDownloading(true)
    setProgress(0)

    try {
      // For simplicity, we'll download files one by one
      // In production, you might want to use a ZIP library like JSZip
      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i]
        try {
          const response = await fetch(asset.aryeo_url)
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

          setProgress(Math.round(((i + 1) / assets.length) * 100))

          // Small delay between downloads to prevent browser throttling
          await new Promise((resolve) => setTimeout(resolve, 300))
        } catch (error) {
          console.error(`Failed to download asset ${asset.id}:`, error)
        }
      }
    } finally {
      setDownloading(false)
      setProgress(0)
    }
  }

  const downloadableAssets = assets.filter(
    (a) => a.type !== 'matterport' && a.type !== 'interactive'
  )

  if (downloadableAssets.length === 0) return null

  return (
    <Button
      onClick={handleDownloadAll}
      disabled={downloading}
      size="lg"
      className="bg-[#ff4533] hover:bg-[#e63e2e]"
    >
      {downloading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Downloading... {progress}%
        </>
      ) : (
        <>
          <Download className="mr-2 h-5 w-5" />
          Download All ({downloadableAssets.length} files)
        </>
      )}
    </Button>
  )
}
