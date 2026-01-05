import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { subDays } from 'date-fns'
import {
  ArrowLeft,
  XCircle,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default async function QCRejectedPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/staff-login')
  }

  // Verify staff role
  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, role')
    .eq('email', user.email!)
    .eq('is_active', true)
    .single()

  if (!staff) {
    redirect('/staff-login')
  }

  // Get rejected assets from the last 7 days
  const sevenDaysAgo = subDays(new Date(), 7)

  const { data: rejectedAssets } = await supabase
    .from('media_assets')
    .select(`
      id,
      listing_id,
      aryeo_url,
      qc_status,
      qc_notes,
      created_at,
      category,
      listing:listings(
        id,
        address,
        city,
        state,
        agent:agents(name)
      )
    `)
    .eq('qc_status', 'rejected')
    .eq('type', 'photo')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  // Group by listing
  const groupedByListing = rejectedAssets?.reduce((acc, asset) => {
    const listingId = asset.listing_id
    if (!acc[listingId]) {
      acc[listingId] = {
        listing: asset.listing,
        assets: [],
      }
    }
    acc[listingId].assets.push(asset)
    return acc
  }, {} as Record<string, { listing: unknown; assets: typeof rejectedAssets }>)

  const listingGroups = Object.values(groupedByListing || {})

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/team/qc">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Rejected Photos</h1>
          <p className="text-sm text-muted-foreground">
            Last 7 days
          </p>
        </div>
        <Badge variant="destructive">
          {rejectedAssets?.length || 0} rejected
        </Badge>
      </div>

      {/* Stats */}
      <Card className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                {rejectedAssets?.length || 0}
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">
                Photos rejected across {listingGroups.length} listings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped by Listing */}
      {listingGroups.map((group) => {
        const listing = group.listing as {
          id: string
          address: string
          city: string | null
          state: string | null
          agent: { name: string } | null
        }

        return (
          <Card key={listing.id}>
            <CardContent className="p-4">
              {/* Listing Header */}
              <Link
                href={`/team/qc/review/${listing.id}`}
                className="flex items-center justify-between mb-4 hover:bg-muted/50 -mx-4 px-4 py-2 rounded-lg transition-colors"
              >
                <div>
                  <p className="font-medium">{listing.address}</p>
                  <p className="text-sm text-muted-foreground">
                    {listing.city}, {listing.state}
                    {listing.agent && ` • ${listing.agent.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">
                    {group.assets.length} rejected
                  </Badge>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>

              {/* Rejected Photos Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {group.assets.slice(0, 8).map((asset) => (
                  <div
                    key={asset.id}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-red-300"
                  >
                    <img
                      src={asset.aryeo_url || ''}
                      alt=""
                      className="h-full w-full object-cover opacity-75"
                    />
                    <div className="absolute inset-0 bg-red-500/20" />
                    <div className="absolute top-1 right-1 p-1 rounded-full bg-red-500">
                      <XCircle className="h-3 w-3 text-white" />
                    </div>
                    {asset.category && (
                      <div className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                        {asset.category}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Show rejection notes */}
              {group.assets.some(a => a.qc_notes) && (
                <div className="mt-3 space-y-1">
                  {group.assets
                    .filter(a => a.qc_notes)
                    .slice(0, 3)
                    .map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
                      >
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <p>{asset.qc_notes}</p>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {listingGroups.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">No rejected photos</p>
            <p className="text-sm text-muted-foreground mt-1">
              No photos have been rejected in the last 7 days.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
