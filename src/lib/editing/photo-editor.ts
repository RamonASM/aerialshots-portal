/**
 * Photo Editor Service
 *
 * Provides core photo editing functionality for the team editor portal.
 * Supports non-destructive editing with history/undo support.
 */

export interface ImageDimensions {
  width: number
  height: number
}

export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface AdjustmentValues {
  brightness: number // -100 to 100, default 0
  contrast: number // -100 to 100, default 0
  saturation: number // -100 to 100, default 0
  exposure: number // -100 to 100, default 0
  highlights: number // -100 to 100, default 0
  shadows: number // -100 to 100, default 0
  temperature: number // -100 to 100, default 0 (warm/cool)
  sharpness: number // 0 to 100, default 0
}

export interface Annotation {
  id: string
  type: 'brush' | 'text' | 'arrow' | 'rectangle' | 'circle'
  color: string
  strokeWidth: number
  points?: Array<{ x: number; y: number }> // For brush strokes
  text?: string // For text annotations
  startPoint?: { x: number; y: number }
  endPoint?: { x: number; y: number }
  fontSize?: number
}

export interface EditState {
  rotation: number // degrees: 0, 90, 180, 270
  flipHorizontal: boolean
  flipVertical: boolean
  crop: CropRegion | null
  adjustments: AdjustmentValues
  annotations: Annotation[]
}

export interface EditHistoryEntry {
  id: string
  timestamp: number
  description: string
  state: EditState
}

export const DEFAULT_ADJUSTMENTS: AdjustmentValues = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  temperature: 0,
  sharpness: 0,
}

export const DEFAULT_EDIT_STATE: EditState = {
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  crop: null,
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  annotations: [],
}

/**
 * Validates crop region against image dimensions
 */
export function validateCropRegion(
  crop: CropRegion,
  dimensions: ImageDimensions
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (crop.x < 0) errors.push('Crop x position cannot be negative')
  if (crop.y < 0) errors.push('Crop y position cannot be negative')
  if (crop.width <= 0) errors.push('Crop width must be positive')
  if (crop.height <= 0) errors.push('Crop height must be positive')
  if (crop.x + crop.width > dimensions.width) {
    errors.push('Crop region exceeds image width')
  }
  if (crop.y + crop.height > dimensions.height) {
    errors.push('Crop region exceeds image height')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validates adjustment values are within bounds
 */
export function validateAdjustments(
  adjustments: Partial<AdjustmentValues>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const rangeKeys: (keyof AdjustmentValues)[] = [
    'brightness',
    'contrast',
    'saturation',
    'exposure',
    'highlights',
    'shadows',
    'temperature',
  ]

  for (const key of rangeKeys) {
    const value = adjustments[key]
    if (value !== undefined && (value < -100 || value > 100)) {
      errors.push(`${key} must be between -100 and 100`)
    }
  }

  if (adjustments.sharpness !== undefined) {
    if (adjustments.sharpness < 0 || adjustments.sharpness > 100) {
      errors.push('sharpness must be between 0 and 100')
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Generates CSS filter string from adjustment values
 */
export function adjustmentsToCSSFilters(adjustments: AdjustmentValues): string {
  const filters: string[] = []

  // Brightness: 0 = 100%, -100 = 0%, +100 = 200%
  if (adjustments.brightness !== 0) {
    const brightness = 1 + adjustments.brightness / 100
    filters.push(`brightness(${brightness})`)
  }

  // Contrast: 0 = 100%, -100 = 0%, +100 = 200%
  if (adjustments.contrast !== 0) {
    const contrast = 1 + adjustments.contrast / 100
    filters.push(`contrast(${contrast})`)
  }

  // Saturation: 0 = 100%, -100 = 0% (grayscale), +100 = 200%
  if (adjustments.saturation !== 0) {
    const saturation = 1 + adjustments.saturation / 100
    filters.push(`saturate(${saturation})`)
  }

  // Temperature uses sepia + hue-rotate for warm/cool effect
  if (adjustments.temperature !== 0) {
    if (adjustments.temperature > 0) {
      // Warm: add sepia
      const sepia = adjustments.temperature / 200
      filters.push(`sepia(${sepia})`)
    } else {
      // Cool: add blue via hue-rotate
      const hueRotate = adjustments.temperature * 0.3
      filters.push(`hue-rotate(${hueRotate}deg)`)
    }
  }

  return filters.join(' ')
}

/**
 * Generates CSS transform string from edit state
 */
export function editStateToTransform(state: EditState): string {
  const transforms: string[] = []

  if (state.rotation !== 0) {
    transforms.push(`rotate(${state.rotation}deg)`)
  }

  if (state.flipHorizontal) {
    transforms.push('scaleX(-1)')
  }

  if (state.flipVertical) {
    transforms.push('scaleY(-1)')
  }

  return transforms.join(' ')
}

/**
 * Calculate effective dimensions after rotation
 */
export function getEffectiveDimensions(
  dimensions: ImageDimensions,
  rotation: number
): ImageDimensions {
  const normalizedRotation = ((rotation % 360) + 360) % 360
  if (normalizedRotation === 90 || normalizedRotation === 270) {
    return { width: dimensions.height, height: dimensions.width }
  }
  return { ...dimensions }
}

/**
 * Creates a new history entry
 */
export function createHistoryEntry(
  description: string,
  state: EditState
): EditHistoryEntry {
  return {
    id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    description,
    state: JSON.parse(JSON.stringify(state)), // Deep clone
  }
}

/**
 * Merge partial adjustments into full adjustments object
 */
export function mergeAdjustments(
  current: AdjustmentValues,
  updates: Partial<AdjustmentValues>
): AdjustmentValues {
  return {
    ...current,
    ...updates,
  }
}

/**
 * Check if edit state has any modifications from default
 */
export function hasEdits(state: EditState): boolean {
  if (state.rotation !== 0) return true
  if (state.flipHorizontal) return true
  if (state.flipVertical) return true
  if (state.crop !== null) return true
  if (state.annotations.length > 0) return true

  // Check adjustments
  for (const key of Object.keys(DEFAULT_ADJUSTMENTS) as (keyof AdjustmentValues)[]) {
    if (state.adjustments[key] !== DEFAULT_ADJUSTMENTS[key]) {
      return true
    }
  }

  return false
}

/**
 * Generate annotation ID
 */
export function createAnnotationId(): string {
  return `annotation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Calculate bounding box for brush annotation
 */
export function getBrushBoundingBox(
  points: Array<{ x: number; y: number }>
): { x: number; y: number; width: number; height: number } | null {
  if (points.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Simplify brush path using Douglas-Peucker algorithm
 * Reduces number of points while preserving shape
 */
export function simplifyBrushPath(
  points: Array<{ x: number; y: number }>,
  tolerance: number = 2
): Array<{ x: number; y: number }> {
  if (points.length <= 2) return points

  // Find the point with the maximum distance from line between first and last points
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]

  let maxDistance = 0
  let maxIndex = 0

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], firstPoint, lastPoint)
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = simplifyBrushPath(points.slice(0, maxIndex + 1), tolerance)
    const right = simplifyBrushPath(points.slice(maxIndex), tolerance)
    return [...left.slice(0, -1), ...right]
  }

  return [firstPoint, lastPoint]
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y

  // Line length squared
  const lineLengthSq = dx * dx + dy * dy

  if (lineLengthSq === 0) {
    // Point-to-point distance
    return Math.sqrt(
      (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2
    )
  }

  // Project point onto line
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lineLengthSq
    )
  )

  const projX = lineStart.x + t * dx
  const projY = lineStart.y + t * dy

  return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2)
}

/**
 * Export edit state as JSON for storage
 */
export function serializeEditState(state: EditState): string {
  return JSON.stringify(state)
}

/**
 * Parse edit state from JSON
 */
export function deserializeEditState(json: string): EditState | null {
  try {
    const parsed = JSON.parse(json)

    // Validate required fields
    if (typeof parsed.rotation !== 'number') return null
    if (typeof parsed.flipHorizontal !== 'boolean') return null
    if (typeof parsed.flipVertical !== 'boolean') return null
    if (!parsed.adjustments) return null
    if (!Array.isArray(parsed.annotations)) return null

    return {
      rotation: parsed.rotation,
      flipHorizontal: parsed.flipHorizontal,
      flipVertical: parsed.flipVertical,
      crop: parsed.crop || null,
      adjustments: {
        ...DEFAULT_ADJUSTMENTS,
        ...parsed.adjustments,
      },
      annotations: parsed.annotations,
    }
  } catch {
    return null
  }
}
