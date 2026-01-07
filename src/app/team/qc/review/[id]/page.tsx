import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { QCReviewClient } from '@/components/qc/QCReviewClient'
import { getStaffAccess } from '@/lib/auth/server-access'
import { createAdminClient } from '@/lib/supabase/admin'

interface PageProps {
  params: Promise<{ id: string }>
}

// Server action for approving a photo
async function approvePhoto(assetId: string) {
  'use server'

  const supabase = await createClient()

  const { error } = await supabase
    .from('media_assets')
    .update({
      qc_status: 'approved',
      qc_reviewed_at: new Date().toISOString(),
    })
    .eq('id', assetId)

  if (error) {
    throw new Error('Failed to approve photo')
  }
}

// Server action for rejecting a photo
async function rejectPhoto(assetId: string, notes?: string) {
  'use server'

  const supabase = await createClient()

  const { error } = await supabase
    .from('media_assets')
    .update({
      qc_status: 'rejected',
      qc_notes: notes,
      qc_reviewed_at: new Date().toISOString(),
    })
    .eq('id', assetId)

  if (error) {
    throw new Error('Failed to reject photo')
  }
}

export default async function QCReviewPage({ params }: PageProps) {
  const { id } = await params

  // Check authentication via Clerk (or Supabase fallback)
  const staff = await getStaffAccess()

  if (!staff) {
    redirect('/sign-in/staff')
  }

  // Allow QC specialists and admins
  if (staff.role !== 'qc' && staff.role !== 'admin') {
    redirect('/team/qc')
  }

  const supabase = createAdminClient()

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
      listing_id,
      aryeo_url,
      storage_path,
      type,
      category,
      qc_status,
      qc_notes,
      sort_order
    `)
    .eq('listing_id', id)
    .eq('type', 'photo')
    .order('sort_order', { ascending: true })

  const photos = mediaAssets || []

  // Calculate stats
  const totalPhotos = photos.length
  const approvedCount = photos.filter(p => p.qc_status === 'approved').length
  const rejectedCount = photos.filter(p => p.qc_status === 'rejected').length
  const pendingCount = photos.filter(p => p.qc_status === 'pending' || p.qc_status === 'ready_for_qc').length

  // Mark listing as in_qc if it's not already
  if (listing.ops_status === 'ready_for_qc') {
    await supabase
      .from('listings')
      .update({ ops_status: 'in_qc' })
      .eq('id', id)
  }

  // Check if QC is complete (all photos reviewed)
  const qcComplete = pendingCount === 0 && totalPhotos > 0

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/team/qc">
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
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{totalPhotos}</p>
            <p className="text-xs text-muted-foreground">Total Photos</p>
          </CardContent>
        </Card>
        <Card className={pendingCount > 0 ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10' : ''}>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            </div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className={approvedCount > 0 ? 'border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/10' : ''}>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className={rejectedCount > 0 ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10' : ''}>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            </div>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Job Info */}
      <div className="grid gap-4 lg:grid-cols-3">
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
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Agent</p>
                {listing.agent ? (
                  <p className="font-medium">
                    {(listing.agent as { name: string }).name}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Not assigned</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QC Complete Banner */}
      {qcComplete && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/10">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-200">
                    QC Review Complete
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    {approvedCount} approved, {rejectedCount} rejected
                  </p>
                </div>
              </div>
              <form
                action={async () => {
                  'use server'
                  const supabase = await createClient()
                  await supabase
                    .from('listings')
                    .update({
                      ops_status: 'delivered',
                      delivered_at: new Date().toISOString(),
                    })
                    .eq('id', id)
                  revalidatePath(`/team/qc/review/${id}`)
                  redirect('/team/qc')
                }}
              >
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Delivered
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejected Photos Warning */}
      {rejectedCount > 0 && !qcComplete && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800 dark:text-amber-200">
                {rejectedCount} photo{rejectedCount !== 1 ? 's' : ''} rejected.
                Finish reviewing remaining photos before marking as delivered.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Review Grid */}
      <Card>
        <CardContent className="pt-6">
          <QCReviewClient
            listingId={listing.id}
            photos={photos}
            onApprove={approvePhoto}
            onReject={rejectPhoto}
          />
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts Hint */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          <strong>Tip:</strong> Click any photo to open full-screen viewer with keyboard shortcuts
        </p>
        <p className="mt-1">
          <kbd className="rounded bg-muted px-2 py-1 text-xs">A</kbd> Approve |{' '}
          <kbd className="rounded bg-muted px-2 py-1 text-xs">R</kbd> Reject |{' '}
          <kbd className="rounded bg-muted px-2 py-1 text-xs">E</kbd> Edit |{' '}
          <kbd className="rounded bg-muted px-2 py-1 text-xs">&larr;</kbd>{' '}
          <kbd className="rounded bg-muted px-2 py-1 text-xs">&rarr;</kbd> Navigate
        </p>
      </div>
    </div>
  )
}
