import type { Tables } from '@/lib/supabase/types'

interface CommunityJsonLdProps {
  community: Tables<'communities'>
}

export function CommunityJsonLd({ community }: CommunityJsonLdProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: community.name,
    description: community.description || community.tagline,
    url: `https://app.aerialshots.media/community/${community.slug}`,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: community.lat,
      longitude: community.lng,
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: community.city || community.name,
      addressRegion: community.state,
      postalCode: community.zip,
      addressCountry: 'US',
    },
    image: community.hero_image_url,
  }

  // Add real estate listing structured data if we have market info
  const realEstateData = community.market_snapshot
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `Homes for Sale in ${community.name}`,
        description: `Find homes for sale in ${community.name}, ${community.state}`,
        itemListElement: [],
      }
    : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {realEstateData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(realEstateData) }}
        />
      )}
    </>
  )
}
