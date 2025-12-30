/**
 * JSON-LD Structured Data Components for SEO
 *
 * These components generate schema.org structured data for better search engine
 * understanding and rich snippets in search results.
 */

// Base URLs
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'
const BLOG_URL = process.env.NEXT_PUBLIC_BLOG_URL || 'https://blog.aerialshots.media'

// Company information
export const COMPANY_INFO = {
  name: 'Aerial Shots Media',
  legalName: 'Aerial Shots Media LLC',
  description: 'Central Florida\'s premier real estate photography, drone, video, 3D tours, and virtual staging service. Professional media that helps sell homes faster.',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  image: `${SITE_URL}/og-home.jpg`,
  email: 'hello@aerialshots.media',
  phone: '+1-407-555-0123', // Update with actual phone
  foundingDate: '2019',
  priceRange: '$$',
  address: {
    streetAddress: 'Orlando, FL',
    addressLocality: 'Orlando',
    addressRegion: 'FL',
    postalCode: '32801',
    addressCountry: 'US',
  },
  geo: {
    latitude: 28.5383,
    longitude: -81.3792,
  },
  areaServed: [
    'Orlando', 'Winter Park', 'Windermere', 'Dr. Phillips',
    'Lake Nona', 'Celebration', 'Kissimmee', 'Davenport',
    'Tampa', 'St. Petersburg', 'Clearwater',
  ],
  sameAs: [
    'https://www.instagram.com/aerialshotsmedia',
    'https://www.facebook.com/aerialshotsmedia',
    'https://www.linkedin.com/company/aerialshotsmedia',
  ],
}

// Service definitions for schema
export const SERVICES = [
  {
    name: 'Real Estate Photography',
    description: 'Professional HDR photography for residential and commercial real estate listings. Wide-angle lenses, expert composition, and same-day editing.',
    url: `${SITE_URL}/services#photography`,
    image: `${SITE_URL}/services/photography.jpg`,
    priceRange: 'Starting at $149',
  },
  {
    name: 'Drone Aerial Photography',
    description: 'FAA Part 107 certified drone photography and videography. Stunning aerial views of properties, neighborhoods, and amenities.',
    url: `${SITE_URL}/services#drone`,
    image: `${SITE_URL}/services/drone.jpg`,
    priceRange: 'Starting at $99',
  },
  {
    name: 'Real Estate Video Tours',
    description: 'Cinematic property videos with professional editing, music, and motion graphics. Perfect for luxury listings and social media.',
    url: `${SITE_URL}/services#video`,
    image: `${SITE_URL}/services/video.jpg`,
    priceRange: 'Starting at $199',
  },
  {
    name: '3D Virtual Tours',
    description: 'Immersive Matterport and Zillow 3D Home tours. Allow buyers to explore properties from anywhere, anytime.',
    url: `${SITE_URL}/services#3d-tours`,
    image: `${SITE_URL}/services/3d-tours.jpg`,
    priceRange: 'Starting at $149',
  },
  {
    name: 'Virtual Staging',
    description: 'AI-powered virtual staging to transform empty rooms into beautifully furnished spaces. Multiple styles available.',
    url: `${SITE_URL}/services#staging`,
    image: `${SITE_URL}/services/staging.jpg`,
    priceRange: 'Starting at $25/room',
  },
  {
    name: 'Floor Plans',
    description: 'Accurate 2D and 3D floor plans created from on-site measurements. Perfect for MLS listings and marketing materials.',
    url: `${SITE_URL}/services#floor-plans`,
    image: `${SITE_URL}/services/floor-plans.jpg`,
    priceRange: 'Starting at $75',
  },
]

/**
 * Organization Schema - Company information
 */
export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: COMPANY_INFO.name,
    legalName: COMPANY_INFO.legalName,
    url: COMPANY_INFO.url,
    logo: {
      '@type': 'ImageObject',
      url: COMPANY_INFO.logo,
    },
    image: COMPANY_INFO.image,
    description: COMPANY_INFO.description,
    email: COMPANY_INFO.email,
    telephone: COMPANY_INFO.phone,
    foundingDate: COMPANY_INFO.foundingDate,
    sameAs: COMPANY_INFO.sameAs,
    address: {
      '@type': 'PostalAddress',
      ...COMPANY_INFO.address,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * LocalBusiness Schema - For local SEO
 */
export function LocalBusinessJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#localbusiness`,
    name: COMPANY_INFO.name,
    description: COMPANY_INFO.description,
    url: COMPANY_INFO.url,
    logo: COMPANY_INFO.logo,
    image: COMPANY_INFO.image,
    telephone: COMPANY_INFO.phone,
    email: COMPANY_INFO.email,
    priceRange: COMPANY_INFO.priceRange,
    address: {
      '@type': 'PostalAddress',
      ...COMPANY_INFO.address,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: COMPANY_INFO.geo.latitude,
      longitude: COMPANY_INFO.geo.longitude,
    },
    areaServed: COMPANY_INFO.areaServed.map(city => ({
      '@type': 'City',
      name: city,
    })),
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday'],
        opens: '09:00',
        closes: '16:00',
      },
    ],
    sameAs: COMPANY_INFO.sameAs,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Real Estate Media Services',
      itemListElement: SERVICES.map(service => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: service.name,
          description: service.description,
        },
      })),
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * WebSite Schema - For sitelinks search box
 */
export function WebSiteJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: COMPANY_INFO.name,
    url: SITE_URL,
    description: COMPANY_INFO.description,
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * Service Schema - For individual services
 */
export function ServiceJsonLd({
  service,
}: {
  service: {
    name: string
    description: string
    url?: string
    image?: string
    priceRange?: string
  }
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description,
    url: service.url || SITE_URL,
    image: service.image,
    provider: {
      '@id': `${SITE_URL}/#organization`,
    },
    areaServed: {
      '@type': 'State',
      name: 'Florida',
    },
    ...(service.priceRange && {
      offers: {
        '@type': 'Offer',
        price: service.priceRange,
        priceCurrency: 'USD',
      },
    }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * FAQPage Schema - For FAQ sections
 */
export function FAQPageJsonLd({
  questions,
}: {
  questions: Array<{ question: string; answer: string }>
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * BreadcrumbList Schema - For breadcrumb navigation
 */
export function BreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; url: string }>
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * Product Schema - For packages/pricing
 */
export function ProductJsonLd({
  product,
}: {
  product: {
    name: string
    description: string
    image?: string
    price: number
    priceCurrency?: string
    url?: string
  }
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    url: product.url || SITE_URL,
    brand: {
      '@type': 'Brand',
      name: COMPANY_INFO.name,
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.priceCurrency || 'USD',
      availability: 'https://schema.org/InStock',
      seller: {
        '@id': `${SITE_URL}/#organization`,
      },
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * ImageGallery Schema - For portfolio pages
 */
export function ImageGalleryJsonLd({
  images,
  name,
  description,
}: {
  images: Array<{ url: string; caption?: string }>
  name: string
  description?: string
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name,
    description,
    image: images.map(img => ({
      '@type': 'ImageObject',
      contentUrl: img.url,
      caption: img.caption,
    })),
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * HowTo Schema - For process/checklist pages
 */
export function HowToJsonLd({
  name,
  description,
  steps,
  totalTime,
}: {
  name: string
  description: string
  steps: Array<{ name: string; text: string; image?: string }>
  totalTime?: string // ISO 8601 duration, e.g., "PT30M" for 30 minutes
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    ...(totalTime && { totalTime }),
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && {
        image: {
          '@type': 'ImageObject',
          url: step.image,
        },
      }),
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * Review/AggregateRating Schema - For testimonials
 */
export function AggregateRatingJsonLd({
  ratingValue,
  reviewCount,
  bestRating = 5,
  worstRating = 1,
}: {
  ratingValue: number
  reviewCount: number
  bestRating?: number
  worstRating?: number
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#localbusiness`,
    name: COMPANY_INFO.name,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue,
      reviewCount,
      bestRating,
      worstRating,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * Combined schema for homepage
 */
export function HomePageJsonLd() {
  return (
    <>
      <OrganizationJsonLd />
      <LocalBusinessJsonLd />
      <WebSiteJsonLd />
    </>
  )
}
