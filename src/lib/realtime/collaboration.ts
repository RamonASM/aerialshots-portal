/**
 * Realtime Collaboration Service
 *
 * Provides presence tracking, cursor synchronization, and optimistic updates
 * for real-time collaborative features across the platform.
 */

// Types

export interface PresenceLocation {
  page: string
  section?: string
  elementId?: string
}

export type PresenceStatus = 'online' | 'idle' | 'away' | 'offline'

export interface PresenceState {
  userId: string
  userName: string
  userAvatar?: string
  status: PresenceStatus
  lastSeen: Date
  location?: PresenceLocation
  customData?: Record<string, unknown>
}

export interface Cursor {
  userId: string
  position: { x: number; y: number }
  velocity?: { x: number; y: number }
  timestamp: Date
  color?: string
  label?: string
}

export interface SessionParticipant extends PresenceState {
  joinedAt: Date
  role?: 'owner' | 'editor' | 'viewer'
}

export interface CollaborationSession {
  id: string
  resourceType: string
  resourceId: string
  ownerId: string
  participants: SessionParticipant[]
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, unknown>
}

export type OptimisticOperation = 'insert' | 'update' | 'delete'

export interface OptimisticUpdate {
  id: string
  operation: OptimisticOperation
  path: string[]
  value?: unknown
  previousValue?: unknown
  status: 'pending' | 'confirmed' | 'rejected'
  timestamp: Date
  userId?: string
}

export type ConflictStrategy = 'last-write-wins' | 'local-wins' | 'server-wins' | 'merge'

export interface ConflictResolution {
  resolvedValue: unknown
  strategy: ConflictStrategy
  localValue: unknown
  serverValue: unknown
}

// Constants

const DEFAULT_STALE_THRESHOLD_MS = 30000 // 30 seconds
const MAX_CURSOR_INTERPOLATION_DISTANCE = 50 // pixels

// Presence State Management

export function createPresenceState(options: {
  userId: string
  userName: string
  userAvatar?: string
  status?: PresenceStatus
  location?: PresenceLocation
  customData?: Record<string, unknown>
}): PresenceState {
  return {
    userId: options.userId,
    userName: options.userName,
    userAvatar: options.userAvatar,
    status: options.status || 'online',
    lastSeen: new Date(),
    location: options.location,
    customData: options.customData,
  }
}

export function updatePresenceState(
  state: PresenceState,
  updates: Partial<Omit<PresenceState, 'userId' | 'lastSeen'>>
): PresenceState {
  return {
    ...state,
    ...updates,
    lastSeen: new Date(),
  }
}

export function isPresenceStale(
  state: PresenceState,
  thresholdMs: number = DEFAULT_STALE_THRESHOLD_MS
): boolean {
  const elapsed = Date.now() - state.lastSeen.getTime()
  return elapsed > thresholdMs
}

export function mergePresenceStates(
  states: PresenceState[],
  options?: { filterStale?: boolean; thresholdMs?: number }
): Map<string, PresenceState> {
  const merged = new Map<string, PresenceState>()
  const { filterStale = false, thresholdMs = DEFAULT_STALE_THRESHOLD_MS } = options || {}

  for (const state of states) {
    const existing = merged.get(state.userId)

    // Skip stale states if filtering
    if (filterStale && isPresenceStale(state, thresholdMs)) {
      continue
    }

    // Keep newer state for same user
    if (!existing || state.lastSeen.getTime() > existing.lastSeen.getTime()) {
      merged.set(state.userId, state)
    }
  }

  return merged
}

// Cursor Management

export function createCursor(options: {
  userId: string
  position: { x: number; y: number }
  color?: string
  label?: string
}): Cursor {
  return {
    userId: options.userId,
    position: options.position,
    timestamp: new Date(),
    color: options.color,
    label: options.label,
  }
}

export function updateCursor(
  cursor: Cursor,
  newPosition: { x: number; y: number }
): Cursor {
  const now = new Date()
  const elapsed = now.getTime() - cursor.timestamp.getTime()

  // Calculate velocity (pixels per second)
  let velocity: { x: number; y: number } | undefined
  if (elapsed > 0) {
    const dx = newPosition.x - cursor.position.x
    const dy = newPosition.y - cursor.position.y
    velocity = {
      x: (dx / elapsed) * 1000,
      y: (dy / elapsed) * 1000,
    }
  }

  return {
    ...cursor,
    position: newPosition,
    velocity,
    timestamp: now,
  }
}

export function calculateCursorInterpolation(
  cursor: Cursor
): { x: number; y: number } {
  if (!cursor.velocity) {
    return cursor.position
  }

  const elapsed = Date.now() - cursor.timestamp.getTime()
  const elapsedSeconds = elapsed / 1000

  // Calculate predicted position based on velocity
  let predictedX = cursor.position.x + cursor.velocity.x * elapsedSeconds
  let predictedY = cursor.position.y + cursor.velocity.y * elapsedSeconds

  // Clamp to max interpolation distance
  const dx = predictedX - cursor.position.x
  const dy = predictedY - cursor.position.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance > MAX_CURSOR_INTERPOLATION_DISTANCE) {
    const scale = MAX_CURSOR_INTERPOLATION_DISTANCE / distance
    predictedX = cursor.position.x + dx * scale
    predictedY = cursor.position.y + dy * scale
  }

  return { x: predictedX, y: predictedY }
}

// Collaboration Session Management

export function createCollaborationSession(options: {
  resourceType: string
  resourceId: string
  ownerId: string
  metadata?: Record<string, unknown>
}): CollaborationSession {
  const now = new Date()
  return {
    id: `collab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    ownerId: options.ownerId,
    participants: [],
    createdAt: now,
    updatedAt: now,
    metadata: options.metadata,
  }
}

export function addParticipant(
  session: CollaborationSession,
  presence: PresenceState,
  role?: 'owner' | 'editor' | 'viewer'
): CollaborationSession {
  // Check if already exists
  if (session.participants.some((p) => p.userId === presence.userId)) {
    return session
  }

  const participant: SessionParticipant = {
    ...presence,
    joinedAt: new Date(),
    role,
  }

  return {
    ...session,
    participants: [...session.participants, participant],
    updatedAt: new Date(),
  }
}

export function removeParticipant(
  session: CollaborationSession,
  userId: string
): CollaborationSession {
  if (!session.participants.some((p) => p.userId === userId)) {
    return session
  }

  return {
    ...session,
    participants: session.participants.filter((p) => p.userId !== userId),
    updatedAt: new Date(),
  }
}

export function updateParticipant(
  session: CollaborationSession,
  presence: PresenceState
): CollaborationSession {
  const index = session.participants.findIndex((p) => p.userId === presence.userId)
  if (index === -1) {
    return session
  }

  const updated = [...session.participants]
  updated[index] = {
    ...updated[index],
    ...presence,
  }

  return {
    ...session,
    participants: updated,
    updatedAt: new Date(),
  }
}

export function getActiveParticipants(
  session: CollaborationSession,
  thresholdMs: number = DEFAULT_STALE_THRESHOLD_MS
): SessionParticipant[] {
  return session.participants.filter((p) => !isPresenceStale(p, thresholdMs))
}

// Optimistic Updates

export function createOptimisticUpdate(options: {
  operation: OptimisticOperation
  path: string[]
  value?: unknown
  previousValue?: unknown
  userId?: string
}): OptimisticUpdate {
  return {
    id: `update-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    operation: options.operation,
    path: options.path,
    value: options.value,
    previousValue: options.previousValue,
    status: 'pending',
    timestamp: new Date(),
    userId: options.userId,
  }
}

export function applyOptimisticUpdate<T extends Record<string, unknown>>(
  data: T,
  update: OptimisticUpdate
): T {
  // Deep clone to avoid mutation
  const result = JSON.parse(JSON.stringify(data)) as T

  if (update.path.length === 0) {
    return result
  }

  // Navigate to parent of target
  let current: Record<string, unknown> = result
  for (let i = 0; i < update.path.length - 1; i++) {
    const key = update.path[i]
    if (current[key] === undefined) {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }

  const finalKey = update.path[update.path.length - 1]

  switch (update.operation) {
    case 'update':
      current[finalKey] = update.value
      break

    case 'insert':
      if (Array.isArray(current)) {
        const index = parseInt(finalKey, 10)
        if (index >= current.length) {
          current.push(update.value)
        } else {
          current.splice(index, 0, update.value)
        }
      } else {
        current[finalKey] = update.value
      }
      break

    case 'delete':
      if (Array.isArray(current)) {
        const index = parseInt(finalKey, 10)
        current.splice(index, 1)
      } else {
        delete current[finalKey]
      }
      break
  }

  return result
}

export function resolveConflict(
  localUpdate: OptimisticUpdate,
  serverValue: unknown,
  strategy: ConflictStrategy
): ConflictResolution {
  let resolvedValue: unknown

  switch (strategy) {
    case 'last-write-wins':
    case 'server-wins':
      resolvedValue = serverValue
      break

    case 'local-wins':
      resolvedValue = localUpdate.value
      break

    case 'merge':
      // For arrays, merge unique values
      if (Array.isArray(localUpdate.value) && Array.isArray(serverValue)) {
        const merged = new Set([...serverValue, ...localUpdate.value])
        // Filter out items that were in the previous value but removed locally
        if (Array.isArray(localUpdate.previousValue)) {
          const previousSet = new Set(localUpdate.previousValue)
          const localSet = new Set(localUpdate.value)
          const removed = localUpdate.previousValue.filter((item) => !localSet.has(item))
          removed.forEach((item) => merged.delete(item))
        }
        resolvedValue = Array.from(merged)
      } else if (
        typeof localUpdate.value === 'object' &&
        typeof serverValue === 'object' &&
        localUpdate.value !== null &&
        serverValue !== null
      ) {
        // For objects, shallow merge
        resolvedValue = { ...(serverValue as object), ...(localUpdate.value as object) }
      } else {
        // For primitives, use server value
        resolvedValue = serverValue
      }
      break

    default:
      resolvedValue = serverValue
  }

  return {
    resolvedValue,
    strategy,
    localValue: localUpdate.value,
    serverValue,
  }
}

// Utility Functions

export function calculateLatency(sentAt: Date, receivedAt: Date): number {
  return receivedAt.getTime() - sentAt.getTime()
}

export function serializeCollaborationState(session: CollaborationSession): string {
  return JSON.stringify(session, (key, value) => {
    if (value instanceof Date) {
      return value.toISOString()
    }
    return value
  })
}

export function deserializeCollaborationState(json: string): CollaborationSession | null {
  try {
    const parsed = JSON.parse(json)

    // Restore Date objects
    const session: CollaborationSession = {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
      participants: parsed.participants.map(
        (p: SessionParticipant & { lastSeen: string; joinedAt: string }) => ({
          ...p,
          lastSeen: new Date(p.lastSeen),
          joinedAt: new Date(p.joinedAt),
        })
      ),
    }

    return session
  } catch {
    return null
  }
}
