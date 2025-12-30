'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Sun,
  Contrast,
  Droplets,
  Thermometer,
  Undo2,
  Redo2,
  Save,
  Download,
  RefreshCw,
  Pencil,
  Type,
  ArrowUpRight,
  Square,
  Circle,
  Eraser,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  type EditState,
  type AdjustmentValues,
  type Annotation,
  type EditHistoryEntry,
  DEFAULT_EDIT_STATE,
  DEFAULT_ADJUSTMENTS,
  adjustmentsToCSSFilters,
  editStateToTransform,
  createHistoryEntry,
  mergeAdjustments,
  hasEdits,
  createAnnotationId,
  simplifyBrushPath,
} from '@/lib/editing/photo-editor'

interface PhotoEditorCanvasProps {
  imageUrl: string
  imageId: string
  imageName?: string
  onSave?: (editState: EditState) => Promise<void>
  onCancel?: () => void
  initialState?: EditState
  className?: string
}

type ToolMode = 'select' | 'crop' | 'brush' | 'text' | 'arrow' | 'rectangle' | 'circle' | 'eraser'

const ANNOTATION_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#ffffff', // white
  '#000000', // black
]

export function PhotoEditorCanvas({
  imageUrl,
  imageId,
  imageName,
  onSave,
  onCancel,
  initialState,
  className,
}: PhotoEditorCanvasProps) {
  // Editor state
  const [editState, setEditState] = useState<EditState>(
    initialState || { ...DEFAULT_EDIT_STATE }
  )
  const [history, setHistory] = useState<EditHistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isSaving, setIsSaving] = useState(false)

  // Tool state
  const [toolMode, setToolMode] = useState<ToolMode>('select')
  const [brushColor, setBrushColor] = useState('#ef4444')
  const [brushSize, setBrushSize] = useState(4)
  const [showAnnotations, setShowAnnotations] = useState(true)

  // Canvas state
  const [zoom, setZoom] = useState(1)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([])

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Track if there are unsaved changes
  const hasUnsavedChanges = hasEdits(editState)

  // Add to history
  const pushHistory = useCallback((description: string, newState: EditState) => {
    const entry = createHistoryEntry(description, newState)
    setHistory((prev) => {
      // If we're not at the end of history, truncate forward history
      const truncated = prev.slice(0, historyIndex + 1)
      return [...truncated, entry]
    })
    setHistoryIndex((prev) => prev + 1)
  }, [historyIndex])

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevEntry = history[historyIndex - 1]
      setEditState(prevEntry.state)
      setHistoryIndex((prev) => prev - 1)
    } else if (historyIndex === 0) {
      setEditState({ ...DEFAULT_EDIT_STATE })
      setHistoryIndex(-1)
    }
  }, [history, historyIndex])

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextEntry = history[historyIndex + 1]
      setEditState(nextEntry.state)
      setHistoryIndex((prev) => prev + 1)
    }
  }, [history, historyIndex])

  // Reset all edits
  const handleReset = useCallback(() => {
    setEditState({ ...DEFAULT_EDIT_STATE })
    setHistory([])
    setHistoryIndex(-1)
  }, [])

  // Rotate clockwise
  const handleRotateCW = useCallback(() => {
    const newState = {
      ...editState,
      rotation: (editState.rotation + 90) % 360,
    }
    setEditState(newState)
    pushHistory('Rotate 90° clockwise', newState)
  }, [editState, pushHistory])

  // Rotate counter-clockwise
  const handleRotateCCW = useCallback(() => {
    const newState = {
      ...editState,
      rotation: (editState.rotation - 90 + 360) % 360,
    }
    setEditState(newState)
    pushHistory('Rotate 90° counter-clockwise', newState)
  }, [editState, pushHistory])

  // Flip horizontal
  const handleFlipH = useCallback(() => {
    const newState = {
      ...editState,
      flipHorizontal: !editState.flipHorizontal,
    }
    setEditState(newState)
    pushHistory('Flip horizontal', newState)
  }, [editState, pushHistory])

  // Flip vertical
  const handleFlipV = useCallback(() => {
    const newState = {
      ...editState,
      flipVertical: !editState.flipVertical,
    }
    setEditState(newState)
    pushHistory('Flip vertical', newState)
  }, [editState, pushHistory])

  // Update adjustment
  const handleAdjustmentChange = useCallback(
    (key: keyof AdjustmentValues, value: number) => {
      const newAdjustments = mergeAdjustments(editState.adjustments, { [key]: value })
      const newState = { ...editState, adjustments: newAdjustments }
      setEditState(newState)
    },
    [editState]
  )

  // Commit adjustment (add to history on slider release)
  const handleAdjustmentCommit = useCallback(
    (key: keyof AdjustmentValues) => {
      pushHistory(`Adjust ${key}`, editState)
    },
    [editState, pushHistory]
  )

  // Drawing handlers
  const getCanvasPoint = useCallback(
    (e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }

      const rect = svg.getBoundingClientRect()
      const x = (e.clientX - rect.left) / zoom
      const y = (e.clientY - rect.top) / zoom

      return { x, y }
    },
    [zoom]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (toolMode === 'brush' || toolMode === 'eraser') {
        setIsDrawing(true)
        const point = getCanvasPoint(e)
        setCurrentPath([point])
      }
    },
    [toolMode, getCanvasPoint]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDrawing) return

      const point = getCanvasPoint(e)
      setCurrentPath((prev) => [...prev, point])
    },
    [isDrawing, getCanvasPoint]
  )

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || currentPath.length < 2) {
      setIsDrawing(false)
      setCurrentPath([])
      return
    }

    if (toolMode === 'brush') {
      const simplifiedPath = simplifyBrushPath(currentPath, 1)
      const annotation: Annotation = {
        id: createAnnotationId(),
        type: 'brush',
        color: brushColor,
        strokeWidth: brushSize,
        points: simplifiedPath,
      }

      const newState = {
        ...editState,
        annotations: [...editState.annotations, annotation],
      }
      setEditState(newState)
      pushHistory('Draw annotation', newState)
    } else if (toolMode === 'eraser') {
      // Find and remove annotations that intersect with eraser path
      // Simplified: remove last annotation
      if (editState.annotations.length > 0) {
        const newState = {
          ...editState,
          annotations: editState.annotations.slice(0, -1),
        }
        setEditState(newState)
        pushHistory('Erase annotation', newState)
      }
    }

    setIsDrawing(false)
    setCurrentPath([])
  }, [
    isDrawing,
    currentPath,
    toolMode,
    brushColor,
    brushSize,
    editState,
    pushHistory,
  ])

  // Delete annotation
  const handleDeleteAnnotation = useCallback(
    (annotationId: string) => {
      const newState = {
        ...editState,
        annotations: editState.annotations.filter((a) => a.id !== annotationId),
      }
      setEditState(newState)
      pushHistory('Delete annotation', newState)
    },
    [editState, pushHistory]
  )

  // Save handler
  const handleSave = useCallback(async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      await onSave(editState)
    } finally {
      setIsSaving(false)
    }
  }, [editState, onSave])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'z' && e.shiftKey) {
          e.preventDefault()
          handleRedo()
        } else if (e.key === 'z') {
          e.preventDefault()
          handleUndo()
        } else if (e.key === 's') {
          e.preventDefault()
          handleSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, handleSave])

  // Calculate CSS filters and transforms
  const cssFilters = adjustmentsToCSSFilters(editState.adjustments)
  const cssTransform = editStateToTransform(editState)

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col h-full bg-black', className)}>
        {/* Top Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-neutral-900/80">
          <div className="flex items-center gap-2">
            {/* File info */}
            <span className="text-sm text-neutral-400 truncate max-w-[200px]">
              {imageName || imageId}
            </span>
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400">
                Unsaved
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Undo/Redo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUndo}
                  disabled={historyIndex < 0}
                  className="h-8 w-8"
                  aria-label="Undo"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (⌘Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="h-8 w-8"
                  aria-label="Redo"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-white/10 mx-2" />

            {/* Zoom controls */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                  className="h-8 w-8"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom out</TooltipContent>
            </Tooltip>

            <span className="text-xs text-neutral-400 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                  className="h-8 w-8"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom in</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(1)}
                  className="h-8 w-8"
                  aria-label="Fit to screen"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fit to screen</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-white/10 mx-2" />

            {/* Reset */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  disabled={!hasUnsavedChanges}
                  className="h-8 w-8"
                  aria-label="Reset all edits"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset all edits</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-white/10 mx-2" />

            {/* Cancel / Save */}
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className="gap-1 bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Toolbar - Tools */}
          <div className="w-12 border-r border-white/10 bg-neutral-900/50 py-2 flex flex-col items-center gap-1">
            <ToolButton
              icon={<Pencil className="h-4 w-4" />}
              label="Draw"
              active={toolMode === 'brush'}
              onClick={() => setToolMode('brush')}
            />
            <ToolButton
              icon={<Type className="h-4 w-4" />}
              label="Text"
              active={toolMode === 'text'}
              onClick={() => setToolMode('text')}
            />
            <ToolButton
              icon={<ArrowUpRight className="h-4 w-4" />}
              label="Arrow"
              active={toolMode === 'arrow'}
              onClick={() => setToolMode('arrow')}
            />
            <ToolButton
              icon={<Square className="h-4 w-4" />}
              label="Rectangle"
              active={toolMode === 'rectangle'}
              onClick={() => setToolMode('rectangle')}
            />
            <ToolButton
              icon={<Circle className="h-4 w-4" />}
              label="Circle"
              active={toolMode === 'circle'}
              onClick={() => setToolMode('circle')}
            />
            <ToolButton
              icon={<Eraser className="h-4 w-4" />}
              label="Eraser"
              active={toolMode === 'eraser'}
              onClick={() => setToolMode('eraser')}
            />

            <div className="w-6 h-px bg-white/10 my-2" />

            {/* Color picker */}
            <div className="flex flex-col gap-1">
              {ANNOTATION_COLORS.slice(0, 5).map((color) => (
                <button
                  key={color}
                  className={cn(
                    'w-5 h-5 rounded-full border-2 transition-transform hover:scale-110',
                    brushColor === color ? 'border-white' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setBrushColor(color)}
                />
              ))}
            </div>

            <div className="w-6 h-px bg-white/10 my-2" />

            {/* Toggle annotations */}
            <ToolButton
              icon={showAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              label={showAnnotations ? 'Hide annotations' : 'Show annotations'}
              onClick={() => setShowAnnotations(!showAnnotations)}
            />
          </div>

          {/* Canvas Area */}
          <div
            ref={canvasRef}
            className="flex-1 overflow-auto bg-neutral-950 flex items-center justify-center p-4"
          >
            <div
              className="relative"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            >
              {/* Image with filters/transforms */}
              <div
                style={{
                  filter: cssFilters || undefined,
                  transform: cssTransform || undefined,
                }}
              >
                <Image
                  src={imageUrl}
                  alt="Editing"
                  width={1920}
                  height={1080}
                  className="max-w-none"
                  style={{ display: 'block' }}
                  priority
                />
              </div>

              {/* Annotations SVG overlay */}
              {showAnnotations && (
                <svg
                  ref={svgRef}
                  className="absolute inset-0 w-full h-full pointer-events-auto"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Existing annotations */}
                  {editState.annotations.map((annotation) => (
                    <AnnotationRenderer
                      key={annotation.id}
                      annotation={annotation}
                      onDelete={() => handleDeleteAnnotation(annotation.id)}
                    />
                  ))}

                  {/* Current drawing path */}
                  {isDrawing && currentPath.length > 1 && (
                    <path
                      d={pathToD(currentPath)}
                      fill="none"
                      stroke={toolMode === 'eraser' ? '#ffffff' : brushColor}
                      strokeWidth={brushSize}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={toolMode === 'eraser' ? '4 4' : undefined}
                    />
                  )}
                </svg>
              )}
            </div>
          </div>

          {/* Right Panel - Adjustments */}
          <div className="w-64 border-l border-white/10 bg-neutral-900/50 overflow-y-auto">
            <Tabs defaultValue="transform" className="h-full">
              <TabsList className="w-full rounded-none border-b border-white/10">
                <TabsTrigger value="transform" className="flex-1 text-xs">
                  Transform
                </TabsTrigger>
                <TabsTrigger value="adjust" className="flex-1 text-xs">
                  Adjust
                </TabsTrigger>
              </TabsList>

              {/* Transform Tab */}
              <TabsContent value="transform" className="p-3 space-y-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-neutral-400 uppercase">Rotation</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRotateCCW}
                      className="flex-1 gap-1"
                    >
                      <RotateCcw className="h-4 w-4" />
                      -90°
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRotateCW}
                      className="flex-1 gap-1"
                    >
                      <RotateCw className="h-4 w-4" />
                      +90°
                    </Button>
                  </div>
                  <p className="text-xs text-neutral-500 text-center">
                    Current: {editState.rotation}°
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-neutral-400 uppercase">Flip</h4>
                  <div className="flex gap-2">
                    <Button
                      variant={editState.flipHorizontal ? 'default' : 'outline'}
                      size="sm"
                      onClick={handleFlipH}
                      className="flex-1 gap-1"
                    >
                      <FlipHorizontal className="h-4 w-4" />
                      Horizontal
                    </Button>
                    <Button
                      variant={editState.flipVertical ? 'default' : 'outline'}
                      size="sm"
                      onClick={handleFlipV}
                      className="flex-1 gap-1"
                    >
                      <FlipVertical className="h-4 w-4" />
                      Vertical
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Adjustments Tab */}
              <TabsContent value="adjust" className="p-3 space-y-4">
                <AdjustmentSlider
                  label="Brightness"
                  icon={<Sun className="h-3.5 w-3.5" />}
                  value={editState.adjustments.brightness}
                  onChange={(v) => handleAdjustmentChange('brightness', v)}
                  onCommit={() => handleAdjustmentCommit('brightness')}
                />

                <AdjustmentSlider
                  label="Contrast"
                  icon={<Contrast className="h-3.5 w-3.5" />}
                  value={editState.adjustments.contrast}
                  onChange={(v) => handleAdjustmentChange('contrast', v)}
                  onCommit={() => handleAdjustmentCommit('contrast')}
                />

                <AdjustmentSlider
                  label="Saturation"
                  icon={<Droplets className="h-3.5 w-3.5" />}
                  value={editState.adjustments.saturation}
                  onChange={(v) => handleAdjustmentChange('saturation', v)}
                  onCommit={() => handleAdjustmentCommit('saturation')}
                />

                <AdjustmentSlider
                  label="Temperature"
                  icon={<Thermometer className="h-3.5 w-3.5" />}
                  value={editState.adjustments.temperature}
                  onChange={(v) => handleAdjustmentChange('temperature', v)}
                  onCommit={() => handleAdjustmentCommit('temperature')}
                />

                <AdjustmentSlider
                  label="Exposure"
                  icon={<Sun className="h-3.5 w-3.5" />}
                  value={editState.adjustments.exposure}
                  onChange={(v) => handleAdjustmentChange('exposure', v)}
                  onCommit={() => handleAdjustmentCommit('exposure')}
                />

                <AdjustmentSlider
                  label="Highlights"
                  value={editState.adjustments.highlights}
                  onChange={(v) => handleAdjustmentChange('highlights', v)}
                  onCommit={() => handleAdjustmentCommit('highlights')}
                />

                <AdjustmentSlider
                  label="Shadows"
                  value={editState.adjustments.shadows}
                  onChange={(v) => handleAdjustmentChange('shadows', v)}
                  onCommit={() => handleAdjustmentCommit('shadows')}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="px-4 py-1.5 border-t border-white/10 bg-neutral-900/80 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-4">
            <span>Tool: {toolMode}</span>
            {toolMode === 'brush' && (
              <span>
                Size: {brushSize}px · Color: {brushColor}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>Annotations: {editState.annotations.length}</span>
            <span>History: {historyIndex + 1}/{history.length}</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

// Tool button component
function ToolButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded transition-colors',
            active
              ? 'bg-blue-600 text-white'
              : 'text-neutral-400 hover:bg-white/10 hover:text-white'
          )}
          onClick={onClick}
          aria-label={label}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

// Adjustment slider component
function AdjustmentSlider({
  label,
  icon,
  value,
  onChange,
  onCommit,
  min = -100,
  max = 100,
}: {
  label: string
  icon?: React.ReactNode
  value: number
  onChange: (value: number) => void
  onCommit: () => void
  min?: number
  max?: number
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-neutral-400">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <span className="text-xs text-neutral-500">{value}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={([v]) => onChange(v)}
        onValueCommit={() => onCommit()}
        className="w-full"
      />
    </div>
  )
}

// Annotation renderer
function AnnotationRenderer({
  annotation,
  onDelete,
}: {
  annotation: Annotation
  onDelete: () => void
}) {
  if (annotation.type === 'brush' && annotation.points) {
    return (
      <path
        d={pathToD(annotation.points)}
        fill="none"
        stroke={annotation.color}
        strokeWidth={annotation.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }

  if (annotation.type === 'text' && annotation.text && annotation.startPoint) {
    return (
      <text
        x={annotation.startPoint.x}
        y={annotation.startPoint.y}
        fill={annotation.color}
        fontSize={annotation.fontSize || 16}
        fontFamily="system-ui, sans-serif"
      >
        {annotation.text}
      </text>
    )
  }

  if (annotation.type === 'arrow' && annotation.startPoint && annotation.endPoint) {
    const markerId = `arrow-${annotation.id}`
    return (
      <>
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={annotation.color} />
          </marker>
        </defs>
        <line
          x1={annotation.startPoint.x}
          y1={annotation.startPoint.y}
          x2={annotation.endPoint.x}
          y2={annotation.endPoint.y}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth}
          markerEnd={`url(#${markerId})`}
        />
      </>
    )
  }

  if (annotation.type === 'rectangle' && annotation.startPoint && annotation.endPoint) {
    const x = Math.min(annotation.startPoint.x, annotation.endPoint.x)
    const y = Math.min(annotation.startPoint.y, annotation.endPoint.y)
    const width = Math.abs(annotation.endPoint.x - annotation.startPoint.x)
    const height = Math.abs(annotation.endPoint.y - annotation.startPoint.y)

    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke={annotation.color}
        strokeWidth={annotation.strokeWidth}
      />
    )
  }

  if (annotation.type === 'circle' && annotation.startPoint && annotation.endPoint) {
    const cx = (annotation.startPoint.x + annotation.endPoint.x) / 2
    const cy = (annotation.startPoint.y + annotation.endPoint.y) / 2
    const rx = Math.abs(annotation.endPoint.x - annotation.startPoint.x) / 2
    const ry = Math.abs(annotation.endPoint.y - annotation.startPoint.y) / 2

    return (
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke={annotation.color}
        strokeWidth={annotation.strokeWidth}
      />
    )
  }

  return null
}

// Convert points array to SVG path d attribute
function pathToD(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`
  }
  return d
}
