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

export function AgentContactCard({ agent, brandColor = '#ff4533' }: AgentContactCardProps) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      {/* Agent Info */}
      <div className="flex items-start gap-4">
        {agent.headshot_url ? (
          <Image
            src={agent.headshot_url}
            alt={agent.name}
            width={80}
            height={80}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{ backgroundColor: brandColor }}
          >
            {agent.name.charAt(0)}
          </div>
        )}

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-neutral-900">{agent.name}</h3>
          {agent.bio && (
            <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{agent.bio}</p>
          )}
        </div>
      </div>

      {/* Agent Logo */}
      {agent.logo_url && (
        <div className="mt-4 border-t border-neutral-100 pt-4">
          <Image
            src={agent.logo_url}
            alt={`${agent.name} logo`}
            width={120}
            height={40}
            className="h-8 w-auto object-contain"
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
          <Button variant="outline" className="w-full justify-start" asChild>
            <a href={`mailto:${agent.email}`}>
              <Mail className="mr-2 h-4 w-4" />
              {agent.email}
            </a>
          </Button>
        )}

        {agent.instagram_url && (
          <Button variant="outline" className="w-full justify-start" asChild>
            <a href={agent.instagram_url} target="_blank" rel="noopener noreferrer">
              <Instagram className="mr-2 h-4 w-4" />
              Instagram
              <ExternalLink className="ml-auto h-3 w-3" />
            </a>
          </Button>
        )}
      </div>

      {/* View Portfolio Link */}
      {agent.slug && (
        <div className="mt-4 border-t border-neutral-100 pt-4">
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
