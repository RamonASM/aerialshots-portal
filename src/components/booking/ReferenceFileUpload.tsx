'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Upload,
  X,
  FileImage,
  FileText,
  File,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  MapPin,
  Key,
  FileQuestion,
} from 'lucide-react'

interface ReferenceFileUploadProps {
  listingId?: string
  bookingToken?: string
  onFilesUploaded?: (
    files: Array<{ id: string; filename: string; url: string; type: string }>
  ) => void
  className?: string
}

interface FileWithPreview {
  file: File
  preview?: string
  type: string
  notes: string
  uploading: boolean
  uploaded: boolean
  error?: string
  uploadedId?: string
}

const FILE_TYPES = [
  { value: 'property_line', label: 'Property Line', icon: MapPin },
  { value: 'access_code', label: 'Access Code/Gate Info', icon: Key },
  { value: 'example_shot', label: 'Example/Reference Shot', icon: Camera },
  { value: 'floor_plan', label: 'Floor Plan', icon: FileImage },
  { value: 'special_instructions', label: 'Special Instructions', icon: FileText },
  { value: 'other', label: 'Other', icon: FileQuestion },
]

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
  'text/plain',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 10

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return FileImage
  }
  if (mimeType === 'application/pdf' || mimeType === 'text/plain') {
    return FileText
  }
  return File
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ReferenceFileUpload({
  listingId,
  bookingToken,
  onFilesUploaded,
  className = '',
}: ReferenceFileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }, [])

  const handleFiles = (newFiles: File[]) => {
    const validFiles: FileWithPreview[] = []

    for (const file of newFiles) {
      // Check total file count
      if (files.length + validFiles.length >= MAX_FILES) {
        break
      }

      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        continue
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        continue
      }

      // Create preview for images
      let preview: string | undefined
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      validFiles.push({
        file,
        preview,
        type: 'other',
        notes: '',
        uploading: false,
        uploaded: false,
      })
    }

    setFiles((prev) => [...prev, ...validFiles])
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const updateFileType = (index: number, type: string) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      newFiles[index] = { ...newFiles[index], type }
      return newFiles
    })
  }

  const updateFileNotes = (index: number, notes: string) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      newFiles[index] = { ...newFiles[index], notes }
      return newFiles
    })
  }

  const uploadFiles = async () => {
    const pendingFiles = files.filter((f) => !f.uploaded)
    if (pendingFiles.length === 0) return

    setUploading(true)
    const uploadedFiles: Array<{ id: string; filename: string; url: string; type: string }> = []

    for (let i = 0; i < files.length; i++) {
      const fileWithPreview = files[i]
      if (fileWithPreview.uploaded) continue

      // Mark as uploading
      setFiles((prev) => {
        const newFiles = [...prev]
        newFiles[i] = { ...newFiles[i], uploading: true, error: undefined }
        return newFiles
      })

      try {
        const formData = new FormData()
        formData.append('files', fileWithPreview.file)
        formData.append('fileType', fileWithPreview.type)
        formData.append('notes', fileWithPreview.notes)
        if (listingId) formData.append('listingId', listingId)
        if (bookingToken) formData.append('bookingToken', bookingToken)

        const response = await fetch('/api/booking/reference-files', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Upload failed')
        }

        // Mark as uploaded
        setFiles((prev) => {
          const newFiles = [...prev]
          newFiles[i] = {
            ...newFiles[i],
            uploading: false,
            uploaded: true,
            uploadedId: data.files[0]?.id,
          }
          return newFiles
        })

        if (data.files[0]) {
          uploadedFiles.push(data.files[0])
        }
      } catch (error) {
        // Mark as error
        setFiles((prev) => {
          const newFiles = [...prev]
          newFiles[i] = {
            ...newFiles[i],
            uploading: false,
            error: error instanceof Error ? error.message : 'Upload failed',
          }
          return newFiles
        })
      }
    }

    setUploading(false)
    if (uploadedFiles.length > 0) {
      onFilesUploaded?.(uploadedFiles)
    }
  }

  const pendingCount = files.filter((f) => !f.uploaded && !f.error).length
  const uploadedCount = files.filter((f) => f.uploaded).length

  return (
    <div className={`rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4 ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-400" />
          <h4 className="font-medium text-white">Reference Files</h4>
        </div>
        <span className="text-xs text-[#8e8e93]">
          {files.length}/{MAX_FILES} files
        </span>
      </div>

      {/* Description */}
      <p className="mb-4 text-sm text-[#a1a1a6]">
        Upload property line images, access codes, example shots, or any reference materials for
        the photographer.
      </p>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-white/[0.12] hover:border-white/[0.24] hover:bg-white/[0.04]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
        <Upload className="mx-auto mb-2 h-8 w-8 text-[#8e8e93]" />
        <p className="text-sm text-white">
          Drag & drop files here or <span className="text-blue-400">browse</span>
        </p>
        <p className="mt-1 text-xs text-[#8e8e93]">
          JPG, PNG, WebP, HEIC, PDF, TXT (max 10MB each)
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-3">
          {files.map((fileWithPreview, index) => {
            const FileIcon = getFileIcon(fileWithPreview.file.type)

            return (
              <div
                key={index}
                className={`rounded-lg border p-3 ${
                  fileWithPreview.error
                    ? 'border-red-500/20 bg-red-500/10'
                    : fileWithPreview.uploaded
                      ? 'border-green-500/20 bg-green-500/10'
                      : 'border-white/[0.08] bg-white/[0.04]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Preview/Icon */}
                  {fileWithPreview.preview ? (
                    <img
                      src={fileWithPreview.preview}
                      alt={fileWithPreview.file.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.08]">
                      <FileIcon className="h-6 w-6 text-[#a1a1a6]" />
                    </div>
                  )}

                  {/* File Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {fileWithPreview.file.name}
                        </p>
                        <p className="text-xs text-[#8e8e93]">
                          {formatFileSize(fileWithPreview.file.size)}
                        </p>
                      </div>

                      {/* Status/Remove */}
                      {fileWithPreview.uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                      ) : fileWithPreview.uploaded ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      ) : fileWithPreview.error ? (
                        <AlertCircle className="h-5 w-5 text-red-400" />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile(index)
                          }}
                          className="rounded p-1 text-[#8e8e93] hover:bg-white/[0.08] hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Error Message */}
                    {fileWithPreview.error && (
                      <p className="mt-1 text-xs text-red-400">{fileWithPreview.error}</p>
                    )}

                    {/* Type Selector (if not uploaded) */}
                    {!fileWithPreview.uploaded && !fileWithPreview.uploading && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {FILE_TYPES.map((type) => {
                          const TypeIcon = type.icon
                          const isSelected = fileWithPreview.type === type.value

                          return (
                            <button
                              key={type.value}
                              onClick={(e) => {
                                e.stopPropagation()
                                updateFileType(index, type.value)
                              }}
                              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] transition-colors ${
                                isSelected
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-white/[0.08] text-[#8e8e93] hover:text-white'
                              }`}
                            >
                              <TypeIcon className="h-2.5 w-2.5" />
                              {type.label}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Notes Input (if not uploaded) */}
                    {!fileWithPreview.uploaded && !fileWithPreview.uploading && (
                      <input
                        type="text"
                        placeholder="Add notes (optional)..."
                        value={fileWithPreview.notes}
                        onChange={(e) => updateFileNotes(index, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-[#8e8e93] focus:border-blue-500/50 focus:outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload Button */}
      {pendingCount > 0 && (
        <button
          onClick={uploadFiles}
          disabled={uploading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}
            </>
          )}
        </button>
      )}

      {/* Success Message */}
      {uploadedCount > 0 && pendingCount === 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          {uploadedCount} file{uploadedCount !== 1 ? 's' : ''} uploaded successfully
        </div>
      )}

      {/* Help Text */}
      <p className="mt-4 text-center text-[10px] text-[#8e8e93]">
        These files help our photographer prepare for your shoot
      </p>
    </div>
  )
}
