'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Send,
  Pin,
  PinOff,
  AlertCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  StickyNote,
  MessageSquare,
  Camera,
  Palette,
  ClipboardCheck,
  Calendar,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Note {
  id: string
  content: string
  note_type: string
  is_pinned: boolean
  is_important: boolean
  created_at: string
  edited_at?: string
  author?: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
}

interface JobNotesProps {
  listingId: string
  orderId?: string
}

const NOTE_TYPES = [
  { value: 'general', label: 'General', icon: StickyNote, color: 'bg-neutral-100 text-neutral-700' },
  { value: 'internal', label: 'Internal', icon: MessageSquare, color: 'bg-purple-100 text-purple-700' },
  { value: 'photographer', label: 'Photographer', icon: Camera, color: 'bg-blue-100 text-blue-700' },
  { value: 'editor', label: 'Editor', icon: Palette, color: 'bg-pink-100 text-pink-700' },
  { value: 'qc', label: 'QC', icon: ClipboardCheck, color: 'bg-green-100 text-green-700' },
  { value: 'scheduling', label: 'Scheduling', icon: Calendar, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'issue', label: 'Issue', icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
  { value: 'resolution', label: 'Resolution', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700' },
]

export function JobNotes({ listingId }: JobNotesProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState('general')
  const [isImportant, setIsImportant] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    fetchNotes()
  }, [listingId, filterType])

  const fetchNotes = async () => {
    try {
      const params = new URLSearchParams()
      if (filterType && filterType !== 'all') {
        params.set('note_type', filterType)
      }

      const response = await fetch(`/api/admin/ops/jobs/${listingId}/notes?${params}`)
      const data = await response.json()
      setNotes(data.notes || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNote = async () => {
    if (!newNote.trim()) return

    try {
      const response = await fetch(`/api/admin/ops/jobs/${listingId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNote,
          note_type: noteType,
          is_important: isImportant,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNotes([data.note, ...notes])
        setNewNote('')
        setNoteType('general')
        setIsImportant(false)
      }
    } catch (error) {
      console.error('Error creating note:', error)
    }
  }

  const handleTogglePin = async (noteId: string, isPinned: boolean) => {
    try {
      const response = await fetch(`/api/admin/ops/jobs/${listingId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_id: noteId, is_pinned: !isPinned }),
      })

      if (response.ok) {
        setNotes(notes.map(n =>
          n.id === noteId ? { ...n, is_pinned: !isPinned } : n
        ).sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1
          if (!a.is_pinned && b.is_pinned) return 1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }))
      }
    } catch (error) {
      console.error('Error toggling pin:', error)
    }
  }

  const handleEditNote = async (noteId: string) => {
    if (!editContent.trim()) return

    try {
      const response = await fetch(`/api/admin/ops/jobs/${listingId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_id: noteId, content: editContent }),
      })

      if (response.ok) {
        const data = await response.json()
        setNotes(notes.map(n => n.id === noteId ? data.note : n))
        setEditingNote(null)
        setEditContent('')
      }
    } catch (error) {
      console.error('Error editing note:', error)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await fetch(`/api/admin/ops/jobs/${listingId}/notes?note_id=${noteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setNotes(notes.filter(n => n.id !== noteId))
      }
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const getNoteTypeBadge = (type: string) => {
    const noteType = NOTE_TYPES.find(t => t.value === type)
    if (!noteType) return null
    const Icon = noteType.icon
    return (
      <Badge className={noteType.color}>
        <Icon className="h-3 w-3 mr-1" />
        {noteType.label}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Team Notes
          </CardTitle>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Notes</SelectItem>
              {NOTE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Note Input */}
        <div className="space-y-3">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note for the team..."
            rows={3}
          />
          <div className="flex items-center gap-3">
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={isImportant ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setIsImportant(!isImportant)}
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              {isImportant ? 'Important' : 'Mark Important'}
            </Button>

            <Button
              size="sm"
              onClick={handleCreateNote}
              disabled={!newNote.trim()}
              className="ml-auto"
            >
              <Send className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-3 pt-4 border-t">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
                </div>
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-neutral-400">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notes yet</p>
              <p className="text-sm">Add a note to share information with the team</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`p-4 rounded-lg border ${
                  note.is_pinned
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    : note.is_important
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
                }`}
              >
                {/* Note Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={note.author?.avatar_url} />
                      <AvatarFallback>
                        {note.author?.name?.slice(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{note.author?.name || 'Unknown'}</span>
                        {getNoteTypeBadge(note.note_type)}
                        {note.is_pinned && (
                          <Pin className="h-3 w-3 text-yellow-600" />
                        )}
                        {note.is_important && (
                          <AlertCircle className="h-3 w-3 text-red-600" />
                        )}
                      </div>
                      <span className="text-xs text-neutral-400">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        {note.edited_at && ' (edited)'}
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleTogglePin(note.id, note.is_pinned)}>
                        {note.is_pinned ? (
                          <>
                            <PinOff className="h-4 w-4 mr-2" />
                            Unpin
                          </>
                        ) : (
                          <>
                            <Pin className="h-4 w-4 mr-2" />
                            Pin Note
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingNote(note.id)
                          setEditContent(note.content)
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Note Content */}
                {editingNote === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleEditNote(note.id)}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingNote(null)
                          setEditContent('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                    {note.content}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
