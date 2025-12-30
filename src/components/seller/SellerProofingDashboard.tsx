'use client'

/**
 * SellerProofingDashboard Component
 *
 * Allows sellers to view, select, and comment on photos during the proofing process.
 */

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  Camera,
  Heart,
  MessageCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  Star,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import type {
  ProofingSession,
  ProofingPhoto,
  PhotoSelection,
  PhotoComment,
} from '@/lib/proofing/service'

interface SellerProofingDashboardProps {
  token: string
  sellerName: string
  canSelect?: boolean
  canComment?: boolean
  onFinalize?: () => void
}

interface SessionStats {
  total_photos: number
  selected_count: number
  favorite_count: number
  comment_count: number
}

export function SellerProofingDashboard({
  token,
  sellerName,
  canSelect = true,
  canComment = true,
  onFinalize,
}: SellerProofingDashboardProps) {
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<ProofingSession | null>(null)
  const [photos, setPhotos] = useState<ProofingPhoto[]>([])
  const [selections, setSelections] = useState<Map<string, PhotoSelection>>(new Map())
  const [comments, setComments] = useState<Map<string, PhotoComment[]>>(new Map())
  const [stats, setStats] = useState<SessionStats | null>(null)

  // UI state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [commentPhotoId, setCommentPhotoId] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch session data
  useEffect(() => {
    async function fetchSession() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/proof/${token}`)
        if (!response.ok) {
          throw new Error('Failed to load proofing session')
        }

        const data = await response.json()
        if (!data.success) {
          setError(data.error || 'Session expired')
          return
        }

        setSession(data.session)
        setPhotos(data.photos || [])

        // Fetch selections
        const selectionsRes = await fetch(`/api/proof/${token}/selections`)
        if (selectionsRes.ok) {
          const selectionsData = await selectionsRes.json()
          if (selectionsData.success) {
            const selectionsMap = new Map<string, PhotoSelection>()
            selectionsData.selections?.forEach((sel: PhotoSelection) => {
              selectionsMap.set(sel.photo_id, sel)
            })
            setSelections(selectionsMap)
          }
        }

        // Fetch comments
        const commentsRes = await fetch(`/api/proof/${token}/comments`)
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json()
          if (commentsData.success) {
            const commentsMap = new Map<string, PhotoComment[]>()
            commentsData.comments?.forEach((comment: PhotoComment) => {
              const existing = commentsMap.get(comment.photo_id) || []
              commentsMap.set(comment.photo_id, [...existing, comment])
            })
            setComments(commentsMap)
          }
        }

        // Fetch stats
        const statsRes = await fetch(`/api/proof/${token}/stats`)
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          if (statsData.success) {
            setStats(statsData.stats)
          }
        }
      } catch (err) {
        console.error('Error fetching session:', err)
        setError('Failed to load proofing session')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSession()
  }, [token])

  // Toggle photo selection
  const toggleSelection = useCallback(
    async (photoId: string) => {
      if (!canSelect || !session || session.status === 'finalized') return

      const isSelected = selections.has(photoId)
      setIsSubmitting(true)

      try {
        if (isSelected) {
          // Deselect
          const response = await fetch(`/api/proof/${token}/deselect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photo_id: photoId }),
          })

          if (response.ok) {
            setSelections((prev) => {
              const next = new Map(prev)
              next.delete(photoId)
              return next
            })
            setStats((prev) =>
              prev ? { ...prev, selected_count: prev.selected_count - 1 } : prev
            )
          }
        } else {
          // Select
          const response = await fetch(`/api/proof/${token}/select`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photo_id: photoId }),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.selection) {
              setSelections((prev) => new Map(prev).set(photoId, data.selection))
              setStats((prev) =>
                prev ? { ...prev, selected_count: prev.selected_count + 1 } : prev
              )
            }
          }
        }
      } catch (err) {
        console.error('Error toggling selection:', err)
      } finally {
        setIsSubmitting(false)
      }
    },
    [canSelect, session, selections, token]
  )

  // Toggle favorite
  const toggleFavorite = useCallback(
    async (photoId: string) => {
      if (!canSelect || !session || session.status === 'finalized') return

      const selection = selections.get(photoId)
      if (!selection) return

      setIsSubmitting(true)

      try {
        const response = await fetch(`/api/proof/${token}/favorite`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo_id: photoId,
            is_favorite: !selection.is_favorite,
          }),
        })

        if (response.ok) {
          setSelections((prev) => {
            const next = new Map(prev)
            const sel = next.get(photoId)
            if (sel) {
              next.set(photoId, { ...sel, is_favorite: !sel.is_favorite })
            }
            return next
          })
        }
      } catch (err) {
        console.error('Error toggling favorite:', err)
      } finally {
        setIsSubmitting(false)
      }
    },
    [canSelect, session, selections, token]
  )

  // Submit comment
  const submitComment = useCallback(async () => {
    if (!canComment || !commentPhotoId || !newComment.trim()) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/proof/${token}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_id: commentPhotoId,
          comment_text: newComment.trim(),
          author_type: 'seller',
          author_name: sellerName,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.comment) {
          setComments((prev) => {
            const next = new Map(prev)
            const existing = next.get(commentPhotoId) || []
            next.set(commentPhotoId, [...existing, data.comment])
            return next
          })
          setNewComment('')
          setStats((prev) =>
            prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev
          )
        }
      }
    } catch (err) {
      console.error('Error submitting comment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [canComment, commentPhotoId, newComment, sellerName, token])

  // Finalize session
  const handleFinalize = useCallback(async () => {
    if (!session || session.status === 'finalized') return

    const confirmed = confirm(
      'Are you sure you want to finalize your selections? You won\'t be able to make changes after this.'
    )
    if (!confirmed) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/proof/${token}/finalize`, {
        method: 'POST',
      })

      if (response.ok) {
        setSession((prev) => (prev ? { ...prev, status: 'finalized' } : prev))
        onFinalize?.()
      }
    } catch (err) {
      console.error('Error finalizing:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [session, token, onFinalize])

  // Loading state
  if (isLoading) {
    return (
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardContent className="py-12 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-neutral-400 animate-spin mb-4" />
          <p className="text-neutral-400">Loading proofing session...</p>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardContent className="py-12 flex flex-col items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-400 mb-4" />
          <p className="text-neutral-400">{error}</p>
          {error.includes('expired') && (
            <p className="text-sm text-neutral-500 mt-2">
              Please contact your agent for a new proofing link.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  if (!session) {
    return null
  }

  const isFinalized = session.status === 'finalized'
  const currentPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null
  const photoComments = commentPhotoId ? comments.get(commentPhotoId) || [] : []

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-neutral-200">
              Photo Proofing
            </CardTitle>
            {isFinalized ? (
              <Badge className="bg-green-500/20 text-green-400">
                <CheckCircle className="h-3 w-3 mr-1" />
                Selections Finalized
              </Badge>
            ) : (
              <Badge variant="outline" className="border-neutral-700">
                <Clock className="h-3 w-3 mr-1" />
                In Progress
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-neutral-500" />
              <span className="text-neutral-400">{photos.length} photos</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-blue-400" />
              <span className="text-white">
                {stats?.selected_count || 0} selected
                {session.max_selections && (
                  <span className="text-neutral-500"> of {session.max_selections}</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400" />
              <span className="text-neutral-400">{stats?.favorite_count || 0} favorites</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-neutral-500" />
              <span className="text-neutral-400">{stats?.comment_count || 0} comments</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 rounded-lg overflow-hidden">
        {photos.map((photo, index) => {
          const isSelected = selections.has(photo.id)
          const isFavorite = selections.get(photo.id)?.is_favorite
          const hasComments = (comments.get(photo.id)?.length || 0) > 0

          return (
            <div
              key={photo.id}
              className="relative aspect-square group"
              data-selected={isSelected}
            >
              <button
                onClick={() => setLightboxIndex(index)}
                className="w-full h-full overflow-hidden"
                aria-label={`Photo ${index + 1}`}
              >
                <Image
                  src={photo.thumbnail_url || photo.url}
                  alt={photo.filename || `Photo ${index + 1}`}
                  fill
                  className={cn(
                    'object-cover transition-all',
                    isSelected && 'ring-2 ring-blue-500 ring-inset'
                  )}
                  sizes="(max-width: 640px) 33vw, 20vw"
                />
              </button>

              {/* Selection overlay */}
              {isSelected && (
                <div className="absolute top-1 left-1">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}

              {/* Favorite indicator */}
              {isFavorite && (
                <div className="absolute top-1 right-1">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                </div>
              )}

              {/* Comments indicator */}
              {hasComments && (
                <div className="absolute bottom-1 left-1">
                  <div className="px-1.5 py-0.5 bg-black/60 rounded text-xs text-white flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {comments.get(photo.id)?.length}
                  </div>
                </div>
              )}

              {/* Hover actions */}
              {!isFinalized && canSelect && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSelection(photo.id)
                    }}
                    disabled={isSubmitting}
                    className={cn(
                      'p-2 rounded-full transition-colors',
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/80 text-neutral-800 hover:bg-white'
                    )}
                    aria-label={isSelected ? 'Deselect photo' : 'Select photo'}
                  >
                    <Check className="h-4 w-4" />
                  </button>

                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(photo.id)
                      }}
                      disabled={isSubmitting}
                      className={cn(
                        'p-2 rounded-full transition-colors',
                        isFavorite
                          ? 'bg-amber-500 text-white'
                          : 'bg-white/80 text-neutral-800 hover:bg-white'
                      )}
                      aria-label={isFavorite ? 'Remove favorite' : 'Add to favorites'}
                    >
                      <Star className={cn('h-4 w-4', isFavorite && 'fill-current')} />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setCommentPhotoId(photo.id)
                    }}
                    className="p-2 rounded-full bg-white/80 text-neutral-800 hover:bg-white transition-colors"
                    aria-label="Add comment"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Finalize Button */}
      {!isFinalized && canSelect && (
        <div className="flex justify-end">
          <Button
            onClick={handleFinalize}
            disabled={isSubmitting || (stats?.selected_count || 0) === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Finalize Selections
          </Button>
        </div>
      )}

      {/* Lightbox Dialog */}
      {lightboxIndex !== null && currentPhoto && (
        <Dialog open={true} onOpenChange={() => setLightboxIndex(null)}>
          <DialogContent className="max-w-5xl p-0 bg-black border-0 overflow-hidden">
            <DialogTitle className="sr-only">Photo Viewer</DialogTitle>
            <div className="relative aspect-[4/3]">
              <Image
                src={currentPhoto.url}
                alt={currentPhoto.filename || 'Photo'}
                fill
                className="object-contain"
                priority
              />

              {/* Navigation */}
              <div className="absolute inset-0 flex items-center justify-between p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70"
                  onClick={() =>
                    setLightboxIndex(
                      lightboxIndex > 0 ? lightboxIndex - 1 : photos.length - 1
                    )
                  }
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70"
                  onClick={() =>
                    setLightboxIndex(
                      lightboxIndex < photos.length - 1 ? lightboxIndex + 1 : 0
                    )
                  }
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </Button>
              </div>

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70"
                onClick={() => setLightboxIndex(null)}
              >
                <X className="h-5 w-5 text-white" />
              </Button>

              {/* Counter and actions */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between">
                  <span className="text-white">
                    {lightboxIndex + 1} / {photos.length}
                  </span>

                  {!isFinalized && canSelect && (
                    <div className="flex gap-2">
                      <Button
                        variant={selections.has(currentPhoto.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleSelection(currentPhoto.id)}
                        disabled={isSubmitting}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {selections.has(currentPhoto.id) ? 'Selected' : 'Select'}
                      </Button>

                      {selections.has(currentPhoto.id) && (
                        <Button
                          variant={
                            selections.get(currentPhoto.id)?.is_favorite
                              ? 'default'
                              : 'outline'
                          }
                          size="sm"
                          onClick={() => toggleFavorite(currentPhoto.id)}
                          disabled={isSubmitting}
                          className={
                            selections.get(currentPhoto.id)?.is_favorite
                              ? 'bg-amber-500 hover:bg-amber-600'
                              : ''
                          }
                        >
                          <Star
                            className={cn(
                              'h-4 w-4 mr-1',
                              selections.get(currentPhoto.id)?.is_favorite && 'fill-current'
                            )}
                          />
                          Favorite
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCommentPhotoId(currentPhoto.id)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Comment
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Comment Sheet */}
      <Sheet open={!!commentPhotoId} onOpenChange={() => setCommentPhotoId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Comments</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full">
            {/* Comment list */}
            <div className="flex-1 overflow-auto py-4 space-y-4">
              {photoComments.length === 0 ? (
                <p className="text-neutral-500 text-sm text-center py-8">
                  No comments yet
                </p>
              ) : (
                photoComments.map((comment) => (
                  <div key={comment.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {comment.author_name || comment.author_type}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-300">{comment.comment_text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment input */}
            {canComment && !isFinalized && (
              <div className="border-t border-neutral-800 pt-4 space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px] bg-neutral-900 border-neutral-700"
                />
                <Button
                  onClick={submitComment}
                  disabled={isSubmitting || !newComment.trim()}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
