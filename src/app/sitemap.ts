import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  // Static marketing pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/portfolio`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/checklist`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/book/listing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    // Developer API pages
    {
      url: `${SITE_URL}/developers`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/developers/docs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/developers/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // Fetch published communities for dynamic pages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: communities } = await (supabase as any)
    .from('communities')
    .select('slug, updated_at')
    .eq('is_published', true)
    .order('updated_at', { ascending: false }) as { data: Array<{ slug: string; updated_at: string | null }> | null }

  const communityPages: MetadataRoute.Sitemap = (communities || []).map((community) => ({
    url: `${SITE_URL}/community/${community.slug}`,
    lastModified: community.updated_at ? new Date(community.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Fetch published property listings for dynamic pages
  // Only include listings with status that should be public
  const { data: listings } = await supabase
    .from('listings')
    .select('id, updated_at, status')
    .in('status', ['delivered', 'published', 'active'])
    .order('updated_at', { ascending: false })
    .limit(500) // Limit to avoid huge sitemaps

  const propertyPages: MetadataRoute.Sitemap = (listings || []).map((listing) => ({
    url: `${SITE_URL}/property/${listing.id}`,
    lastModified: listing.updated_at ? new Date(listing.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...communityPages, ...propertyPages]
}
