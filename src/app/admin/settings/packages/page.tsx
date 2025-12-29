'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Star,
  Layers,
  DollarSign,
  MoreVertical,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { PackageBuilder } from '@/components/admin/settings/PackageBuilder'
import { Skeleton } from '@/components/ui/skeleton'

interface Service {
  id: string
  name: string
  price_cents: number
}

interface PackageItem {
  id: string
  package_id: string
  service_id: string
  is_optional: boolean
  quantity: number
}

interface PackageTier {
  id: string
  package_id: string
  min_sqft: number
  max_sqft: number | null
  price_cents: number
  tier_name: string
}

interface ServicePackage {
  id: string
  name: string
  slug: string
  description: string | null
  features: string[]
  display_order: number
  is_featured: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  items: PackageItem[]
  tiers: PackageTier[]
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null)
  const [deletePackage, setDeletePackage] = useState<ServicePackage | null>(null)

  const fetchPackages = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/packages')
      if (res.ok) {
        const data = await res.json()
        setPackages(data.packages || [])
      }
    } catch (error) {
      console.error('Error fetching packages:', error)
    }
  }, [])

  const fetchServices = useCallback(async () => {
    try {
      // Fetch services from the existing services endpoint
      const res = await fetch('/api/admin/services')
      if (res.ok) {
        const data = await res.json()
        setServices(data.services || [])
      }
    } catch (error) {
      console.error('Error fetching services:', error)
      // Fallback to empty array - services might come from a different source
      setServices([])
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchPackages(), fetchServices()])
      setIsLoading(false)
    }
    loadData()
  }, [fetchPackages, fetchServices])

  const handleCreate = () => {
    setEditingPackage(null)
    setDialogOpen(true)
  }

  const handleEdit = (pkg: ServicePackage) => {
    setEditingPackage(pkg)
    setDialogOpen(true)
  }

  const handleSave = async (data: {
    id?: string
    name: string
    slug: string
    description: string
    features: string[]
    items: { service_id: string; is_optional: boolean; quantity: number }[]
    tiers: { min_sqft: number; max_sqft: number | null; price_cents: number; tier_name: string }[]
    display_order: number
    is_featured: boolean
    is_active: boolean
  }) => {
    setIsSaving(true)
    try {
      const method = editingPackage ? 'PATCH' : 'POST'
      const body = editingPackage ? { ...data, id: editingPackage.id } : data

      const res = await fetch('/api/admin/packages', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setDialogOpen(false)
        await fetchPackages()
      } else {
        const error = await res.json()
        console.error('Error saving package:', error)
      }
    } catch (error) {
      console.error('Error saving package:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletePackage) return

    try {
      const res = await fetch('/api/admin/packages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletePackage.id }),
      })

      if (res.ok) {
        setDeletePackage(null)
        await fetchPackages()
      }
    } catch (error) {
      console.error('Error deleting package:', error)
    }
  }

  const handleToggleActive = async (pkg: ServicePackage) => {
    try {
      const res = await fetch('/api/admin/packages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pkg.id,
          is_active: !pkg.is_active,
        }),
      })

      if (res.ok) {
        await fetchPackages()
      }
    } catch (error) {
      console.error('Error toggling package:', error)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const getPriceRange = (tiers: PackageTier[]) => {
    if (!tiers || tiers.length === 0) return 'No pricing set'
    const prices = tiers.map((t) => t.price_cents).filter((p) => p > 0)
    if (prices.length === 0) return 'No pricing set'
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    if (min === max) return formatCurrency(min)
    return `${formatCurrency(min)} - ${formatCurrency(max)}`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Packages</h1>
          <p className="text-muted-foreground">
            Create and manage bundled service packages with tiered pricing
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Package
        </Button>
      </div>

      {/* Packages Grid */}
      {packages.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`relative ${!pkg.is_active ? 'opacity-60' : ''} ${
                pkg.is_featured ? 'ring-2 ring-amber-500' : ''
              }`}
            >
              {pkg.is_featured && (
                <div className="absolute -top-3 left-4">
                  <Badge className="bg-amber-500 hover:bg-amber-600">
                    <Star className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      {pkg.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {pkg.description || 'No description'}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(pkg)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(pkg)}>
                        {pkg.is_active ? (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeletePackage(pkg)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price Range */}
                <div className="flex items-center gap-2 text-lg font-semibold text-green-600 dark:text-green-400">
                  <DollarSign className="h-5 w-5" />
                  {getPriceRange(pkg.tiers)}
                </div>

                {/* Services Count */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  {pkg.items.length} service{pkg.items.length !== 1 ? 's' : ''} included
                </div>

                {/* Features */}
                {pkg.features && pkg.features.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pkg.features.slice(0, 3).map((feature, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {pkg.features.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{pkg.features.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Status */}
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        pkg.is_active ? 'bg-green-500' : 'bg-neutral-300'
                      }`}
                    />
                    <span className="text-sm text-muted-foreground">
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      Order: {pkg.display_order}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No packages yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create service packages to offer bundled pricing to your clients
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Package
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Edit Package' : 'Create New Package'}
            </DialogTitle>
            <DialogDescription>
              {editingPackage
                ? 'Update the package details below'
                : 'Configure your new service package'}
            </DialogDescription>
          </DialogHeader>
          <PackageBuilder
            package={
              editingPackage
                ? {
                    id: editingPackage.id,
                    name: editingPackage.name,
                    slug: editingPackage.slug,
                    description: editingPackage.description || '',
                    features: editingPackage.features || [],
                    items: editingPackage.items.map((item) => ({
                      service_id: item.service_id,
                      is_optional: item.is_optional,
                      quantity: item.quantity,
                    })),
                    tiers: editingPackage.tiers.map((tier) => ({
                      min_sqft: tier.min_sqft,
                      max_sqft: tier.max_sqft,
                      price_cents: tier.price_cents,
                      tier_name: tier.tier_name,
                    })),
                    display_order: editingPackage.display_order,
                    is_featured: editingPackage.is_featured,
                    is_active: editingPackage.is_active,
                  }
                : undefined
            }
            services={services}
            onSave={handleSave}
            onCancel={() => setDialogOpen(false)}
            isLoading={isSaving}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePackage} onOpenChange={() => setDeletePackage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletePackage?.name}&quot;? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
