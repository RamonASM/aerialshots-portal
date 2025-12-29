'use client'

import { useState, useEffect } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Calendar,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
} from 'lucide-react'
import { TaskBoard } from '@/components/admin/ops/TaskBoard'
import { TaskCard } from '@/components/admin/ops/TaskCard'
import { formatDistanceToNow } from 'date-fns'

interface Task {
  id: string
  title: string
  description?: string
  task_type: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'
  due_date?: string
  blocked_reason?: string
  assigned_staff?: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
  assigner?: {
    id: string
    name: string
  }
  completer?: {
    id: string
    name: string
  }
  listing?: {
    id: string
    address: string
    city: string
    state: string
  }
  created_at: string
  completed_at?: string
}

interface Stats {
  total: number
  pending: number
  in_progress: number
  blocked: number
  completed: number
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
  { value: 'pending', label: 'To Do', icon: Circle, color: 'text-neutral-500 bg-neutral-100' },
  { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-blue-500 bg-blue-100' },
  { value: 'blocked', label: 'Blocked', icon: AlertTriangle, color: 'text-orange-500 bg-orange-100' },
  { value: 'completed', label: 'Done', icon: CheckCircle2, color: 'text-green-500 bg-green-100' },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, in_progress: 0, blocked: 0, completed: 0 })
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    fetchTasks()
    fetchStaff()
  }, [statusFilter, priorityFilter, assigneeFilter, typeFilter])

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams()
      params.set('include_completed', 'true')
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter && priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (assigneeFilter && assigneeFilter !== 'all') params.set('assigned_to', assigneeFilter)
      if (typeFilter && typeFilter !== 'all') params.set('task_type', typeFilter)

      const response = await fetch(`/api/admin/tasks?${params}`)
      const data = await response.json()
      setTasks(data.tasks || [])
      setStats(data.stats || { total: 0, pending: 0, in_progress: 0, blocked: 0, completed: 0 })
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

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, ...updates }),
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(tasks.map(t => t.id === taskId ? { ...t, ...data.task } : t))
        if (selectedTask?.id === taskId) {
          setSelectedTask({ ...selectedTask, ...data.task })
        }
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (search) {
      const searchLower = search.toLowerCase()
      if (!task.title.toLowerCase().includes(searchLower) &&
          !task.listing?.address?.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    return true
  })

  const getPriorityBadge = (priority: string) => {
    const p = PRIORITIES.find(p => p.value === priority)
    return p ? <Badge className={p.color}>{p.label}</Badge> : null
  }

  const getStatusBadge = (status: string) => {
    const s = STATUS_OPTIONS.find(s => s.value === status)
    if (!s) return null
    const Icon = s.icon
    return (
      <Badge variant="outline" className={s.color}>
        <Icon className="h-3 w-3 mr-1" />
        {s.label}
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task Management</h1>
          <p className="text-neutral-500 mt-1">
            Manage and track all job tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTasks}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-neutral-500">Total Tasks</div>
            <div className="text-2xl font-bold mt-1">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Circle className="h-4 w-4" />
              To Do
            </div>
            <div className="text-2xl font-bold mt-1">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-blue-500">
              <Clock className="h-4 w-4" />
              In Progress
            </div>
            <div className="text-2xl font-bold mt-1">{stats.in_progress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-orange-500">
              <AlertTriangle className="h-4 w-4" />
              Blocked
            </div>
            <div className="text-2xl font-bold mt-1 text-orange-500">{stats.blocked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </div>
            <div className="text-2xl font-bold mt-1">{stats.completed}</div>
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
                  placeholder="Search tasks..."
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
                <SelectValue placeholder="Task Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TASK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 border rounded-md">
              <Button
                variant={viewMode === 'board' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('board')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : viewMode === 'board' ? (
        <TaskBoard onTaskSelect={(task) => setSelectedTask(task)} />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow
                  key={task.id}
                  className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  onClick={() => setSelectedTask(task)}
                >
                  <TableCell className="font-medium max-w-[250px]">
                    <div className="truncate">{task.title}</div>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {task.listing ? (
                      <div className="truncate max-w-[200px]">
                        {task.listing.address}, {task.listing.city}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {TASK_TYPES.find(t => t.value === task.task_type)?.label || task.task_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                  <TableCell>
                    {task.assigned_staff ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={task.assigned_staff.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {task.assigned_staff.name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{task.assigned_staff.name}</span>
                      </div>
                    ) : (
                      <span className="text-neutral-400 text-sm">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.due_date ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-neutral-400" />
                        {new Date(task.due_date).toLocaleDateString()}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
              {filteredTasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-neutral-400">
                    No tasks found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Task Detail Sheet */}
      {selectedTask && (
        <TaskCard
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          staff={staff}
        />
      )}
    </div>
  )
}
