import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SellerPortalContent } from './SellerPortalContent'

interface PageProps {
  params: Promise<{ token: string }>
}

// Fetch portal data server-side
async function getPortalData(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const response = await fetch(`${baseUrl}/api/seller/${token}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      if (response.status === 404 || response.status === 410) {
        return null
      }
      throw new Error('Failed to fetch portal data')
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching seller portal data:', error)
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const data = await getPortalData(token)

  if (!data) {
    return {
      title: 'Seller Portal - Aerial Shots Media',
    }
  }

  return {
    title: `${data.listing.address} | Seller Portal`,
    description: `Track your real estate photoshoot at ${data.listing.address}, ${data.listing.city}`,
    robots: 'noindex',
  }
}

export default async function SellerPortalPage({ params }: PageProps) {
  const { token } = await params
  const data = await getPortalData(token)

  if (!data || !data.success) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-black">
      <SellerPortalContent
        token={token}
        initialData={data}
      />
    </div>
  )
}
