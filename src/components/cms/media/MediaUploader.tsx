'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Video, File, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

interface UploadingFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  url?: string
}

interface MediaUploaderProps {
  onUpload?: (files: File[]) => Promise<string[]>
  onComplete?: (urls: string[]) => void
  accept?: string
  maxFiles?: number
  maxSize?: number // in bytes
  className?: string
  multiple?: boolean
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return ImageIcon
  if (type.startsWith('video/')) return Video
  return File
}

export function MediaUploader({
  onUpload,
  onComplete,
  accept = 'image/*,video/*',
  maxFiles = 50,
  maxSize = 100 * 1024 * 1024, // 100MB default
  className,
  multiple = true,
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, maxFiles)

      // Validate files
      const validFiles: File[] = []
      const errors: string[] = []

      fileArray.forEach((file) => {
        if (file.size > maxSize) {
          errors.push(`${file.name} exceeds max size of ${formatFileSize(maxSize)}`)
        } else {
          validFiles.push(file)
        }
      })

      if (errors.length > 0) {
        console.warn('File validation errors:', errors)
      }

      if (validFiles.length === 0) return

      // Create uploading file entries
      const newUploads: UploadingFile[] = validFiles.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        progress: 0,
        status: 'pending',
      }))

      setUploadingFiles((prev) => [...prev, ...newUploads])

      // Simulate upload progress (replace with actual upload logic)
      if (onUpload) {
        try {
          // Update status to uploading
          setUploadingFiles((prev) =>
            prev.map((f) =>
              newUploads.find((n) => n.id === f.id) ? { ...f, status: 'uploading' as const } : f
            )
          )

          // Simulate progress
          const progressInterval = setInterval(() => {
            setUploadingFiles((prev) =>
              prev.map((f) => {
                if (f.status === 'uploading' && f.progress < 90) {
                  return { ...f, progress: Math.min(f.progress + 10, 90) }
                }
                return f
              })
            )
          }, 200)

          const urls = await onUpload(validFiles)

          clearInterval(progressInterval)

          // Update to completed
          setUploadingFiles((prev) =>
            prev.map((f, i) => {
              const idx = newUploads.findIndex((n) => n.id === f.id)
              if (idx !== -1) {
                return {
                  ...f,
                  status: 'completed' as const,
                  progress: 100,
                  url: urls[idx],
                }
              }
              return f
            })
          )

          onComplete?.(urls)
        } catch (error) {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              newUploads.find((n) => n.id === f.id)
                ? { ...f, status: 'error' as const, error: 'Upload failed' }
                : f
            )
          )
        }
      } else {
        // Demo mode - simulate upload
        for (const upload of newUploads) {
          setUploadingFiles((prev) =>
            prev.map((f) => (f.id === upload.id ? { ...f, status: 'uploading' as const } : f))
          )

          for (let progress = 0; progress <= 100; progress += 10) {
            await new Promise((resolve) => setTimeout(resolve, 100))
            setUploadingFiles((prev) =>
              prev.map((f) => (f.id === upload.id ? { ...f, progress } : f))
            )
          }

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === upload.id
                ? { ...f, status: 'completed' as const, url: URL.createObjectURL(upload.file) }
                : f
            )
          )
        }
      }
    },
    [maxFiles, maxSize, onUpload, onComplete]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      processFiles(e.dataTransfer.files)
    },
    [processFiles]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        processFiles(e.target.files)
      }
    },
    [processFiles]
  )

  const removeFile = useCallback((id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const clearCompleted = useCallback(() => {
    setUploadingFiles((prev) => prev.filter((f) => f.status !== 'completed'))
  }, [])

  const hasCompleted = uploadingFiles.some((f) => f.status === 'completed')

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
            : 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900/50 dark:hover:border-neutral-600'
        )}
      >
        <div
          className={cn(
            'mb-4 rounded-full p-3',
            isDragging
              ? 'bg-blue-100 dark:bg-blue-900/40'
              : 'bg-neutral-200 dark:bg-neutral-800'
          )}
        >
          <Upload
            className={cn(
              'h-6 w-6',
              isDragging ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500'
            )}
          />
        </div>
        <p className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {isDragging ? 'Drop files here' : 'Drag and drop files here'}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          or click to browse • Max {formatFileSize(maxSize)} per file
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Queue */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Uploads ({uploadingFiles.length})
            </h4>
            {hasCompleted && (
              <button
                onClick={clearCompleted}
                className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                Clear completed
              </button>
            )}
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {uploadingFiles.map((file) => {
              const FileIcon = getFileIcon(file.file.type)
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-700">
                    <FileIcon className="h-5 w-5 text-neutral-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                      {file.file.name}
                    </p>
                    <p className="text-xs text-neutral-500">{formatFileSize(file.file.size)}</p>

                    {file.status === 'uploading' && (
                      <Progress value={file.progress} size="sm" className="mt-2" />
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {file.status === 'completed' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {file.status === 'error' && (
                      <span title={file.error}>
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      </span>
                    )}
                    {(file.status === 'pending' || file.status === 'uploading') && (
                      <button
                        onClick={() => removeFile(file.id)}
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default MediaUploader
