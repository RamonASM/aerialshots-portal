'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'

interface Point {
  x: number
  y: number
}

interface InpaintCanvasProps {
  imageUrl: string
  width?: number
  height?: number
  onMaskChange?: (hasMask: boolean) => void
}

export interface InpaintCanvasHandle {
  getMaskDataUrl: () => string | null
  getMaskBlob: () => Promise<Blob | null>
  clearMask: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  getImageDimensions: () => { width: number; height: number }
}

export const InpaintCanvas = forwardRef<InpaintCanvasHandle, InpaintCanvasProps>(
  function InpaintCanvas({ imageUrl, width, height, onMaskChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const imageCanvasRef = useRef<HTMLCanvasElement>(null)
    const maskCanvasRef = useRef<HTMLCanvasElement>(null)
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null)

    const [isDrawing, setIsDrawing] = useState(false)
    const [brushSize, setBrushSize] = useState(30)
    const [isEraser, setIsEraser] = useState(false)
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

    // Undo/redo history
    const historyRef = useRef<ImageData[]>([])
    const historyIndexRef = useRef(-1)
    const maxHistory = 50

    // Load image and set up canvases
    useEffect(() => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height })

        // Calculate display size (fit within container)
        const containerWidth = width || containerRef.current?.clientWidth || 800
        const containerHeight = height || containerRef.current?.clientHeight || 600
        const scale = Math.min(
          containerWidth / img.width,
          containerHeight / img.height,
          1 // Don't scale up
        )

        const displayWidth = Math.floor(img.width * scale)
        const displayHeight = Math.floor(img.height * scale)

        setCanvasSize({ width: displayWidth, height: displayHeight })

        // Draw image on image canvas
        const imageCanvas = imageCanvasRef.current
        if (imageCanvas) {
          imageCanvas.width = displayWidth
          imageCanvas.height = displayHeight
          const ctx = imageCanvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, displayWidth, displayHeight)
          }
        }

        // Initialize mask canvas
        const maskCanvas = maskCanvasRef.current
        if (maskCanvas) {
          maskCanvas.width = displayWidth
          maskCanvas.height = displayHeight
          const ctx = maskCanvas.getContext('2d')
          if (ctx) {
            ctx.fillStyle = 'black'
            ctx.fillRect(0, 0, displayWidth, displayHeight)
          }
        }

        // Initialize overlay canvas
        const overlayCanvas = overlayCanvasRef.current
        if (overlayCanvas) {
          overlayCanvas.width = displayWidth
          overlayCanvas.height = displayHeight
        }

        setImageLoaded(true)
        saveToHistory()
      }
      img.src = imageUrl
    }, [imageUrl, width, height])

    // Save current mask state to history
    const saveToHistory = useCallback(() => {
      const maskCanvas = maskCanvasRef.current
      if (!maskCanvas) return

      const ctx = maskCanvas.getContext('2d')
      if (!ctx) return

      const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)

      // Truncate any future history if we're not at the end
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)

      // Add new state
      historyRef.current.push(imageData)
      historyIndexRef.current = historyRef.current.length - 1

      // Limit history size
      if (historyRef.current.length > maxHistory) {
        historyRef.current.shift()
        historyIndexRef.current--
      }
    }, [])

    // Update overlay to show mask
    const updateOverlay = useCallback(() => {
      const maskCanvas = maskCanvasRef.current
      const overlayCanvas = overlayCanvasRef.current
      if (!maskCanvas || !overlayCanvas) return

      const maskCtx = maskCanvas.getContext('2d')
      const overlayCtx = overlayCanvas.getContext('2d')
      if (!maskCtx || !overlayCtx) return

      const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
      const overlayImageData = overlayCtx.createImageData(maskCanvas.width, maskCanvas.height)

      let hasMask = false

      // Convert mask (white = paint area) to red overlay
      for (let i = 0; i < maskData.data.length; i += 4) {
        const maskValue = maskData.data[i] // R channel (white = 255, black = 0)

        if (maskValue > 128) {
          hasMask = true
          // Red semi-transparent overlay
          overlayImageData.data[i] = 239 // R
          overlayImageData.data[i + 1] = 68 // G
          overlayImageData.data[i + 2] = 68 // B
          overlayImageData.data[i + 3] = 150 // A (semi-transparent)
        } else {
          // Fully transparent
          overlayImageData.data[i] = 0
          overlayImageData.data[i + 1] = 0
          overlayImageData.data[i + 2] = 0
          overlayImageData.data[i + 3] = 0
        }
      }

      overlayCtx.putImageData(overlayImageData, 0, 0)
      onMaskChange?.(hasMask)
    }, [onMaskChange])

    // Get position relative to canvas
    const getPosition = useCallback(
      (e: React.MouseEvent | React.TouchEvent): Point | null => {
        const canvas = overlayCanvasRef.current
        if (!canvas) return null

        const rect = canvas.getBoundingClientRect()
        let clientX: number, clientY: number

        if ('touches' in e) {
          if (e.touches.length === 0) return null
          clientX = e.touches[0].clientX
          clientY = e.touches[0].clientY
        } else {
          clientX = e.clientX
          clientY = e.clientY
        }

        return {
          x: clientX - rect.left,
          y: clientY - rect.top,
        }
      },
      []
    )

    // Draw on mask canvas
    const draw = useCallback(
      (pos: Point) => {
        const maskCanvas = maskCanvasRef.current
        if (!maskCanvas) return

        const ctx = maskCanvas.getContext('2d')
        if (!ctx) return

        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = isEraser ? 'black' : 'white'
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2)
        ctx.fill()

        updateOverlay()
      },
      [brushSize, isEraser, updateOverlay]
    )

    // Mouse/touch handlers
    const handleStart = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        const pos = getPosition(e)
        if (!pos) return

        setIsDrawing(true)
        draw(pos)
      },
      [getPosition, draw]
    )

    const handleMove = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return
        e.preventDefault()

        const pos = getPosition(e)
        if (!pos) return

        draw(pos)
      },
      [isDrawing, getPosition, draw]
    )

    const handleEnd = useCallback(() => {
      if (isDrawing) {
        setIsDrawing(false)
        saveToHistory()
      }
    }, [isDrawing, saveToHistory])

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        getMaskDataUrl: () => {
          const maskCanvas = maskCanvasRef.current
          if (!maskCanvas) return null

          // Create a new canvas at original image dimensions
          const exportCanvas = document.createElement('canvas')
          exportCanvas.width = imageDimensions.width
          exportCanvas.height = imageDimensions.height
          const ctx = exportCanvas.getContext('2d')
          if (!ctx) return null

          // Scale up the mask to original dimensions
          ctx.drawImage(
            maskCanvas,
            0,
            0,
            maskCanvas.width,
            maskCanvas.height,
            0,
            0,
            imageDimensions.width,
            imageDimensions.height
          )

          return exportCanvas.toDataURL('image/png')
        },

        getMaskBlob: async () => {
          const maskCanvas = maskCanvasRef.current
          if (!maskCanvas) return null

          // Create a new canvas at original image dimensions
          const exportCanvas = document.createElement('canvas')
          exportCanvas.width = imageDimensions.width
          exportCanvas.height = imageDimensions.height
          const ctx = exportCanvas.getContext('2d')
          if (!ctx) return null

          // Scale up the mask to original dimensions
          ctx.drawImage(
            maskCanvas,
            0,
            0,
            maskCanvas.width,
            maskCanvas.height,
            0,
            0,
            imageDimensions.width,
            imageDimensions.height
          )

          return new Promise<Blob | null>((resolve) => {
            exportCanvas.toBlob((blob) => resolve(blob), 'image/png')
          })
        },

        clearMask: () => {
          const maskCanvas = maskCanvasRef.current
          if (!maskCanvas) return

          const ctx = maskCanvas.getContext('2d')
          if (!ctx) return

          ctx.fillStyle = 'black'
          ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
          updateOverlay()
          saveToHistory()
        },

        undo: () => {
          if (historyIndexRef.current <= 0) return

          historyIndexRef.current--
          const maskCanvas = maskCanvasRef.current
          if (!maskCanvas) return

          const ctx = maskCanvas.getContext('2d')
          if (!ctx) return

          const imageData = historyRef.current[historyIndexRef.current]
          ctx.putImageData(imageData, 0, 0)
          updateOverlay()
        },

        redo: () => {
          if (historyIndexRef.current >= historyRef.current.length - 1) return

          historyIndexRef.current++
          const maskCanvas = maskCanvasRef.current
          if (!maskCanvas) return

          const ctx = maskCanvas.getContext('2d')
          if (!ctx) return

          const imageData = historyRef.current[historyIndexRef.current]
          ctx.putImageData(imageData, 0, 0)
          updateOverlay()
        },

        canUndo: () => historyIndexRef.current > 0,

        canRedo: () => historyIndexRef.current < historyRef.current.length - 1,

        getImageDimensions: () => imageDimensions,
      }),
      [imageDimensions, updateOverlay, saveToHistory]
    )

    return (
      <div ref={containerRef} className="relative inline-block">
        {/* Controls */}
        <div className="absolute -top-12 left-0 right-0 flex items-center justify-center gap-4 z-10">
          <div className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2">
            <label className="text-xs text-neutral-400">Brush:</label>
            <input
              type="range"
              min="5"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-24 accent-cyan-500"
            />
            <span className="text-xs text-white w-8">{brushSize}px</span>
          </div>

          <div className="flex rounded-lg bg-neutral-800 p-1">
            <button
              type="button"
              onClick={() => setIsEraser(false)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                !isEraser
                  ? 'bg-red-500 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Paint
            </button>
            <button
              type="button"
              onClick={() => setIsEraser(true)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                isEraser
                  ? 'bg-cyan-500 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Erase
            </button>
          </div>
        </div>

        {/* Canvas layers */}
        <div
          className="relative cursor-crosshair"
          style={{ width: canvasSize.width, height: canvasSize.height }}
        >
          {/* Base image layer */}
          <canvas
            ref={imageCanvasRef}
            className="absolute inset-0"
            style={{ width: canvasSize.width, height: canvasSize.height }}
          />

          {/* Hidden mask layer (for export) */}
          <canvas ref={maskCanvasRef} className="hidden" />

          {/* Visible overlay layer */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0"
            style={{ width: canvasSize.width, height: canvasSize.height }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />

          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
              <div className="text-neutral-500">Loading image...</div>
            </div>
          )}
        </div>
      </div>
    )
  }
)
