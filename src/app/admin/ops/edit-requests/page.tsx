'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  User,
  MapPin,
  Calendar,
  Zap,
  Send,
  MessageSquare,
  ExternalLink,
  Image,
  Video,
  Palette,
  Sparkles,
  Layers,
  Pencil,
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
  is_billable: boolean
  estimated_cost?: number
  actual_cost?: number
  resolution_notes?: string
  due_date?: string
  created_at: string
  resolved_at?: string
  assigned_at?: string
  agent?: {
    id: string
    name: string
    email: string
  }
  listing?: {
    id: string
    address: string
    city: string
    state: string
  }
  assigned_staff?: {
    id: string
    name: string
    avatar_url?: string
  }
  resolver?: {
    id: string
    name: string
  }
}

interface Stats {
  total: number
  pending: number
  inProgress: number
  completedToday: number
}

const REQUEST_TYPES = [
  { value: 'photo_retouching', label: 'Photo Retouching', icon: Image },
  { value: 'color_correction', label: 'Color Correction', icon: Palette },
  { value: 'sky_replacement', label: 'Sky Replacement', icon: Sparkles },
  { value: 'object_removal', label: 'Object Removal', icon: X },
  { value: 'virtual_staging_revision', label: 'Virtual Staging Revision', icon: Layers },
  { value: 'video_edit', label: 'Video Edit', icon: Video },
  { value: 'floor_plan_correction', label: 'Floor Plan Correction', icon: Layers },
  { value: 'crop_resize', label: 'Crop/Resize', icon: Image },
  { value: 'exposure_adjustment', label: 'Exposure Adjustment', icon: Sparkles },
  { value: 'other', label: 'Other', icon: Pencil },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'reviewing', label: 'Reviewing', icon: Clock, color: 'bg-blue-100 text-blue-700' },
  { value: 'approved', label: 'Approved', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  { value: 'in_progress', label: 'In Progress', icon: RefreshCw, color: 'bg-purple-100 text-purple-700' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'bg-red-100 text-red-700' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-neutral-100 text-neutral-700' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
]

export default function EditRequestsPage() {
  const [editRequests, setEditRequests] = useState<EditRequest[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, inProgress: 0, completedToday: 0 })
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Detail panel state
  const [comment, setComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)

  useEffect(() => {
    fetchEditRequests()
    fetchStaff()
  }, [statusFilter, priorityFilter, typeFilter])

  const fetchEditRequests = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter && priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (typeFilter && typeFilter !== 'all') params.set('request_type', typeFilter)

      const response = await fetch(`/api/admin/edit-requests?${params}`)
      const data = await response.json()
      setEditRequests(data.editRequests || [])
      setStats(data.stats || { total: 0, pending: 0, inProgress: 0, completedToday: 0 })
    } catch (error) {
      console.error('Error fetching edit requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/admin/staff?is_active=true')
      const data = await response.json()
      setStaff(data.staff || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const handleUpdateRequest = async (id: string, updates: Partial<EditRequest>) => {
    try {
      const response = await fetch(`/api/admin/edit-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const data = await response.json()
        setEditRequests(editRequests.map(r => r.id === id ? { ...r, ...data.editRequest } : r))
        if (selectedRequest?.id === id) {
          setSelectedRequest({ ...selectedRequest, ...data.editRequest })
        }
      }
    } catch (error) {
      console.error('Error updating edit request:', error)
    }
  }

  const handleAddComment = async () => {
    if (!selectedRequest || !comment.trim()) return

    try {
      const response = await fetch(`/api/admin/edit-requests/${selectedRequest.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment, is_internal: isInternal }),
      })

      if (response.ok) {
        setComment('')
        setIsInternal(false)
        // Optionally refresh to get updated comments
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const filteredRequests = editRequests.filter(req => {
    if (search) {
      const searchLower = search.toLowerCase()
      if (!req.title.toLowerCase().includes(searchLower) &&
          !req.listing?.address?.toLowerCase().includes(searchLower) &&
          !req.agent?.name?.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    return true
  })

  const getStatusBadge = (status: string) => {
    const s = STATUS_OPTIONS.find(s => s.value === status)
    if (!s) return null
    const Icon = s.icon
    return (
      <Badge className={s.color}>
        <Icon className="h-3 w-3 mr-1" />
        {s.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const p = PRIORITIES.find(p => p.value === priority)
    return p ? <Badge className={p.color}>{p.label}</Badge> : null
  }

  const getTypeInfo = (type: string) => {
    return REQUEST_TYPES.find(t => t.value === type) || { label: type, icon: Pencil }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Requests</h1>
          <p className="text-neutral-500 mt-1">
            Post-delivery edit requests from agents
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEditRequests}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-neutral-500">Total Requests</div>
            <div className="text-2xl font-bold mt-1">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <Clock className="h-4 w-4" />
              Pending
            </div>
            <div className="text-2xl font-bold mt-1 text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-purple-600">
              <RefreshCw className="h-4 w-4" />
              In Progress
            </div>
            <div className="text-2xl font-bold mt-1">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Completed Today
            </div>
            <div className="text-2xl font-bold mt-1">{stats.completedToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search requests..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Request Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {REQUEST_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-neutral-400" />
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-neutral-400">
                  No edit requests found
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request) => {
                const typeInfo = getTypeInfo(request.request_type)
                const TypeIcon = typeInfo.icon

                return (
                  <TableRow
                    key={request.id}
                    className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <TableCell className="font-medium max-w-[250px]">
                      <div className="flex items-center gap-2">
                        {request.is_rush && (
                          <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{request.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {request.listing ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">
                            {request.listing.address}
                          </span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {request.agent ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-neutral-400" />
                          <span className="text-sm">{request.agent.name}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <TypeIcon className="h-3 w-3 mr-1" />
                        {typeInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                    <TableCell>
                      {request.assigned_staff ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={request.assigned_staff.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {request.assigned_staff.name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{request.assigned_staff.name}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          {selectedRequest && (
            <>
              <SheetHeader>
                <div className="flex items-start gap-3">
                  {selectedRequest.is_rush && (
                    <Zap className="h-5 w-5 text-amber-500 mt-1" />
                  )}
                  <SheetTitle className="text-left">{selectedRequest.title}</SheetTitle>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status & Priority Controls */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={selectedRequest.status}
                      onValueChange={(value) => handleUpdateRequest(selectedRequest.id, { status: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={selectedRequest.priority}
                      onValueChange={(value) => handleUpdateRequest(selectedRequest.id, { priority: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Assignee */}
                <div>
                  <Label>Assigned To</Label>
                  <Select
                    value={selectedRequest.assigned_staff?.id || 'unassigned'}
                    onValueChange={(value) => handleUpdateRequest(selectedRequest.id, { assigned_to: value === 'unassigned' ? null : value } as Partial<EditRequest>)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                {selectedRequest.description && (
                  <div>
                    <Label>Description</Label>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                      {selectedRequest.description}
                    </p>
                  </div>
                )}

                {/* Property & Agent Info */}
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg space-y-2">
                  {selectedRequest.listing && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-neutral-400" />
                      <span>
                        {selectedRequest.listing.address}, {selectedRequest.listing.city}
                      </span>
                      <Link
                        href={`/admin/ops/jobs/${selectedRequest.listing.id}`}
                        className="ml-auto text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                  {selectedRequest.agent && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-neutral-400" />
                      <span>{selectedRequest.agent.name}</span>
                      <span className="text-neutral-400">({selectedRequest.agent.email})</span>
                    </div>
                  )}
                </div>

                {/* Resolution Notes */}
                <div>
                  <Label>Resolution Notes</Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Add notes about the resolution..."
                    value={selectedRequest.resolution_notes || ''}
                    onChange={(e) => setSelectedRequest({ ...selectedRequest, resolution_notes: e.target.value })}
                    onBlur={() => {
                      if (selectedRequest.resolution_notes !== undefined) {
                        handleUpdateRequest(selectedRequest.id, { resolution_notes: selectedRequest.resolution_notes })
                      }
                    }}
                    rows={3}
                  />
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  {selectedRequest.status === 'pending' && (
                    <Button
                      className="flex-1"
                      onClick={() => handleUpdateRequest(selectedRequest.id, { status: 'in_progress' })}
                    >
                      Start Working
                    </Button>
                  )}
                  {selectedRequest.status === 'in_progress' && (
                    <Button
                      className="flex-1"
                      onClick={() => handleUpdateRequest(selectedRequest.id, { status: 'completed' })}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                </div>

                {/* Add Comment */}
                <div className="pt-4 border-t">
                  <Label>Add Comment</Label>
                  <div className="mt-1 space-y-2">
                    <Textarea
                      placeholder="Type a message..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded"
                        />
                        Internal note (not visible to agent)
                      </label>
                      <Button size="sm" onClick={handleAddComment} disabled={!comment.trim()}>
                        <Send className="h-4 w-4 mr-1" />
                        Send
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t text-xs text-neutral-400 space-y-1">
                  <p>Created {formatDistanceToNow(new Date(selectedRequest.created_at), { addSuffix: true })}</p>
                  {selectedRequest.assigned_at && (
                    <p>Assigned {formatDistanceToNow(new Date(selectedRequest.assigned_at), { addSuffix: true })}</p>
                  )}
                  {selectedRequest.resolved_at && (
                    <p>Resolved {formatDistanceToNow(new Date(selectedRequest.resolved_at), { addSuffix: true })} by {selectedRequest.resolver?.name}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
