import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Admin and staff areas
          '/admin/',
          '/team/',

          // Authentication
          '/login',
          '/auth/',

          // Private dashboards
          '/dashboard/',
          '/client/',
          '/seller/',

          // Internal delivery pages (allow property/ but not delivery/)
          '/delivery/',

          // API routes
          '/api/',

          // Developer private pages
          '/developers/keys',
          '/developers/login',

          // Booking success (no need to index)
          '/book/success',
        ],
      },
      {
        // Block AI training bots
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        disallow: '/',
      },
      {
        userAgent: 'Claude-Web',
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
