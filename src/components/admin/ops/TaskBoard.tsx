'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Ban,
  Calendar,
  User,
  GripVertical,
  MoreHorizontal,
  MessageSquare,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Task {
  id: string
  title: string
  description?: string
  task_type: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'
  due_date?: string
  assigned_staff?: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
  listing?: {
    id: string
    address: string
    city: string
    state: string
  }
  created_at: string
}

interface TaskBoardProps {
  listingId?: string
  orderId?: string
  onTaskSelect?: (task: Task) => void
}

const COLUMNS = [
  { id: 'pending', title: 'To Do', icon: Circle, color: 'text-neutral-500' },
  { id: 'in_progress', title: 'In Progress', icon: Clock, color: 'text-blue-500' },
  { id: 'blocked', title: 'Blocked', icon: AlertTriangle, color: 'text-orange-500' },
  { id: 'completed', title: 'Done', icon: CheckCircle2, color: 'text-green-500' },
]

const TASK_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'photo_editing', label: 'Photo Editing' },
  { value: 'video_editing', label: 'Video Editing' },
  { value: 'floor_plan', label: 'Floor Plan' },
  { value: 'virtual_staging', label: 'Virtual Staging' },
  { value: 'drone_review', label: 'Drone Review' },
  { value: 'qc_review', label: 'QC Review' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'client_followup', label: 'Client Follow-up' },
  { value: 'reshoot', label: 'Reshoot' },
  { value: 'revision', label: 'Revision' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-neutral-100 text-neutral-700' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
]

export function TaskBoard({ listingId, orderId, onTaskSelect }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([])

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_type: 'general',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
  })

  useEffect(() => {
    fetchTasks()
    fetchStaff()
  }, [listingId, orderId])

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams()
      if (listingId) params.set('listing_id', listingId)
      if (orderId) params.set('order_id', orderId)
      params.set('include_completed', 'true')

      const response = await fetch(`/api/admin/tasks?${params}`)
      const data = await response.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
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

  const handleCreateTask = async () => {
    if (!newTask.title) return

    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          listing_id: listingId,
          order_id: orderId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setTasks([...tasks, data.task])
        setNewTask({
          title: '',
          description: '',
          task_type: 'general',
          priority: 'medium',
          assigned_to: '',
          due_date: '',
        })
        setIsCreateOpen(false)
      }
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      })

      if (response.ok) {
        setTasks(tasks.map(t =>
          t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t
        ))
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const getTasksByStatus = (status: string) => {
    return tasks.filter(t => t.status === status)
  }

  const getPriorityBadge = (priority: string) => {
    const p = PRIORITIES.find(p => p.value === priority)
    return p ? <Badge className={p.color}>{p.label}</Badge> : null
  }

  const formatDueDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return <span className="text-red-600 text-xs">Overdue</span>
    } else if (diffDays === 0) {
      return <span className="text-orange-600 text-xs">Today</span>
    } else if (diffDays === 1) {
      return <span className="text-orange-600 text-xs">Tomorrow</span>
    }
    return <span className="text-neutral-500 text-xs">{d.toLocaleDateString()}</span>
  }

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map(col => (
          <div key={col.id} className="bg-neutral-50 rounded-lg p-4 animate-pulse">
            <div className="h-6 bg-neutral-200 rounded w-24 mb-4" />
            <div className="space-y-3">
              <div className="h-24 bg-neutral-200 rounded" />
              <div className="h-24 bg-neutral-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <Badge variant="secondary">{tasks.length} total</Badge>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Task Type</Label>
                  <Select
                    value={newTask.task_type}
                    onValueChange={(value) => setNewTask({ ...newTask, task_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                  >
                    <SelectTrigger>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select
                    value={newTask.assigned_to}
                    onValueChange={(value) => setNewTask({ ...newTask, assigned_to: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTask} disabled={!newTask.title}>
                  Create Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((column) => {
          const Icon = column.icon
          const columnTasks = getTasksByStatus(column.id)

          return (
            <div key={column.id} className="bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              {/* Column Header */}
              <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${column.color}`} />
                  <span className="font-medium text-sm">{column.title}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {columnTasks.length}
                  </Badge>
                </div>
              </div>

              {/* Tasks */}
              <div className="p-2 space-y-2 min-h-[200px]">
                {columnTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onTaskSelect?.(task)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-neutral-400 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium line-clamp-2">
                              {task.title}
                            </h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {COLUMNS.filter(c => c.id !== task.status && c.id !== 'cancelled').map((c) => (
                                  <DropdownMenuItem
                                    key={c.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleUpdateStatus(task.id, c.id)
                                    }}
                                  >
                                    <c.icon className={`h-4 w-4 mr-2 ${c.color}`} />
                                    Move to {c.title}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleUpdateStatus(task.id, 'cancelled')
                                  }}
                                  className="text-red-600"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Cancel Task
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Task Type Badge */}
                          <Badge variant="outline" className="mt-2 text-xs">
                            {TASK_TYPES.find(t => t.value === task.task_type)?.label || task.task_type}
                          </Badge>

                          {/* Priority & Due Date */}
                          <div className="flex items-center gap-2 mt-2">
                            {getPriorityBadge(task.priority)}
                            {task.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-neutral-400" />
                                {formatDueDate(task.due_date)}
                              </div>
                            )}
                          </div>

                          {/* Assignee */}
                          {task.assigned_staff && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={task.assigned_staff.avatar_url} />
                                <AvatarFallback className="text-[10px]">
                                  {task.assigned_staff.name?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                                {task.assigned_staff.name}
                              </span>
                            </div>
                          )}

                          {/* Property info */}
                          {task.listing && (
                            <div className="text-xs text-neutral-500 mt-2 truncate">
                              {task.listing.address}, {task.listing.city}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-neutral-400 text-sm">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
