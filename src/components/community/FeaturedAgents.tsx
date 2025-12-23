import Image from 'next/image'
import Link from 'next/link'
import { Phone, Mail, ExternalLink, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Tables } from '@/lib/supabase/types'

interface FeaturedAgentsProps {
  agents: Tables<'agents'>[]
}

export function FeaturedAgents({ agents }: FeaturedAgentsProps) {
  if (!agents || agents.length === 0) return null

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e]/72 backdrop-blur-xl p-6">
      <h3 className="font-semibold text-white">Local Experts</h3>
      <p className="mt-1 text-[13px] text-[#636366]">
        Connect with agents who specialize in this area
      </p>

      <div className="mt-4 space-y-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-3 transition-colors hover:border-white/[0.16]"
          >
            {/* Agent Photo */}
            {agent.headshot_url ? (
              <Image
                src={agent.headshot_url}
                alt={agent.name}
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: agent.brand_color || '#0077ff' }}
              >
                <User className="h-6 w-6 text-white" />
              </div>
            )}

            {/* Agent Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-white truncate">
                {agent.name}
              </h4>
              {agent.bio && (
                <p className="mt-0.5 text-[13px] text-[#636366] line-clamp-2">
                  {agent.bio}
                </p>
              )}

              {/* Contact Actions */}
              <div className="mt-2 flex flex-wrap gap-2">
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    className="inline-flex items-center gap-1 text-[11px] text-[#636366] hover:text-[#0077ff] transition-colors"
                  >
                    <Phone className="h-3 w-3" />
                    Call
                  </a>
                )}
                {agent.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className="inline-flex items-center gap-1 text-[11px] text-[#636366] hover:text-[#0077ff] transition-colors"
                  >
                    <Mail className="h-3 w-3" />
                    Email
                  </a>
                )}
              </div>
            </div>

            {/* View Profile Link */}
            <Link
              href={`/agents/${agent.slug}`}
              className="flex-shrink-0 text-[#636366] hover:text-[#0077ff] transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>

      {agents.length > 0 && (
        <Button variant="outline" className="mt-4 w-full" asChild>
          <Link href={`/agents/${agents[0].slug}`}>
            View All Listings
          </Link>
        </Button>
      )}
    </div>
  )
}
