'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  CheckCircle,
  Loader2,
  Camera,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BracketUploadSection } from '@/components/editor/BracketUploadSection'

interface UploadedBracket {
  id: string
  storagePath: string
  previewUrl: string
}

interface PhotographerJobClientProps {
  listingId: string
  assignmentId: string
  isRush: boolean
}

export function PhotographerJobClient({
  listingId,
  assignmentId,
  isRush,
}: PhotographerJobClientProps) {
  const router = useRouter()
  const [uploadedBrackets, setUploadedBrackets] = useState<UploadedBracket[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Handle bracket upload complete
  const handleBracketsUploaded = useCallback((brackets: UploadedBracket[]) => {
    setUploadedBrackets(brackets)
    setSubmitError(null)
    setSubmitSuccess(false)
  }, [])

  // Submit for HDR processing
  const handleSubmitProcessing = async () => {
    if (uploadedBrackets.length < 2) {
      setSubmitError('Please upload at least 2 bracketed exposures for HDR processing')
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
          source: 'photographer',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit processing job')
      }

      // Clear uploaded brackets after successful submission
      setUploadedBrackets([])
      setSubmitSuccess(true)
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit processing job')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-white/[0.08] bg-[#1c1c1e]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Camera className="h-5 w-5" />
          HDR Bracket Upload
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Upload your bracketed exposures for HDR processing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Success Message */}
        {submitSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium text-green-400">Photos submitted for processing!</p>
              <p className="text-sm text-green-400/80">
                The editing team will process your HDR brackets.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {submitError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-red-400">{submitError}</p>
          </div>
        )}

        {/* Upload Section */}
        {!submitSuccess && (
          <>
            <BracketUploadSection
              listingId={listingId}
              onBracketsUploaded={handleBracketsUploaded}
              disabled={isSubmitting}
            />

            {/* Submit Button */}
            {uploadedBrackets.length >= 2 && (
              <div className="pt-4 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">
                    {uploadedBrackets.length} bracket{uploadedBrackets.length !== 1 ? 's' : ''} ready
                  </p>
                  <Button
                    onClick={handleSubmitProcessing}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Submit for Processing
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Upload another set */}
        {submitSuccess && (
          <Button
            variant="outline"
            onClick={() => setSubmitSuccess(false)}
            className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <Camera className="mr-2 h-4 w-4" />
            Upload More Photos
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
