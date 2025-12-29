'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  X,
  Undo2,
  Redo2,
  Trash2,
  Wand2,
  Check,
  RotateCcw,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InpaintCanvas, type InpaintCanvasHandle } from './InpaintCanvas'

interface InpaintModalProps {
  imageUrl: string
  assetId: string
  listingId: string
  onClose: () => void
  onSuccess: (newImageUrl: string) => void
}

type InpaintStatus = 'drawing' | 'submitting' | 'processing' | 'completed' | 'failed'

export function InpaintModal({
  imageUrl,
  assetId,
  listingId,
  onClose,
  onSuccess,
}: InpaintModalProps) {
  const canvasRef = useRef<InpaintCanvasHandle>(null)
  const [status, setStatus] = useState<InpaintStatus>('drawing')
  const [hasMask, setHasMask] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollStartTimeRef = useRef<number>(0)
  const pollErrorCountRef = useRef<number>(0)
  const MAX_POLL_TIME_MS = 120000 // 2 minutes max
  const MAX_POLL_ERRORS = 5

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // Handle mask submission
  const handleSubmit = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasMask) return

    setStatus('submitting')
    setError(null)

    try {
      // Get mask blob
      const maskBlob = await canvas.getMaskBlob()
      if (!maskBlob) {
        throw new Error('Failed to generate mask')
      }

      // Get image dimensions for the request
      const dimensions = canvas.getImageDimensions()

      // Create form data
      const formData = new FormData()
      formData.append('mask', maskBlob, 'mask.png')
      formData.append('asset_id', assetId)
      formData.append('listing_id', listingId)
      formData.append('image_url', imageUrl)
      formData.append('width', dimensions.width.toString())
      formData.append('height', dimensions.height.toString())

      // Submit to API
      const response = await fetch('/api/inpaint', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit inpainting request')
      }

      const data = await response.json()
      setJobId(data.job_id)
      setStatus('processing')

      // Initialize polling tracking
      pollStartTimeRef.current = Date.now()
      pollErrorCountRef.current = 0

      // Start polling for result
      pollIntervalRef.current = setInterval(async () => {
        try {
          // Check for timeout
          const elapsed = Date.now() - pollStartTimeRef.current
          if (elapsed > MAX_POLL_TIME_MS) {
            clearInterval(pollIntervalRef.current!)
            pollIntervalRef.current = null
            setError('Processing timed out. Please try again.')
            setStatus('failed')
            return
          }

          const statusResponse = await fetch(`/api/inpaint/${data.job_id}`)
          const statusData = await statusResponse.json()

          // Reset error count on successful response
          pollErrorCountRef.current = 0

          if (statusData.status === 'completed') {
            clearInterval(pollIntervalRef.current!)
            pollIntervalRef.current = null
            setResultUrl(statusData.output_url)
            setStatus('completed')
          } else if (statusData.status === 'failed') {
            clearInterval(pollIntervalRef.current!)
            pollIntervalRef.current = null
            setError(statusData.error_message || 'Inpainting failed')
            setStatus('failed')
          }
        } catch (e) {
          console.error('Polling error:', e)
          pollErrorCountRef.current++

          // Stop polling after too many errors
          if (pollErrorCountRef.current >= MAX_POLL_ERRORS) {
            clearInterval(pollIntervalRef.current!)
            pollIntervalRef.current = null
            setError('Network error. Please check your connection and try again.')
            setStatus('failed')
          }
        }
      }, 2000) // Poll every 2 seconds
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setStatus('failed')
    }
  }, [assetId, listingId, imageUrl, hasMask])

  // Handle accepting result
  const handleAccept = useCallback(() => {
    if (resultUrl) {
      onSuccess(resultUrl)
    }
  }, [resultUrl, onSuccess])

  // Handle retry
  const handleRetry = useCallback(() => {
    setStatus('drawing')
    setError(null)
    setResultUrl(null)
    setJobId(null)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        if (e.shiftKey) {
          canvasRef.current?.redo()
        } else {
          canvasRef.current?.undo()
        }
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white">
            <X className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-white">Object Removal</h2>
            <p className="text-sm text-neutral-400">
              {status === 'drawing' && 'Paint over objects you want to remove'}
              {status === 'submitting' && 'Uploading mask...'}
              {status === 'processing' && 'AI is removing objects...'}
              {status === 'completed' && 'Review the result'}
              {status === 'failed' && 'Processing failed'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {status === 'drawing' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => canvasRef.current?.undo()}
                className="text-neutral-400 hover:text-white"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => canvasRef.current?.redo()}
                className="text-neutral-400 hover:text-white"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => canvasRef.current?.clearMask()}
                className="text-neutral-400 hover:text-white"
                title="Clear all"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="mx-2 h-6 w-px bg-neutral-700" />
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!hasMask}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Remove Objects
              </Button>
            </>
          )}

          {status === 'completed' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetry}
                className="text-neutral-400 hover:text-white"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="mr-2 h-4 w-4" />
                Accept Result
              </Button>
            </>
          )}

          {status === 'failed' && (
            <Button
              size="sm"
              onClick={handleRetry}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="mt-16 flex items-center justify-center p-8">
        {(status === 'drawing' || status === 'submitting') && (
          <div className="relative">
            <InpaintCanvas
              ref={canvasRef}
              imageUrl={imageUrl}
              onMaskChange={setHasMask}
            />
            {status === 'submitting' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="flex items-center gap-3 rounded-lg bg-neutral-900 px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
                  <span className="text-white">Uploading...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {status === 'processing' && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <img
                src={imageUrl}
                alt=""
                className="max-h-[70vh] max-w-[80vw] object-contain opacity-50"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 rounded-lg bg-neutral-900/90 px-8 py-6">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
                  <div className="text-center">
                    <p className="text-lg font-medium text-white">
                      AI is removing objects...
                    </p>
                    <p className="text-sm text-neutral-400">
                      This usually takes 5-15 seconds
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {status === 'completed' && resultUrl && (
          <div className="flex flex-col items-center gap-4">
            <img
              src={resultUrl}
              alt="Inpainted result"
              className="max-h-[70vh] max-w-[80vw] object-contain rounded-lg"
            />
            <p className="text-sm text-neutral-400">
              Objects have been removed. Accept to save changes.
            </p>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex flex-col items-center gap-4 rounded-lg bg-red-900/30 p-8">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-center">
              <p className="text-lg font-medium text-white">Processing Failed</p>
              <p className="text-sm text-red-400">{error || 'An unknown error occurred'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions overlay for drawing mode */}
      {status === 'drawing' && !hasMask && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="rounded-lg bg-neutral-800/90 px-4 py-2 text-sm text-neutral-300">
            Paint over objects to remove them. Use the brush slider to adjust size.
          </div>
        </div>
      )}
    </div>
  )
}
