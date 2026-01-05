// Instagram Content Publishing via Graph API
// Documentation: https://developers.facebook.com/docs/instagram-api/guides/content-publishing

import { integrationLogger, formatError } from '@/lib/logger'

const logger = integrationLogger.child({ integration: 'instagram-publish' })

// Exponential Backoff Configuration
interface BackoffConfig {
  baseDelay?: number
  maxDelay?: number
  maxRetries?: number
  jitterFactor?: number
}

// Exponential backoff wrapper for API calls
async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  config: BackoffConfig = {}
): Promise<T> {
  const {
    baseDelay = 1000,
    maxDelay = 30000,
    maxRetries = 3,
    jitterFactor = 0.1,
  } = config

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === maxRetries) break

      // Check for rate limit response from Instagram
      if (isRateLimitError(error)) {
        const retryAfter = getRetryAfterFromError(error)
        if (retryAfter) {
          logger.warn({ retryAfter, attempt }, 'Rate limited, waiting for retry-after header')
          await delay(retryAfter * 1000)
          continue
        }
      }

      const waitTime = calculateBackoff(attempt, baseDelay, maxDelay, jitterFactor)
      logger.warn({ attempt, waitTime }, 'Request failed, backing off')
      await delay(waitTime)
    }
  }

  throw lastError
}

// Calculate exponential backoff delay with jitter
function calculateBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  jitterFactor: number
): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  const jitter = exponentialDelay * jitterFactor * Math.random()
  return Math.floor(exponentialDelay + jitter)
}

// Simple delay utility
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Check if error is a rate limit error
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes('rate') ||
           message.includes('429') ||
           message.includes('too many')
  }
  return false
}

// Extract retry-after from Instagram API error
function getRetryAfterFromError(error: unknown): number | null {
  if (error instanceof Error) {
    // Instagram Graph API may include retry-after in error message
    const match = error.message.match(/retry[_\s]after[:\s]+(\d+)/i)
    if (match) {
      return parseInt(match[1], 10)
    }
  }
  return null
}

// Check if error is a specific Instagram API error code
function isInstagramErrorCode(error: unknown, code: number): boolean {
  if (error instanceof Error) {
    return error.message.includes(`"code":${code}`) ||
           error.message.includes(`code ${code}`)
  }
  return false
}

interface MediaContainer {
  id: string
}

interface PublishedMedia {
  id: string
  permalink?: string
}

interface CarouselItem {
  imageUrl: string
  isVideo?: boolean
}

// Create a single image container
export async function createImageContainer(
  instagramAccountId: string,
  accessToken: string,
  imageUrl: string,
  caption?: string,
  isCarouselItem = false
): Promise<MediaContainer> {
  const params: Record<string, string> = {
    image_url: imageUrl,
    access_token: accessToken,
  }

  if (isCarouselItem) {
    params.is_carousel_item = 'true'
  } else if (caption) {
    params.caption = caption
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    logger.error({ error }, 'Create container error')
    throw new Error(`Failed to create image container: ${error.error?.message || 'Unknown error'}`)
  }

  return response.json()
}

// Create a carousel container
export async function createCarouselContainer(
  instagramAccountId: string,
  accessToken: string,
  childrenIds: string[],
  caption?: string
): Promise<MediaContainer> {
  const params: Record<string, string> = {
    media_type: 'CAROUSEL',
    children: childrenIds.join(','),
    access_token: accessToken,
  }

  if (caption) {
    params.caption = caption
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    logger.error({ error }, 'Create carousel container error')
    throw new Error(`Failed to create carousel container: ${error.error?.message || 'Unknown error'}`)
  }

  return response.json()
}

// Publish a media container
export async function publishMedia(
  instagramAccountId: string,
  accessToken: string,
  containerId: string
): Promise<PublishedMedia> {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        creation_id: containerId,
        access_token: accessToken,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    logger.error({ error }, 'Publish media error')
    throw new Error(`Failed to publish media: ${error.error?.message || 'Unknown error'}`)
  }

  return response.json()
}

// Get media permalink
export async function getMediaPermalink(
  mediaId: string,
  accessToken: string
): Promise<string | null> {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${mediaId}?fields=permalink&access_token=${accessToken}`
  )

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  return data.permalink || null
}

// Check container status (useful for async processing)
export async function checkContainerStatus(
  containerId: string,
  accessToken: string
): Promise<{ status: string; status_code?: string }> {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${containerId}?fields=status,status_code&access_token=${accessToken}`
  )

  if (!response.ok) {
    throw new Error('Failed to check container status')
  }

  return response.json()
}

// Full carousel publishing flow with rollback on failure
export async function publishCarousel(
  instagramAccountId: string,
  accessToken: string,
  items: CarouselItem[],
  caption: string
): Promise<{ mediaId: string; permalink: string | null }> {
  // Validate
  if (items.length < 2 || items.length > 10) {
    throw new Error('Carousel must have 2-10 items')
  }

  // Track created containers for potential cleanup
  const createdContainerIds: string[] = []

  try {
    // Step 1: Create containers for each item with exponential backoff
    const childrenIds: string[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      try {
        const container = await withExponentialBackoff(
          () => createImageContainer(
            instagramAccountId,
            accessToken,
            item.imageUrl,
            undefined,
            true // isCarouselItem
          ),
          {
            baseDelay: 1000,
            maxDelay: 15000,
            maxRetries: 3,
            jitterFactor: 0.1,
          }
        )
        childrenIds.push(container.id)
        createdContainerIds.push(container.id)

        // Progressive delay between items (increases with carousel size)
        // Prevents bursting too many requests at once
        if (i < items.length - 1) {
          await delay(500 + (i * 100))
        }
      } catch (containerError) {
        // Log which item failed for debugging
        logger.error({ itemIndex: i + 1, ...formatError(containerError) }, 'Failed to create container for item')
        throw new Error(`Failed to create image container for item ${i + 1}: ${containerError instanceof Error ? containerError.message : 'Unknown error'}`)
      }
    }

    // Step 2: Create carousel container with backoff
    let carouselContainer
    try {
      carouselContainer = await withExponentialBackoff(
        () => createCarouselContainer(
          instagramAccountId,
          accessToken,
          childrenIds,
          caption
        ),
        {
          baseDelay: 2000,
          maxDelay: 20000,
          maxRetries: 3,
          jitterFactor: 0.1,
        }
      )
      createdContainerIds.push(carouselContainer.id)
    } catch (carouselError) {
      logger.error({ ...formatError(carouselError) }, 'Failed to create carousel container')
      throw new Error(`Failed to create carousel container: ${carouselError instanceof Error ? carouselError.message : 'Unknown error'}`)
    }

    // Step 3: Adaptive wait for processing based on carousel size
    // Larger carousels need more time to process
    const processingDelay = Math.min(3000 + (items.length * 500), 10000)
    logger.info({ processingDelay, itemCount: items.length }, 'Waiting for Instagram processing')
    await delay(processingDelay)

    // Step 4: Publish the carousel with backoff
    let published
    try {
      published = await withExponentialBackoff(
        () => publishMedia(
          instagramAccountId,
          accessToken,
          carouselContainer.id
        ),
        {
          baseDelay: 2000,
          maxDelay: 30000,
          maxRetries: 5, // More retries for publish step
          jitterFactor: 0.15,
        }
      )
    } catch (publishError) {
      logger.error({ ...formatError(publishError) }, 'Failed to publish carousel')

      // Check for specific Instagram error codes
      if (isInstagramErrorCode(publishError, 190)) {
        throw new Error('Access token expired. Please reconnect your Instagram account.')
      } else if (isInstagramErrorCode(publishError, 9)) {
        throw new Error('Permission denied. Please check Instagram account permissions.')
      } else if (isInstagramErrorCode(publishError, 4)) {
        throw new Error('Too many API calls. Please try again in a few minutes.')
      }

      throw new Error(`Failed to publish carousel: ${publishError instanceof Error ? publishError.message : 'Unknown error'}`)
    }

    // Step 5: Get permalink
    const permalink = await getMediaPermalink(published.id, accessToken)

    return {
      mediaId: published.id,
      permalink,
    }
  } catch (error) {
    // Log the orphaned containers for cleanup (Instagram will auto-delete after 24 hours)
    if (createdContainerIds.length > 0) {
      logger.error({ orphanedContainerIds: createdContainerIds }, 'Publishing failed with orphaned containers')
      logger.warn('Instagram auto-deletes unpublished containers after 24 hours')
    }

    // Re-throw the original error
    throw error
  }
}

// Check if an Instagram account has publishing permissions
export async function checkPublishingPermissions(
  instagramAccountId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=id&access_token=${accessToken}`
    )
    return response.ok
  } catch {
    return false
  }
}
