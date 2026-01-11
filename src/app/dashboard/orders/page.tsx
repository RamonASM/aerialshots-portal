import { redirect } from 'next/navigation'
import Link from 'next/link'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  Calendar,
  Clock,
  MapPin,
  Package,
  Plus,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/pricing/config'
import { toDollars } from '@/lib/payments/stripe'

// Auth bypass for development
const authBypassEnabled =
  process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true' ||
  process.env.AUTH_BYPASS === 'true'

// Status badge colors
const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: Clock },
  paid: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: CheckCircle },
  confirmed: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: CheckCircle },
  scheduled: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: Calendar },
  in_progress: { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: Loader2 },
  completed: { bg: 'bg-green-500/10', text: 'text-green-400', icon: CheckCircle },
  delivered: { bg: 'bg-green-500/10', text: 'text-green-400', icon: CheckCircle },
  cancelled: { bg: 'bg-neutral-500/10', text: 'text-neutral-400', icon: AlertCircle },
  refunded: { bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertCircle },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatScheduledDate(dateStr: string | null) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  }
}

export default async function OrdersPage() {
  // Get user email - either from bypass or Clerk
  let userEmail: string

  if (authBypassEnabled) {
    userEmail = process.env.AUTH_BYPASS_EMAIL || 'bypass@aerialshots.media'
  } else {
    const user = await currentUser()
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      redirect('/sign-in')
    }
    userEmail = user.emailAddresses[0].emailAddress.toLowerCase()
  }

  const supabase = createAdminClient()

  // Get agent by email
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name')
    .eq('email', userEmail)
    .maybeSingle()

  if (!agent) {
    redirect('/sign-in?error=no_agent')
  }

  // Get orders for this agent
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })

  const activeOrders = orders?.filter(o =>
    !['delivered', 'cancelled', 'refunded'].includes(o.status || 'pending')
  ) || []

  const pastOrders = orders?.filter(o =>
    ['delivered', 'cancelled', 'refunded'].includes(o.status || 'pending')
  ) || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Orders</h1>
          <p className="text-neutral-400 mt-1">
            Track your bookings and order history
          </p>
        </div>
        <Link
          href="/book"
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Booking</span>
        </Link>
      </div>

      {/* Active Orders */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          Active Orders
          {activeOrders.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-sm rounded-full">
              {activeOrders.length}
            </span>
          )}
        </h2>

        {activeOrders.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
            <Package className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-400 mb-4">No active orders</p>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              Book your first shoot
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>

      {/* Past Orders */}
      {pastOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Past Orders
          </h2>

          <div className="space-y-3">
            {pastOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function OrderCard({ order }: { order: any }) {
  const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.pending
  const StatusIcon = statusStyle.icon
  const scheduled = formatScheduledDate(order.scheduled_at)

  return (
    <Link
      href={`/dashboard/orders/${order.id}`}
      className="block bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Package & Status */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-medium text-white">{order.package_name} Package</h3>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
              <StatusIcon className="w-3 h-3" />
              {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
            </span>
          </div>

          {/* Address */}
          {order.property_address && (
            <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
              <MapPin className="w-4 h-4" />
              <span className="truncate">
                {order.property_address}, {order.property_city}
              </span>
            </div>
          )}

          {/* Schedule */}
          {scheduled && (
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Calendar className="w-4 h-4" />
              <span>
                {scheduled.date} at {scheduled.time}
              </span>
            </div>
          )}
        </div>

        {/* Price & Date */}
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-white">
            {formatCurrency(toDollars(order.total_cents))}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {formatDate(order.created_at)}
          </div>
        </div>
      </div>
    </Link>
  )
}
