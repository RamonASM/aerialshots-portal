'use client'

import Image from 'next/image'
import { Phone, Mail, Instagram, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/types'

type Agent = Database['public']['Tables']['agents']['Row']

interface AgentContactCardProps {
  agent: Agent
  brandColor?: string
}

export function AgentContactCard({ agent, brandColor = '#0077ff' }: AgentContactCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e]/72 backdrop-blur-xl p-6">
      {/* Agent Info */}
      <div className="flex items-start gap-4">
        {agent.headshot_url ? (
          <Image
            src={agent.headshot_url}
            alt={agent.name}
            width={80}
            height={80}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-white/10"
          />
        ) : (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-[22px] font-semibold text-white"
            style={{ backgroundColor: brandColor }}
          >
            {agent.name.charAt(0)}
          </div>
        )}

        <div className="flex-1">
          <h3 className="text-[17px] font-semibold text-white">{agent.name}</h3>
          {agent.bio && (
            <p className="mt-1 line-clamp-2 text-[13px] text-[#a1a1a6]">{agent.bio}</p>
          )}
        </div>
      </div>

      {/* Agent Logo */}
      {agent.logo_url && (
        <div className="mt-4 border-t border-white/[0.08] pt-4">
          <Image
            src={agent.logo_url}
            alt={`${agent.name} logo`}
            width={120}
            height={40}
            className="h-8 w-auto object-contain brightness-0 invert opacity-70"
          />
        </div>
      )}

      {/* Contact Buttons */}
      <div className="mt-4 space-y-2">
        {agent.phone && (
          <Button variant="outline" className="w-full justify-start" asChild>
            <a href={`tel:${agent.phone}`}>
              <Phone className="mr-2 h-4 w-4" />
              {agent.phone}
            </a>
          </Button>
        )}

        {agent.email && (
          <Button variant="outline" className="w-full justify-start text-[13px]" asChild>
            <a href={`mailto:${agent.email}`}>
              <Mail className="mr-2 h-4 w-4" />
              <span className="truncate">{agent.email}</span>
            </a>
          </Button>
        )}

        {agent.instagram_url && (
          <Button variant="outline" className="w-full justify-start" asChild>
            <a href={agent.instagram_url} target="_blank" rel="noopener noreferrer">
              <Instagram className="mr-2 h-4 w-4" />
              Instagram
              <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
            </a>
          </Button>
        )}
      </div>

      {/* View Portfolio Link */}
      {agent.slug && (
        <div className="mt-4 border-t border-white/[0.08] pt-4">
          <Button
            className="w-full"
            style={{ backgroundColor: brandColor }}
            asChild
          >
            <a href={`/agents/${agent.slug}`}>View All Listings</a>
          </Button>
        </div>
      )}
    </div>
  )
}
