'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Camera,
  Upload,
  CheckCircle,
  Circle,
  AlertTriangle,
  X,
  ChevronRight,
  Image,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Home,
  Utensils,
  Bath,
  BedDouble,
  Sofa,
  TreePine,
  Waves,
  Warehouse,
  Wine,
  Sparkles,
  DoorOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  createShootSession,
  addShot,
  removeShot,
  updateShotStatus,
  calculateProgress,
  getNextRecommendedCategory,
  completeSession,
  pauseSession,
  resumeSession,
  validateSessionForCompletion,
  STANDARD_SHOT_CATEGORIES,
  type ShootSession,
  type ShotCategory,
} from '@/lib/shooting/shoot-mode'

interface ShootModeClientProps {
  listingId: string
  assignmentId: string
  photographerId: string
  listingAddress: string
  sqft?: number
  onComplete?: (session: ShootSession) => Promise<void>
  onUploadPhoto?: (file: File, categoryId: string) => Promise<string>
}

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'exterior-front': <Home className="h-5 w-5" />,
  'exterior-back': <TreePine className="h-5 w-5" />,
  'living-room': <Sofa className="h-5 w-5" />,
  kitchen: <Utensils className="h-5 w-5" />,
  'master-bedroom': <BedDouble className="h-5 w-5" />,
  'bedrooms-other': <DoorOpen className="h-5 w-5" />,
  bathrooms: <Bath className="h-5 w-5" />,
  dining: <Wine className="h-5 w-5" />,
  garage: <Warehouse className="h-5 w-5" />,
  pool: <Waves className="h-5 w-5" />,
  details: <Sparkles className="h-5 w-5" />,
}

export function ShootModeClient({
  listingId,
  assignmentId,
  photographerId,
  listingAddress,
  sqft,
  onComplete,
  onUploadPhoto,
}: ShootModeClientProps) {
  // Session state
  const [session, setSession] = useState<ShootSession>(() =>
    createShootSession(listingId, assignmentId, photographerId, sqft)
  )
  const [selectedCategory, setSelectedCategory] = useState<ShotCategory | null>(
    getNextRecommendedCategory(session)
  )
  const [isCompleting, setIsCompleting] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)

  // Camera state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  // Calculate progress
  const progress = calculateProgress(session)

  // Handle file selection/capture
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || !selectedCategory) return

      setIsCapturing(true)

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Create local preview URL
        const localUri = URL.createObjectURL(file)

        // Add to session
        let updatedSession = addShot(session, selectedCategory.id, localUri, {
          fileSize: file.size,
          mimeType: file.type,
        })

        const shotId = updatedSession.shots[updatedSession.shots.length - 1].id

        // Start upload if handler provided
        if (onUploadPhoto) {
          updatedSession = updateShotStatus(updatedSession, shotId, 'uploading', {
            uploadProgress: 0,
          })
          setSession(updatedSession)

          try {
            const uploadedUrl = await onUploadPhoto(file, selectedCategory.id)
            updatedSession = updateShotStatus(updatedSession, shotId, 'uploaded', {
              uploadedUrl,
              uploadProgress: 100,
            })
          } catch (error) {
            updatedSession = updateShotStatus(updatedSession, shotId, 'failed', {
              error: error instanceof Error ? error.message : 'Upload failed',
            })
          }
        } else {
          // Mark as uploaded immediately for testing
          updatedSession = updateShotStatus(updatedSession, shotId, 'uploaded')
        }

        setSession(updatedSession)
      }

      setIsCapturing(false)

      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [session, selectedCategory, onUploadPhoto]
  )

  // Handle category selection
  const handleCategorySelect = useCallback((category: ShotCategory) => {
    setSelectedCategory(category)
    setShowChecklist(false)
  }, [])

  // Handle shot deletion
  const handleDeleteShot = useCallback(
    (shotId: string) => {
      const updatedSession = removeShot(session, shotId)
      setSession(updatedSession)
    },
    [session]
  )

  // Handle pause/resume
  const handleTogglePause = useCallback(() => {
    if (session.status === 'paused') {
      setSession(resumeSession(session))
    } else {
      setSession(pauseSession(session))
    }
  }, [session])

  // Handle completion
  const handleComplete = useCallback(async () => {
    const validation = validateSessionForCompletion(session)

    if (!validation.isValid) {
      // Show errors
      alert(`Cannot complete:\n${validation.errors.join('\n')}`)
      return
    }

    if (validation.warnings.length > 0) {
      const proceed = confirm(
        `Warnings:\n${validation.warnings.join('\n')}\n\nContinue anyway?`
      )
      if (!proceed) return
    }

    setIsCompleting(true)
    const completedSession = completeSession(session)
    setSession(completedSession)

    if (onComplete) {
      try {
        await onComplete(completedSession)
      } catch (error) {
        console.error('Failed to complete session:', error)
      }
    }

    setIsCompleting(false)
  }, [session, onComplete])

  // Update recommended category when progress changes
  useEffect(() => {
    const next = getNextRecommendedCategory(session)
    if (next && !selectedCategory) {
      setSelectedCategory(next)
    }
  }, [session, selectedCategory])

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-neutral-900/80">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-medium truncate">{listingAddress}</h1>
          <p className="text-xs text-neutral-400">
            {progress.totalShots} photos · {progress.percentComplete}% complete
          </p>
        </div>

        <div className="flex items-center gap-2">
          {session.status === 'paused' ? (
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
              Paused
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-green-500/20 text-green-400">
              In Progress
            </Badge>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleTogglePause}
            className="h-8 w-8"
          >
            {session.status === 'paused' ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2 bg-neutral-900/50">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-neutral-400">Progress</span>
          <span className="text-neutral-300">
            {progress.requiredCategoriesComplete}/{progress.totalRequiredCategories} categories
          </span>
        </div>
        <Progress value={progress.percentComplete} className="h-2" />
      </div>

      {/* Category Selector */}
      <div className="flex overflow-x-auto gap-2 px-4 py-3 border-b border-white/10">
        {STANDARD_SHOT_CATEGORIES.map((category) => {
          const catProgress = session.categories.find((c) => c.categoryId === category.id)
          const isSelected = selectedCategory?.id === category.id
          const isComplete = catProgress?.isComplete

          return (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-[72px] transition-colors',
                isSelected
                  ? 'bg-blue-600 text-white'
                  : isComplete
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              )}
            >
              <div className="relative">
                {CATEGORY_ICONS[category.id] || <Camera className="h-5 w-5" />}
                {isComplete && !isSelected && (
                  <CheckCircle className="absolute -top-1 -right-1 h-3 w-3 text-green-400" />
                )}
              </div>
              <span className="text-[10px] font-medium whitespace-nowrap">
                {category.name.length > 8
                  ? category.name.substring(0, 8) + '...'
                  : category.name}
              </span>
              <span className="text-[9px] opacity-70">
                {catProgress?.shotCount || 0}/{category.minShots}+
              </span>
            </button>
          )
        })}
      </div>

      {/* Selected Category Tips */}
      {selectedCategory && (
        <div className="px-4 py-3 border-b border-white/10 bg-blue-500/5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              {CATEGORY_ICONS[selectedCategory.id] || <Camera className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium">{selectedCategory.name}</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {selectedCategory.tips[0]}
              </p>
            </div>
            <Sheet open={showChecklist} onOpenChange={setShowChecklist}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs">
                  Tips
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[60vh]">
                <SheetHeader>
                  <SheetTitle>{selectedCategory.name} - Shot Tips</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-3">
                  {selectedCategory.tips.map((tip, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400 flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-sm text-neutral-300">{tip}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-white/10">
                  <p className="text-xs text-neutral-500">
                    Required: {selectedCategory.minShots}+ shots
                    {!selectedCategory.required && ' (optional category)'}
                  </p>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      <div className="flex-1 overflow-auto p-4">
        {selectedCategory && (
          <div className="grid grid-cols-3 gap-2">
            {session.shots
              .filter((s) => s.categoryId === selectedCategory.id)
              .map((shot) => (
                <div
                  key={shot.id}
                  className="relative aspect-[4/3] bg-neutral-800 rounded-lg overflow-hidden"
                >
                  {shot.localUri && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shot.localUri}
                      alt="Shot"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Status overlay */}
                  {shot.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-400" />
                        <span className="text-xs mt-1 block">
                          {shot.uploadProgress || 0}%
                        </span>
                      </div>
                    </div>
                  )}

                  {shot.status === 'failed' && (
                    <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                    </div>
                  )}

                  {shot.status === 'uploaded' && (
                    <div className="absolute top-1 right-1">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    </div>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteShot(shot.id)}
                    className="absolute top-1 left-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

            {/* Add photo placeholder */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isCapturing || session.status === 'paused'}
              className={cn(
                'aspect-[4/3] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors',
                session.status === 'paused'
                  ? 'border-neutral-700 text-neutral-600'
                  : 'border-blue-500/50 text-blue-400 hover:border-blue-400 hover:bg-blue-500/10'
              )}
            >
              {isCapturing ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <Camera className="h-6 w-6" />
                  <span className="text-xs">Add Photo</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Empty state */}
        {selectedCategory &&
          session.shots.filter((s) => s.categoryId === selectedCategory.id).length === 0 && (
            <div className="text-center py-8">
              <Image className="h-12 w-12 mx-auto text-neutral-600 mb-3" />
              <p className="text-neutral-400 text-sm">No photos yet</p>
              <p className="text-neutral-500 text-xs mt-1">
                Tap the camera button to start capturing
              </p>
            </div>
          )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Bottom Action Bar */}
      <div className="border-t border-white/10 bg-neutral-900 p-4 pb-safe">
        <div className="flex gap-3">
          {/* Main capture button */}
          <Button
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={isCapturing || session.status === 'paused' || !selectedCategory}
            className="flex-1 h-14 text-lg gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {isCapturing ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
            {isCapturing ? 'Capturing...' : 'Capture Photo'}
          </Button>

          {/* Complete button */}
          <Button
            size="lg"
            variant="outline"
            onClick={handleComplete}
            disabled={isCompleting || progress.totalShots === 0}
            className="h-14 px-6"
          >
            {isCompleting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Quick stats */}
        <div className="flex justify-center gap-6 mt-3 text-xs text-neutral-400">
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-400" />
            {progress.uploadedShots} uploaded
          </span>
          {progress.pendingShots > 0 && (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
              {progress.pendingShots} pending
            </span>
          )}
          {progress.failedShots > 0 && (
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-400" />
              {progress.failedShots} failed
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
