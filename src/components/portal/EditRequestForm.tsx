'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Pencil,
  Clock,
  CheckCircle2,
  AlertCircle,
  Image,
  Video,
  Palette,
  Sparkles,
  Layers,
  Send,
  X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface EditRequest {
  id: string
  request_type: string
  title: string
  description?: string
  status: string
  priority: string
  is_rush: boolean
  created_at: string
  resolved_at?: string
  resolution_notes?: string
}

interface EditRequestFormProps {
  orderId: string
  listingAddress: string
  existingRequests?: EditRequest[]
  onRequestCreated?: (request: EditRequest) => void
}

const REQUEST_TYPES = [
  { value: 'photo_retouching', label: 'Photo Retouching', icon: Image, description: 'Touch up, smooth, or enhance photos' },
  { value: 'color_correction', label: 'Color Correction', icon: Palette, description: 'Adjust colors, white balance, or exposure' },
  { value: 'sky_replacement', label: 'Sky Replacement', icon: Sparkles, description: 'Replace overcast sky with blue sky' },
  { value: 'object_removal', label: 'Object Removal', icon: X, description: 'Remove unwanted objects from photos' },
  { value: 'virtual_staging_revision', label: 'Virtual Staging Revision', icon: Layers, description: 'Modify virtual staging furniture or style' },
  { value: 'video_edit', label: 'Video Edit', icon: Video, description: 'Edit video content or add elements' },
  { value: 'floor_plan_correction', label: 'Floor Plan Correction', icon: Layers, description: 'Fix measurements or labels on floor plan' },
  { value: 'crop_resize', label: 'Crop/Resize', icon: Image, description: 'Crop or resize images' },
  { value: 'exposure_adjustment', label: 'Exposure Adjustment', icon: Sparkles, description: 'Fix over/underexposed areas' },
  { value: 'other', label: 'Other Request', icon: Pencil, description: 'Describe your specific request' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  reviewing: { label: 'Under Review', color: 'bg-blue-100 text-blue-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-700', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Declined', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-neutral-100 text-neutral-700', icon: X },
}

export function EditRequestForm({
  orderId,
  listingAddress,
  existingRequests = [],
  onRequestCreated,
}: EditRequestFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [requestType, setRequestType] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isRush, setIsRush] = useState(false)

  const handleSubmit = async () => {
    if (!requestType || !title) {
      setError('Please select a request type and provide a title')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/orders/${orderId}/edit-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: requestType,
          title,
          description,
          is_rush: isRush,
          priority: isRush ? 'urgent' : 'normal',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit request')
      }

      const data = await response.json()
      onRequestCreated?.(data.editRequest)

      // Reset form
      setRequestType('')
      setTitle('')
      setDescription('')
      setIsRush(false)
      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const selectedType = REQUEST_TYPES.find(t => t.value === requestType)

  return (
    <div className="space-y-6">
      {/* Header with New Request Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Edit Requests</h2>
          <p className="text-sm text-neutral-500">
            Request changes to your delivered media
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Pencil className="h-4 w-4 mr-2" />
              New Edit Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Request an Edit</DialogTitle>
              <DialogDescription>
                {listingAddress}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Request Type Selection */}
              <div className="space-y-2">
                <Label>What type of edit do you need?</Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select edit type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map((type) => {
                      const Icon = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {selectedType && (
                  <p className="text-xs text-neutral-500">{selectedType.description}</p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Brief Summary *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Remove car from driveway in photo 3"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe exactly what changes you need. Include photo numbers or timestamps for videos."
                  rows={4}
                />
              </div>

              {/* Rush Option */}
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Checkbox
                  id="rush"
                  checked={isRush}
                  onCheckedChange={(checked) => setIsRush(checked === true)}
                />
                <div className="flex-1">
                  <Label htmlFor="rush" className="font-medium text-amber-900">
                    Rush Request (+$25)
                  </Label>
                  <p className="text-xs text-amber-700">
                    Get your edits back within 4 hours during business hours
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading || !requestType || !title}>
                  {loading ? (
                    <>Submitting...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Existing Requests List */}
      {existingRequests.length > 0 ? (
        <div className="space-y-3">
          {existingRequests.map((request) => {
            const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending
            const StatusIcon = statusConfig.icon
            const requestTypeInfo = REQUEST_TYPES.find(t => t.value === request.request_type)
            const TypeIcon = requestTypeInfo?.icon || Pencil

            return (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-neutral-100 rounded-lg">
                      <TypeIcon className="h-5 w-5 text-neutral-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium">{request.title}</h3>
                          <p className="text-sm text-neutral-500 mt-0.5">
                            {requestTypeInfo?.label || request.request_type}
                          </p>
                        </div>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>

                      {request.description && (
                        <p className="text-sm text-neutral-600 mt-2 line-clamp-2">
                          {request.description}
                        </p>
                      )}

                      {request.resolution_notes && request.status === 'completed' && (
                        <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
                          <strong>Resolution:</strong> {request.resolution_notes}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-neutral-400">
                        <span>
                          Submitted {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </span>
                        {request.is_rush && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Rush
                          </Badge>
                        )}
                        {request.resolved_at && (
                          <span>
                            Resolved {formatDistanceToNow(new Date(request.resolved_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Pencil className="h-12 w-12 mx-auto text-neutral-300 mb-3" />
            <h3 className="font-medium text-neutral-700">No Edit Requests</h3>
            <p className="text-sm text-neutral-500 mt-1">
              Need changes to your photos or videos? Submit an edit request above.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
