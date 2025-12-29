'use client'

import { useState, use, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  Clock,
  Loader2,
  Image as ImageIcon,
  Eye,
  DownloadCloud,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProcessedGallery } from '@/components/photographer/ProcessedGallery'
import { useRealtimeProcessing } from '@/hooks/useRealtimeProcessing'
import { ProcessingProgress } from '@/components/processing/ProcessingProgress'
import type { Database } from '@/lib/supabase/types'

type MediaAsset = Database['public']['Tables']['media_assets']['Row']

interface ProcessedPhoto {
  id: string
  originalUrl: string
  processedUrl: string | null
  filename: string
  category: string
  qcStatus: string
  processingTime?: number
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [photos, setPhotos] = useState<ProcessedPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [listing, setListing] = useState<{ address?: string; ops_status?: string } | null>(null)
  const [downloadingAll, setDownloadingAll] = useState(false)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Realtime processing status for any ongoing jobs
  const { isProcessing, progress, completedJobs, latestJob } = useRealtimeProcessing({
    listingId: id,
    enabled: true,
  })

  const fetchPhotos = async () => {
    setLoading(true)

    try {
      // Fetch listing info
      const { data: listingData } = await supabase
        .from('listings')
        .select('address, ops_status')
        .eq('id', id)
        .single()

      setListing(listingData)

      // Fetch media assets
      const { data: assets, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('listing_id', id)
        .eq('type', 'photo')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Transform to ProcessedPhoto format
      const processedPhotos: ProcessedPhoto[] = (assets || []).map((asset: MediaAsset) => ({
        id: asset.id,
        originalUrl: asset.storage_path
          ? supabase.storage.from('staged-photos').getPublicUrl(asset.storage_path).data.publicUrl
          : asset.aryeo_url || '',
        processedUrl: asset.processed_storage_path
          ? supabase.storage.from('processed-photos').getPublicUrl(asset.processed_storage_path).data.publicUrl
          : null,
        filename: asset.original_filename || `photo-${asset.id.slice(0, 8)}`,
        category: asset.category || 'photo',
        qcStatus: asset.qc_status || 'pending',
      }))

      setPhotos(processedPhotos)
    } catch (err) {
      console.error('Error fetching photos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPhotos()
  }, [id])

  // Refresh when processing completes
  useEffect(() => {
    if (completedJobs.length > 0) {
      fetchPhotos()
    }
  }, [completedJobs.length])

  const downloadAll = async () => {
    setDownloadingAll(true)

    try {
      // Create a simple download of all processed images
      const processedPhotos = photos.filter(p => p.processedUrl)

      for (const photo of processedPhotos) {
        if (photo.processedUrl) {
          const link = document.createElement('a')
          link.href = photo.processedUrl
          link.download = photo.filename
          link.target = '_blank'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }
    } catch (err) {
      console.error('Download error:', err)
    } finally {
      setDownloadingAll(false)
    }
  }

  const processedCount = photos.filter(p => p.processedUrl).length
  const pendingCount = photos.filter(p => !p.processedUrl && p.qcStatus === 'processing').length
  const approvedCount = photos.filter(p => p.qcStatus === 'approved').length

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/admin/ops/photographer/jobs/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-neutral-900">Processed Photos</h1>
            {listing?.address && (
              <p className="text-sm text-neutral-600 truncate">{listing.address}</p>
            )}
          </div>
          <Button
            onClick={downloadAll}
            disabled={downloadingAll || processedCount === 0}
            variant="outline"
          >
            {downloadingAll ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <DownloadCloud className="mr-2 h-4 w-4" />
                Download All
              </>
            )}
          </Button>
        </div>
      </header>

      <div className="p-4">
        {/* Stats */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-neutral-500" />
              <span className="text-sm text-neutral-600">Total</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{photos.length}</p>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-neutral-600">Processed</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-green-600">{processedCount}</p>
          </div>
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-neutral-600">Pending</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-600">{pendingCount}</p>
          </div>
        </div>

        {/* Processing status if still running */}
        {isProcessing && (
          <ProcessingProgress
            progress={progress}
            isProcessing={isProcessing}
            errorMessage={latestJob?.error_message}
            variant="compact"
            className="mb-4"
          />
        )}

        {/* Processing metrics summary */}
        {latestJob?.metrics?.total_time_ms && !isProcessing && (
          <div className="mb-4 rounded-lg bg-green-50 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Processing completed in {(latestJob.metrics.total_time_ms / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        )}

        {/* Refresh button */}
        <div className="mb-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchPhotos}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Photo Gallery */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        ) : photos.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-neutral-300" />
            <p className="mt-4 text-neutral-600">No photos found</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href={`/admin/ops/photographer/jobs/${id}/upload`}>
                Upload Photos
              </Link>
            </Button>
          </div>
        ) : (
          <ProcessedGallery photos={photos} />
        )}
      </div>
    </div>
  )
}
