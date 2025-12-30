import type { Metadata } from 'next'
import { MarketingNav } from '@/components/marketing/nav/MarketingNav'
import { MarketingFooter } from '@/components/marketing/footer/MarketingFooter'

export const metadata: Metadata = {
  title: {
    default: 'Aerial Shots Media | Central Florida Real Estate Photography',
    template: '%s | Aerial Shots Media',
  },
  description:
    'Premier real estate photography, drone, video, 3D tours, and virtual staging for Central Florida agents. Professional media that sells homes faster.',
  keywords: [
    'real estate photography',
    'drone photography',
    'aerial photography',
    'real estate video',
    'Matterport',
    'Zillow 3D tour',
    'virtual staging',
    'floor plans',
    'Orlando real estate photography',
    'Central Florida real estate media',
  ],
  authors: [{ name: 'Aerial Shots Media' }],
  creator: 'Aerial Shots Media',
  metadataBase: new URL('https://aerialshots.media'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://aerialshots.media',
    siteName: 'Aerial Shots Media',
    title: 'Aerial Shots Media | Central Florida Real Estate Photography',
    description:
      'Premier real estate photography, drone, video, 3D tours, and virtual staging for Central Florida agents.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Aerial Shots Media - Real Estate Photography',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aerial Shots Media | Real Estate Photography',
    description:
      'Premier real estate photography, drone, video, and virtual staging for Central Florida agents.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-black">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  )
}
