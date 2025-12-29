'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Upload,
  X,
  Image as ImageIcon,
  Video,
  FileText,
  Check,
  Grid,
  List,
  Loader2,
  FolderOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface MediaItem {
  id: string
  url: string
  filename: string
  type: 'image' | 'video' | 'document'
  size: number
  width?: number
  height?: number
  created_at: string
  listing_id?: string
}

interface MediaLibraryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (items: MediaItem[]) => void
  multiple?: boolean
  accept?: ('image' | 'video' | 'document')[]
  listingId?: string
}

export function MediaLibrary({
  open,
  onOpenChange,
  onSelect,
  multiple = false,
  accept = ['image', 'video', 'document'],
  listingId,
}: MediaLibraryProps) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video' | 'document'>('all')
  const [uploading, setUploading] = useState(false)

  // Fetch media items
  const fetchMedia = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (listingId) params.set('listing_id', listingId)

      const res = await fetch(`/api/admin/media?${params}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching media:', error)
      // Use placeholder data if API not available
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, listingId])

  useEffect(() => {
    if (open) {
      fetchMedia()
      setSelected(new Set())
    }
  }, [open, fetchMedia])

  const handleSelect = (item: MediaItem) => {
    if (multiple) {
      const newSelected = new Set(selected)
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id)
      } else {
        newSelected.add(item.id)
      }
      setSelected(newSelected)
    } else {
      setSelected(new Set([item.id]))
    }
  }

  const handleConfirm = () => {
    const selectedItems = items.filter((item) => selected.has(item.id))
    onSelect(selectedItems)
    onOpenChange(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    setUploading(true)
    try {
      // Upload logic would go here
      // For now, just refresh the list
      await fetchMedia()
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />
      case 'video':
        return <Video className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const filteredItems = items.filter((item) =>
    accept.includes(item.type)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-700">
          {/* Search */}
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Search media..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filter */}
          <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
            {(['all', 'image', 'video', 'document'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm capitalize transition-colors',
                  typeFilter === type
                    ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
                )}
              >
                {type}
              </button>
            ))}
          </div>

          {/* View Mode */}
          <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'grid'
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-600 dark:text-neutral-400'
              )}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'list'
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-600 dark:text-neutral-400'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Upload Button */}
          <label>
            <input
              type="file"
              multiple
              accept="image/*,video/*,.pdf"
              className="hidden"
              onChange={handleUpload}
            />
            <Button variant="outline" size="sm" asChild disabled={uploading}>
              <span className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload
              </span>
            </Button>
          </label>
        </div>

        {/* Content */}
        <div className="max-h-[50vh] min-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <FolderOpen className="mb-4 h-12 w-12 text-neutral-300" />
              <p className="text-neutral-500">No media found</p>
              <p className="mt-1 text-sm text-neutral-400">
                Upload some files to get started
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-lg border-2 bg-neutral-100 transition-all dark:bg-neutral-800',
                    selected.has(item.id)
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-transparent hover:border-neutral-300 dark:hover:border-neutral-600'
                  )}
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.filename}
                      className="h-full w-full object-cover"
                    />
                  ) : item.type === 'video' ? (
                    <div className="flex h-full items-center justify-center">
                      <Video className="h-12 w-12 text-neutral-400" />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <FileText className="h-12 w-12 text-neutral-400" />
                    </div>
                  )}

                  {/* Selection indicator */}
                  {selected.has(item.id) && (
                    <div className="absolute right-2 top-2 rounded-full bg-blue-500 p-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}

                  {/* Filename overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-xs text-white">{item.filename}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-lg border-2 p-3 text-left transition-all',
                    selected.has(item.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-transparent bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700'
                  )}
                >
                  {/* Thumbnail */}
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700">
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        {getTypeIcon(item.type)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-900 dark:text-white">
                      {item.filename}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {formatFileSize(item.size)}
                      {item.width && item.height && ` • ${item.width}×${item.height}`}
                    </p>
                  </div>

                  {/* Selection indicator */}
                  {selected.has(item.id) && (
                    <Check className="h-5 w-5 flex-shrink-0 text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-neutral-700">
          <p className="text-sm text-neutral-500">
            {selected.size} item{selected.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={selected.size === 0}>
              {multiple ? 'Add Selected' : 'Select'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MediaLibrary
