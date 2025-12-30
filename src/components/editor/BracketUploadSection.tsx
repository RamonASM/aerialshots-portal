'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Upload,
  X,
  Image,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { createBrowserClient } from '@supabase/ssr'

interface UploadedBracket {
  id: string
  storagePath: string
  previewUrl: string
}

interface BracketUploadSectionProps {
  listingId: string
  onBracketsUploaded: (brackets: UploadedBracket[]) => void
  disabled?: boolean
}

interface FileUploadState {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
  result?: UploadedBracket
}

export function BracketUploadSection({
  listingId,
  onBracketsUploaded,
  disabled = false,
}: BracketUploadSectionProps) {
  const [files, setFiles] = useState<FileUploadState[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | File[]) => {
      const fileArray = Array.from(selectedFiles).filter((file) =>
        file.type.startsWith('image/')
      )

      if (fileArray.length === 0) return

      // Add files to state
      const newFileStates: FileUploadState[] = fileArray.map((file) => ({
        file,
        progress: 0,
        status: 'pending' as const,
      }))

      setFiles((prev) => [...prev, ...newFileStates])

      // Upload each file
      const uploadResults: UploadedBracket[] = []

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        const fileIndex = files.length + i

        try {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex ? { ...f, status: 'uploading' as const, progress: 10 } : f
            )
          )

          // Generate unique filename
          const timestamp = Date.now()
          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
          const storagePath = `staged-photos/${listingId}/${timestamp}_${i}.${ext}`

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('media')
            .upload(storagePath, file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) {
            throw new Error(uploadError.message)
          }

          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex ? { ...f, progress: 50 } : f
            )
          )

          // Create media asset record
          const { data: assetData, error: assetError } = await supabase
            .from('media_assets')
            .insert({
              listing_id: listingId,
              storage_path: storagePath,
              type: 'photo',
              category: 'bracket',
              qc_status: 'pending',
              original_filename: file.name,
            })
            .select('id')
            .single()

          if (assetError) {
            throw new Error(assetError.message)
          }

          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex ? { ...f, progress: 80 } : f
            )
          )

          // Get public URL for preview
          const { data: urlData } = supabase.storage
            .from('media')
            .getPublicUrl(storagePath)

          const result: UploadedBracket = {
            id: assetData.id,
            storagePath,
            previewUrl: urlData.publicUrl,
          }

          uploadResults.push(result)

          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex
                ? { ...f, status: 'complete' as const, progress: 100, result }
                : f
            )
          )
        } catch (error) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex
                ? {
                    ...f,
                    status: 'error' as const,
                    error: error instanceof Error ? error.message : 'Upload failed',
                  }
                : f
            )
          )
        }
      }

      // Notify parent of all successfully uploaded brackets
      if (uploadResults.length > 0) {
        const allCompleted = [
          ...files.filter((f) => f.status === 'complete' && f.result).map((f) => f.result!),
          ...uploadResults,
        ]
        onBracketsUploaded(allCompleted)
      }
    },
    [files, listingId, supabase, onBracketsUploaded]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (!disabled && e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files)
      }
    },
    [disabled, handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeFile = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, idx) => idx !== index))
      // Update parent with remaining completed files
      const remaining = files
        .filter((f, idx) => idx !== index && f.status === 'complete' && f.result)
        .map((f) => f.result!)
      onBracketsUploaded(remaining)
    },
    [files, onBracketsUploaded]
  )

  const completedCount = files.filter((f) => f.status === 'complete').length
  const uploadingCount = files.filter((f) => f.status === 'uploading').length

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium mb-1">
          Drop bracket images here or click to upload
        </p>
        <p className="text-xs text-muted-foreground">
          Upload 2-7 bracket exposures for HDR processing (RAW or JPEG)
        </p>
      </div>

      {/* Upload Status */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedCount} of {files.length} uploaded
              {uploadingCount > 0 && ` (${uploadingCount} in progress)`}
            </span>
            {completedCount >= 2 && (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Ready for processing
              </span>
            )}
          </div>

          {/* File List */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {files.map((fileState, index) => (
              <div
                key={index}
                className={`
                  relative aspect-square rounded-lg overflow-hidden border
                  ${fileState.status === 'complete' ? 'border-green-500' : ''}
                  ${fileState.status === 'error' ? 'border-destructive' : ''}
                  ${fileState.status === 'uploading' || fileState.status === 'pending' ? 'border-border' : ''}
                `}
              >
                {/* Preview Image */}
                {fileState.result?.previewUrl ? (
                  <img
                    src={fileState.result.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-muted flex items-center justify-center">
                    <Image className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                {/* Status Overlay */}
                {fileState.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-2">
                    <Loader2 className="h-6 w-6 text-white animate-spin mb-2" />
                    <Progress value={fileState.progress} className="h-1 w-full" />
                  </div>
                )}

                {fileState.status === 'error' && (
                  <div className="absolute inset-0 bg-destructive/80 flex items-center justify-center p-2">
                    <div className="text-center">
                      <AlertCircle className="h-6 w-6 text-white mx-auto mb-1" />
                      <p className="text-xs text-white truncate">
                        {fileState.error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Success Indicator */}
                {fileState.status === 'complete' && (
                  <div className="absolute bottom-1 left-1 p-1 rounded-full bg-green-500">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minimum Requirement Warning */}
      {files.length > 0 && completedCount < 2 && (
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <AlertCircle className="h-4 w-4" />
          <span>At least 2 bracket images are required for HDR processing</span>
        </div>
      )}
    </div>
  )
}
