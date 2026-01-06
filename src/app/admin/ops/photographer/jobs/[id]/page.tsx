import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  Navigation,
  Camera,
  CheckCircle,
  PlayCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ id: string }>
}

async function startJob(formData: FormData) {
  'use server'

  const id = formData.get('id') as string
  const supabase = createAdminClient()

  await supabase
    .from('listings')
    .update({ ops_status: 'in_progress' })
    .eq('id', id)

  await supabase.from('job_events').insert({
    listing_id: id,
    event_type: 'check_in',
    new_value: JSON.parse(JSON.stringify({ status: 'in_progress', timestamp: new Date().toISOString() })),
    actor_type: 'staff',
  })

  revalidatePath(`/admin/ops/photographer/jobs/${id}`)
  revalidatePath('/admin/ops/photographer')
}

export default async function PhotographerJobDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !listing) {
    notFound()
  }

  // Get agent info if available
  const { data: agent } = listing.agent_id
    ? await supabase.from('agents').select('name, phone, email').eq('id', listing.agent_id).single()
    : { data: null }

  const isScheduled = listing.ops_status === 'scheduled'
  const isInProgress = listing.ops_status === 'in_progress'

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/ops/photographer">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-neutral-900">{listing.address}</h1>
            <p className="text-sm text-neutral-600">
              {listing.city}, {listing.state}
            </p>
          </div>
          {listing.is_rush && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
              RUSH
            </span>
          )}
        </div>
      </header>

      <div className="space-y-4 p-4">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                `${listing.address}, ${listing.city}, ${listing.state}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Navigation className="mr-2 h-4 w-4" />
              Navigate
            </a>
          </Button>
          {agent?.phone && (
            <Button asChild variant="outline" className="flex-1">
              <a href={`tel:${agent.phone}`}>
                <Phone className="mr-2 h-4 w-4" />
                Call Agent
              </a>
            </Button>
          )}
        </div>

        {/* Status Card */}
        <div
          className={`rounded-lg p-4 ${
            isInProgress
              ? 'border-2 border-yellow-400 bg-yellow-50'
              : isScheduled
                ? 'border border-blue-200 bg-blue-50'
                : 'border border-green-200 bg-green-50'
          }`}
        >
          <div className="flex items-center gap-2">
            {isInProgress ? (
              <>
                <Camera className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-700">In Progress</span>
              </>
            ) : isScheduled ? (
              <>
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-700">Scheduled</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-700">
                  {listing.ops_status?.replace('_', ' ')}
                </span>
              </>
            )}
          </div>

          {isScheduled && (
            <form action={startJob} className="mt-4">
              <input type="hidden" name="id" value={listing.id} />
              <Button type="submit" className="w-full">
                <PlayCircle className="mr-2 h-4 w-4" />
                Check In & Start Shoot
              </Button>
            </form>
          )}

          {isInProgress && (
            <Button asChild className="mt-4 w-full">
              <Link href={`/admin/ops/photographer/jobs/${listing.id}/upload`}>
                <Camera className="mr-2 h-4 w-4" />
                Upload Photos
              </Link>
            </Button>
          )}
        </div>

        {/* Property Details */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-neutral-900">Property Details</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Address</span>
              <span className="font-medium text-neutral-900">{listing.address}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">City</span>
              <span className="font-medium text-neutral-900">
                {listing.city}, {listing.state} {listing.zip}
              </span>
            </div>
            {listing.sqft && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Square Feet</span>
                <span className="font-medium text-neutral-900">
                  {listing.sqft.toLocaleString()} sqft
                </span>
              </div>
            )}
            {listing.beds && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Bedrooms</span>
                <span className="font-medium text-neutral-900">{listing.beds}</span>
              </div>
            )}
            {listing.baths && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Bathrooms</span>
                <span className="font-medium text-neutral-900">{listing.baths}</span>
              </div>
            )}
            {listing.scheduled_at && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Scheduled</span>
                <span className="font-medium text-neutral-900">
                  {new Date(listing.scheduled_at).toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Agent Info */}
        {agent && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-neutral-900">Agent Contact</h2>

            <div className="space-y-2">
              <p className="font-medium text-neutral-900">{agent.name}</p>
              {agent.email && (
                <p className="text-sm text-neutral-600">{agent.email}</p>
              )}
              {agent.phone && (
                <a
                  href={`tel:${agent.phone}`}
                  className="inline-flex items-center gap-2 text-[#ff4533] hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {agent.phone}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Shot List Reminder */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-neutral-900">Shot List Reminder</h2>

          <ul className="space-y-2 text-sm text-neutral-600">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              Exterior front (multiple angles)
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              Exterior back/yard
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              Living room
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              Kitchen
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              Primary bedroom
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              Primary bathroom
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              Additional bedrooms
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              Dining area
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              Special features (pool, fireplace, views)
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              Drone aerials (if scheduled)
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
