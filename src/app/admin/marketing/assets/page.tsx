'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  Upload,
  Download,
  Star,
  Heart,
  MoreVertical,
  Trash2,
  ExternalLink,
  FolderOpen,
  FileImage,
  FileVideo,
  File,
  Filter,
  Grid,
  List,
} from 'lucide-react'

// Marketing asset type (defined inline since types may not be regenerated)
interface MarketingAsset {
  id: string
  listing_id: string | null
  agent_id: string | null
  name: string
  type: string
  asset_type?: string
  format: string
  status: string
  bannerbear_uid: string | null
  image_url: string | null
  image_url_png: string | null
  image_url_jpg: string | null
  render_time_ms: number | null
  error_message: string | null
  created_at: string | null
  completed_at: string | null
  template_data?: Record<string, unknown>
  file_url?: string | null
  // UI display properties
  description?: string | null
  file_type?: string
  file_size?: number | null
  width?: number | null
  height?: number | null
  tags?: string[]
  is_favorite?: boolean
  download_count?: number
}

const ASSET_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'flyer', label: 'Flyers' },
  { value: 'brochure', label: 'Brochures' },
  { value: 'postcard', label: 'Postcards' },
  { value: 'social_graphic', label: 'Social Graphics' },
  { value: 'email_header', label: 'Email Headers' },
  { value: 'business_card', label: 'Business Cards' },
  { value: 'presentation', label: 'Presentations' },
  { value: 'video_thumbnail', label: 'Video Thumbnails' },
  { value: 'other', label: 'Other' },
]

const getFileIcon = (fileType: string | undefined) => {
  if (fileType?.startsWith('image/')) return FileImage
  if (fileType?.startsWith('video/')) return FileVideo
  return File
}

const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes) return 'Unknown'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MarketingAssetsPage() {
  const [assets, setAssets] = useState<MarketingAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFavorites, setShowFavorites] = useState(false)

  const fetchAssets = useCallback(async () => {
    const supabase = createClient()

    try {
      // marketing_assets table may not be in generated types yet - use any cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('marketing_assets')
        .select('*')
        .order('created_at', { ascending: false })

      if (typeFilter !== 'all') {
        query = query.eq('asset_type', typeFilter)
      }

      if (showFavorites) {
        query = query.eq('is_favorite', true)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching assets:', error)
        return
      }

      // Convert to MarketingAsset with computed properties from template_data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const convertedAssets: MarketingAsset[] = ((data || []) as any[]).map((row) => ({
        ...row,
        description: (row.template_data as Record<string, unknown>)?.description as string | null ?? null,
        file_type: (row.template_data as Record<string, unknown>)?.file_type as string ?? 'unknown',
        file_size: (row.template_data as Record<string, unknown>)?.file_size as number ?? null,
        width: (row.template_data as Record<string, unknown>)?.width as number ?? null,
        height: (row.template_data as Record<string, unknown>)?.height as number ?? null,
        tags: (row.template_data as Record<string, unknown>)?.tags as string[] ?? [],
        is_favorite: (row.template_data as Record<string, unknown>)?.is_favorite as boolean ?? false,
        download_count: (row.template_data as Record<string, unknown>)?.download_count as number ?? 0,
      }))
      setAssets(convertedAssets)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, showFavorites])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const filteredAssets = assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const toggleFavorite = async (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId)
    if (!asset) return

    const supabase = createClient()

    // Update is_favorite in template_data
    const updatedTemplateData = {
      ...(asset.template_data as Record<string, unknown>),
      is_favorite: !asset.is_favorite,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('marketing_assets')
      .update({ template_data: updatedTemplateData })
      .eq('id', assetId)

    if (!error) {
      setAssets(
        assets.map((a) =>
          a.id === assetId ? { ...a, is_favorite: !a.is_favorite, template_data: updatedTemplateData } : a
        )
      )
    }
  }

  const handleDelete = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('marketing_assets')
      .delete()
      .eq('id', assetId)

    if (!error) {
      setAssets(assets.filter((a) => a.id !== assetId))
    }
  }

  const handleDownload = async (asset: MarketingAsset) => {
    // Increment download count in template_data
    const supabase = createClient()
    const updatedTemplateData = {
      ...(asset.template_data as Record<string, unknown>),
      download_count: (asset.download_count ?? 0) + 1,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('marketing_assets')
      .update({ template_data: updatedTemplateData })
      .eq('id', asset.id)

    // Open file URL
    if (asset.file_url) {
      window.open(asset.file_url, '_blank')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing Assets</h1>
          <p className="text-muted-foreground">
            Your library of marketing materials and graphics
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Asset
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assets.length}</p>
                <p className="text-sm text-muted-foreground">Total Assets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-500/10 p-2">
                <Heart className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {assets.filter((a) => a.is_favorite).length}
                </p>
                <p className="text-sm text-muted-foreground">Favorites</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <FileImage className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {assets.filter((a) => a.asset_type === 'social_graphic').length}
                </p>
                <p className="text-sm text-muted-foreground">Social Graphics</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <Download className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {assets.reduce((sum, a) => sum + (a.download_count ?? 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Downloads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showFavorites ? 'default' : 'outline'}
              onClick={() => setShowFavorites(!showFavorites)}
            >
              <Heart className={`mr-2 h-4 w-4 ${showFavorites ? 'fill-current' : ''}`} />
              Favorites
            </Button>
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-muted" />
              <CardContent className="pt-4">
                <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No assets found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? 'Try a different search term'
                : 'Upload your first marketing asset'}
            </p>
            <Button className="mt-4">
              <Upload className="mr-2 h-4 w-4" />
              Upload Asset
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {filteredAssets.map((asset) => {
            const FileIcon = getFileIcon(asset.file_type)

            return (
              <Card key={asset.id} className="group overflow-hidden">
                {/* Preview */}
                <div className="relative aspect-video bg-muted flex items-center justify-center">
                  {asset.file_type?.startsWith('image/') && asset.file_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.file_url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileIcon className="h-12 w-12 text-muted-foreground/30" />
                  )}

                  {/* Favorite button */}
                  <button
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white"
                    onClick={() => toggleFavorite(asset.id)}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        asset.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-600'
                      }`}
                    />
                  </button>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(asset)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium line-clamp-1">
                      {asset.name}
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(asset)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => asset.file_url && window.open(asset.file_url, '_blank')}
                          disabled={!asset.file_url}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(asset.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      {(asset.asset_type || asset.type || 'unknown').replace('_', ' ')}
                    </Badge>
                    <span>{formatFileSize(asset.file_size)}</span>
                  </div>

                  {asset.tags && asset.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {asset.tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {asset.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{asset.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        // List view
        <Card>
          <CardContent className="pt-6">
            <div className="divide-y">
              {filteredAssets.map((asset) => {
                const FileIcon = getFileIcon(asset.file_type)

                return (
                  <div
                    key={asset.id}
                    className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="h-16 w-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      {asset.file_type?.startsWith('image/') && asset.file_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.file_url}
                          alt={asset.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <FileIcon className="h-8 w-8 text-muted-foreground/30" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{asset.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {(asset.asset_type || asset.type || 'unknown').replace('_', ' ')}
                        </Badge>
                        <span>{formatFileSize(asset.file_size)}</span>
                        <span>{asset.download_count ?? 0} downloads</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavorite(asset.id)}
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            asset.is_favorite ? 'fill-red-500 text-red-500' : ''
                          }`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(asset)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(asset.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
