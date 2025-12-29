import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export const metadata: Metadata = {
  title: 'My Bookings | Client Portal',
}

export default async function ClientBookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get client account
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: client } = await (supabase as any)
    .from('client_accounts')
    .select('id')
    .eq('auth_user_id', user?.id)
    .single()

  // Get all bookings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bookings } = await (supabase as any)
    .from('client_bookings')
    .select('*')
    .eq('client_id', client?.id)
    .order('created_at', { ascending: false })

  const pendingBookings = bookings?.filter((b: Booking) => ['pending', 'quoted', 'confirmed', 'scheduled'].includes(b.status)) || []
  const completedBookings = bookings?.filter((b: Booking) => b.status === 'completed') || []
  const cancelledBookings = bookings?.filter((b: Booking) => ['cancelled', 'expired'].includes(b.status)) || []

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">My Bookings</h1>
            <p className="text-[#a1a1a6]">View and manage your photography bookings.</p>
          </div>
          <Link
            href="/book/listing"
            className="flex items-center gap-2 px-4 py-2 bg-[#0077ff] text-white rounded-lg text-sm font-medium hover:bg-[#0066dd] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Booking
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-[#1c1c1e] rounded-xl">
          <Tab active count={pendingBookings.length}>Active</Tab>
          <Tab count={completedBookings.length}>Completed</Tab>
          <Tab count={cancelledBookings.length}>Cancelled</Tab>
        </div>

        {/* Bookings List */}
        {pendingBookings.length > 0 ? (
          <div className="space-y-4">
            {pendingBookings.map((booking: Booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}

function Tab({ children, active = false, count = 0 }: { children: React.ReactNode; active?: boolean; count?: number }) {
  return (
    <button
      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-[#0a0a0a] text-white'
          : 'text-[#8e8e93] hover:text-white'
      }`}
    >
      {children}
      {count > 0 && (
        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
          active ? 'bg-[#0077ff] text-white' : 'bg-white/10'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

interface Booking {
  id: string
  property_address: string
  property_city: string
  property_state: string
  property_zip: string
  package_name: string | null
  status: string
  preferred_date: string | null
  preferred_time_slot: string | null
  estimated_price: number | null
  quoted_price: number | null
  created_at: string
}

function BookingCard({ booking }: { booking: Booking }) {
  const statusConfig = {
    pending: { label: 'Pending Quote', color: 'bg-yellow-500/20 text-yellow-400' },
    quoted: { label: 'Quote Ready', color: 'bg-blue-500/20 text-blue-400' },
    confirmed: { label: 'Confirmed', color: 'bg-green-500/20 text-green-400' },
    scheduled: { label: 'Scheduled', color: 'bg-purple-500/20 text-purple-400' },
    completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400' },
    cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400' },
    expired: { label: 'Expired', color: 'bg-[#8e8e93]/20 text-[#8e8e93]' },
  }

  const status = statusConfig[booking.status as keyof typeof statusConfig] || statusConfig.pending
  const price = booking.quoted_price || booking.estimated_price

  return (
    <div className="bg-[#1c1c1e] rounded-xl border border-white/[0.08] overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{booking.property_address}</h3>
            <p className="text-[#8e8e93] text-sm">
              {booking.property_city}, {booking.property_state} {booking.property_zip}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-[#8e8e93] text-xs mb-1">Package</p>
            <p className="text-white text-sm font-medium">{booking.package_name || 'TBD'}</p>
          </div>
          <div>
            <p className="text-[#8e8e93] text-xs mb-1">Preferred Date</p>
            <p className="text-white text-sm font-medium">
              {booking.preferred_date ? format(new Date(booking.preferred_date), 'MMM d, yyyy') : 'Flexible'}
            </p>
          </div>
          <div>
            <p className="text-[#8e8e93] text-xs mb-1">Time Slot</p>
            <p className="text-white text-sm font-medium capitalize">
              {booking.preferred_time_slot || 'Any'}
            </p>
          </div>
          <div>
            <p className="text-[#8e8e93] text-xs mb-1">{booking.quoted_price ? 'Quote' : 'Estimate'}</p>
            <p className="text-white text-sm font-medium">
              {price ? `$${price.toLocaleString()}` : 'Pending'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-white/[0.08]">
          {booking.status === 'quoted' && (
            <button className="flex-1 py-2.5 bg-[#0077ff] text-white rounded-lg text-sm font-medium hover:bg-[#0066dd] transition-colors">
              Accept Quote
            </button>
          )}
          {['pending', 'quoted'].includes(booking.status) && (
            <button className="py-2.5 px-4 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-colors">
              Cancel
            </button>
          )}
          <button className="py-2.5 px-4 text-[#a1a1a6] rounded-lg text-sm font-medium hover:bg-white/[0.05] transition-colors ml-auto">
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-[#1c1c1e] rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-[#8e8e93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No Bookings Yet</h3>
      <p className="text-[#8e8e93] mb-6 max-w-sm mx-auto">
        Book your first property photography shoot and we&apos;ll deliver stunning media in 24 hours.
      </p>
      <Link
        href="/book/listing"
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#0077ff] text-white rounded-xl font-medium hover:bg-[#0066dd] transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Book Your First Shoot
      </Link>
    </div>
  )
}
