'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, Package, DollarSign, Layers, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

interface Service {
  id: string
  name: string
  price_cents: number
}

interface PackageItem {
  service_id: string
  is_optional: boolean
  quantity: number
}

interface PackageTier {
  min_sqft: number
  max_sqft: number | null
  price_cents: number
  tier_name: string
}

interface PackageData {
  id?: string
  name: string
  slug: string
  description: string
  features: string[]
  items: PackageItem[]
  tiers: PackageTier[]
  display_order: number
  is_featured: boolean
  is_active: boolean
}

interface PackageBuilderProps {
  package?: PackageData
  services: Service[]
  onSave: (data: PackageData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const DEFAULT_TIERS: PackageTier[] = [
  { min_sqft: 0, max_sqft: 1500, price_cents: 0, tier_name: 'Under 1,500 sq ft' },
  { min_sqft: 1501, max_sqft: 2500, price_cents: 0, tier_name: '1,501 - 2,500 sq ft' },
  { min_sqft: 2501, max_sqft: 3500, price_cents: 0, tier_name: '2,501 - 3,500 sq ft' },
  { min_sqft: 3501, max_sqft: 4000, price_cents: 0, tier_name: '3,501 - 4,000 sq ft' },
  { min_sqft: 4001, max_sqft: 5000, price_cents: 0, tier_name: '4,001 - 5,000 sq ft' },
  { min_sqft: 5001, max_sqft: null, price_cents: 0, tier_name: '5,001+ sq ft' },
]

export function PackageBuilder({
  package: initialPackage,
  services,
  onSave,
  onCancel,
  isLoading = false,
}: PackageBuilderProps) {
  const [formData, setFormData] = useState<PackageData>({
    name: '',
    slug: '',
    description: '',
    features: [],
    items: [],
    tiers: DEFAULT_TIERS,
    display_order: 0,
    is_featured: false,
    is_active: true,
    ...initialPackage,
  })
  const [newFeature, setNewFeature] = useState('')
  const [sectionsOpen, setSectionsOpen] = useState({
    basic: true,
    services: true,
    pricing: true,
    features: true,
    settings: false,
  })

  // Auto-generate slug from name
  useEffect(() => {
    if (!initialPackage && formData.name) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setFormData((prev) => ({ ...prev, slug }))
    }
  }, [formData.name, initialPackage])

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const addService = (serviceId: string) => {
    if (formData.items.some((item) => item.service_id === serviceId)) return
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { service_id: serviceId, is_optional: false, quantity: 1 }],
    }))
  }

  const removeService = (serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.service_id !== serviceId),
    }))
  }

  const toggleServiceOptional = (serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.service_id === serviceId
          ? { ...item, is_optional: !item.is_optional }
          : item
      ),
    }))
  }

  const updateTierPrice = (index: number, priceCents: number) => {
    setFormData((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier, i) =>
        i === index ? { ...tier, price_cents: priceCents } : tier
      ),
    }))
  }

  const addFeature = () => {
    if (!newFeature.trim()) return
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, newFeature.trim()],
    }))
    setNewFeature('')
  }

  const removeFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const getServiceName = (serviceId: string) => {
    return services.find((s) => s.id === serviceId)?.name || 'Unknown Service'
  }

  const availableServices = services.filter(
    (service) => !formData.items.some((item) => item.service_id === service.id)
  )

  const calculatedBaseValue = formData.items.reduce((sum, item) => {
    const service = services.find((s) => s.id === item.service_id)
    return sum + (service?.price_cents || 0) * item.quantity
  }, 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Collapsible open={sectionsOpen.basic} onOpenChange={() => toggleSection('basic')}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                    <CardDescription>Package name and description</CardDescription>
                  </div>
                </div>
                {sectionsOpen.basic ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Package Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Essentials Package"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g., essentials"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this package includes and who it's best for..."
                  rows={3}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Included Services */}
      <Collapsible open={sectionsOpen.services} onOpenChange={() => toggleSection('services')}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-purple-600" />
                  <div className="text-left">
                    <CardTitle className="text-lg">Included Services</CardTitle>
                    <CardDescription>
                      {formData.items.length} services selected
                      {calculatedBaseValue > 0 && ` (${formatCurrency(calculatedBaseValue)} value)`}
                    </CardDescription>
                  </div>
                </div>
                {sectionsOpen.services ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Add Service Selector */}
              {availableServices.length > 0 && (
                <div className="flex gap-2">
                  <Select onValueChange={addService}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Add a service to this package..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableServices.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} ({formatCurrency(service.price_cents)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Selected Services List */}
              {formData.items.length > 0 ? (
                <div className="space-y-2">
                  {formData.items.map((item) => {
                    const service = services.find((s) => s.id === item.service_id)
                    return (
                      <div
                        key={item.service_id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <div>
                            <p className="font-medium">{getServiceName(item.service_id)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(service?.price_cents || 0)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.is_optional}
                              onCheckedChange={() => toggleServiceOptional(item.service_id)}
                            />
                            <span className="text-sm text-muted-foreground">Optional</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeService(item.service_id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No services added yet</p>
                  <p className="text-sm">Select services from the dropdown above</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Pricing Tiers */}
      <Collapsible open={sectionsOpen.pricing} onOpenChange={() => toggleSection('pricing')}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <CardTitle className="text-lg">Pricing Tiers</CardTitle>
                    <CardDescription>Set prices based on home square footage</CardDescription>
                  </div>
                </div>
                {sectionsOpen.pricing ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-3">
                {formData.tiers.map((tier, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{tier.tier_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tier.min_sqft.toLocaleString()} - {tier.max_sqft ? tier.max_sqft.toLocaleString() : '∞'} sq ft
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={tier.price_cents / 100}
                        onChange={(e) => updateTierPrice(index, Math.round(parseFloat(e.target.value || '0') * 100))}
                        className="w-28"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {calculatedBaseValue > 0 && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong>Tip:</strong> Individual services total {formatCurrency(calculatedBaseValue)}.
                    Set package prices lower to offer savings.
                  </p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Features List */}
      <Collapsible open={sectionsOpen.features} onOpenChange={() => toggleSection('features')}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-amber-500" />
                  <div className="text-left">
                    <CardTitle className="text-lg">Feature Highlights</CardTitle>
                    <CardDescription>
                      {formData.features.length} features listed
                    </CardDescription>
                  </div>
                </div>
                {sectionsOpen.features ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="e.g., 24-hour turnaround"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                />
                <Button type="button" onClick={addFeature} variant="secondary">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.features.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm"
                    >
                      <span>{feature}</span>
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Add feature highlights that will be shown on the pricing page
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Settings */}
      <Collapsible open={sectionsOpen.settings} onOpenChange={() => toggleSection('settings')}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <CardTitle className="text-lg">Display Settings</CardTitle>
                    <CardDescription>Visibility and ordering options</CardDescription>
                  </div>
                </div>
                {sectionsOpen.settings ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Active</p>
                  <p className="text-sm text-muted-foreground">Show this package on the pricing page</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Featured</p>
                  <p className="text-sm text-muted-foreground">Highlight this as a recommended package</p>
                </div>
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_featured: checked }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData((prev) => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  className="w-24"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !formData.name || !formData.slug}>
          {isLoading ? 'Saving...' : initialPackage ? 'Update Package' : 'Create Package'}
        </Button>
      </div>
    </form>
  )
}
