'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Ban,
  Calendar,
  User,
  MessageSquare,
  History,
  Send,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
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

interface Comment {
  id: string
  content: string
  created_at: string
  author?: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
}

interface HistoryItem {
  id: string
  field_changed: string
  old_value?: string
  new_value?: string
  created_at: string
  changed_by_staff?: {
    id: string
    name: string
  }
}

interface TaskCardProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<Task>) => void
  staff?: { id: string; name: string }[]
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'To Do', icon: Circle, color: 'text-neutral-500' },
  { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-blue-500' },
  { value: 'blocked', label: 'Blocked', icon: AlertTriangle, color: 'text-orange-500' },
  { value: 'completed', label: 'Done', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'cancelled', label: 'Cancelled', icon: Ban, color: 'text-red-500' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-neutral-100 text-neutral-700' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
]

export function TaskCard({ task, isOpen, onClose, onUpdate, staff = [] }: TaskCardProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [newComment, setNewComment] = useState('')
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments')
  const [loading, setLoading] = useState(false)

  const fetchTaskDetails = async () => {
    if (!task.id) return
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/tasks/${task.id}`)
      const data = await response.json()
      setComments(data.comments || [])
      setHistory(data.history || [])
    } catch (error) {
      console.error('Error fetching task details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      const response = await fetch(`/api/admin/tasks/${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      })

      if (response.ok) {
        const data = await response.json()
        setComments([...comments, data.comment])
        setNewComment('')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const handleStatusChange = (newStatus: string) => {
    onUpdate(task.id, { status: newStatus as Task['status'] })
  }

  const handlePriorityChange = (newPriority: string) => {
    onUpdate(task.id, { priority: newPriority as Task['priority'] })
  }

  const handleAssigneeChange = (staffId: string) => {
    onUpdate(task.id, { assigned_to: staffId } as Partial<Task>)
  }

  const StatusIcon = STATUS_OPTIONS.find(s => s.value === task.status)?.icon || Circle

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start gap-3">
            <StatusIcon className={`h-5 w-5 mt-1 ${STATUS_OPTIONS.find(s => s.value === task.status)?.color}`} />
            <div className="flex-1">
              <SheetTitle className="text-left">{task.title}</SheetTitle>
              {task.listing && (
                <p className="text-sm text-neutral-500 mt-1">
                  {task.listing.address}, {task.listing.city}, {task.listing.state}
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {task.description}
              </p>
            </div>
          )}

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Status</h4>
              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        <s.icon className={`h-4 w-4 ${s.color}`} />
                        {s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Priority</h4>
              <Select value={task.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <Badge className={p.color}>{p.label}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <h4 className="text-sm font-medium mb-2">Assigned To</h4>
            <Select
              value={task.assigned_staff?.id || ''}
              onValueChange={handleAssigneeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
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

          {/* Due Date */}
          {task.due_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-neutral-400" />
              <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          )}

          {/* Blocked Reason */}
          {task.status === 'blocked' && task.blocked_reason && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium text-sm">Blocked</span>
              </div>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                {task.blocked_reason}
              </p>
            </div>
          )}

          {/* Completed Info */}
          {task.status === 'completed' && task.completed_at && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">
                  Completed {formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}
                  {task.completer && ` by ${task.completer.name}`}
                </span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setActiveTab('comments')
                  if (comments.length === 0) fetchTaskDetails()
                }}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'comments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <MessageSquare className="h-4 w-4 inline mr-1" />
                Comments
              </button>
              <button
                onClick={() => {
                  setActiveTab('history')
                  if (history.length === 0) fetchTaskDetails()
                }}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <History className="h-4 w-4 inline mr-1" />
                History
              </button>
            </div>
          </div>

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              {/* Comment Input */}
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.author?.avatar_url} />
                      <AvatarFallback>
                        {comment.author?.name?.slice(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.author?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}

                {comments.length === 0 && !loading && (
                  <p className="text-sm text-neutral-400 text-center py-4">
                    No comments yet
                  </p>
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="flex items-start gap-3 text-sm">
                  <div className="w-1 h-1 rounded-full bg-neutral-300 mt-2" />
                  <div className="flex-1">
                    <span className="font-medium">{item.changed_by_staff?.name || 'System'}</span>
                    <span className="text-neutral-500"> changed </span>
                    <span className="font-medium">{item.field_changed}</span>
                    {item.old_value && item.new_value && (
                      <>
                        <span className="text-neutral-500"> from </span>
                        <Badge variant="outline" className="mx-1">{item.old_value}</Badge>
                        <span className="text-neutral-500"> to </span>
                        <Badge variant="outline" className="mx-1">{item.new_value}</Badge>
                      </>
                    )}
                    <span className="text-neutral-400 text-xs ml-2">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}

              {history.length === 0 && !loading && (
                <p className="text-sm text-neutral-400 text-center py-4">
                  No history yet
                </p>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-400">
            <p>Created {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</p>
            {task.assigner && (
              <p>Assigned by {task.assigner.name}</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
