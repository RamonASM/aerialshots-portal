/**
 * Photographer Shoot Mode Service
 *
 * Manages the photo capture workflow during a real estate photography session.
 * Provides shot checklists, progress tracking, and upload management.
 */

export interface ShotCategory {
  id: string
  name: string
  icon: string
  required: boolean
  minShots: number
  maxShots: number
  tips: string[]
}

export interface Shot {
  id: string
  categoryId: string
  localUri?: string // Local file URI before upload
  uploadedUrl?: string // Remote URL after upload
  timestamp: Date
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
  uploadProgress?: number // 0-100
  error?: string
  metadata?: ShotMetadata
}

export interface ShotMetadata {
  width?: number
  height?: number
  fileSize?: number
  mimeType?: string
  exifData?: Record<string, unknown>
}

export interface ShootSession {
  id: string
  listingId: string
  assignmentId: string
  photographerId: string
  startedAt: Date
  completedAt?: Date
  status: 'in_progress' | 'paused' | 'completed' | 'cancelled'
  shots: Shot[]
  categories: ShotCategoryProgress[]
  notes: string
  totalPhotosRequired: number
}

export interface ShotCategoryProgress {
  categoryId: string
  shotCount: number
  isComplete: boolean
}

// Standard shot categories for real estate photography
export const STANDARD_SHOT_CATEGORIES: ShotCategory[] = [
  {
    id: 'exterior-front',
    name: 'Front Exterior',
    icon: 'home',
    required: true,
    minShots: 2,
    maxShots: 5,
    tips: [
      'Capture from street level at slight angle',
      'Include full facade and landscaping',
      'Shoot in optimal lighting (golden hour ideal)',
      'Avoid cars in driveway if possible',
    ],
  },
  {
    id: 'exterior-back',
    name: 'Back Exterior',
    icon: 'trees',
    required: true,
    minShots: 1,
    maxShots: 4,
    tips: [
      'Include full backyard if applicable',
      'Capture outdoor living spaces',
      'Show pool/patio areas',
    ],
  },
  {
    id: 'living-room',
    name: 'Living Room',
    icon: 'sofa',
    required: true,
    minShots: 2,
    maxShots: 6,
    tips: [
      'Shoot from corner for depth',
      'Include main focal points',
      'Capture natural light from windows',
      'Get multiple angles',
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: 'utensils',
    required: true,
    minShots: 3,
    maxShots: 8,
    tips: [
      'Wide shot showing full layout',
      'Detail shots of countertops and appliances',
      'Include breakfast area if present',
      'Capture island from multiple angles',
    ],
  },
  {
    id: 'master-bedroom',
    name: 'Master Bedroom',
    icon: 'bed',
    required: true,
    minShots: 2,
    maxShots: 5,
    tips: [
      'Shoot from doorway first',
      'Include en-suite entrance if visible',
      'Capture closet if walk-in',
    ],
  },
  {
    id: 'bedrooms-other',
    name: 'Other Bedrooms',
    icon: 'door-open',
    required: true,
    minShots: 1,
    maxShots: 10,
    tips: [
      'One wide shot per bedroom minimum',
      'Highlight unique features',
    ],
  },
  {
    id: 'bathrooms',
    name: 'Bathrooms',
    icon: 'bath',
    required: true,
    minShots: 2,
    maxShots: 10,
    tips: [
      'Wide shot from doorway',
      'Detail shot of vanity',
      'Master bath gets more shots',
      'Close toilet lid',
    ],
  },
  {
    id: 'dining',
    name: 'Dining Room',
    icon: 'wine-glass',
    required: false,
    minShots: 1,
    maxShots: 4,
    tips: [
      'Include table setting if staged',
      'Show connection to kitchen',
    ],
  },
  {
    id: 'garage',
    name: 'Garage',
    icon: 'warehouse',
    required: false,
    minShots: 1,
    maxShots: 2,
    tips: [
      'Empty garage preferred',
      'Show full depth and width',
    ],
  },
  {
    id: 'pool',
    name: 'Pool & Spa',
    icon: 'waves',
    required: false,
    minShots: 2,
    maxShots: 6,
    tips: [
      'Capture full pool area',
      'Include surrounding landscaping',
      'Get water at still moment',
    ],
  },
  {
    id: 'details',
    name: 'Detail Shots',
    icon: 'sparkles',
    required: false,
    minShots: 0,
    maxShots: 10,
    tips: [
      'Unique architectural features',
      'High-end finishes',
      'Custom millwork',
      'Fireplace details',
    ],
  },
]

/**
 * Create a new shoot session
 */
export function createShootSession(
  listingId: string,
  assignmentId: string,
  photographerId: string,
  sqft?: number
): ShootSession {
  const totalRequired = calculateRequiredPhotos(sqft)

  return {
    id: `shoot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    listingId,
    assignmentId,
    photographerId,
    startedAt: new Date(),
    status: 'in_progress',
    shots: [],
    categories: STANDARD_SHOT_CATEGORIES.map((cat) => ({
      categoryId: cat.id,
      shotCount: 0,
      isComplete: false,
    })),
    notes: '',
    totalPhotosRequired: totalRequired,
  }
}

/**
 * Calculate total required photos based on square footage
 */
export function calculateRequiredPhotos(sqft?: number): number {
  if (!sqft) return 25 // Default

  if (sqft < 1500) return 20
  if (sqft <= 2500) return 25
  if (sqft <= 3500) return 35
  if (sqft <= 5000) return 45
  return 60 // 5000+ sqft
}

/**
 * Add a shot to the session
 */
export function addShot(
  session: ShootSession,
  categoryId: string,
  localUri: string,
  metadata?: ShotMetadata
): ShootSession {
  const shot: Shot = {
    id: `shot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    categoryId,
    localUri,
    timestamp: new Date(),
    status: 'pending',
    metadata,
  }

  const updatedShots = [...session.shots, shot]
  const updatedCategories = updateCategoryProgress(session.categories, categoryId, 1)

  return {
    ...session,
    shots: updatedShots,
    categories: updatedCategories,
  }
}

/**
 * Update category progress
 */
function updateCategoryProgress(
  categories: ShotCategoryProgress[],
  categoryId: string,
  delta: number
): ShotCategoryProgress[] {
  return categories.map((cat) => {
    if (cat.categoryId !== categoryId) return cat

    const categoryDef = STANDARD_SHOT_CATEGORIES.find((c) => c.id === categoryId)
    const newCount = Math.max(0, cat.shotCount + delta)
    const isComplete = categoryDef ? newCount >= categoryDef.minShots : false

    return {
      ...cat,
      shotCount: newCount,
      isComplete,
    }
  })
}

/**
 * Remove a shot from the session
 */
export function removeShot(session: ShootSession, shotId: string): ShootSession {
  const shot = session.shots.find((s) => s.id === shotId)
  if (!shot) return session

  const updatedShots = session.shots.filter((s) => s.id !== shotId)
  const updatedCategories = updateCategoryProgress(session.categories, shot.categoryId, -1)

  return {
    ...session,
    shots: updatedShots,
    categories: updatedCategories,
  }
}

/**
 * Update shot status (for upload tracking)
 */
export function updateShotStatus(
  session: ShootSession,
  shotId: string,
  status: Shot['status'],
  updates?: Partial<Shot>
): ShootSession {
  const updatedShots = session.shots.map((shot) => {
    if (shot.id !== shotId) return shot
    return {
      ...shot,
      status,
      ...updates,
    }
  })

  return {
    ...session,
    shots: updatedShots,
  }
}

/**
 * Calculate session progress
 */
export function calculateProgress(session: ShootSession): {
  totalShots: number
  uploadedShots: number
  failedShots: number
  pendingShots: number
  uploadProgress: number
  requiredCategoriesComplete: number
  totalRequiredCategories: number
  isMinimumMet: boolean
  percentComplete: number
} {
  const totalShots = session.shots.length
  const uploadedShots = session.shots.filter((s) => s.status === 'uploaded').length
  const failedShots = session.shots.filter((s) => s.status === 'failed').length
  const pendingShots = session.shots.filter(
    (s) => s.status === 'pending' || s.status === 'uploading'
  ).length

  // Calculate upload progress (average of all uploading shots)
  const uploadingShots = session.shots.filter((s) => s.status === 'uploading')
  const uploadProgress =
    uploadingShots.length > 0
      ? uploadingShots.reduce((sum, s) => sum + (s.uploadProgress || 0), 0) /
        uploadingShots.length
      : 0

  // Count completed required categories
  const requiredCategories = STANDARD_SHOT_CATEGORIES.filter((c) => c.required)
  const requiredCategoriesComplete = session.categories.filter((cat) => {
    const isDef = requiredCategories.find((c) => c.id === cat.categoryId)
    return isDef && cat.isComplete
  }).length

  const totalRequiredCategories = requiredCategories.length
  const isMinimumMet =
    requiredCategoriesComplete === totalRequiredCategories &&
    totalShots >= session.totalPhotosRequired

  const percentComplete = Math.min(
    100,
    Math.round(
      ((requiredCategoriesComplete / totalRequiredCategories) * 50 +
        (totalShots / session.totalPhotosRequired) * 50)
    )
  )

  return {
    totalShots,
    uploadedShots,
    failedShots,
    pendingShots,
    uploadProgress,
    requiredCategoriesComplete,
    totalRequiredCategories,
    isMinimumMet,
    percentComplete,
  }
}

/**
 * Get next recommended category to shoot
 */
export function getNextRecommendedCategory(session: ShootSession): ShotCategory | null {
  // Find first incomplete required category
  for (const category of STANDARD_SHOT_CATEGORIES) {
    if (!category.required) continue

    const progress = session.categories.find((c) => c.categoryId === category.id)
    if (!progress || !progress.isComplete) {
      return category
    }
  }

  // All required complete, suggest optional categories with 0 shots
  for (const category of STANDARD_SHOT_CATEGORIES) {
    if (category.required) continue

    const progress = session.categories.find((c) => c.categoryId === category.id)
    if (!progress || progress.shotCount === 0) {
      return category
    }
  }

  return null
}

/**
 * Complete the shoot session
 */
export function completeSession(session: ShootSession): ShootSession {
  return {
    ...session,
    status: 'completed',
    completedAt: new Date(),
  }
}

/**
 * Pause the shoot session
 */
export function pauseSession(session: ShootSession): ShootSession {
  return {
    ...session,
    status: 'paused',
  }
}

/**
 * Resume a paused session
 */
export function resumeSession(session: ShootSession): ShootSession {
  if (session.status !== 'paused') return session

  return {
    ...session,
    status: 'in_progress',
  }
}

/**
 * Serialize session for storage
 */
export function serializeSession(session: ShootSession): string {
  return JSON.stringify(session, (key, value) => {
    if (value instanceof Date) {
      return value.toISOString()
    }
    return value
  })
}

/**
 * Deserialize session from storage
 */
export function deserializeSession(json: string): ShootSession | null {
  try {
    const parsed = JSON.parse(json)

    return {
      ...parsed,
      startedAt: new Date(parsed.startedAt),
      completedAt: parsed.completedAt ? new Date(parsed.completedAt) : undefined,
      shots: parsed.shots.map((shot: Shot & { timestamp: string }) => ({
        ...shot,
        timestamp: new Date(shot.timestamp),
      })),
    }
  } catch {
    return null
  }
}

/**
 * Validate session is ready for completion
 */
export function validateSessionForCompletion(session: ShootSession): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  const progress = calculateProgress(session)

  // Check required categories
  if (progress.requiredCategoriesComplete < progress.totalRequiredCategories) {
    const missing = STANDARD_SHOT_CATEGORIES.filter((cat) => {
      if (!cat.required) return false
      const catProgress = session.categories.find((c) => c.categoryId === cat.id)
      return !catProgress || !catProgress.isComplete
    }).map((c) => c.name)

    errors.push(`Missing required categories: ${missing.join(', ')}`)
  }

  // Check minimum photo count
  if (progress.totalShots < session.totalPhotosRequired) {
    warnings.push(
      `Only ${progress.totalShots} photos captured. Recommended: ${session.totalPhotosRequired}`
    )
  }

  // Check for failed uploads
  if (progress.failedShots > 0) {
    errors.push(`${progress.failedShots} photos failed to upload`)
  }

  // Check for pending uploads
  if (progress.pendingShots > 0) {
    errors.push(`${progress.pendingShots} photos still uploading`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
