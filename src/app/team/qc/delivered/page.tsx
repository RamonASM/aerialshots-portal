import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format, subDays, startOfDay } from 'date-fns'
import {
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  Calendar,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default async function QCDeliveredPage() {
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
    .select('id, name, role, team_role')
    .eq('email', user.email!)
    .eq('is_active', true)
    .single()

  if (!staff) {
    redirect('/staff-login')
  }

  // Get delivered listings from the last 7 days
  const sevenDaysAgo = subDays(new Date(), 7)

  const { data: deliveredListings } = await supabase
    .from('listings')
    .select(`
      id,
      address,
      city,
      state,
      sqft,
      delivered_at,
      scheduled_at,
      agent:agents(name)
    `)
    .eq('ops_status', 'delivered')
    .gte('delivered_at', sevenDaysAgo.toISOString())
    .order('delivered_at', { ascending: false })

  // Group by day
  const today = startOfDay(new Date())
  const yesterday = startOfDay(subDays(new Date(), 1))

  const todayDelivered = deliveredListings?.filter(l => {
    const date = new Date(l.delivered_at!)
    return date >= today
  }) || []

  const yesterdayDelivered = deliveredListings?.filter(l => {
    const date = new Date(l.delivered_at!)
    return date >= yesterday && date < today
  }) || []

  const olderDelivered = deliveredListings?.filter(l => {
    const date = new Date(l.delivered_at!)
    return date < yesterday
  }) || []

  // Calculate turnaround times
  const turnaroundTimes = deliveredListings?.map(l => {
    if (l.scheduled_at && l.delivered_at) {
      const scheduled = new Date(l.scheduled_at)
      const delivered = new Date(l.delivered_at)
      return (delivered.getTime() - scheduled.getTime()) / (1000 * 60 * 60) // hours
    }
    return null
  }).filter(t => t !== null) || []

  const avgTurnaround = turnaroundTimes.length > 0
    ? Math.round(turnaroundTimes.reduce((a, b) => a! + b!, 0)! / turnaroundTimes.length)
    : 0

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
          <h1 className="text-xl font-bold text-foreground">Delivered</h1>
          <p className="text-sm text-muted-foreground">
            Last 7 days
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {deliveredListings?.length || 0}
                </p>
                <p className="text-xs text-green-600 dark:text-green-300">Total Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayDelivered.length}</p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{yesterdayDelivered.length}</p>
                <p className="text-xs text-muted-foreground">Yesterday</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgTurnaround}h</p>
                <p className="text-xs text-muted-foreground">Avg Turnaround</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delivered by Day */}
      {todayDelivered.length > 0 && (
        <DeliveredSection
          title="Today"
          listings={todayDelivered}
        />
      )}

      {yesterdayDelivered.length > 0 && (
        <DeliveredSection
          title="Yesterday"
          listings={yesterdayDelivered}
        />
      )}

      {olderDelivered.length > 0 && (
        <DeliveredSection
          title="Earlier This Week"
          listings={olderDelivered}
        />
      )}

      {deliveredListings?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">No deliveries yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Listings you deliver will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface DeliveredSectionProps {
  title: string
  listings: Array<{
    id: string
    address: string
    city: string | null
    state: string | null
    sqft: number | null
    delivered_at: string | null
    scheduled_at: string | null
    agent: { name: string } | null
  }>
}

function DeliveredSection({ title, listings }: DeliveredSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          {listings.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {listings.map((listing) => {
          const turnaround = listing.scheduled_at && listing.delivered_at
            ? Math.round(
                (new Date(listing.delivered_at).getTime() -
                  new Date(listing.scheduled_at).getTime()) /
                  (1000 * 60 * 60)
              )
            : null

          return (
            <Link
              key={listing.id}
              href={`/team/qc/review/${listing.id}`}
              className="block"
            >
              <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {listing.address}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {listing.city}, {listing.state}
                      </p>
                      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                        {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
                        {listing.agent && <span>Agent: {listing.agent.name}</span>}
                        {listing.delivered_at && (
                          <span>
                            Delivered {format(new Date(listing.delivered_at), 'h:mm a')}
                          </span>
                        )}
                        {turnaround !== null && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {turnaround}h turnaround
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
