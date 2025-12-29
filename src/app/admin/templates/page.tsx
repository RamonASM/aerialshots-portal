'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Mail,
  Search,
  Plus,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  Code,
  FileText,
  Clock,
  Calendar,
  Package,
  Megaphone,
  Bell,
  ChevronDown,
  ChevronUp,
  Send,
  ToggleLeft,
  ToggleRight,
  GitBranch,
  Variable,
  TestTube,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SkeletonGrid } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DEFAULT_TEMPLATE_VARIABLES,
  processTemplate,
  validateTemplate,
  extractVariables,
  type TemplateContext,
} from '@/lib/notifications/template-engine'

interface TemplateCondition {
  id: string
  template_id: string
  condition_type: 'service_type' | 'order_value' | 'client_tier' | 'status' | 'custom'
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  field: string
  value: string
  priority: number
  template_override: string | null
  is_active: boolean
}

interface EmailTemplate {
  id: string
  name: string
  slug: string
  subject: string
  body_html: string
  body_text: string | null
  category: string
  variables: string[]
  conditions: TemplateCondition[]
  is_active: boolean
  created_at: string
  updated_at: string
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Mail; color: string }> = {
  general: {
    label: 'General',
    icon: Mail,
    color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  },
  order: {
    label: 'Order',
    icon: Package,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  scheduling: {
    label: 'Scheduling',
    icon: Calendar,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  delivery: {
    label: 'Delivery',
    icon: Send,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  marketing: {
    label: 'Marketing',
    icon: Megaphone,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  reminder: {
    label: 'Reminder',
    icon: Bell,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
}

// Sample context for template preview
const SAMPLE_CONTEXT: TemplateContext = {
  company_name: 'Aerial Shots Media',
  company_email: 'hello@aerialshots.media',
  company_phone: '(407) 555-0100',
  current_year: new Date().getFullYear(),
  current_date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  agent_name: 'Jane Smith',
  agent_email: 'jane@realty.com',
  agent_phone: '(555) 123-4567',
  agent_company: 'Premier Realty',
  order_id: 'ord_123456',
  order_number: 'ORD-2024-1234',
  order_date: 'December 28, 2024',
  order_status: 'In Production',
  order_total: 49900,
  order_total_formatted: '$499.00',
  services: ['Photography', 'Drone', 'Video'],
  service_list: 'Photography, Drone, Video',
  property_address: '123 Main Street, Orlando, FL 32801',
  property_city: 'Orlando',
  property_state: 'FL',
  property_sqft: 2500,
  payment_amount_formatted: '$499.00',
  payment_link: 'https://pay.aerialshots.media/sample',
  invoice_number: 'INV-2024-1234',
  delivery_link: 'https://portal.aerialshots.media/delivery/sample',
  photo_count: 25,
  scheduled_date: 'January 5, 2025',
  scheduled_time: '10:00 AM',
}

const CONDITION_TYPES = [
  { value: 'service_type', label: 'Service Type', description: 'Based on ordered services' },
  { value: 'order_value', label: 'Order Value', description: 'Based on order total' },
  { value: 'client_tier', label: 'Client Tier', description: 'Based on agent tier level' },
  { value: 'status', label: 'Order Status', description: 'Based on current order status' },
  { value: 'custom', label: 'Custom Field', description: 'Any custom field' },
]

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'in', label: 'Is one of' },
  { value: 'not_in', label: 'Is not one of' },
]

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<EmailTemplate> | null>(null)
  const [saving, setSaving] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [variablesDialogOpen, setVariablesDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'conditions' | 'variables'>('content')
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    slug: '',
    subject: '',
    body_html: '',
    body_text: '',
    category: 'general',
    variables: [] as string[],
  })

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category !== 'all') params.set('category', category)

      const res = await fetch(`/api/admin/templates?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [search, category])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      const res = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !template.is_active }),
      })
      if (!res.ok) throw new Error('Failed to update')
      fetchTemplates()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editForm) return
    try {
      setSaving(true)
      const res = await fetch(`/api/admin/templates/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('Failed to update')
      setEditingId(null)
      setEditForm(null)
      fetchTemplates()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      })
      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || 'Failed to create template')
        return
      }
      setShowNewForm(false)
      setNewTemplate({
        name: '',
        slug: '',
        subject: '',
        body_html: '',
        body_text: '',
        category: 'general',
        variables: [],
      })
      fetchTemplates()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      fetchTemplates()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handlePreview = (template: EmailTemplate) => {
    setPreviewTemplate(template)
    setPreviewDialogOpen(true)
  }

  const getProcessedPreview = (template: EmailTemplate): { subject: string; body: string } => {
    try {
      const subject = processTemplate(template.subject, SAMPLE_CONTEXT)
      const body = processTemplate(template.body_html, SAMPLE_CONTEXT)
      return { subject, body }
    } catch {
      return { subject: template.subject, body: template.body_html }
    }
  }

  const getTemplateValidation = (template: EmailTemplate) => {
    return validateTemplate(template.body_html)
  }

  const getTemplateVariables = (template: EmailTemplate): string[] => {
    return extractVariables(template.body_html + ' ' + template.subject)
  }

  // Group templates by category
  const groupedTemplates = templates.reduce(
    (acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = []
      }
      acc[template.category].push(template)
      return acc
    },
    {} as Record<string, EmailTemplate[]>
  )

  const stats = {
    total: templates.length,
    active: templates.filter((t) => t.is_active).length,
    categories: Object.keys(groupedTemplates).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Email Templates</h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Manage automated email notifications and marketing templates
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowNewForm(true)} variant="default">
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.categories}</p>
              <p className="text-xs text-neutral-500">Categories</p>
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
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* New Template Form */}
      {showNewForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Create New Template</span>
              <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="Order Confirmation"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Slug</label>
                <Input
                  value={newTemplate.slug}
                  onChange={(e) => setNewTemplate({ ...newTemplate, slug: e.target.value })}
                  placeholder="order-confirmation"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Subject</label>
                <Input
                  value={newTemplate.subject}
                  onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                  placeholder="Your order is confirmed!"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Category</label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">HTML Body</label>
              <textarea
                value={newTemplate.body_html}
                onChange={(e) => setNewTemplate({ ...newTemplate, body_html: e.target.value })}
                placeholder="<h1>Hello {{name}}</h1>"
                rows={6}
                className="w-full rounded-md border border-neutral-200 bg-white p-3 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Use {'{{variable_name}}'} for dynamic content
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate} disabled={saving || !newTemplate.name || !newTemplate.slug || !newTemplate.subject || !newTemplate.body_html}>
                {saving ? 'Creating...' : 'Create Template'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      {loading ? (
        <SkeletonGrid items={4} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No templates found"
          description="Create your first email template to get started with automated communications."
          action={{
            label: 'Create Template',
            onClick: () => setShowNewForm(true),
          }}
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTemplates).map(([cat, catTemplates]) => {
            const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general
            const CategoryIcon = config.icon

            return (
              <div key={cat}>
                <div className="mb-3 flex items-center gap-2">
                  <CategoryIcon className="h-4 w-4 text-neutral-500" />
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {config.label}
                  </h3>
                  <span className="text-xs text-neutral-400">({catTemplates.length})</span>
                </div>

                <div className="space-y-2">
                  {catTemplates.map((template) => {
                    const isExpanded = expandedId === template.id
                    const isEditing = editingId === template.id

                    return (
                      <Card
                        key={template.id}
                        className={`transition-all ${!template.is_active ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center gap-4 p-4">
                          {/* Toggle Active */}
                          <button
                            onClick={() => handleToggleActive(template)}
                            className="flex-shrink-0"
                            title={template.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {template.is_active ? (
                              <ToggleRight className="h-6 w-6 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-6 w-6 text-neutral-400" />
                            )}
                          </button>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-neutral-900 dark:text-white">
                                {template.name}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${config.color}`}
                              >
                                {config.label}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-sm text-neutral-500">
                              Subject: {template.subject}
                            </p>
                            {template.variables && template.variables.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {template.variables.map((v) => (
                                  <span
                                    key={v}
                                    className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-mono text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                  >
                                    {'{{'}{v}{'}}'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {/* Conditions indicator */}
                            {template.conditions && template.conditions.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <GitBranch className="h-3 w-3 mr-1" />
                                {template.conditions.length}
                              </Badge>
                            )}
                            <button
                              onClick={() => handlePreview(template)}
                              className="rounded p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                              title="Preview with sample data"
                            >
                              <TestTube className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => copyToClipboard(template.slug)}
                              className="rounded p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                              title="Copy slug"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (isEditing) {
                                  setEditingId(null)
                                  setEditForm(null)
                                } else {
                                  setEditingId(template.id)
                                  setEditForm({
                                    name: template.name,
                                    subject: template.subject,
                                    body_html: template.body_html,
                                    body_text: template.body_text || '',
                                  })
                                  setActiveTab('content')
                                }
                              }}
                              className="rounded p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="rounded p-2 text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : template.id)}
                              className="rounded p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="border-t border-neutral-100 p-4 dark:border-neutral-800">
                            {isEditing && editForm ? (
                              <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-sm font-medium">Name</label>
                                    <Input
                                      value={editForm.name || ''}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, name: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-sm font-medium">Subject</label>
                                    <Input
                                      value={editForm.subject || ''}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, subject: e.target.value })
                                      }
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="mb-1 block text-sm font-medium">
                                    HTML Body
                                  </label>
                                  <textarea
                                    value={editForm.body_html || ''}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, body_html: e.target.value })
                                    }
                                    rows={8}
                                    className="w-full rounded-md border border-neutral-200 bg-white p-3 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-800"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setEditingId(null)
                                      setEditForm(null)
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button onClick={handleSaveEdit} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div>
                                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                    <Code className="h-4 w-4" />
                                    HTML Preview
                                  </h4>
                                  <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                                    <div
                                      className="prose prose-sm max-w-none dark:prose-invert"
                                      dangerouslySetInnerHTML={{ __html: template.body_html }}
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-neutral-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Created: {new Date(template.created_at).toLocaleDateString()}
                                  </span>
                                  {template.updated_at !== template.created_at && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Updated: {new Date(template.updated_at).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-purple-500" />
              Template Preview
            </DialogTitle>
            <DialogDescription>
              Preview with sample data. Variables are replaced with example values.
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              {/* Validation Status */}
              {(() => {
                const validation = getTemplateValidation(previewTemplate)
                if (!validation.valid) {
                  return (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900">
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-400">Template has errors</p>
                        <ul className="mt-1 text-sm text-red-600 dark:text-red-300">
                          {validation.errors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )
                }
                return (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="text-green-700 dark:text-green-400">Template syntax is valid</span>
                  </div>
                )
              })()}

              {/* Used Variables */}
              <div>
                <h4 className="text-sm font-medium mb-2">Variables Used</h4>
                <div className="flex flex-wrap gap-1">
                  {getTemplateVariables(previewTemplate).map((variable) => (
                    <Badge key={variable} variant="secondary" className="font-mono text-xs">
                      {'{{' + variable + '}}'}
                    </Badge>
                  ))}
                  {getTemplateVariables(previewTemplate).length === 0 && (
                    <span className="text-sm text-muted-foreground">No variables used</span>
                  )}
                </div>
              </div>

              {/* Subject Preview */}
              <div>
                <h4 className="text-sm font-medium mb-2">Subject</h4>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{getProcessedPreview(previewTemplate).subject}</p>
                </div>
              </div>

              {/* Body Preview */}
              <div>
                <h4 className="text-sm font-medium mb-2">Email Body</h4>
                <div className="border rounded-lg p-4 bg-white dark:bg-neutral-900">
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: getProcessedPreview(previewTemplate).body }}
                  />
                </div>
              </div>

              {/* Raw HTML toggle */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Code className="h-4 w-4 mr-2" />
                    View Raw HTML
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">
                    {previewTemplate.body_html}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Variables Reference Dialog */}
      <Dialog open={variablesDialogOpen} onOpenChange={setVariablesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Variable className="h-5 w-5 text-blue-500" />
              Available Variables
            </DialogTitle>
            <DialogDescription>
              Use these variables in your templates with {'{{variable_name}}'} syntax
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {Object.entries(
              DEFAULT_TEMPLATE_VARIABLES.reduce(
                (acc, variable) => {
                  if (!acc[variable.category]) {
                    acc[variable.category] = []
                  }
                  acc[variable.category].push(variable)
                  return acc
                },
                {} as Record<string, typeof DEFAULT_TEMPLATE_VARIABLES>
              )
            ).map(([category, variables]) => (
              <div key={category}>
                <h4 className="text-sm font-medium capitalize mb-2">{category}</h4>
                <div className="grid gap-2">
                  {variables.map((variable) => (
                    <div
                      key={variable.key}
                      className="flex items-start justify-between p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => copyToClipboard(`{{${variable.key}}}`)}
                    >
                      <div>
                        <code className="text-sm font-mono text-blue-600 dark:text-blue-400">
                          {'{{' + variable.key + '}}'}
                        </code>
                        <p className="text-xs text-muted-foreground mt-0.5">{variable.description}</p>
                      </div>
                      {variable.example_value && (
                        <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                          {variable.example_value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Conditional Syntax Help */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Conditional Syntax
              </h4>
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-muted/50 rounded-lg">
                  <code className="font-mono text-xs block">
                    {'{{#if services contains \'drone\'}}'}
                    <br />
                    {'  Includes aerial photography!'}
                    <br />
                    {'{{/if}}'}
                  </code>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <code className="font-mono text-xs block">
                    {'{{#if order_total > 50000}}'}
                    <br />
                    {'  Thank you for your premium order!'}
                    <br />
                    {'{{#else}}'}
                    <br />
                    {'  Thank you for your order!'}
                    <br />
                    {'{{/if}}'}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Variables Reference Button (floating) */}
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-6 right-6 shadow-lg"
        onClick={() => setVariablesDialogOpen(true)}
      >
        <Variable className="h-4 w-4 mr-2" />
        Variables
      </Button>
    </div>
  )
}
