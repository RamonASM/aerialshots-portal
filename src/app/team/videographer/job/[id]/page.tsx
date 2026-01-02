import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import {
  ArrowLeft,
  MapPin,
  Clock,
  Video,
  Phone,
  User,
  CheckCircle,
  AlertTriangle,
  Film,
  Navigation,
  Home,
  Camera,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Check if staff has videographer access
 * Supports: role = 'videographer' or role = 'admin'
 */
function hasVideographerAccess(staff: { role: string | null }): boolean {
  if (staff.role === 'admin') return true
  if (staff.role === 'videographer') return true
  return false
}

async function updateJobStatus(formData: FormData) {
  'use server'

  const id = formData.get('id') as string
  const status = formData.get('status') as string

  const supabase = await createClient()

  await supabase
    .from('listings')
    .update({
      ops_status: status,
      ...(status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
    })
    .eq('id', id)

  // Log event
  await supabase.from('job_events').insert({
    listing_id: id,
    event_type: 'status_change',
    new_value: JSON.parse(JSON.stringify({ status, source: 'videographer_portal' })),
    actor_type: 'staff',
  })

  revalidatePath(`/team/videographer/job/${id}`)
}

export default async function VideoJobDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/staff-login')
  }

  // Get staff member
  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, role')
    .eq('email', user.email!)
    .single()

  if (!staff || !hasVideographerAccess(staff)) {
    redirect('/staff-login')
  }

  // Get listing details
  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      *,
      agent:agents(name, email, phone),
      order:orders(
        services,
        special_instructions,
        total_cents
      )
    `)
    .eq('id', id)
    .single()

  if (error || !listing) {
    notFound()
  }

  const order = Array.isArray(listing.order) ? listing.order[0] : listing.order
  const agent = Array.isArray(listing.agent) ? listing.agent[0] : listing.agent

  // Get video types for this job
  const videoServiceKeys = ['listingVideo', 'lifestyleVid', 'dayToNight', 'signatureVid', 'render3d', 'lp2v30', 'lp2v60']
  const orderServices = (order?.services || []) as Array<{ key?: string; id?: string }>
  const serviceKeys = orderServices.map((s) => s.key || s.id || '').filter(Boolean)
  const videoTypes = serviceKeys.filter((s) => videoServiceKeys.includes(s))

  // Get media assets
  const { data: mediaAssets } = await supabase
    .from('media_assets')
    .select('id, media_url, type, category')
    .eq('listing_id', id)
    .in('type', ['video', 'photo'])
    .order('created_at', { ascending: false })

  const videos = mediaAssets?.filter((m) => m.type === 'video') || []
  const photos = mediaAssets?.filter((m) => m.type === 'photo') || []

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/team/videographer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-neutral-900">{listing.address}</h1>
            {listing.is_rush && (
              <Badge variant="destructive">RUSH</Badge>
            )}
          </div>
          <p className="text-sm text-neutral-600">
            {listing.city}, {listing.state} {listing.zip}
          </p>
        </div>
      </div>

      {/* Video Types */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-purple-600" />
            Video Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {videoTypes.map((type) => (
              <Badge
                key={type}
                className="bg-purple-100 px-3 py-1 text-purple-700"
              >
                <Film className="mr-1.5 h-3.5 w-3.5" />
                {getVideoTypeName(type)}
              </Badge>
            ))}
          </div>
          {order?.special_instructions && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{order.special_instructions}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Update */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Job Status</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateJobStatus} className="flex items-center gap-4">
            <input type="hidden" name="id" value={listing.id} />
            <select
              name="status"
              defaultValue={listing.ops_status || 'scheduled'}
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2"
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">Shooting</option>
              <option value="staged">Footage Captured</option>
              <option value="processing">Editing</option>
              <option value="ready_for_qc">Ready for QC</option>
              <option value="delivered">Delivered</option>
            </select>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
              Update
            </Button>
          </form>
          <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
            <Clock className="h-4 w-4" />
            Current: <StatusBadge status={listing.ops_status} />
          </div>
        </CardContent>
      </Card>

      {/* Property & Agent Info */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Property */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Property
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-neutral-400" />
              <span className="text-sm">
                {listing.address}, {listing.city}, {listing.state} {listing.zip}
              </span>
            </div>
            {listing.sqft && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">
                  {listing.beds} bed, {listing.baths} bath, {listing.sqft.toLocaleString()} sqft
                </span>
              </div>
            )}
            {listing.scheduled_at && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-neutral-400" />
                <span className="text-sm">
                  {format(new Date(listing.scheduled_at), 'EEEE, MMMM d @ h:mm a')}
                </span>
              </div>
            )}
            {listing.lat && listing.lng && (
              <a
                href={`https://maps.google.com/?daddr=${listing.lat},${listing.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-purple-600 hover:underline"
              >
                <Navigation className="h-4 w-4" />
                Navigate to Property
              </a>
            )}
          </CardContent>
        </Card>

        {/* Agent */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agent ? (
              <>
                <p className="font-medium">{agent.name}</p>
                {agent.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className="block text-sm text-purple-600 hover:underline"
                  >
                    {agent.email}
                  </a>
                )}
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    className="flex items-center gap-2 text-sm text-purple-600 hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {agent.phone}
                  </a>
                )}
              </>
            ) : (
              <p className="text-sm text-neutral-500">No agent assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Existing Media */}
      {(photos.length > 0 || videos.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Media Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Photos (for reference) */}
            {photos.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-700">
                  Photos ({photos.length})
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                  {photos.slice(0, 8).map((photo) => (
                    <div
                      key={photo.id}
                      className="aspect-square overflow-hidden rounded-lg"
                    >
                      <img
                        src={photo.media_url || ''}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                  {photos.length > 8 && (
                    <div className="flex aspect-square items-center justify-center rounded-lg bg-neutral-100">
                      <span className="text-sm text-neutral-500">+{photos.length - 8}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Videos */}
            {videos.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-700">
                  Videos ({videos.length})
                </p>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className="aspect-video overflow-hidden rounded-lg bg-neutral-900"
                    >
                      <video
                        src={video.media_url || ''}
                        className="h-full w-full object-cover"
                        controls
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          className="h-auto flex-col py-4"
          asChild
        >
          <Link href={`/admin/ops/jobs/${id}`}>
            <Camera className="mb-1 h-5 w-5" />
            View Full Job
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col py-4"
          asChild
        >
          <Link href={`/delivery/${id}`} target="_blank">
            <CheckCircle className="mb-1 h-5 w-5" />
            Preview Delivery
          </Link>
        </Button>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const config: Record<string, { label: string; className: string }> = {
    scheduled: { label: 'Scheduled', className: 'bg-neutral-100 text-neutral-700' },
    in_progress: { label: 'Shooting', className: 'bg-amber-100 text-amber-700' },
    staged: { label: 'Footage Captured', className: 'bg-blue-100 text-blue-700' },
    processing: { label: 'Editing', className: 'bg-purple-100 text-purple-700' },
    ready_for_qc: { label: 'Ready for QC', className: 'bg-cyan-100 text-cyan-700' },
    delivered: { label: 'Delivered', className: 'bg-green-100 text-green-700' },
  }

  const { label, className } = config[status || 'scheduled'] || config.scheduled

  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  )
}

function getVideoTypeName(key: string): string {
  const names: Record<string, string> = {
    listingVideo: 'Listing Video',
    lifestyleVid: 'Lifestyle Video',
    dayToNight: 'Day-to-Night Video',
    signatureVid: 'Cinematic Signature',
    render3d: '3D Video Render',
    lp2v30: 'Photo→Video (30s)',
    lp2v60: 'Photo→Video (1min)',
  }
  return names[key] || key
}
