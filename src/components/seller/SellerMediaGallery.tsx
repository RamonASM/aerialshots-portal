'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Camera,
  Video,
  Box,
  Map,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface MediaAsset {
  id: string
  url: string
  category: string | null
  sort_order: number
}

interface MediaData {
  photos: MediaAsset[]
  videos: MediaAsset[]
  tours: MediaAsset[]
  floor_plans: MediaAsset[]
}

interface SellerMediaGalleryProps {
  token: string
  listingId: string
}

export function SellerMediaGallery({ token, listingId }: SellerMediaGalleryProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [media, setMedia] = useState<MediaData | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [selectedCategory, setSelectedCategory] = useState<'photos' | 'videos' | 'tours' | 'floor_plans'>('photos')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Fetch deliverables
  useEffect(() => {
    async function fetchDeliverables() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/seller/${token}/deliverables`)

        if (!response.ok) {
          throw new Error('Failed to fetch media')
        }

        const data = await response.json()

        if (data.success && data.has_access) {
          setMedia(data.media)
          setCounts(data.counts)
        } else {
          setError(data.lock_message || 'Media not available')
        }
      } catch (err) {
        console.error('Error fetching media:', err)
        setError('Failed to load media')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDeliverables()
  }, [token])

  if (isLoading) {
    return (
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardContent className="py-12 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-neutral-400 animate-spin mb-4" />
          <p className="text-neutral-400">Loading media...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardContent className="py-12 flex flex-col items-center justify-center">
          <Camera className="h-8 w-8 text-neutral-500 mb-4" />
          <p className="text-neutral-400">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!media) {
    return null
  }

  const categories = [
    { key: 'photos' as const, label: 'Photos', icon: Camera, count: counts.photos || 0 },
    { key: 'videos' as const, label: 'Videos', icon: Video, count: counts.videos || 0 },
    { key: 'tours' as const, label: '3D Tours', icon: Box, count: counts.tours || 0 },
    { key: 'floor_plans' as const, label: 'Floor Plans', icon: Map, count: counts.floor_plans || 0 },
  ].filter(c => c.count > 0)

  const currentAssets = media[selectedCategory] || []

  return (
    <Card className="border-neutral-800 bg-neutral-900/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-neutral-200">
            Media Gallery
          </CardTitle>
          <Badge variant="outline" className="text-xs border-neutral-700">
            {counts.total} assets
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => {
            const Icon = cat.icon
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === cat.key
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {cat.label}
                <span className="text-xs opacity-60">({cat.count})</span>
              </button>
            )
          })}
        </div>

        {/* Photo Grid */}
        {selectedCategory === 'photos' && currentAssets.length > 0 && (
          <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
            {currentAssets.map((asset, index) => (
              <button
                key={asset.id}
                onClick={() => setLightboxIndex(index)}
                className="aspect-square relative overflow-hidden group"
              >
                <Image
                  src={asset.url}
                  alt={asset.category || 'Property photo'}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                  sizes="(max-width: 640px) 33vw, 150px"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Video List */}
        {selectedCategory === 'videos' && currentAssets.length > 0 && (
          <div className="space-y-2">
            {currentAssets.map((asset) => (
              <a
                key={asset.id}
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                <div className="p-2 bg-neutral-700 rounded-lg">
                  <Video className="h-5 w-5 text-neutral-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {asset.category || 'Property Video'}
                  </p>
                  <p className="text-xs text-neutral-400">Click to view</p>
                </div>
                <ChevronRight className="h-5 w-5 text-neutral-500" />
              </a>
            ))}
          </div>
        )}

        {/* 3D Tours List */}
        {selectedCategory === 'tours' && currentAssets.length > 0 && (
          <div className="space-y-2">
            {currentAssets.map((asset) => (
              <a
                key={asset.id}
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Box className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">3D Tour</p>
                  <p className="text-xs text-neutral-400">Interactive walkthrough</p>
                </div>
                <ChevronRight className="h-5 w-5 text-neutral-500" />
              </a>
            ))}
          </div>
        )}

        {/* Floor Plans Grid */}
        {selectedCategory === 'floor_plans' && currentAssets.length > 0 && (
          <div className="space-y-2">
            {currentAssets.map((asset) => (
              <a
                key={asset.id}
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-video relative overflow-hidden rounded-lg bg-neutral-800"
              >
                <Image
                  src={asset.url}
                  alt="Floor Plan"
                  fill
                  className="object-contain"
                />
              </a>
            ))}
          </div>
        )}

        {/* Empty State */}
        {currentAssets.length === 0 && (
          <div className="py-8 text-center">
            <Camera className="h-8 w-8 mx-auto text-neutral-500 mb-2" />
            <p className="text-neutral-400">No {selectedCategory.replace('_', ' ')} available</p>
          </div>
        )}
      </CardContent>

      {/* Lightbox Dialog */}
      {lightboxIndex !== null && selectedCategory === 'photos' && (
        <Dialog open={true} onOpenChange={() => setLightboxIndex(null)}>
          <DialogContent className="max-w-4xl p-0 bg-black border-0 overflow-hidden">
            <DialogTitle className="sr-only">Photo Viewer</DialogTitle>
            <div className="relative aspect-[4/3]">
              <Image
                src={currentAssets[lightboxIndex].url}
                alt={currentAssets[lightboxIndex].category || 'Property photo'}
                fill
                className="object-contain"
                priority
              />

              {/* Navigation */}
              <div className="absolute inset-0 flex items-center justify-between p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70"
                  onClick={() => setLightboxIndex(
                    lightboxIndex > 0 ? lightboxIndex - 1 : currentAssets.length - 1
                  )}
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70"
                  onClick={() => setLightboxIndex(
                    lightboxIndex < currentAssets.length - 1 ? lightboxIndex + 1 : 0
                  )}
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </Button>
              </div>

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70"
                onClick={() => setLightboxIndex(null)}
              >
                <X className="h-5 w-5 text-white" />
              </Button>

              {/* Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/70 rounded-full">
                <span className="text-sm text-white">
                  {lightboxIndex + 1} / {currentAssets.length}
                </span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}
