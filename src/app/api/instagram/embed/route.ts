import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getInstagramEmbed, isValidInstagramPostUrl } from '@/lib/integrations/instagram/oembed'

// POST - Fetch embed data for multiple Instagram URLs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { urls, agentId } = body as { urls: string[]; agentId?: string }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'URLs array is required' },
        { status: 400 }
      )
    }

    // Limit to 10 URLs
    const limitedUrls = urls.slice(0, 10)
    const supabase = createAdminClient()

    // Cleanup expired cache entries (fire and forget)
    supabase
      .from('instagram_embed_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .then(({ error }) => {
        if (error) console.error('Cache cleanup error:', error)
      })

    // Check cache first
    const { data: cachedEmbeds } = await supabase
      .from('instagram_embed_cache')
      .select('instagram_url, embed_html, thumbnail_url, expires_at')
      .in('instagram_url', limitedUrls)
      .gt('expires_at', new Date().toISOString())

    const cachedMap = new Map(
      cachedEmbeds?.map(e => [e.instagram_url, e]) || []
    )

    const embeds = []
    const toFetch: string[] = []
    const toCache: Array<{
      agent_id?: string
      instagram_url: string
      embed_html: string
      thumbnail_url: string | null
    }> = []

    // Process URLs
    for (const url of limitedUrls) {
      // Validate URL
      if (!isValidInstagramPostUrl(url)) {
        embeds.push({ url, error: 'Invalid Instagram URL' })
        continue
      }

      // Check cache
      const cached = cachedMap.get(url)
      if (cached) {
        embeds.push({
          url,
          html: cached.embed_html,
          thumbnailUrl: cached.thumbnail_url,
          cached: true,
        })
        continue
      }

      // Need to fetch
      toFetch.push(url)
    }

    // Fetch uncached embeds
    for (const url of toFetch) {
      try {
        const embed = await getInstagramEmbed(url)
        if (embed) {
          embeds.push({
            url,
            html: embed.html,
            thumbnailUrl: embed.thumbnailUrl,
            authorName: embed.authorName,
            cached: false,
          })

          // Add to cache
          toCache.push({
            agent_id: agentId,
            instagram_url: url,
            embed_html: embed.html,
            thumbnail_url: embed.thumbnailUrl || null,
          })
        } else {
          embeds.push({ url, error: 'Failed to fetch embed' })
        }
      } catch (error) {
        console.error(`Error fetching embed for ${url}:`, error)
        embeds.push({ url, error: 'Fetch error' })
      }
    }

    // Cache new embeds (only if agentId is provided)
    if (toCache.length > 0 && agentId) {
      await supabase
        .from('instagram_embed_cache')
        .upsert(
          toCache.map(item => ({
            agent_id: agentId,
            instagram_url: item.instagram_url,
            embed_html: item.embed_html,
            thumbnail_url: item.thumbnail_url,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          })),
          { onConflict: 'instagram_url' }
        )
    }

    return NextResponse.json({
      embeds,
      cached: embeds.filter(e => (e as { cached?: boolean }).cached).length,
      fetched: toFetch.length,
    })
  } catch (error) {
    console.error('Instagram embed error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Instagram embeds' },
      { status: 500 }
    )
  }
}
