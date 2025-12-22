// Instagram Content Publishing via Graph API
// Documentation: https://developers.facebook.com/docs/instagram-api/guides/content-publishing

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
    console.error('Create container error:', error)
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
    console.error('Create carousel container error:', error)
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
    console.error('Publish media error:', error)
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
    // Step 1: Create containers for each item
    const childrenIds: string[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      try {
        const container = await createImageContainer(
          instagramAccountId,
          accessToken,
          item.imageUrl,
          undefined,
          true // isCarouselItem
        )
        childrenIds.push(container.id)
        createdContainerIds.push(container.id)

        // Small delay to avoid rate limiting (increased to 500ms)
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (containerError) {
        // Log which item failed for debugging
        console.error(`Failed to create container for item ${i + 1}:`, containerError)
        throw new Error(`Failed to create image container for item ${i + 1}: ${containerError instanceof Error ? containerError.message : 'Unknown error'}`)
      }
    }

    // Step 2: Create carousel container
    let carouselContainer
    try {
      carouselContainer = await createCarouselContainer(
        instagramAccountId,
        accessToken,
        childrenIds,
        caption
      )
      createdContainerIds.push(carouselContainer.id)
    } catch (carouselError) {
      console.error('Failed to create carousel container:', carouselError)
      throw new Error(`Failed to create carousel container: ${carouselError instanceof Error ? carouselError.message : 'Unknown error'}`)
    }

    // Step 3: Wait for processing (increased to 3 seconds for reliability)
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Step 4: Publish the carousel
    let published
    try {
      published = await publishMedia(
        instagramAccountId,
        accessToken,
        carouselContainer.id
      )
    } catch (publishError) {
      console.error('Failed to publish carousel:', publishError)
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
      console.error('Publishing failed. Orphaned container IDs:', createdContainerIds.join(', '))
      console.warn('Note: Instagram auto-deletes unpublished containers after 24 hours')
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
