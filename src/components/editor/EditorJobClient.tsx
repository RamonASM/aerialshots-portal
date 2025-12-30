'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Image,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ProcessingOptionsPanel,
  useProcessingOptions,
  optionsToAPI,
  type ProcessingOptions,
} from '@/components/processing/ProcessingOptionsPanel'
import { useRealtimeProcessing, type ProcessingJob } from '@/hooks/useRealtimeProcessing'
import { MediaAssetsGallery } from './MediaAssetsGallery'
import { BracketUploadSection } from './BracketUploadSection'

interface Photo {
  id: string
  url: string
  storagePath: string | null
  category: string | null
  qcStatus: string | null
  processingJobId: string | null
}

interface EditorJobClientProps {
  listingId: string
  isRush: boolean
  photos: Photo[]
  initialProcessingJob: ProcessingJob | null
}

export function EditorJobClient({
  listingId,
  isRush,
  photos,
  initialProcessingJob,
}: EditorJobClientProps) {
  const router = useRouter()
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])
  const [uploadedBrackets, setUploadedBrackets] = useState<
    Array<{ id: string; storagePath: string; previewUrl: string }>
  >([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)

  const { options, setOptions } = useProcessingOptions()

  // Real-time processing status
  const {
    latestJob,
    isProcessing,
    progress,
    isConnected,
  } = useRealtimeProcessing({
    listingId,
    enabled: true,
    onComplete: (job) => {
      // Refresh the page when processing completes
      router.refresh()
    },
    onError: (job) => {
      setSubmitError(job.error_message || 'Processing failed')
    },
  })

  const activeJob = latestJob || initialProcessingJob

  // Handle photo selection
  const togglePhotoSelection = useCallback((photoId: string) => {
    setSelectedPhotoIds(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    )
  }, [])

  const selectAllPhotos = useCallback(() => {
    setSelectedPhotoIds(photos.map(p => p.id))
  }, [photos])

  const clearSelection = useCallback(() => {
    setSelectedPhotoIds([])
  }, [])

  // Handle bracket upload complete
  const handleBracketsUploaded = useCallback((brackets: Array<{ id: string; storagePath: string; previewUrl: string }>) => {
    setUploadedBrackets(brackets)
  }, [])

  // Submit for processing
  const handleSubmitProcessing = async () => {
    if (uploadedBrackets.length < 2) {
      setSubmitError('At least 2 bracket images are required for HDR processing')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/founddr/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId,
          mediaAssetIds: uploadedBrackets.map(b => b.id),
          storagePaths: uploadedBrackets.map(b => b.storagePath),
          isRush,
          options: optionsToAPI(options),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit processing job')
      }

      // Clear uploaded brackets after successful submission
      setUploadedBrackets([])
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit processing job')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Mark as complete (advance to QC)
  const handleMarkComplete = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch(`/api/admin/listings/${listingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'ready_for_qc',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update status')
      }

      router.push('/team/editor')
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to mark as complete')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Processing Status Banner */}
      {activeJob && (
        <Card className={
          activeJob.status === 'completed'
            ? 'border-green-500/50 bg-green-500/5'
            : activeJob.status === 'failed'
              ? 'border-destructive/50 bg-destructive/5'
              : 'border-blue-500/50 bg-blue-500/5'
        }>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              {activeJob.status === 'completed' ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : activeJob.status === 'failed' ? (
                <XCircle className="h-6 w-6 text-destructive" />
              ) : (
                <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">
                    {activeJob.status === 'completed'
                      ? 'Processing Complete'
                      : activeJob.status === 'failed'
                        ? 'Processing Failed'
                        : progress?.stageLabel || 'Processing...'}
                  </p>
                  {progress?.estimatedSecondsRemaining != null && (
                    <span className="text-sm text-muted-foreground">
                      ~{Math.ceil(progress.estimatedSecondsRemaining)}s remaining
                    </span>
                  )}
                </div>
                {isProcessing && progress && (
                  <Progress value={progress.overallProgress} className="h-2" />
                )}
                {activeJob.status === 'failed' && activeJob.error_message && (
                  <p className="text-sm text-destructive mt-1">{activeJob.error_message}</p>
                )}
              </div>
              {!isConnected && (
                <Badge variant="outline" className="text-amber-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Reconnecting...
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Banner */}
      {submitError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">{submitError}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSubmitError(null)}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Assets Gallery */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-muted-foreground" />
              Photos ({photos.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              {selectedPhotoIds.length > 0 && (
                <>
                  <Badge variant="secondary">
                    {selectedPhotoIds.length} selected
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={selectAllPhotos}>
                Select All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MediaAssetsGallery
            photos={photos}
            selectedIds={selectedPhotoIds}
            onToggleSelect={togglePhotoSelection}
          />
        </CardContent>
      </Card>

      {/* Bracket Upload Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-muted-foreground" />
            HDR Bracket Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BracketUploadSection
            listingId={listingId}
            onBracketsUploaded={handleBracketsUploaded}
            disabled={isProcessing || isSubmitting}
          />
        </CardContent>
      </Card>

      {/* Processing Options */}
      {uploadedBrackets.length >= 2 && (
        <Card>
          <CardHeader
            className="pb-3 cursor-pointer"
            onClick={() => setShowOptions(!showOptions)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
                Processing Options
              </CardTitle>
              {showOptions ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {showOptions && (
            <CardContent className="pt-0">
              <ProcessingOptionsPanel
                value={options}
                onChange={setOptions}
                disabled={isProcessing || isSubmitting}
              />
            </CardContent>
          )}
        </Card>
      )}

      {/* Action Bar */}
      <div className="fixed bottom-16 left-0 right-0 lg:bottom-0 lg:left-64 bg-card border-t border-border p-4 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {uploadedBrackets.length > 0 && (
              <Badge variant="secondary" className="text-sm">
                {uploadedBrackets.length} brackets ready
              </Badge>
            )}
            {isProcessing && (
              <Badge variant="outline" className="text-blue-600">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Processing
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {uploadedBrackets.length >= 2 && !isProcessing && (
              <Button
                onClick={handleSubmitProcessing}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Start HDR Processing
              </Button>
            )}
            {activeJob?.status === 'completed' && (
              <Button
                onClick={handleMarkComplete}
                disabled={isSubmitting}
                variant="default"
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Send to QC
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
