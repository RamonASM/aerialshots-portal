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
  Calendar,
  ListTodo,
  MoreHorizontal,
  Ban,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'

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
  created_at: string
}

interface JobTasksClientProps {
  listingId: string
  orderId?: string
}

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

const STATUS_OPTIONS = [
  { value: 'pending', label: 'To Do', icon: Circle, color: 'text-neutral-500' },
  { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-blue-500' },
  { value: 'blocked', label: 'Blocked', icon: AlertTriangle, color: 'text-orange-500' },
  { value: 'completed', label: 'Done', icon: CheckCircle2, color: 'text-green-500' },
]

export function JobTasksClient({ listingId, orderId }: JobTasksClientProps) {
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
      params.set('listing_id', listingId)
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
        setTasks([data.task, ...tasks])
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

  const getPriorityBadge = (priority: string) => {
    const p = PRIORITIES.find(p => p.value === priority)
    return p ? <Badge className={p.color}>{p.label}</Badge> : null
  }

  const getStatusIcon = (status: string) => {
    const s = STATUS_OPTIONS.find(s => s.value === status)
    if (!s) return null
    const Icon = s.icon
    return <Icon className={`h-4 w-4 ${s.color}`} />
  }

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const totalCount = tasks.filter(t => t.status !== 'cancelled').length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Tasks
            <Badge variant="secondary" className="ml-2">
              {completedCount}/{totalCount}
            </Badge>
          </CardTitle>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
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
                    rows={2}
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
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-14 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-neutral-400">
            <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No tasks yet</p>
            <p className="text-sm">Add a task to track work for this job</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                task.status === 'completed'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : task.status === 'blocked'
                  ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                  : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <button
                onClick={() => {
                  const nextStatus = task.status === 'completed' ? 'pending' :
                    task.status === 'pending' ? 'in_progress' :
                    task.status === 'in_progress' ? 'completed' : task.status
                  handleUpdateStatus(task.id, nextStatus)
                }}
                className="mt-0.5"
              >
                {getStatusIcon(task.status)}
              </button>

              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-neutral-400' : ''}`}>
                  {task.title}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {TASK_TYPES.find(t => t.value === task.task_type)?.label || task.task_type}
                  </Badge>
                  {getPriorityBadge(task.priority)}
                  {task.due_date && (
                    <span className="text-xs text-neutral-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {task.assigned_staff && (
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={task.assigned_staff.avatar_url} />
                      <AvatarFallback className="text-[10px]">
                        {task.assigned_staff.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-neutral-500">{task.assigned_staff.name}</span>
                  </div>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {STATUS_OPTIONS.filter(s => s.value !== task.status).map((s) => (
                    <DropdownMenuItem
                      key={s.value}
                      onClick={() => handleUpdateStatus(task.id, s.value)}
                    >
                      <s.icon className={`h-4 w-4 mr-2 ${s.color}`} />
                      {s.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    onClick={() => handleUpdateStatus(task.id, 'cancelled')}
                    className="text-red-600"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Cancel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
