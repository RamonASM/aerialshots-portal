'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Plus,
  Search,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Star,
  Eye,
  Copy,
  Edit,
  Trash2,
  Image as ImageIcon,
  LayoutTemplate,
} from 'lucide-react'

// Social template type (defined inline since types may not be regenerated)
interface SocialTemplate {
  id: string
  agent_id: string | null
  name: string
  description: string | null
  category: string
  platform: string
  width: number
  height: number
  template_data: Record<string, unknown> | null
  template_type?: string
  preview_url: string | null
  is_active: boolean
  is_featured: boolean
  use_count: number
  created_at: string
  updated_at: string
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'new_listing', label: 'New Listing' },
  { value: 'open_house', label: 'Open House' },
  { value: 'just_sold', label: 'Just Sold' },
  { value: 'price_drop', label: 'Price Drop' },
  { value: 'coming_soon', label: 'Coming Soon' },
  { value: 'market_update', label: 'Market Update' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'general', label: 'General' },
]

const PLATFORMS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'instagram_post', label: 'Instagram Post', icon: Instagram },
  { value: 'instagram_story', label: 'Instagram Story', icon: Instagram },
  { value: 'instagram_reel', label: 'Instagram Reel', icon: Instagram },
  { value: 'facebook_post', label: 'Facebook Post', icon: Facebook },
  { value: 'facebook_story', label: 'Facebook Story', icon: Facebook },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter },
]

const getPlatformIcon = (platform: string) => {
  if (platform.startsWith('instagram')) return Instagram
  if (platform.startsWith('facebook')) return Facebook
  if (platform === 'linkedin') return Linkedin
  if (platform === 'twitter') return Twitter
  return ImageIcon
}

export default function SocialTemplatesPage() {
  const [templates, setTemplates] = useState<SocialTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (platformFilter !== 'all') params.set('platform', platformFilter)

      const response = await fetch(`/api/admin/marketing/templates?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }

      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error:', error)
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, platformFilter])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const filteredTemplates = templates.filter((template) =>
    (template.name || 'Untitled Template').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDuplicate = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return

    try {
      const response = await fetch('/api/admin/marketing/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          description: template.description,
          category: template.category || template.template_type || 'general',
          platform: template.platform,
          width: template.width,
          height: template.height,
          template_data: template.template_data || {},
          preview_url: template.preview_url,
          is_active: true,
          is_featured: false,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate template')
      }

      fetchTemplates()
    } catch (error) {
      console.error('Error duplicating template:', error)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/admin/marketing/templates/${templateId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete template')
      }

      setTemplates(templates.filter((t) => t.id !== templateId))
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Social Media Templates</h1>
          <p className="text-muted-foreground">
            Create and manage templates for social media posts
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <LayoutTemplate className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-sm text-muted-foreground">Total Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-500/10 p-2">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {templates.filter((t) => t.is_featured ?? false).length}
                </p>
                <p className="text-sm text-muted-foreground">Featured</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-pink-500/10 p-2">
                <Instagram className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {templates.filter((t) => t.platform.startsWith('instagram')).length}
                </p>
                <p className="text-sm text-muted-foreground">Instagram</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <Eye className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {templates.reduce((sum, t) => sum + (t.use_count ?? 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Uses</p>
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
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((plat) => (
                  <SelectItem key={plat.value} value={plat.value}>
                    {plat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-muted" />
              <CardContent className="pt-4">
                <div className="h-5 w-3/4 bg-muted rounded mb-2" />
                <div className="h-4 w-1/2 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LayoutTemplate className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No templates found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first template to get started'}
            </p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const PlatformIcon = getPlatformIcon(template.platform)

            return (
              <Card
                key={template.id}
                className={`group overflow-hidden ${
                  template.is_featured ? 'ring-2 ring-yellow-500' : ''
                }`}
              >
                {/* Preview */}
                <div
                  className="relative aspect-square bg-muted flex items-center justify-center"
                  style={{
                    aspectRatio: `${template.width ?? 1080} / ${template.height ?? 1080}`,
                  }}
                >
                  {template.preview_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={template.preview_url}
                      alt={template.name || 'Template preview'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-muted-foreground/30">
                      <ImageIcon className="h-16 w-16" />
                    </div>
                  )}

                  {template.is_featured && (
                    <Badge className="absolute top-2 left-2 bg-yellow-500">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary">
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button size="sm" variant="secondary">
                      Use Template
                    </Button>
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{template.name || 'Untitled Template'}</CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {template.description || 'No description'}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <PlatformIcon className="h-3 w-3" />
                        {template.platform.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">
                        {(template.category ?? 'general').replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDuplicate(template.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {template.use_count ?? 0} uses
                    </span>
                    <span>
                      {template.width ?? 1080} x {template.height ?? 1080}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
