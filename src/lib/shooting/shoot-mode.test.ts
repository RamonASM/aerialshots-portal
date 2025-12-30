/**
 * Shoot Mode Service Tests
 *
 * TDD tests for photographer shoot workflow
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createShootSession,
  calculateRequiredPhotos,
  addShot,
  removeShot,
  updateShotStatus,
  calculateProgress,
  getNextRecommendedCategory,
  completeSession,
  pauseSession,
  resumeSession,
  serializeSession,
  deserializeSession,
  validateSessionForCompletion,
  STANDARD_SHOT_CATEGORIES,
  type ShootSession,
} from './shoot-mode'

describe('Shoot Mode Service', () => {
  describe('createShootSession', () => {
    it('should create a new session with default values', () => {
      const session = createShootSession('listing-1', 'assignment-1', 'photographer-1')

      expect(session.listingId).toBe('listing-1')
      expect(session.assignmentId).toBe('assignment-1')
      expect(session.photographerId).toBe('photographer-1')
      expect(session.status).toBe('in_progress')
      expect(session.shots).toHaveLength(0)
      expect(session.categories).toHaveLength(STANDARD_SHOT_CATEGORIES.length)
    })

    it('should generate unique session ID', () => {
      const session1 = createShootSession('listing-1', 'a-1', 'p-1')
      const session2 = createShootSession('listing-1', 'a-1', 'p-1')

      expect(session1.id).not.toBe(session2.id)
    })

    it('should initialize all categories with 0 shots', () => {
      const session = createShootSession('listing-1', 'a-1', 'p-1')

      session.categories.forEach((cat) => {
        expect(cat.shotCount).toBe(0)
        expect(cat.isComplete).toBe(false)
      })
    })

    it('should set total required photos based on sqft', () => {
      const session = createShootSession('listing-1', 'a-1', 'p-1', 3000)

      expect(session.totalPhotosRequired).toBe(35) // 2501-3500 sqft range
    })
  })

  describe('calculateRequiredPhotos', () => {
    it('should return 20 for homes under 1500 sqft', () => {
      expect(calculateRequiredPhotos(1000)).toBe(20)
      expect(calculateRequiredPhotos(1499)).toBe(20)
    })

    it('should return 25 for homes 1500-2500 sqft', () => {
      expect(calculateRequiredPhotos(1500)).toBe(25)
      expect(calculateRequiredPhotos(2000)).toBe(25)
      expect(calculateRequiredPhotos(2500)).toBe(25)
    })

    it('should return 35 for homes 2501-3500 sqft', () => {
      expect(calculateRequiredPhotos(2501)).toBe(35)
      expect(calculateRequiredPhotos(3500)).toBe(35)
    })

    it('should return 45 for homes 3501-5000 sqft', () => {
      expect(calculateRequiredPhotos(3501)).toBe(45)
      expect(calculateRequiredPhotos(5000)).toBe(45)
    })

    it('should return 60 for homes over 5000 sqft', () => {
      expect(calculateRequiredPhotos(5001)).toBe(60)
      expect(calculateRequiredPhotos(10000)).toBe(60)
    })

    it('should return 25 as default when sqft is undefined', () => {
      expect(calculateRequiredPhotos()).toBe(25)
      expect(calculateRequiredPhotos(undefined)).toBe(25)
    })
  })

  describe('addShot', () => {
    let session: ShootSession

    beforeEach(() => {
      session = createShootSession('listing-1', 'a-1', 'p-1')
    })

    it('should add a shot to the session', () => {
      const updated = addShot(session, 'kitchen', 'file:///photo1.jpg')

      expect(updated.shots).toHaveLength(1)
      expect(updated.shots[0].categoryId).toBe('kitchen')
      expect(updated.shots[0].localUri).toBe('file:///photo1.jpg')
      expect(updated.shots[0].status).toBe('pending')
    })

    it('should increment category shot count', () => {
      const updated = addShot(session, 'kitchen', 'file:///photo1.jpg')
      const kitchenProgress = updated.categories.find((c) => c.categoryId === 'kitchen')

      expect(kitchenProgress?.shotCount).toBe(1)
    })

    it('should mark category complete when minShots reached', () => {
      // Kitchen requires 3 shots minimum
      let updated = addShot(session, 'kitchen', 'file:///1.jpg')
      updated = addShot(updated, 'kitchen', 'file:///2.jpg')
      updated = addShot(updated, 'kitchen', 'file:///3.jpg')

      const kitchenProgress = updated.categories.find((c) => c.categoryId === 'kitchen')
      expect(kitchenProgress?.isComplete).toBe(true)
    })

    it('should include metadata if provided', () => {
      const metadata = { width: 4000, height: 3000, fileSize: 5000000 }
      const updated = addShot(session, 'kitchen', 'file:///photo1.jpg', metadata)

      expect(updated.shots[0].metadata).toEqual(metadata)
    })
  })

  describe('removeShot', () => {
    let session: ShootSession

    beforeEach(() => {
      session = createShootSession('listing-1', 'a-1', 'p-1')
      session = addShot(session, 'kitchen', 'file:///1.jpg')
      session = addShot(session, 'kitchen', 'file:///2.jpg')
    })

    it('should remove a shot by ID', () => {
      const shotId = session.shots[0].id
      const updated = removeShot(session, shotId)

      expect(updated.shots).toHaveLength(1)
      expect(updated.shots.find((s) => s.id === shotId)).toBeUndefined()
    })

    it('should decrement category shot count', () => {
      const shotId = session.shots[0].id
      const updated = removeShot(session, shotId)

      const kitchenProgress = updated.categories.find((c) => c.categoryId === 'kitchen')
      expect(kitchenProgress?.shotCount).toBe(1)
    })

    it('should return unchanged session if shot not found', () => {
      const updated = removeShot(session, 'nonexistent-id')

      expect(updated.shots).toHaveLength(2)
    })
  })

  describe('updateShotStatus', () => {
    let session: ShootSession

    beforeEach(() => {
      session = createShootSession('listing-1', 'a-1', 'p-1')
      session = addShot(session, 'kitchen', 'file:///1.jpg')
    })

    it('should update shot status', () => {
      const shotId = session.shots[0].id
      const updated = updateShotStatus(session, shotId, 'uploading', {
        uploadProgress: 50,
      })

      expect(updated.shots[0].status).toBe('uploading')
      expect(updated.shots[0].uploadProgress).toBe(50)
    })

    it('should set uploaded URL on completion', () => {
      const shotId = session.shots[0].id
      const updated = updateShotStatus(session, shotId, 'uploaded', {
        uploadedUrl: 'https://cdn.example.com/photo1.jpg',
      })

      expect(updated.shots[0].status).toBe('uploaded')
      expect(updated.shots[0].uploadedUrl).toBe('https://cdn.example.com/photo1.jpg')
    })

    it('should set error on failure', () => {
      const shotId = session.shots[0].id
      const updated = updateShotStatus(session, shotId, 'failed', {
        error: 'Network error',
      })

      expect(updated.shots[0].status).toBe('failed')
      expect(updated.shots[0].error).toBe('Network error')
    })
  })

  describe('calculateProgress', () => {
    let session: ShootSession

    beforeEach(() => {
      session = createShootSession('listing-1', 'a-1', 'p-1', 2000) // 25 photos required
    })

    it('should return 0 progress for empty session', () => {
      const progress = calculateProgress(session)

      expect(progress.totalShots).toBe(0)
      expect(progress.uploadedShots).toBe(0)
      expect(progress.percentComplete).toBe(0)
    })

    it('should count shots by status', () => {
      session = addShot(session, 'kitchen', 'file:///1.jpg')
      session = addShot(session, 'kitchen', 'file:///2.jpg')
      session = addShot(session, 'kitchen', 'file:///3.jpg')
      session = updateShotStatus(session, session.shots[0].id, 'uploaded')
      session = updateShotStatus(session, session.shots[1].id, 'failed')

      const progress = calculateProgress(session)

      expect(progress.totalShots).toBe(3)
      expect(progress.uploadedShots).toBe(1)
      expect(progress.failedShots).toBe(1)
      expect(progress.pendingShots).toBe(1)
    })

    it('should calculate average upload progress', () => {
      session = addShot(session, 'kitchen', 'file:///1.jpg')
      session = addShot(session, 'kitchen', 'file:///2.jpg')
      session = updateShotStatus(session, session.shots[0].id, 'uploading', {
        uploadProgress: 50,
      })
      session = updateShotStatus(session, session.shots[1].id, 'uploading', {
        uploadProgress: 100,
      })

      const progress = calculateProgress(session)
      expect(progress.uploadProgress).toBe(75) // (50 + 100) / 2
    })

    it('should track required category completion', () => {
      // Complete exterior-front (requires 2)
      session = addShot(session, 'exterior-front', 'file:///1.jpg')
      session = addShot(session, 'exterior-front', 'file:///2.jpg')

      const progress = calculateProgress(session)
      expect(progress.requiredCategoriesComplete).toBe(1)
    })

    it('should set isMinimumMet when all requirements satisfied', () => {
      // This is a complex test - we need to complete all required categories
      // and reach the minimum photo count
      const requiredCategories = STANDARD_SHOT_CATEGORIES.filter((c) => c.required)

      requiredCategories.forEach((cat) => {
        for (let i = 0; i < cat.minShots; i++) {
          session = addShot(session, cat.id, `file:///${cat.id}-${i}.jpg`)
        }
      })

      // Add more shots to reach 25 minimum
      const currentCount = session.shots.length
      for (let i = currentCount; i < 25; i++) {
        session = addShot(session, 'details', `file:///extra-${i}.jpg`)
      }

      const progress = calculateProgress(session)
      expect(progress.isMinimumMet).toBe(true)
    })
  })

  describe('getNextRecommendedCategory', () => {
    let session: ShootSession

    beforeEach(() => {
      session = createShootSession('listing-1', 'a-1', 'p-1')
    })

    it('should recommend first required category for new session', () => {
      const next = getNextRecommendedCategory(session)

      expect(next).not.toBeNull()
      expect(next?.required).toBe(true)
      expect(next?.id).toBe('exterior-front')
    })

    it('should recommend next incomplete required category', () => {
      // Complete exterior-front
      session = addShot(session, 'exterior-front', 'file:///1.jpg')
      session = addShot(session, 'exterior-front', 'file:///2.jpg')

      const next = getNextRecommendedCategory(session)

      expect(next?.id).toBe('exterior-back')
    })

    it('should recommend optional categories after all required complete', () => {
      // Complete all required categories
      const requiredCategories = STANDARD_SHOT_CATEGORIES.filter((c) => c.required)

      requiredCategories.forEach((cat) => {
        for (let i = 0; i < cat.minShots; i++) {
          session = addShot(session, cat.id, `file:///${cat.id}-${i}.jpg`)
        }
      })

      const next = getNextRecommendedCategory(session)

      expect(next?.required).toBe(false)
    })
  })

  describe('Session State Management', () => {
    let session: ShootSession

    beforeEach(() => {
      session = createShootSession('listing-1', 'a-1', 'p-1')
    })

    it('should complete session', () => {
      const completed = completeSession(session)

      expect(completed.status).toBe('completed')
      expect(completed.completedAt).toBeDefined()
    })

    it('should pause session', () => {
      const paused = pauseSession(session)

      expect(paused.status).toBe('paused')
    })

    it('should resume paused session', () => {
      const paused = pauseSession(session)
      const resumed = resumeSession(paused)

      expect(resumed.status).toBe('in_progress')
    })

    it('should not change status when resuming non-paused session', () => {
      const completed = completeSession(session)
      const result = resumeSession(completed)

      expect(result.status).toBe('completed')
    })
  })

  describe('Serialization', () => {
    let session: ShootSession

    beforeEach(() => {
      session = createShootSession('listing-1', 'a-1', 'p-1')
      session = addShot(session, 'kitchen', 'file:///1.jpg')
    })

    it('should serialize and deserialize session', () => {
      const serialized = serializeSession(session)
      const deserialized = deserializeSession(serialized)

      expect(deserialized).not.toBeNull()
      expect(deserialized?.id).toBe(session.id)
      expect(deserialized?.shots).toHaveLength(1)
    })

    it('should preserve dates correctly', () => {
      const serialized = serializeSession(session)
      const deserialized = deserializeSession(serialized)

      expect(deserialized?.startedAt).toBeInstanceOf(Date)
      expect(deserialized?.startedAt.getTime()).toBe(session.startedAt.getTime())
    })

    it('should return null for invalid JSON', () => {
      const result = deserializeSession('invalid json')
      expect(result).toBeNull()
    })
  })

  describe('validateSessionForCompletion', () => {
    let session: ShootSession

    beforeEach(() => {
      session = createShootSession('listing-1', 'a-1', 'p-1', 2000)
    })

    it('should return errors for incomplete required categories', () => {
      const result = validateSessionForCompletion(session)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Missing required categories')
    })

    it('should return warning for low photo count', () => {
      // Complete all required categories with minimum shots
      const requiredCategories = STANDARD_SHOT_CATEGORIES.filter((c) => c.required)

      requiredCategories.forEach((cat) => {
        for (let i = 0; i < cat.minShots; i++) {
          session = addShot(session, cat.id, `file:///${cat.id}-${i}.jpg`)
          session = updateShotStatus(session, session.shots[session.shots.length - 1].id, 'uploaded')
        }
      })

      const result = validateSessionForCompletion(session)

      // Should have warnings about photo count but no errors
      expect(result.errors).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should return error for failed uploads', () => {
      session = addShot(session, 'kitchen', 'file:///1.jpg')
      session = updateShotStatus(session, session.shots[0].id, 'failed')

      const result = validateSessionForCompletion(session)

      expect(result.errors).toContain('1 photos failed to upload')
    })

    it('should return error for pending uploads', () => {
      session = addShot(session, 'kitchen', 'file:///1.jpg')
      session = updateShotStatus(session, session.shots[0].id, 'uploading')

      const result = validateSessionForCompletion(session)

      expect(result.errors).toContain('1 photos still uploading')
    })
  })

  describe('STANDARD_SHOT_CATEGORIES', () => {
    it('should have required categories defined', () => {
      const requiredCount = STANDARD_SHOT_CATEGORIES.filter((c) => c.required).length

      expect(requiredCount).toBeGreaterThan(0)
    })

    it('should have valid minShots and maxShots for all categories', () => {
      STANDARD_SHOT_CATEGORIES.forEach((cat) => {
        expect(cat.minShots).toBeGreaterThanOrEqual(0)
        expect(cat.maxShots).toBeGreaterThan(cat.minShots)
      })
    })

    it('should have tips for all categories', () => {
      STANDARD_SHOT_CATEGORIES.forEach((cat) => {
        expect(cat.tips.length).toBeGreaterThan(0)
      })
    })
  })
})
