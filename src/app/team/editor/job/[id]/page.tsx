import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Zap,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EditorJobClient } from '@/components/editor/EditorJobClient'
import type { ProcessingJob } from '@/hooks/useRealtimeProcessing'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditorJobDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Verify staff authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/staff-login')
  }

  // Verify staff role
  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, role, team_role')
    .eq('email', user.email!)
    .eq('is_active', true)
    .single()

  if (!staff) {
    redirect('/staff-login')
  }

  // Allow editors and admins
  if (staff.team_role !== 'editor' && staff.role !== 'admin') {
    redirect('/team/editor')
  }

  // Get listing with agent info
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select(`
      id,
      address,
      city,
      state,
      zip,
      sqft,
      beds,
      baths,
      ops_status,
      is_rush,
      scheduled_at,
      expected_completion,
      agent:agents(id, name, email, phone)
    `)
    .eq('id', id)
    .single()

  if (listingError || !listing) {
    notFound()
  }

  // Get media assets
  const { data: mediaAssets } = await supabase
    .from('media_assets')
    .select(`
      id,
      aryeo_url,
      media_url,
      storage_path,
      type,
      category,
      qc_status,
      processing_job_id,
      sort_order
    `)
    .eq('listing_id', id)
    .order('sort_order', { ascending: true })

  // Get processing jobs for this listing
  const { data: processingJobs } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('listing_id', id)
    .order('created_at', { ascending: false })

  const photos = mediaAssets?.filter(m => m.type === 'photo') || []
  const latestJob = processingJobs?.[0] || null

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/team/editor">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">{listing.address}</h1>
            {listing.is_rush && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                RUSH
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {listing.city}, {listing.state} {listing.zip}
          </p>
        </div>
        <StatusBadge status={listing.ops_status} />
      </div>

      {/* Job Info Cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Property Info */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Property</p>
                <p className="font-medium">
                  {listing.beds} bed, {listing.baths} bath
                </p>
                {listing.sqft && (
                  <p className="text-sm text-muted-foreground">
                    {listing.sqft.toLocaleString()} sqft
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scheduled */}
        {listing.scheduled_at && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                  <p className="font-medium">
                    {new Date(listing.scheduled_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(listing.scheduled_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agent */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Agent</p>
                {listing.agent ? (
                  <>
                    <p className="font-medium">
                      {(listing.agent as { name: string }).name}
                    </p>
                    {(listing.agent as { phone?: string }).phone && (
                      <p className="text-sm text-muted-foreground">
                        {(listing.agent as { phone: string }).phone}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Not assigned</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Editor Client Component - handles all interactive functionality */}
      <EditorJobClient
        listingId={listing.id}
        isRush={listing.is_rush}
        photos={photos.map(p => ({
          id: p.id,
          url: p.media_url || p.aryeo_url || '',
          storagePath: p.storage_path,
          category: p.category,
          qcStatus: p.qc_status,
          processingJobId: p.processing_job_id,
        }))}
        initialProcessingJob={latestJob as ProcessingJob | null}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    staged: { label: 'Ready to Edit', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    awaiting_editing: { label: 'Queued', className: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300' },
    in_editing: { label: 'Editing', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    processing: { label: 'Processing', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    ready_for_qc: { label: 'Ready for QC', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  }

  const { label, className } = config[status] || { label: status, className: 'bg-neutral-100 text-neutral-700' }

  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  )
}
