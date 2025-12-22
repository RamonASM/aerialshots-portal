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
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <h3 className="font-semibold text-neutral-900">Local Experts</h3>
      <p className="mt-1 text-sm text-neutral-500">
        Connect with agents who specialize in this area
      </p>

      <div className="mt-4 space-y-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-start gap-3 rounded-lg border border-neutral-100 p-3 transition-colors hover:bg-neutral-50"
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
                style={{ backgroundColor: agent.brand_color || '#3b82f6' }}
              >
                <User className="h-6 w-6 text-white" />
              </div>
            )}

            {/* Agent Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-neutral-900 truncate">
                {agent.name}
              </h4>
              {agent.bio && (
                <p className="mt-0.5 text-sm text-neutral-500 line-clamp-2">
                  {agent.bio}
                </p>
              )}

              {/* Contact Actions */}
              <div className="mt-2 flex flex-wrap gap-2">
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
                  >
                    <Phone className="h-3 w-3" />
                    Call
                  </a>
                )}
                {agent.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
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
              className="flex-shrink-0 text-neutral-400 hover:text-neutral-600"
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
