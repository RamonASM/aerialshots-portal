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
  const brandColor = agent?.brand_color ?? '#0077ff'

  return (
    <header className="border-b border-white/[0.08] bg-black">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
              <div className="relative">
                <Image
                  src={agent.headshot_url}
                  alt={agent.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-white/10"
                />
              </div>
            ) : null}
            {agent && (
              <div>
                <p className="text-[13px] text-[#636366]">Prepared for</p>
                <p className="text-[15px] font-medium text-white">{agent.name}</p>
              </div>
            )}
          </div>

          {/* Property Info */}
          <div className="text-left md:text-right">
            <h1 className="text-[22px] font-semibold tracking-tight text-white sm:text-[28px]">
              {listing.address}
            </h1>
            <p className="text-[15px] text-[#a1a1a6]">
              {listing.city && `${listing.city}, `}
              {listing.state} {listing.zip}
            </p>
          </div>
        </div>

        {/* Property Stats */}
        <div className="mt-6 flex flex-wrap gap-3">
          {listing.beds && (
            <div className="rounded-xl bg-[#1c1c1e] px-4 py-2.5 border border-white/[0.08]">
              <span className="text-[17px] font-semibold text-white">{listing.beds}</span>
              <span className="ml-1.5 text-[13px] text-[#636366]">beds</span>
            </div>
          )}
          {listing.baths && (
            <div className="rounded-xl bg-[#1c1c1e] px-4 py-2.5 border border-white/[0.08]">
              <span className="text-[17px] font-semibold text-white">{listing.baths}</span>
              <span className="ml-1.5 text-[13px] text-[#636366]">baths</span>
            </div>
          )}
          {listing.sqft && (
            <div className="rounded-xl bg-[#1c1c1e] px-4 py-2.5 border border-white/[0.08]">
              <span className="text-[17px] font-semibold text-white">
                {listing.sqft.toLocaleString()}
              </span>
              <span className="ml-1.5 text-[13px] text-[#636366]">sqft</span>
            </div>
          )}
          {listing.price && (
            <div
              className="rounded-xl px-4 py-2.5 border"
              style={{
                backgroundColor: brandColor + '15',
                borderColor: brandColor + '30'
              }}
            >
              <span className="text-[17px] font-semibold" style={{ color: brandColor }}>
                ${listing.price.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
