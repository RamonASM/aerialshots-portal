'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Layers,
  Search,
  Plus,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  Image,
  Layout,
  ChevronRight,
  Settings,
  Eye,
  MoreHorizontal,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SkeletonGrid } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// Template categories from the plan
const TEMPLATE_CATEGORIES = [
  { value: 'story_archetype', label: 'Story Archetype' },
  { value: 'listing_marketing', label: 'Listing Marketing' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'neighborhood', label: 'Neighborhood' },
  { value: 'social', label: 'Social Media' },
  { value: 'custom', label: 'Custom' },
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
  { value: 'archived', label: 'Archived', color: 'bg-amber-100 text-amber-700' },
]

interface RenderTemplate {
  id: string
  slug: string
  name: string
  description?: string
  category: string
  subcategory?: string
  version: number
  status: 'draft' | 'active' | 'archived'
  canvas: {
    width: number
    height: number
    background?: string
  }
  layers: unknown[]
  variables: unknown[]
  extends_slug?: string
  is_system: boolean
  created_at: string
  updated_at: string
}

export default function RenderTemplatesPage() {
  const [templates, setTemplates] = useState<RenderTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'custom',
    width: 1080,
    height: 1080,
  })

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/v1/render/template?${params}`)
      if (!res.ok) throw new Error('Failed to fetch templates')
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, statusFilter])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.slug) {
      toast.error('Name and slug are required')
      return
    }

    try {
      setCreating(true)
      const res = await fetch('/api/v1/render/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ASM-Secret': 'internal-admin',
        },
        body: JSON.stringify({
          name: newTemplate.name,
          slug: newTemplate.slug,
          description: newTemplate.description,
          category: newTemplate.category,
          canvas: {
            width: newTemplate.width,
            height: newTemplate.height,
            background: '#ffffff',
          },
          layers: [],
          variables: [],
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create template')
      }

      toast.success('Template created')
      setShowNewDialog(false)
      setNewTemplate({
        name: '',
        slug: '',
        description: '',
        category: 'custom',
        width: 1080,
        height: 1080,
      })
      fetchTemplates()
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create template')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (template: RenderTemplate) => {
    if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`/api/v1/render/template/${template.id}`, {
        method: 'DELETE',
        headers: { 'X-ASM-Secret': 'internal-admin' },
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Template deleted')
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    }
  }

  const handleDuplicate = async (template: RenderTemplate) => {
    try {
      const res = await fetch('/api/v1/render/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ASM-Secret': 'internal-admin',
        },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          slug: `${template.slug}-copy-${Date.now()}`,
          description: template.description,
          category: template.category,
          canvas: template.canvas,
          layers: template.layers,
          variables: template.variables,
        }),
      })

      if (!res.ok) throw new Error('Failed to duplicate')
      toast.success('Template duplicated')
      fetchTemplates()
    } catch (error) {
      console.error('Error duplicating template:', error)
      toast.error('Failed to duplicate template')
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    const cat = template.category || 'custom'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(template)
    return acc
  }, {} as Record<string, RenderTemplate[]>)

  const stats = {
    total: templates.length,
    active: templates.filter(t => t.status === 'active').length,
    draft: templates.filter(t => t.status === 'draft').length,
    system: templates.filter(t => t.is_system).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Render Templates
          </h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Visual templates for carousel and image generation
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
          <Button onClick={fetchTemplates} variant="outline" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
              <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-neutral-500">Total Templates</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.active}</p>
              <p className="text-xs text-neutral-500">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
              <Edit2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.draft}</p>
              <p className="text-xs text-neutral-500">Draft</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
              <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.system}</p>
              <p className="text-xs text-neutral-500">System</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TEMPLATE_CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map(status => (
              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates List */}
      {loading ? (
        <SkeletonGrid items={6} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No templates found"
          description="Create your first render template to get started with carousel generation."
          action={{
            label: 'Create Template',
            onClick: () => setShowNewDialog(true),
          }}
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedTemplates).map(([category, catTemplates]) => {
            const categoryConfig = TEMPLATE_CATEGORIES.find(c => c.value === category)

            return (
              <div key={category}>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
                  <Layout className="h-5 w-5" />
                  {categoryConfig?.label || category}
                  <Badge variant="secondary" className="ml-2">{catTemplates.length}</Badge>
                </h3>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {catTemplates.map((template) => {
                    const statusConfig = STATUS_OPTIONS.find(s => s.value === template.status)

                    return (
                      <Card key={template.id} className="group relative overflow-hidden">
                        {/* Preview Thumbnail */}
                        <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800">
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{
                              backgroundColor: template.canvas?.background || '#f5f5f5',
                            }}
                          >
                            <div className="text-center text-neutral-400">
                              <Image className="mx-auto h-12 w-12 opacity-50" />
                              <p className="mt-2 text-sm">
                                {template.canvas?.width}×{template.canvas?.height}
                              </p>
                            </div>
                          </div>

                          {/* Hover Actions */}
                          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                            <Link href={`/admin/render-templates/${template.id}`}>
                              <Button size="sm" variant="secondary">
                                <Edit2 className="mr-1 h-4 w-4" />
                                Edit
                              </Button>
                            </Link>
                            <Button size="sm" variant="secondary">
                              <Eye className="mr-1 h-4 w-4" />
                              Preview
                            </Button>
                          </div>
                        </div>

                        {/* Info */}
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate font-medium text-neutral-900 dark:text-white">
                                {template.name}
                              </h4>
                              <p className="mt-0.5 text-xs text-neutral-500">
                                {template.slug}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/render-templates/${template.id}`}>
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(template)}
                                  className="text-red-600"
                                  disabled={template.is_system}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <Badge className={statusConfig?.color}>
                              {statusConfig?.label}
                            </Badge>
                            {template.is_system && (
                              <Badge variant="outline">System</Badge>
                            )}
                            <span className="ml-auto text-xs text-neutral-400">
                              v{template.version}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                            <span>{template.layers?.length || 0} layers</span>
                            <span>•</span>
                            <span>{template.variables?.length || 0} variables</span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Template Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a new render template for carousel or image generation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newTemplate.name}
                onChange={(e) => {
                  setNewTemplate({
                    ...newTemplate,
                    name: e.target.value,
                    slug: newTemplate.slug || generateSlug(e.target.value),
                  })
                }}
                placeholder="Hero Slide"
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={newTemplate.slug}
                onChange={(e) => setNewTemplate({ ...newTemplate, slug: e.target.value })}
                placeholder="hero-slide"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Unique identifier used in API calls
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Opening slide with property hero image and price"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={newTemplate.category}
                onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="width">Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  value={newTemplate.width}
                  onChange={(e) => setNewTemplate({ ...newTemplate, width: parseInt(e.target.value) || 1080 })}
                />
              </div>
              <div>
                <Label htmlFor="height">Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  value={newTemplate.height}
                  onChange={(e) => setNewTemplate({ ...newTemplate, height: parseInt(e.target.value) || 1080 })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={creating}>
              {creating ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
