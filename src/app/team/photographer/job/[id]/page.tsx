import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Zap,
  Clock,
  Phone,
  Camera,
  Home,
  Navigation,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getStaffAccess, hasRequiredRole } from '@/lib/auth/server-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { PhotographerJobClient } from '@/components/team/PhotographerJobClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PhotographerJobDetailPage({ params }: PageProps) {
  const { id } = await params

  // Check authentication via Clerk
  const staff = await getStaffAccess()

  if (!staff) {
    redirect('/sign-in/staff')
  }

  // Verify photographer or admin role
  if (!hasRequiredRole(staff.role, ['photographer'])) {
    redirect('/sign-in/staff')
  }

  const supabase = createAdminClient()

  // Get assignment with listing info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignment, error: assignmentError } = await (supabase as any)
    .from('photographer_assignments')
    .select(`
      id,
      status,
      scheduled_time,
      notes,
      checked_in_at,
      checked_out_at,
      listing:listings(
        id,
        address,
        city,
        state,
        zip,
        sqft,
        beds,
        baths,
        lat,
        lng,
        is_rush,
        ops_status,
        agent:agents(id, name, email, phone)
      )
    `)
    .eq('id', id)
    .eq('photographer_id', staff.id)
    .single() as { data: {
      id: string
      status: string | null
      scheduled_time: string | null
      notes: string | null
      checked_in_at: string | null
      checked_out_at: string | null
      listing: {
        id: string
        address: string
        city: string | null
        state: string | null
        zip: string | null
        sqft: number | null
        beds: number | null
        baths: number | null
        lat: number | null
        lng: number | null
        is_rush: boolean | null
        ops_status: string | null
        agent: { id: string; name: string; email: string; phone: string | null } | null
      } | null
    } | null; error: Error | null }

  if (assignmentError || !assignment || !assignment.listing) {
    notFound()
  }

  const listing = assignment.listing
  const isRush = listing.is_rush || false

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="text-zinc-400 hover:text-white hover:bg-white/5">
          <Link href="/team/photographer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white truncate">{listing.address}</h1>
            {isRush && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                RUSH
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-400">
            {listing.city}, {listing.state} {listing.zip}
          </p>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-3">
        <StatusBadge status={assignment.status} />
        {assignment.scheduled_time && (
          <span className="text-sm text-zinc-400">
            <Clock className="inline h-4 w-4 mr-1" />
            {format(new Date(assignment.scheduled_time), 'MMM d, h:mm a')}
          </span>
        )}
      </div>

      {/* Property Details */}
      <Card className="border-white/[0.08] bg-[#1c1c1e]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Home className="h-5 w-5" />
            Property Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-zinc-500" />
            <div>
              <p className="text-sm text-zinc-400">Address</p>
              <p className="font-medium text-white">{listing.address}</p>
              <p className="text-sm text-zinc-400">{listing.city}, {listing.state} {listing.zip}</p>
            </div>
          </div>
          {listing.sqft && (
            <div className="flex items-center gap-3">
              <Home className="h-5 w-5 text-zinc-500" />
              <div>
                <p className="text-sm text-zinc-400">Size</p>
                <p className="font-medium text-white">{listing.sqft.toLocaleString()} sqft</p>
                {listing.beds && listing.baths && (
                  <p className="text-sm text-zinc-400">{listing.beds} bed, {listing.baths} bath</p>
                )}
              </div>
            </div>
          )}
          {listing.lat && listing.lng && (
            <a
              href={`https://maps.google.com/?daddr=${listing.lat},${listing.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 transition-colors hover:bg-blue-500/10"
            >
              <Navigation className="h-5 w-5 text-blue-400" />
              <span className="font-medium text-blue-400">Open in Maps</span>
            </a>
          )}
        </CardContent>
      </Card>

      {/* Agent Info */}
      {listing.agent && (
        <Card className="border-white/[0.08] bg-[#1c1c1e]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="h-5 w-5" />
              Agent
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">{listing.agent.name}</p>
              <p className="text-sm text-zinc-400">{listing.agent.email}</p>
            </div>
            {listing.agent.phone && (
              <a
                href={`tel:${listing.agent.phone}`}
                className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-2 transition-colors hover:bg-green-500/10"
              >
                <Phone className="h-4 w-4 text-green-400" />
                <span className="font-medium text-green-400">Call</span>
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {assignment.notes && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-amber-400">Notes:</p>
            <p className="mt-1 text-amber-300">{assignment.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* HDR Upload Section - Only show after check-out or for completed jobs */}
      {(assignment.status === 'completed' || assignment.checked_out_at) && (
        <PhotographerJobClient
          listingId={listing.id}
          assignmentId={assignment.id}
          isRush={isRush}
        />
      )}

      {/* Check-in/out status */}
      {assignment.checked_in_at && (
        <Card className="border-white/[0.08] bg-[#1c1c1e]">
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Checked in:</span>
              <span className="text-white">{format(new Date(assignment.checked_in_at), 'h:mm a')}</span>
            </div>
            {assignment.checked_out_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Checked out:</span>
                <span className="text-white">{format(new Date(assignment.checked_out_at), 'h:mm a')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const config: Record<string, { label: string; className: string }> = {
    assigned: { label: 'Assigned', className: 'bg-zinc-500/20 text-zinc-300' },
    en_route: { label: 'En Route', className: 'bg-blue-500/20 text-blue-400' },
    in_progress: { label: 'In Progress', className: 'bg-amber-500/20 text-amber-400' },
    completed: { label: 'Completed', className: 'bg-green-500/20 text-green-400' },
    cancelled: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400' },
  }

  const { label, className } = (status && config[status]) || config.assigned

  return (
    <Badge className={className}>
      {label}
    </Badge>
  )
}
