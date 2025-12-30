/**
 * Photo Editor Service Tests
 *
 * TDD tests for core photo editing functionality
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateCropRegion,
  validateAdjustments,
  adjustmentsToCSSFilters,
  editStateToTransform,
  getEffectiveDimensions,
  createHistoryEntry,
  mergeAdjustments,
  hasEdits,
  createAnnotationId,
  getBrushBoundingBox,
  simplifyBrushPath,
  serializeEditState,
  deserializeEditState,
  DEFAULT_ADJUSTMENTS,
  DEFAULT_EDIT_STATE,
  type EditState,
  type CropRegion,
  type AdjustmentValues,
  type ImageDimensions,
  type Annotation,
} from './photo-editor'

describe('Photo Editor Service', () => {
  describe('validateCropRegion', () => {
    const dimensions: ImageDimensions = { width: 1920, height: 1080 }

    it('should validate a correct crop region', () => {
      const crop: CropRegion = { x: 100, y: 100, width: 500, height: 400 }
      const result = validateCropRegion(crop, dimensions)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject negative x position', () => {
      const crop: CropRegion = { x: -10, y: 100, width: 500, height: 400 }
      const result = validateCropRegion(crop, dimensions)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Crop x position cannot be negative')
    })

    it('should reject negative y position', () => {
      const crop: CropRegion = { x: 100, y: -10, width: 500, height: 400 }
      const result = validateCropRegion(crop, dimensions)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Crop y position cannot be negative')
    })

    it('should reject zero width', () => {
      const crop: CropRegion = { x: 100, y: 100, width: 0, height: 400 }
      const result = validateCropRegion(crop, dimensions)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Crop width must be positive')
    })

    it('should reject zero height', () => {
      const crop: CropRegion = { x: 100, y: 100, width: 500, height: 0 }
      const result = validateCropRegion(crop, dimensions)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Crop height must be positive')
    })

    it('should reject crop exceeding image width', () => {
      const crop: CropRegion = { x: 1800, y: 100, width: 200, height: 400 }
      const result = validateCropRegion(crop, dimensions)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Crop region exceeds image width')
    })

    it('should reject crop exceeding image height', () => {
      const crop: CropRegion = { x: 100, y: 900, width: 500, height: 300 }
      const result = validateCropRegion(crop, dimensions)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Crop region exceeds image height')
    })

    it('should allow crop at exact bounds', () => {
      const crop: CropRegion = { x: 0, y: 0, width: 1920, height: 1080 }
      const result = validateCropRegion(crop, dimensions)

      expect(result.valid).toBe(true)
    })
  })

  describe('validateAdjustments', () => {
    it('should validate correct adjustment values', () => {
      const adjustments: Partial<AdjustmentValues> = {
        brightness: 50,
        contrast: -30,
        saturation: 0,
      }
      const result = validateAdjustments(adjustments)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject brightness out of range (too high)', () => {
      const adjustments: Partial<AdjustmentValues> = { brightness: 150 }
      const result = validateAdjustments(adjustments)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('brightness must be between -100 and 100')
    })

    it('should reject brightness out of range (too low)', () => {
      const adjustments: Partial<AdjustmentValues> = { brightness: -150 }
      const result = validateAdjustments(adjustments)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('brightness must be between -100 and 100')
    })

    it('should reject sharpness below 0', () => {
      const adjustments: Partial<AdjustmentValues> = { sharpness: -10 }
      const result = validateAdjustments(adjustments)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('sharpness must be between 0 and 100')
    })

    it('should reject sharpness above 100', () => {
      const adjustments: Partial<AdjustmentValues> = { sharpness: 150 }
      const result = validateAdjustments(adjustments)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('sharpness must be between 0 and 100')
    })

    it('should accept boundary values', () => {
      const adjustments: Partial<AdjustmentValues> = {
        brightness: -100,
        contrast: 100,
        sharpness: 0,
      }
      const result = validateAdjustments(adjustments)

      expect(result.valid).toBe(true)
    })
  })

  describe('adjustmentsToCSSFilters', () => {
    it('should return empty string for default adjustments', () => {
      const result = adjustmentsToCSSFilters(DEFAULT_ADJUSTMENTS)
      expect(result).toBe('')
    })

    it('should generate brightness filter', () => {
      const adjustments: AdjustmentValues = {
        ...DEFAULT_ADJUSTMENTS,
        brightness: 50,
      }
      const result = adjustmentsToCSSFilters(adjustments)

      expect(result).toContain('brightness(1.5)')
    })

    it('should generate contrast filter', () => {
      const adjustments: AdjustmentValues = {
        ...DEFAULT_ADJUSTMENTS,
        contrast: -50,
      }
      const result = adjustmentsToCSSFilters(adjustments)

      expect(result).toContain('contrast(0.5)')
    })

    it('should generate saturation filter', () => {
      const adjustments: AdjustmentValues = {
        ...DEFAULT_ADJUSTMENTS,
        saturation: 100,
      }
      const result = adjustmentsToCSSFilters(adjustments)

      expect(result).toContain('saturate(2)')
    })

    it('should generate warm temperature filter (sepia)', () => {
      const adjustments: AdjustmentValues = {
        ...DEFAULT_ADJUSTMENTS,
        temperature: 50,
      }
      const result = adjustmentsToCSSFilters(adjustments)

      expect(result).toContain('sepia(0.25)')
    })

    it('should generate cool temperature filter (hue-rotate)', () => {
      const adjustments: AdjustmentValues = {
        ...DEFAULT_ADJUSTMENTS,
        temperature: -50,
      }
      const result = adjustmentsToCSSFilters(adjustments)

      expect(result).toContain('hue-rotate(-15deg)')
    })

    it('should combine multiple filters', () => {
      const adjustments: AdjustmentValues = {
        ...DEFAULT_ADJUSTMENTS,
        brightness: 20,
        contrast: 10,
        saturation: -10,
      }
      const result = adjustmentsToCSSFilters(adjustments)

      expect(result).toContain('brightness(1.2)')
      expect(result).toContain('contrast(1.1)')
      expect(result).toContain('saturate(0.9)')
    })
  })

  describe('editStateToTransform', () => {
    it('should return empty string for default state', () => {
      const result = editStateToTransform(DEFAULT_EDIT_STATE)
      expect(result).toBe('')
    })

    it('should generate rotation transform', () => {
      const state: EditState = { ...DEFAULT_EDIT_STATE, rotation: 90 }
      const result = editStateToTransform(state)

      expect(result).toContain('rotate(90deg)')
    })

    it('should generate horizontal flip transform', () => {
      const state: EditState = { ...DEFAULT_EDIT_STATE, flipHorizontal: true }
      const result = editStateToTransform(state)

      expect(result).toContain('scaleX(-1)')
    })

    it('should generate vertical flip transform', () => {
      const state: EditState = { ...DEFAULT_EDIT_STATE, flipVertical: true }
      const result = editStateToTransform(state)

      expect(result).toContain('scaleY(-1)')
    })

    it('should combine rotation and flip transforms', () => {
      const state: EditState = {
        ...DEFAULT_EDIT_STATE,
        rotation: 180,
        flipHorizontal: true,
      }
      const result = editStateToTransform(state)

      expect(result).toContain('rotate(180deg)')
      expect(result).toContain('scaleX(-1)')
    })
  })

  describe('getEffectiveDimensions', () => {
    const dimensions: ImageDimensions = { width: 1920, height: 1080 }

    it('should return same dimensions for 0 rotation', () => {
      const result = getEffectiveDimensions(dimensions, 0)

      expect(result.width).toBe(1920)
      expect(result.height).toBe(1080)
    })

    it('should swap dimensions for 90 degree rotation', () => {
      const result = getEffectiveDimensions(dimensions, 90)

      expect(result.width).toBe(1080)
      expect(result.height).toBe(1920)
    })

    it('should return same dimensions for 180 rotation', () => {
      const result = getEffectiveDimensions(dimensions, 180)

      expect(result.width).toBe(1920)
      expect(result.height).toBe(1080)
    })

    it('should swap dimensions for 270 degree rotation', () => {
      const result = getEffectiveDimensions(dimensions, 270)

      expect(result.width).toBe(1080)
      expect(result.height).toBe(1920)
    })

    it('should handle negative rotation', () => {
      const result = getEffectiveDimensions(dimensions, -90)

      expect(result.width).toBe(1080)
      expect(result.height).toBe(1920)
    })

    it('should handle rotation over 360', () => {
      const result = getEffectiveDimensions(dimensions, 450)

      expect(result.width).toBe(1080)
      expect(result.height).toBe(1920)
    })
  })

  describe('createHistoryEntry', () => {
    it('should create history entry with unique id', () => {
      const state: EditState = { ...DEFAULT_EDIT_STATE, rotation: 90 }
      const entry1 = createHistoryEntry('Rotate 90°', state)
      const entry2 = createHistoryEntry('Rotate 90°', state)

      expect(entry1.id).not.toBe(entry2.id)
    })

    it('should include timestamp', () => {
      const before = Date.now()
      const state: EditState = { ...DEFAULT_EDIT_STATE }
      const entry = createHistoryEntry('Test', state)
      const after = Date.now()

      expect(entry.timestamp).toBeGreaterThanOrEqual(before)
      expect(entry.timestamp).toBeLessThanOrEqual(after)
    })

    it('should deep clone state', () => {
      const state: EditState = {
        ...DEFAULT_EDIT_STATE,
        adjustments: { ...DEFAULT_ADJUSTMENTS, brightness: 50 },
      }
      const entry = createHistoryEntry('Adjust brightness', state)

      // Modify original state
      state.adjustments.brightness = 100

      // Entry state should be unchanged
      expect(entry.state.adjustments.brightness).toBe(50)
    })
  })

  describe('mergeAdjustments', () => {
    it('should merge partial updates', () => {
      const current: AdjustmentValues = { ...DEFAULT_ADJUSTMENTS }
      const updates = { brightness: 50, contrast: 20 }
      const result = mergeAdjustments(current, updates)

      expect(result.brightness).toBe(50)
      expect(result.contrast).toBe(20)
      expect(result.saturation).toBe(0) // Unchanged
    })

    it('should not modify original', () => {
      const current: AdjustmentValues = { ...DEFAULT_ADJUSTMENTS }
      mergeAdjustments(current, { brightness: 50 })

      expect(current.brightness).toBe(0)
    })
  })

  describe('hasEdits', () => {
    it('should return false for default state', () => {
      expect(hasEdits(DEFAULT_EDIT_STATE)).toBe(false)
    })

    it('should return true for rotation', () => {
      const state: EditState = { ...DEFAULT_EDIT_STATE, rotation: 90 }
      expect(hasEdits(state)).toBe(true)
    })

    it('should return true for horizontal flip', () => {
      const state: EditState = { ...DEFAULT_EDIT_STATE, flipHorizontal: true }
      expect(hasEdits(state)).toBe(true)
    })

    it('should return true for crop', () => {
      const state: EditState = {
        ...DEFAULT_EDIT_STATE,
        crop: { x: 0, y: 0, width: 100, height: 100 },
      }
      expect(hasEdits(state)).toBe(true)
    })

    it('should return true for annotations', () => {
      const annotation: Annotation = {
        id: 'test',
        type: 'text',
        color: '#ff0000',
        strokeWidth: 2,
        text: 'Test',
      }
      const state: EditState = {
        ...DEFAULT_EDIT_STATE,
        annotations: [annotation],
      }
      expect(hasEdits(state)).toBe(true)
    })

    it('should return true for adjusted brightness', () => {
      const state: EditState = {
        ...DEFAULT_EDIT_STATE,
        adjustments: { ...DEFAULT_ADJUSTMENTS, brightness: 10 },
      }
      expect(hasEdits(state)).toBe(true)
    })
  })

  describe('createAnnotationId', () => {
    it('should generate unique ids', () => {
      const id1 = createAnnotationId()
      const id2 = createAnnotationId()

      expect(id1).not.toBe(id2)
    })

    it('should start with "annotation-"', () => {
      const id = createAnnotationId()
      expect(id.startsWith('annotation-')).toBe(true)
    })
  })

  describe('getBrushBoundingBox', () => {
    it('should return null for empty points array', () => {
      const result = getBrushBoundingBox([])
      expect(result).toBeNull()
    })

    it('should calculate bounding box for single point', () => {
      const result = getBrushBoundingBox([{ x: 100, y: 100 }])

      expect(result).toEqual({ x: 100, y: 100, width: 0, height: 0 })
    })

    it('should calculate bounding box for multiple points', () => {
      const points = [
        { x: 10, y: 20 },
        { x: 50, y: 10 },
        { x: 30, y: 60 },
        { x: 5, y: 40 },
      ]
      const result = getBrushBoundingBox(points)

      expect(result).toEqual({ x: 5, y: 10, width: 45, height: 50 })
    })
  })

  describe('simplifyBrushPath', () => {
    it('should return same points if 2 or fewer', () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 100 }]
      const result = simplifyBrushPath(points)

      expect(result).toEqual(points)
    })

    it('should simplify straight line to two points', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 25, y: 25 },
        { x: 50, y: 50 },
        { x: 75, y: 75 },
        { x: 100, y: 100 },
      ]
      const result = simplifyBrushPath(points, 1)

      expect(result.length).toBeLessThanOrEqual(2)
    })

    it('should preserve corners in path', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
      ]
      const result = simplifyBrushPath(points, 1)

      // Should keep all 3 points because of corner
      expect(result.length).toBe(3)
    })
  })

  describe('serializeEditState / deserializeEditState', () => {
    it('should round-trip serialize and deserialize', () => {
      const state: EditState = {
        rotation: 90,
        flipHorizontal: true,
        flipVertical: false,
        crop: { x: 10, y: 20, width: 100, height: 200 },
        adjustments: {
          ...DEFAULT_ADJUSTMENTS,
          brightness: 50,
          contrast: -20,
        },
        annotations: [
          {
            id: 'test-1',
            type: 'text',
            color: '#ff0000',
            strokeWidth: 2,
            text: 'Test annotation',
          },
        ],
      }

      const serialized = serializeEditState(state)
      const deserialized = deserializeEditState(serialized)

      expect(deserialized).toEqual(state)
    })

    it('should return null for invalid JSON', () => {
      const result = deserializeEditState('invalid json')
      expect(result).toBeNull()
    })

    it('should return null for missing required fields', () => {
      const invalid = JSON.stringify({ rotation: 0 })
      const result = deserializeEditState(invalid)
      expect(result).toBeNull()
    })

    it('should fill in default adjustments for partial data', () => {
      const partial = JSON.stringify({
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        crop: null,
        adjustments: { brightness: 50 },
        annotations: [],
      })
      const result = deserializeEditState(partial)

      expect(result?.adjustments.brightness).toBe(50)
      expect(result?.adjustments.contrast).toBe(0) // Default
    })
  })
})
