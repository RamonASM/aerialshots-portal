import { cookies } from 'next/headers'
import { currentUser, clerkClient } from '@clerk/nextjs/server'

// Cache duration: 5 minutes (in seconds)
const CACHE_DURATION = 5 * 60

/**
 * Cached user info structure stored in cookie
 */
interface CachedUserInfo {
  userId: string
  email: string
  role?: string
  name?: string
  cachedAt: number // Unix timestamp
}

const CACHE_COOKIE_NAME = '__clerk_user_cache'

/**
 * Check if cached data is still valid
 */
function isCacheValid(cachedAt: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  return now - cachedAt < CACHE_DURATION
}

/**
 * Get cached user info from cookie
 */
async function getCachedUserInfo(): Promise<CachedUserInfo | null> {
  try {
    const cookieStore = await cookies()
    const cached = cookieStore.get(CACHE_COOKIE_NAME)

    if (!cached?.value) return null

    const parsed = JSON.parse(cached.value) as CachedUserInfo

    if (!isCacheValid(parsed.cachedAt)) {
      return null // Cache expired
    }

    return parsed
  } catch {
    return null
  }
}

/**
 * Set cached user info in cookie
 * Note: This can only be called in a Server Action or Route Handler
 */
export function createUserCacheCookie(info: Omit<CachedUserInfo, 'cachedAt'>): string {
  const cached: CachedUserInfo = {
    ...info,
    cachedAt: Math.floor(Date.now() / 1000),
  }
  return JSON.stringify(cached)
}

/**
 * Get current user with caching to reduce Clerk API calls
 *
 * Strategy:
 * 1. Check cookie cache first
 * 2. If cache miss or expired, call Clerk API
 * 3. On rate limit, use cached data even if expired (stale-while-revalidate)
 * 4. If no cache and rate limited, return null with error flag
 */
export async function getCurrentUserCached(): Promise<{
  userId: string | null
  email: string | null
  role: string | null
  name: string | null
  isFromCache: boolean
  isRateLimited: boolean
  error?: string
}> {
  // First, check if we have valid cached data
  const cached = await getCachedUserInfo()

  if (cached && isCacheValid(cached.cachedAt)) {
    return {
      userId: cached.userId,
      email: cached.email,
      role: cached.role || null,
      name: cached.name || null,
      isFromCache: true,
      isRateLimited: false,
    }
  }

  // Cache miss or expired - try to fetch from Clerk
  try {
    const user = await currentUser()

    if (!user) {
      return {
        userId: null,
        email: null,
        role: null,
        name: null,
        isFromCache: false,
        isRateLimited: false,
      }
    }

    const email = user.emailAddresses?.[0]?.emailAddress || null
    const role = (user.publicMetadata?.role as string) || null
    const name = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || null

    return {
      userId: user.id,
      email,
      role,
      name,
      isFromCache: false,
      isRateLimited: false,
    }
  } catch (error) {
    const errorObj = error as { status?: number; message?: string; toString?: () => string }
    const errorString = errorObj.toString?.() || errorObj.message || ''
    const isRateLimited =
      errorObj.status === 429 ||
      errorString.includes('Too Many Requests') ||
      errorString.toLowerCase().includes('rate')

    if (isRateLimited) {
      console.warn('[Clerk Cache] Rate limited - checking for stale cache')

      // On rate limit, use stale cache if available (stale-while-revalidate pattern)
      if (cached) {
        console.log('[Clerk Cache] Using stale cache due to rate limit')
        return {
          userId: cached.userId,
          email: cached.email,
          role: cached.role || null,
          name: cached.name || null,
          isFromCache: true,
          isRateLimited: true,
        }
      }

      // No cache available - return rate limited state
      return {
        userId: null,
        email: null,
        role: null,
        name: null,
        isFromCache: false,
        isRateLimited: true,
        error: 'Rate limited with no cached data',
      }
    }

    // Other error
    console.error('[Clerk Cache] Error fetching user:', error)
    return {
      userId: null,
      email: null,
      role: null,
      name: null,
      isFromCache: false,
      isRateLimited: false,
      error: errorString,
    }
  }
}

/**
 * Get user by ID with rate limit handling
 * Used when we have userId from session but need full user data
 */
export async function getUserByIdCached(userId: string): Promise<{
  email: string | null
  role: string | null
  name: string | null
  isRateLimited: boolean
  error?: string
}> {
  // Check cache first
  const cached = await getCachedUserInfo()

  if (cached && cached.userId === userId && isCacheValid(cached.cachedAt)) {
    return {
      email: cached.email,
      role: cached.role || null,
      name: cached.name || null,
      isRateLimited: false,
    }
  }

  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)

    return {
      email: user.emailAddresses?.[0]?.emailAddress || null,
      role: (user.publicMetadata?.role as string) || null,
      name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
      isRateLimited: false,
    }
  } catch (error) {
    const errorObj = error as { status?: number; message?: string }
    const isRateLimited =
      errorObj.status === 429 ||
      errorObj.message?.includes('Too many requests')

    if (isRateLimited && cached && cached.userId === userId) {
      // Use stale cache on rate limit
      return {
        email: cached.email,
        role: cached.role || null,
        name: cached.name || null,
        isRateLimited: true,
      }
    }

    return {
      email: null,
      role: null,
      name: null,
      isRateLimited: isRateLimited ?? false,
      error: errorObj.message,
    }
  }
}
