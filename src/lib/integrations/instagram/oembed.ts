// Instagram oEmbed integration for embedding public posts
// Documentation: https://developers.facebook.com/docs/instagram/oembed

interface OEmbedResponse {
  version: string
  title: string
  author_name: string
  author_url: string
  author_id: number
  media_id: string
  provider_name: string
  provider_url: string
  type: 'rich'
  width: number | null
  height: number | null
  html: string
  thumbnail_url: string
  thumbnail_width: number
  thumbnail_height: number
}

interface EmbedData {
  html: string
  thumbnailUrl: string
  authorName: string
  authorUrl: string
  mediaId: string
}

// Fetch oEmbed data for an Instagram post
export async function getInstagramEmbed(postUrl: string): Promise<EmbedData | null> {
  // Instagram oEmbed requires an access token
  const accessToken = process.env.META_APP_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN

  if (!accessToken) {
    console.warn('No Instagram/Meta access token configured for oEmbed')
    // Fall back to basic embed without oEmbed API
    return getBasicEmbed(postUrl)
  }

  try {
    const encodedUrl = encodeURIComponent(postUrl)
    const response = await fetch(
      `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodedUrl}&access_token=${accessToken}&omitscript=true`
    )

    if (!response.ok) {
      console.error('Instagram oEmbed error:', response.status)
      return getBasicEmbed(postUrl)
    }

    const data: OEmbedResponse = await response.json()

    return {
      html: data.html,
      thumbnailUrl: data.thumbnail_url,
      authorName: data.author_name,
      authorUrl: data.author_url,
      mediaId: data.media_id,
    }
  } catch (error) {
    console.error('Error fetching Instagram oEmbed:', error)
    return getBasicEmbed(postUrl)
  }
}

// Basic embed using Instagram's embed.js (doesn't require API access)
function getBasicEmbed(postUrl: string): EmbedData {
  // Extract the shortcode from the URL
  const shortcode = extractShortcode(postUrl)

  // Generate basic embed HTML that Instagram's embed.js will process
  const html = `
    <blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${postUrl}" data-instgrm-version="14" style="background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);">
      <div style="padding:16px;">
        <a href="${postUrl}" style="background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank">
          View this post on Instagram
        </a>
      </div>
    </blockquote>
  `.trim()

  return {
    html,
    thumbnailUrl: '',
    authorName: '',
    authorUrl: '',
    mediaId: shortcode,
  }
}

// Extract Instagram post shortcode from URL
function extractShortcode(url: string): string {
  const patterns = [
    /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return ''
}

// Extract Instagram username from profile URL
export function extractInstagramUsername(url: string): string | null {
  const match = url.match(/instagram\.com\/([A-Za-z0-9_.]+)/)
  return match ? match[1] : null
}

// Validate if a URL is a valid Instagram post/reel URL
export function isValidInstagramPostUrl(url: string): boolean {
  return /instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/.test(url)
}

// Get multiple embeds in parallel
export async function getMultipleEmbeds(postUrls: string[]): Promise<(EmbedData | null)[]> {
  return Promise.all(postUrls.map(url => getInstagramEmbed(url)))
}
