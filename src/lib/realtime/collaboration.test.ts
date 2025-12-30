/**
 * Realtime Collaboration Service Tests
 *
 * TDD tests for presence, cursors, and live updates
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createPresenceState,
  updatePresenceState,
  isPresenceStale,
  mergePresenceStates,
  createCursor,
  updateCursor,
  calculateCursorInterpolation,
  createCollaborationSession,
  addParticipant,
  removeParticipant,
  updateParticipant,
  getActiveParticipants,
  createOptimisticUpdate,
  applyOptimisticUpdate,
  resolveConflict,
  calculateLatency,
  serializeCollaborationState,
  deserializeCollaborationState,
  type PresenceState,
  type Cursor,
  type CollaborationSession,
  type OptimisticUpdate,
} from './collaboration'

describe('Realtime Collaboration Service', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createPresenceState', () => {
    it('should create a presence state with user info', () => {
      const presence = createPresenceState({
        userId: 'user-123',
        userName: 'John Doe',
        userAvatar: 'https://example.com/avatar.jpg',
      })

      expect(presence.userId).toBe('user-123')
      expect(presence.userName).toBe('John Doe')
      expect(presence.userAvatar).toBe('https://example.com/avatar.jpg')
      expect(presence.status).toBe('online')
      expect(presence.lastSeen).toBeInstanceOf(Date)
    })

    it('should set default status to online', () => {
      const presence = createPresenceState({
        userId: 'user-123',
        userName: 'John',
      })

      expect(presence.status).toBe('online')
    })

    it('should set custom status if provided', () => {
      const presence = createPresenceState({
        userId: 'user-123',
        userName: 'John',
        status: 'idle',
      })

      expect(presence.status).toBe('idle')
    })

    it('should include location if provided', () => {
      const presence = createPresenceState({
        userId: 'user-123',
        userName: 'John',
        location: { page: '/listing/123', section: 'photos' },
      })

      expect(presence.location).toEqual({ page: '/listing/123', section: 'photos' })
    })
  })

  describe('updatePresenceState', () => {
    it('should update status and refresh lastSeen', () => {
      const initial = createPresenceState({
        userId: 'user-123',
        userName: 'John',
      })

      vi.advanceTimersByTime(5000)

      const updated = updatePresenceState(initial, { status: 'away' })

      expect(updated.status).toBe('away')
      expect(updated.lastSeen.getTime()).toBeGreaterThan(initial.lastSeen.getTime())
    })

    it('should update location', () => {
      const initial = createPresenceState({
        userId: 'user-123',
        userName: 'John',
      })

      const updated = updatePresenceState(initial, {
        location: { page: '/listing/456', section: 'editor' },
      })

      expect(updated.location).toEqual({ page: '/listing/456', section: 'editor' })
    })

    it('should preserve unchanged fields', () => {
      const initial = createPresenceState({
        userId: 'user-123',
        userName: 'John',
        userAvatar: 'https://example.com/avatar.jpg',
      })

      const updated = updatePresenceState(initial, { status: 'away' })

      expect(updated.userId).toBe('user-123')
      expect(updated.userName).toBe('John')
      expect(updated.userAvatar).toBe('https://example.com/avatar.jpg')
    })
  })

  describe('isPresenceStale', () => {
    it('should return false for recent presence', () => {
      const presence = createPresenceState({
        userId: 'user-123',
        userName: 'John',
      })

      expect(isPresenceStale(presence)).toBe(false)
    })

    it('should return true for stale presence (> 30 seconds)', () => {
      const presence = createPresenceState({
        userId: 'user-123',
        userName: 'John',
      })

      vi.advanceTimersByTime(35000) // 35 seconds

      expect(isPresenceStale(presence)).toBe(true)
    })

    it('should respect custom threshold', () => {
      const presence = createPresenceState({
        userId: 'user-123',
        userName: 'John',
      })

      vi.advanceTimersByTime(5000) // 5 seconds

      expect(isPresenceStale(presence, 10000)).toBe(false) // 10 second threshold
      expect(isPresenceStale(presence, 3000)).toBe(true) // 3 second threshold
    })
  })

  describe('mergePresenceStates', () => {
    it('should merge multiple presence states', () => {
      const states: PresenceState[] = [
        createPresenceState({ userId: 'user-1', userName: 'Alice' }),
        createPresenceState({ userId: 'user-2', userName: 'Bob' }),
      ]

      const merged = mergePresenceStates(states)

      expect(merged.size).toBe(2)
      expect(merged.get('user-1')?.userName).toBe('Alice')
      expect(merged.get('user-2')?.userName).toBe('Bob')
    })

    it('should keep newer presence for duplicate users', () => {
      const older = createPresenceState({ userId: 'user-1', userName: 'Alice' })
      vi.advanceTimersByTime(1000)
      const newer = createPresenceState({ userId: 'user-1', userName: 'Alice Updated' })

      const merged = mergePresenceStates([older, newer])

      expect(merged.size).toBe(1)
      expect(merged.get('user-1')?.userName).toBe('Alice Updated')
    })

    it('should filter out stale presences if requested', () => {
      const fresh = createPresenceState({ userId: 'user-1', userName: 'Alice' })
      const stale = createPresenceState({ userId: 'user-2', userName: 'Bob' })

      vi.advanceTimersByTime(35000) // Make stale

      // Refresh the fresh one
      const refreshed = updatePresenceState(fresh, {})

      const merged = mergePresenceStates([refreshed, stale], { filterStale: true })

      expect(merged.size).toBe(1)
      expect(merged.has('user-1')).toBe(true)
      expect(merged.has('user-2')).toBe(false)
    })
  })

  describe('Cursor Management', () => {
    describe('createCursor', () => {
      it('should create a cursor with position', () => {
        const cursor = createCursor({
          userId: 'user-123',
          position: { x: 100, y: 200 },
        })

        expect(cursor.userId).toBe('user-123')
        expect(cursor.position).toEqual({ x: 100, y: 200 })
        expect(cursor.timestamp).toBeInstanceOf(Date)
      })

      it('should include color if provided', () => {
        const cursor = createCursor({
          userId: 'user-123',
          position: { x: 100, y: 200 },
          color: '#ff5500',
        })

        expect(cursor.color).toBe('#ff5500')
      })
    })

    describe('updateCursor', () => {
      it('should update position and timestamp', () => {
        const initial = createCursor({
          userId: 'user-123',
          position: { x: 100, y: 200 },
        })

        vi.advanceTimersByTime(100)

        const updated = updateCursor(initial, { x: 150, y: 250 })

        expect(updated.position).toEqual({ x: 150, y: 250 })
        expect(updated.timestamp.getTime()).toBeGreaterThan(initial.timestamp.getTime())
      })

      it('should calculate velocity', () => {
        const initial = createCursor({
          userId: 'user-123',
          position: { x: 0, y: 0 },
        })

        vi.advanceTimersByTime(100) // 100ms

        const updated = updateCursor(initial, { x: 100, y: 0 })

        // 100 pixels in 100ms = 1000 pixels/second
        expect(updated.velocity?.x).toBeCloseTo(1000, 0)
        expect(updated.velocity?.y).toBeCloseTo(0, 0)
      })
    })

    describe('calculateCursorInterpolation', () => {
      it('should interpolate cursor position based on velocity', () => {
        const cursor = createCursor({
          userId: 'user-123',
          position: { x: 100, y: 100 },
        })

        vi.advanceTimersByTime(50)
        const withVelocity = updateCursor(cursor, { x: 200, y: 100 })

        vi.advanceTimersByTime(25) // 25ms after last update

        const interpolated = calculateCursorInterpolation(withVelocity)

        // Should be somewhere between 200 and further based on velocity
        expect(interpolated.x).toBeGreaterThan(200)
        expect(interpolated.y).toBe(100) // No vertical velocity
      })

      it('should clamp interpolation to max distance', () => {
        const cursor: Cursor = {
          userId: 'user-123',
          position: { x: 100, y: 100 },
          velocity: { x: 10000, y: 0 }, // Very high velocity
          timestamp: new Date(Date.now() - 100),
        }

        const interpolated = calculateCursorInterpolation(cursor)

        // Should be clamped to reasonable distance (e.g., 50 pixels)
        expect(interpolated.x).toBeLessThanOrEqual(150)
      })
    })
  })

  describe('Collaboration Session', () => {
    describe('createCollaborationSession', () => {
      it('should create a session with resource info', () => {
        const session = createCollaborationSession({
          resourceType: 'listing',
          resourceId: 'listing-123',
          ownerId: 'user-owner',
        })

        expect(session.resourceType).toBe('listing')
        expect(session.resourceId).toBe('listing-123')
        expect(session.ownerId).toBe('user-owner')
        expect(session.participants).toEqual([])
        expect(session.createdAt).toBeInstanceOf(Date)
      })

      it('should generate unique session ID', () => {
        const session1 = createCollaborationSession({
          resourceType: 'listing',
          resourceId: 'listing-123',
          ownerId: 'user-owner',
        })

        const session2 = createCollaborationSession({
          resourceType: 'listing',
          resourceId: 'listing-123',
          ownerId: 'user-owner',
        })

        expect(session1.id).not.toBe(session2.id)
      })
    })

    describe('addParticipant', () => {
      it('should add a participant to the session', () => {
        const session = createCollaborationSession({
          resourceType: 'listing',
          resourceId: 'listing-123',
          ownerId: 'user-owner',
        })

        const presence = createPresenceState({
          userId: 'user-123',
          userName: 'John',
        })

        const updated = addParticipant(session, presence)

        expect(updated.participants).toHaveLength(1)
        expect(updated.participants[0].userId).toBe('user-123')
      })

      it('should not add duplicate participants', () => {
        let session = createCollaborationSession({
          resourceType: 'listing',
          resourceId: 'listing-123',
          ownerId: 'user-owner',
        })

        const presence = createPresenceState({
          userId: 'user-123',
          userName: 'John',
        })

        session = addParticipant(session, presence)
        session = addParticipant(session, presence)

        expect(session.participants).toHaveLength(1)
      })

      it('should set join time', () => {
        const session = createCollaborationSession({
          resourceType: 'listing',
          resourceId: 'listing-123',
          ownerId: 'user-owner',
        })

        const presence = createPresenceState({
          userId: 'user-123',
          userName: 'John',
        })

        const updated = addParticipant(session, presence)

        expect(updated.participants[0].joinedAt).toBeInstanceOf(Date)
      })
    })

    describe('removeParticipant', () => {
      it('should remove a participant by userId', () => {
        let session = createCollaborationSession({
          resourceType: 'listing',
          resourceId: 'listing-123',
          ownerId: 'user-owner',
        })

        session = addParticipant(
          session,
          createPresenceState({ userId: 'user-1', userName: 'Alice' })
        )
        session = addParticipant(
          session,
          createPresenceState({ userId: 'user-2', userName: 'Bob' })
        )

        const updated = removeParticipant(session, 'user-1')

        expect(updated.participants).toHaveLength(1)
        expect(updated.participants[0].userId).toBe('user-2')
      })

      it('should return unchanged session if participant not found', () => {
        const session = createCollaborationSession({
          resourceType: 'listing',
          resourceId: 'listing-123',
          ownerId: 'user-owner',
        })

        const updated = removeParticipant(session, 'non-existent')

        expect(updated).toEqual(session)
      })
    })

    describe('updateParticipant', () => {
      it('should update participant presence', () => {
        let session = createCollaborationSession({
          resourceType: 'listing',
          resourceId: 'listing-123',
          ownerId: 'user-owner',
        })

        const presence = createPresenceState({ userId: 'user-123', userName: 'John' })
        session = addParticipant(session, presence)

        const updatedPresence = updatePresenceState(presence, { status: 'away' })
        const updated = updateParticipant(session, updatedPresence)

        expect(updated.participants[0].status).toBe('away')
      })
    })

    describe('getActiveParticipants', () => {
      it('should return only non-stale participants', () => {
        let session = createCollaborationSession({
          resourceType: 'listing',
          resourceId: 'listing-123',
          ownerId: 'user-owner',
        })

        const alice = createPresenceState({ userId: 'user-1', userName: 'Alice' })
        const bob = createPresenceState({ userId: 'user-2', userName: 'Bob' })

        session = addParticipant(session, alice)
        session = addParticipant(session, bob)

        vi.advanceTimersByTime(35000) // Make all stale

        // Refresh Alice
        session = updateParticipant(session, updatePresenceState(alice, {}))

        const active = getActiveParticipants(session)

        expect(active).toHaveLength(1)
        expect(active[0].userId).toBe('user-1')
      })
    })
  })

  describe('Optimistic Updates', () => {
    describe('createOptimisticUpdate', () => {
      it('should create an optimistic update with pending status', () => {
        const update = createOptimisticUpdate({
          operation: 'update',
          path: ['photos', '0', 'caption'],
          value: 'New caption',
          previousValue: 'Old caption',
        })

        expect(update.status).toBe('pending')
        expect(update.operation).toBe('update')
        expect(update.path).toEqual(['photos', '0', 'caption'])
        expect(update.value).toBe('New caption')
        expect(update.previousValue).toBe('Old caption')
        expect(update.timestamp).toBeInstanceOf(Date)
      })

      it('should generate unique update ID', () => {
        const update1 = createOptimisticUpdate({
          operation: 'update',
          path: ['field'],
          value: 'value1',
        })

        const update2 = createOptimisticUpdate({
          operation: 'update',
          path: ['field'],
          value: 'value2',
        })

        expect(update1.id).not.toBe(update2.id)
      })
    })

    describe('applyOptimisticUpdate', () => {
      it('should apply update to object', () => {
        const data = { photos: [{ id: '1', caption: 'Old' }] }
        const update = createOptimisticUpdate({
          operation: 'update',
          path: ['photos', '0', 'caption'],
          value: 'New',
        })

        const result = applyOptimisticUpdate(data, update)

        expect(result.photos[0].caption).toBe('New')
      })

      it('should apply insert operation', () => {
        const data = { items: ['a', 'b'] }
        const update = createOptimisticUpdate({
          operation: 'insert',
          path: ['items', '2'],
          value: 'c',
        })

        const result = applyOptimisticUpdate(data, update)

        expect(result.items).toEqual(['a', 'b', 'c'])
      })

      it('should apply delete operation', () => {
        const data = { items: ['a', 'b', 'c'] }
        const update = createOptimisticUpdate({
          operation: 'delete',
          path: ['items', '1'],
          previousValue: 'b',
        })

        const result = applyOptimisticUpdate(data, update)

        expect(result.items).toEqual(['a', 'c'])
      })
    })

    describe('resolveConflict', () => {
      it('should use server value for last-write-wins strategy', () => {
        const localUpdate = createOptimisticUpdate({
          operation: 'update',
          path: ['title'],
          value: 'Local Title',
          previousValue: 'Original',
        })

        const serverValue = 'Server Title'

        const result = resolveConflict(localUpdate, serverValue, 'last-write-wins')

        expect(result.resolvedValue).toBe('Server Title')
        expect(result.strategy).toBe('last-write-wins')
      })

      it('should keep local value for local-wins strategy', () => {
        const localUpdate = createOptimisticUpdate({
          operation: 'update',
          path: ['title'],
          value: 'Local Title',
          previousValue: 'Original',
        })

        const serverValue = 'Server Title'

        const result = resolveConflict(localUpdate, serverValue, 'local-wins')

        expect(result.resolvedValue).toBe('Local Title')
        expect(result.strategy).toBe('local-wins')
      })

      it('should merge values for merge strategy on arrays', () => {
        const localUpdate = createOptimisticUpdate({
          operation: 'update',
          path: ['tags'],
          value: ['tag1', 'tag2', 'new-tag'],
          previousValue: ['tag1', 'tag2'],
        })

        const serverValue = ['tag1', 'tag2', 'server-tag']

        const result = resolveConflict(localUpdate, serverValue, 'merge')

        expect(result.resolvedValue).toContain('new-tag')
        expect(result.resolvedValue).toContain('server-tag')
        expect(result.strategy).toBe('merge')
      })
    })
  })

  describe('Utility Functions', () => {
    describe('calculateLatency', () => {
      it('should calculate round-trip latency', () => {
        const sentAt = new Date()
        vi.advanceTimersByTime(50)
        const receivedAt = new Date()

        const latency = calculateLatency(sentAt, receivedAt)

        expect(latency).toBe(50)
      })
    })

    describe('Serialization', () => {
      it('should serialize collaboration state', () => {
        const session = createCollaborationSession({
          resourceType: 'listing',
          resourceId: 'listing-123',
          ownerId: 'user-owner',
        })

        const presence = createPresenceState({ userId: 'user-123', userName: 'John' })
        const sessionWithParticipant = addParticipant(session, presence)

        const serialized = serializeCollaborationState(sessionWithParticipant)

        expect(typeof serialized).toBe('string')
        expect(JSON.parse(serialized)).toBeDefined()
      })

      it('should deserialize collaboration state', () => {
        const session = createCollaborationSession({
          resourceType: 'listing',
          resourceId: 'listing-123',
          ownerId: 'user-owner',
        })

        const presence = createPresenceState({ userId: 'user-123', userName: 'John' })
        const sessionWithParticipant = addParticipant(session, presence)

        const serialized = serializeCollaborationState(sessionWithParticipant)
        const deserialized = deserializeCollaborationState(serialized)

        expect(deserialized).not.toBeNull()
        expect(deserialized?.id).toBe(sessionWithParticipant.id)
        expect(deserialized?.participants).toHaveLength(1)
        expect(deserialized?.createdAt).toBeInstanceOf(Date)
      })

      it('should return null for invalid JSON', () => {
        const result = deserializeCollaborationState('invalid json')
        expect(result).toBeNull()
      })
    })
  })
})
