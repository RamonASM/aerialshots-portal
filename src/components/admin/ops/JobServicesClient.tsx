'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
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
import {
  Plus,
  Minus,
  ShoppingCart,
  Package,
  DollarSign,
  Loader2,
  Check,
  Image,
  Video,
  Camera,
  Plane,
  Layers,
  Sparkles,
  Clock,
  History,
  AlertCircle,
} from 'lucide-react'

interface Service {
  id: string
  service_key: string
  name: string
  description?: string
  category: string
  base_price: number
  is_active: boolean
  display_order: number
}

interface OrderModification {
  id: string
  modification_type: string
  service_name: string
  service_price: number
  quantity: number
  price_change: number
  original_total: number
  new_total: number
  reason?: string
  created_at: string
}

interface Order {
  id: string
  total: number
  status: string
  line_items: Array<{
    service_key?: string
    name?: string
    price?: number
    quantity?: number
  }>
}

interface JobServicesClientProps {
  listingId: string
}

const CATEGORY_ICONS: Record<string, typeof Image> = {
  photography: Camera,
  video: Video,
  drone: Plane,
  floor_plan: Layers,
  staging: Sparkles,
  default: Package,
}

const CATEGORY_COLORS: Record<string, string> = {
  photography: 'bg-blue-100 text-blue-700',
  video: 'bg-purple-100 text-purple-700',
  drone: 'bg-sky-100 text-sky-700',
  floor_plan: 'bg-orange-100 text-orange-700',
  staging: 'bg-pink-100 text-pink-700',
  default: 'bg-neutral-100 text-neutral-700',
}

export function JobServicesClient({ listingId }: JobServicesClientProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [services, setServices] = useState<Service[]>([])
  const [order, setOrder] = useState<Order | null>(null)
  const [currentServices, setCurrentServices] = useState<string[]>([])
  const [modifications, setModifications] = useState<OrderModification[]>([])

  // Add service form
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')

  // Remove dialog
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [serviceToRemove, setServiceToRemove] = useState<string | null>(null)
  const [removeReason, setRemoveReason] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/ops/jobs/${listingId}/services`)
      if (!response.ok) {
        throw new Error('Failed to fetch services')
      }
      const data = await response.json()
      setServices(data.services || [])
      setOrder(data.order || null)
      setCurrentServices(data.currentServices || [])
      setModifications(data.modifications || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [listingId])

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, fetchData])

  const handleAddService = async () => {
    if (!selectedService) return

    setActionLoading(selectedService.service_key)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/ops/jobs/${listingId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_key: selectedService.service_key,
          quantity,
          reason: reason || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add service')
      }

      const data = await response.json()
      setSuccess(`Added ${selectedService.name} - New total: $${data.modification?.new_total || order?.total}`)
      setSelectedService(null)
      setQuantity(1)
      setReason('')
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveService = async () => {
    if (!serviceToRemove) return

    setActionLoading(serviceToRemove)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/admin/ops/jobs/${listingId}/services`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_key: serviceToRemove,
          reason: removeReason || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove service')
      }

      const data = await response.json()
      setSuccess(`Removed service - New total: $${data.modification?.new_total || order?.total}`)
      setRemoveDialogOpen(false)
      setServiceToRemove(null)
      setRemoveReason('')
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(null)
    }
  }

  const availableServices = services.filter(
    (service) => !currentServices.includes(service.service_key)
  )

  const groupedAvailable = availableServices.reduce(
    (acc, service) => {
      const category = service.category || 'other'
      if (!acc[category]) acc[category] = []
      acc[category].push(service)
      return acc
    },
    {} as Record<string, Service[]>
  )

  const currentServiceDetails = services.filter((service) =>
    currentServices.includes(service.service_key)
  )

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Manage Services
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Order Services</SheetTitle>
            <SheetDescription>
              Add or remove services from this order
            </SheetDescription>
          </SheetHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          ) : !order ? (
            <div className="py-12 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-neutral-300 mb-3" />
              <p className="text-neutral-500">No order found for this listing</p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Order Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    ${order.total?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {currentServices.length} services
                  </p>
                </CardContent>
              </Card>

              {/* Success/Error Messages */}
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {success}
                </div>
              )}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* Current Services */}
              <div>
                <h3 className="font-medium text-sm text-neutral-700 mb-3">
                  Current Services
                </h3>
                {currentServiceDetails.length > 0 ? (
                  <div className="space-y-2">
                    {currentServiceDetails.map((service) => {
                      const Icon =
                        CATEGORY_ICONS[service.category] || CATEGORY_ICONS.default
                      const colorClass =
                        CATEGORY_COLORS[service.category] || CATEGORY_COLORS.default
                      const lineItem = order.line_items?.find(
                        (item) => item.service_key === service.service_key
                      )

                      return (
                        <div
                          key={service.service_key}
                          className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${colorClass}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{service.name}</p>
                              <p className="text-xs text-neutral-500">
                                ${(lineItem?.price || service.base_price).toFixed(2)}
                                {(lineItem?.quantity || 1) > 1 &&
                                  ` x ${lineItem?.quantity}`}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setServiceToRemove(service.service_key)
                              setRemoveDialogOpen(true)
                            }}
                            disabled={actionLoading === service.service_key}
                          >
                            {actionLoading === service.service_key ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Minus className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">No services in order</p>
                )}
              </div>

              {/* Add Service */}
              <div>
                <h3 className="font-medium text-sm text-neutral-700 mb-3">
                  Add Service
                </h3>

                {selectedService ? (
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{selectedService.name}</p>
                          <p className="text-sm text-neutral-500">
                            ${selectedService.base_price.toFixed(2)} each
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedService(null)}
                        >
                          Change
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="quantity">Quantity</Label>
                          <Input
                            id="quantity"
                            type="number"
                            min="1"
                            max="100"
                            value={quantity}
                            onChange={(e) =>
                              setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                            }
                          />
                        </div>
                        <div>
                          <Label>Total</Label>
                          <p className="text-lg font-bold mt-2">
                            ${(selectedService.base_price * quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="reason">Reason (optional)</Label>
                        <Textarea
                          id="reason"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Why is this service being added?"
                          rows={2}
                        />
                      </div>

                      <Button
                        onClick={handleAddService}
                        disabled={!!actionLoading}
                        className="w-full"
                      >
                        {actionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Add to Order
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedAvailable).map(([category, categoryServices]) => {
                      const Icon =
                        CATEGORY_ICONS[category] || CATEGORY_ICONS.default
                      const colorClass =
                        CATEGORY_COLORS[category] || CATEGORY_COLORS.default

                      return (
                        <div key={category}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 rounded ${colorClass}`}>
                              <Icon className="h-3 w-3" />
                            </div>
                            <span className="text-xs font-medium text-neutral-500 uppercase">
                              {category.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {categoryServices.map((service) => (
                              <button
                                key={service.service_key}
                                onClick={() => setSelectedService(service)}
                                className="flex items-center justify-between p-3 bg-white border border-neutral-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-left"
                              >
                                <div>
                                  <p className="font-medium text-sm">
                                    {service.name}
                                  </p>
                                  {service.description && (
                                    <p className="text-xs text-neutral-500 line-clamp-1">
                                      {service.description}
                                    </p>
                                  )}
                                </div>
                                <Badge variant="secondary">
                                  ${service.base_price.toFixed(2)}
                                </Badge>
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}

                    {availableServices.length === 0 && (
                      <p className="text-sm text-neutral-500 text-center py-4">
                        All available services have been added
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Modification History */}
              {modifications.length > 0 && (
                <div>
                  <h3 className="font-medium text-sm text-neutral-700 mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Modification History
                  </h3>
                  <div className="space-y-2">
                    {modifications.slice(0, 5).map((mod) => (
                      <div
                        key={mod.id}
                        className="flex items-start gap-3 p-2 bg-neutral-50 rounded text-sm"
                      >
                        <div
                          className={`p-1 rounded ${
                            mod.modification_type === 'add_service'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {mod.modification_type === 'add_service' ? (
                            <Plus className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{mod.service_name}</p>
                          <p className="text-xs text-neutral-500">
                            {mod.modification_type === 'add_service' ? '+' : ''}$
                            {mod.price_change.toFixed(2)} -{' '}
                            {new Date(mod.created_at).toLocaleDateString()}
                          </p>
                          {mod.reason && (
                            <p className="text-xs text-neutral-400 mt-1">
                              {mod.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this service from the order? This will
              update the order total.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="removeReason">Reason (optional)</Label>
            <Textarea
              id="removeReason"
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              placeholder="Why is this service being removed?"
              rows={2}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveService}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Remove Service
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
