'use client'

import Image from 'next/image'
import type { Database } from '@/lib/supabase/types'

type Listing = Database['public']['Tables']['listings']['Row']
type Agent = Database['public']['Tables']['agents']['Row']

interface DeliveryHeaderProps {
  listing: Listing
  agent: Agent | null
}

export function DeliveryHeader({ listing, agent }: DeliveryHeaderProps) {
  const brandColor = agent?.brand_color ?? '#ff4533'

  return (
    <header className="border-b border-neutral-800 bg-black">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Agent Branding */}
          <div className="flex items-center gap-4">
            {agent?.logo_url ? (
              <Image
                src={agent.logo_url}
                alt={agent.name}
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
              />
            ) : agent?.headshot_url ? (
              <Image
                src={agent.headshot_url}
                alt={agent.name}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : null}
            {agent && (
              <div>
                <p className="text-sm text-neutral-400">Prepared for</p>
                <p className="font-medium text-white">{agent.name}</p>
              </div>
            )}
          </div>

          {/* Property Info */}
          <div className="text-left md:text-right">
            <h1 className="text-xl font-semibold text-white sm:text-2xl">
              {listing.address}
            </h1>
            <p className="text-neutral-400">
              {listing.city && `${listing.city}, `}
              {listing.state} {listing.zip}
            </p>
          </div>
        </div>

        {/* Property Stats */}
        <div className="mt-6 flex flex-wrap gap-4">
          {listing.beds && (
            <div className="rounded-lg bg-neutral-900 px-4 py-2">
              <span className="text-lg font-semibold text-white">{listing.beds}</span>
              <span className="ml-1 text-sm text-neutral-400">beds</span>
            </div>
          )}
          {listing.baths && (
            <div className="rounded-lg bg-neutral-900 px-4 py-2">
              <span className="text-lg font-semibold text-white">{listing.baths}</span>
              <span className="ml-1 text-sm text-neutral-400">baths</span>
            </div>
          )}
          {listing.sqft && (
            <div className="rounded-lg bg-neutral-900 px-4 py-2">
              <span className="text-lg font-semibold text-white">
                {listing.sqft.toLocaleString()}
              </span>
              <span className="ml-1 text-sm text-neutral-400">sqft</span>
            </div>
          )}
          {listing.price && (
            <div className="rounded-lg px-4 py-2" style={{ backgroundColor: brandColor + '20' }}>
              <span className="text-lg font-semibold" style={{ color: brandColor }}>
                ${listing.price.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
