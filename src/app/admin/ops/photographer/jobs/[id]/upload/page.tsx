'use client'

import { useState, useCallback, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import {
  ArrowLeft,
  Upload,
  X,
  Check,
  Loader2,
  Camera,
  Home,
  Trees,
  Plane,
  Wand2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useRealtimeProcessing } from '@/hooks/useRealtimeProcessing'
import { ProcessingProgress } from '@/components/processing/ProcessingProgress'
import type { Database } from '@/lib/supabase/types'

interface PhotoUpload {
  id: string
  file: File
  preview: string
  category: 'interior' | 'exterior' | 'drone'
  uploading: boolean
  uploaded: boolean
  storagePath?: string
  mediaAssetId?: string
  error?: string
}

export default function UploadPhotosPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [photos, setPhotos] = useState<PhotoUpload[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enableHDR, setEnableHDR] = useState(true)
  const [processingStarted, setProcessingStarted] = useState(false)

  // Realtime processing status
  const {
    isProcessing,
    progress,
    latestJob,
    isConnected,
  } = useRealtimeProcessing({
    listingId: id,
    enabled: processingStarted,
    onComplete: () => {
      // Redirect to results page when processing completes
      router.push(`/admin/ops/photographer/jobs/${id}/results`)
    },
    onError: (job) => {
      setError(job.error_message || 'HDR processing failed')
    },
  })

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      const newPhotos: PhotoUpload[] = files.map((file) => ({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
        category: 'interior' as const,
        uploading: false,
        uploaded: false,
      }))
      setPhotos((prev) => [...prev, ...newPhotos])
      e.target.value = ''
    },
    []
  )

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id)
      if (photo) {
        URL.revokeObjectURL(photo.preview)
      }
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const setPhotoCategory = useCallback(
    (photoId: string, category: PhotoUpload['category']) => {
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, category } : p))
      )
    },
    []
  )

  const triggerHDRProcessing = async (
    uploadedPhotos: PhotoUpload[]
  ): Promise<void> => {
    const storagePaths = uploadedPhotos
      .filter((p) => p.storagePath && p.mediaAssetId)
      .map((p) => p.storagePath!)

    const mediaAssetIds = uploadedPhotos
      .filter((p) => p.mediaAssetId)
      .map((p) => p.mediaAssetId!)

    if (storagePaths.length < 2) {
      console.log('Not enough photos for HDR processing, skipping')
      return
    }

    // Enable realtime subscription
    setProcessingStarted(true)

    try {
      // Call the Portal API which will call FoundDR
      const response = await fetch('/api/processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: id,
          media_asset_ids: mediaAssetIds,
          storage_paths: storagePaths,
          is_rush: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start processing')
      }

      // Update listing status to processing
      await supabase
        .from('listings')
        .update({ ops_status: 'processing' })
        .eq('id', id)

    } catch (err) {
      console.error('HDR processing error:', err)
      setError(err instanceof Error ? err.message : 'Processing failed')
      setProcessingStarted(false)
    }
  }

  const handleSubmit = async () => {
    if (photos.length === 0) {
      setError('Please add at least one photo')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const uploadedPhotos: PhotoUpload[] = []

    try {
      // Upload each photo
      for (const photo of photos) {
        setPhotos((prev) =>
          prev.map((p) => (p.id === photo.id ? { ...p, uploading: true } : p))
        )

        const fileExt = photo.file.name.split('.').pop()
        const fileName = `${id}/${Date.now()}-${photo.id}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('staged-photos')
          .upload(fileName, photo.file)

        if (uploadError) {
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photo.id
                ? { ...p, uploading: false, error: uploadError.message }
                : p
            )
          )
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('staged-photos')
          .getPublicUrl(fileName)

        // Create media asset record
        const { data: assetData, error: assetError } = await supabase
          .from('media_assets')
          .insert({
            listing_id: id,
            aryeo_url: urlData.publicUrl,
            storage_path: fileName,
            type: 'photo',
            category: photo.category,
            qc_status: enableHDR ? 'processing' : 'pending',
            original_filename: photo.file.name,
            file_size_bytes: photo.file.size,
          })
          .select('id')
          .single()

        if (assetError) {
          console.error('Failed to create media asset:', assetError)
        }

        const updatedPhoto = {
          ...photo,
          uploading: false,
          uploaded: true,
          storagePath: fileName,
          mediaAssetId: assetData?.id,
        }

        uploadedPhotos.push(updatedPhoto)

        setPhotos((prev) =>
          prev.map((p) => (p.id === photo.id ? updatedPhoto : p))
        )
      }

      // Update listing status
      await supabase
        .from('listings')
        .update({ ops_status: enableHDR ? 'processing' : 'staged' })
        .eq('id', id)

      // Log event
      await supabase.from('job_events').insert({
        listing_id: id,
        event_type: 'photos_uploaded',
        new_value: JSON.parse(
          JSON.stringify({
            photo_count: photos.length,
            hdr_enabled: enableHDR,
          })
        ),
        actor_type: 'staff',
      })

      // Trigger HDR processing if enabled
      if (enableHDR && uploadedPhotos.length >= 2) {
        await triggerHDRProcessing(uploadedPhotos)
      }

      // Wait a moment to show success state
      await new Promise((resolve) => setTimeout(resolve, 1000))

      router.push('/admin/ops/photographer')
      router.refresh()
    } catch (err) {
      setError('Failed to upload photos. Please try again.')
      setIsSubmitting(false)
    }
  }

  const uploadedCount = photos.filter((p) => p.uploaded).length

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
            <h1 className="text-lg font-bold text-neutral-900">Upload Photos</h1>
            <p className="text-sm text-neutral-600">
              {photos.length} photos selected
            </p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || photos.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadedCount}/{photos.length}
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Submit
              </>
            )}
          </Button>
        </div>
      </header>

      <div className="p-4">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Processing Status Banner - Realtime */}
        {(isProcessing || processingStarted) && (
          <ProcessingProgress
            progress={progress}
            isProcessing={isProcessing || processingStarted}
            errorMessage={latestJob?.error_message}
            variant="full"
            className="mb-4"
          />
        )}

        {/* Connection status indicator */}
        {processingStarted && !isConnected && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Connecting to realtime updates...</span>
          </div>
        )}

        {/* View results button when complete */}
        {progress?.stage === 'completed' && (
          <div className="mb-4">
            <Button asChild className="w-full">
              <Link href={`/admin/ops/photographer/jobs/${id}/results`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Processed Photos
              </Link>
            </Button>
          </div>
        )}

        {/* HDR Processing Toggle */}
        <div className="mb-4 flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <Wand2 className="h-5 w-5 text-[#ff4533]" />
            <div>
              <p className="font-medium text-neutral-900">Auto HDR Processing</p>
              <p className="text-sm text-neutral-500">
                Automatically merge bracket photos for perfect exposure
              </p>
            </div>
          </div>
          <Switch
            checked={enableHDR}
            onCheckedChange={setEnableHDR}
            disabled={isSubmitting}
          />
        </div>

        {enableHDR && photos.length > 0 && photos.length < 2 && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4" />
            <span>HDR requires at least 2 bracket photos</span>
          </div>
        )}

        {/* Upload Button */}
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-white p-8 transition-colors hover:border-neutral-400">
          <Camera className="h-12 w-12 text-neutral-400" />
          <span className="mt-4 text-lg font-medium text-neutral-700">
            Add Photos
          </span>
          <span className="mt-1 text-sm text-neutral-500">
            {enableHDR
              ? 'Select 2-7 bracket photos for HDR'
              : 'Tap to select from camera roll or files'}
          </span>
          <input
            type="file"
            accept="image/*,.arw,.ARW,.dng,.DNG,.cr2,.CR2,.nef,.NEF"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 font-semibold text-neutral-900">
              Selected Photos
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className={`relative overflow-hidden rounded-lg bg-white shadow ${
                    photo.uploaded
                      ? 'ring-2 ring-green-500'
                      : photo.error
                        ? 'ring-2 ring-red-500'
                        : ''
                  }`}
                >
                  {/* Image */}
                  <div className="aspect-square">
                    <img
                      src={photo.preview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Remove Button */}
                  {!photo.uploading && !photo.uploaded && (
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {/* Upload Status Overlay */}
                  {photo.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}

                  {photo.uploaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/80">
                      <Check className="h-8 w-8 text-white" />
                    </div>
                  )}

                  {/* Category Selector */}
                  {!photo.uploading && !photo.uploaded && (
                    <div className="flex border-t border-neutral-100">
                      <button
                        onClick={() => setPhotoCategory(photo.id, 'interior')}
                        className={`flex flex-1 items-center justify-center gap-1 py-2 text-xs ${
                          photo.category === 'interior'
                            ? 'bg-[#ff4533] text-white'
                            : 'bg-white text-neutral-600'
                        }`}
                      >
                        <Home className="h-3 w-3" />
                        Int
                      </button>
                      <button
                        onClick={() => setPhotoCategory(photo.id, 'exterior')}
                        className={`flex flex-1 items-center justify-center gap-1 border-x border-neutral-100 py-2 text-xs ${
                          photo.category === 'exterior'
                            ? 'bg-[#ff4533] text-white'
                            : 'bg-white text-neutral-600'
                        }`}
                      >
                        <Trees className="h-3 w-3" />
                        Ext
                      </button>
                      <button
                        onClick={() => setPhotoCategory(photo.id, 'drone')}
                        className={`flex flex-1 items-center justify-center gap-1 py-2 text-xs ${
                          photo.category === 'drone'
                            ? 'bg-[#ff4533] text-white'
                            : 'bg-white text-neutral-600'
                        }`}
                      >
                        <Plane className="h-3 w-3" />
                        Drone
                      </button>
                    </div>
                  )}

                  {photo.error && (
                    <p className="bg-red-50 px-2 py-1 text-center text-xs text-red-600">
                      {photo.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-2 font-semibold text-neutral-900">Upload Tips</h2>
          <ul className="space-y-2 text-sm text-neutral-600">
            <li>• Tag each photo with the correct category (Interior, Exterior, Drone)</li>
            <li>• Upload all photos in one session for faster processing</li>
            <li>• Make sure photos are in focus and properly exposed</li>
            <li>• Include both wide shots and detail shots</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
