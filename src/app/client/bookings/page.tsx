'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format, formatDistanceToNow, isToday as isTodayDate } from 'date-fns'

// Helper to check if a date string is today
function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  return isTodayDate(new Date(dateStr))
}
import { Calendar, Clock, Package, DollarSign, ChevronRight, X, Check, MapPin, Phone, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PhotographerTracker } from '@/components/client/PhotographerTracker'

interface Booking {
  id: string
  listing_id: string | null
  property_address: string
  property_city: string
  property_state: string
  property_zip: string
  package_name: string | null
  services: string[] | null
  status: string
  preferred_date: string | null
  preferred_time_slot: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  estimated_price: number | null
  quoted_price: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

type TabType = 'active' | 'completed' | 'cancelled'

export default function ClientBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  async function fetchBookings() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get client account
    // Note: client_accounts table exists but types need regeneration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: client } = await (supabase as any)
      .from('client_accounts')
      .select('id')
      .eq('auth_user_id', user.id)
      .single() as { data: { id: string } | null }

    if (!client) {
      setLoading(false)
      return
    }

    // Get all bookings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bookingsData } = await (supabase as any)
      .from('client_bookings')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false }) as { data: Booking[] | null }

    setBookings(bookingsData || [])
    setLoading(false)
  }

  async function handleAcceptQuote(bookingId: string) {
    setActionLoading(bookingId)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('client_bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)

      setBookings(prev => prev.map(b =>
        b.id === bookingId ? { ...b, status: 'confirmed' } : b
      ))
    } catch (error) {
      console.error('Error accepting quote:', error)
    }
    setActionLoading(null)
  }

  async function handleCancelBooking(bookingId: string) {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    setActionLoading(bookingId)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('client_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      setBookings(prev => prev.map(b =>
        b.id === bookingId ? { ...b, status: 'cancelled' } : b
      ))
    } catch (error) {
      console.error('Error cancelling booking:', error)
    }
    setActionLoading(null)
  }

  const activeStatuses = ['pending', 'quoted', 'confirmed', 'scheduled']
  const completedStatuses = ['completed']
  const cancelledStatuses = ['cancelled', 'expired']

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'active') return activeStatuses.includes(b.status)
    if (activeTab === 'completed') return completedStatuses.includes(b.status)
    return cancelledStatuses.includes(b.status)
  })

  const counts = {
    active: bookings.filter(b => activeStatuses.includes(b.status)).length,
    completed: bookings.filter(b => completedStatuses.includes(b.status)).length,
    cancelled: bookings.filter(b => cancelledStatuses.includes(b.status)).length,
  }

  if (loading) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-[#1c1c1e] rounded-lg w-48" />
            <div className="h-12 bg-[#1c1c1e] rounded-xl" />
            <div className="h-48 bg-[#1c1c1e] rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

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
          <TabButton
            active={activeTab === 'active'}
            count={counts.active}
            onClick={() => setActiveTab('active')}
          >
            Active
          </TabButton>
          <TabButton
            active={activeTab === 'completed'}
            count={counts.completed}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </TabButton>
          <TabButton
            active={activeTab === 'cancelled'}
            count={counts.cancelled}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled
          </TabButton>
        </div>

        {/* Bookings List */}
        {filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onAcceptQuote={() => handleAcceptQuote(booking.id)}
                onCancel={() => handleCancelBooking(booking.id)}
                isLoading={actionLoading === booking.id}
              />
            ))}
          </div>
        ) : (
          <EmptyState tab={activeTab} />
        )}

        {/* Contact Support */}
        <div className="mt-8 p-6 bg-[#1c1c1e] rounded-xl border border-white/[0.08]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold mb-1">Questions about a booking?</h3>
              <p className="text-[#8e8e93] text-sm">
                Our team is available to help with scheduling changes or special requests.
              </p>
            </div>
            <a
              href="tel:+14074551985"
              className="flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] rounded-lg text-white text-sm hover:bg-[#151515] transition-colors whitespace-nowrap"
            >
              <Phone className="w-4 h-4" />
              (407) 455-1985
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function TabButton({
  children,
  active = false,
  count = 0,
  onClick
}: {
  children: React.ReactNode
  active?: boolean
  count?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
        active
          ? 'bg-[#0a0a0a] text-white'
          : 'text-[#8e8e93] hover:text-white'
      }`}
    >
      {children}
      {count > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-xs ${
          active ? 'bg-[#0077ff] text-white' : 'bg-white/10'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

function BookingCard({
  booking,
  onAcceptQuote,
  onCancel,
  isLoading
}: {
  booking: Booking
  onAcceptQuote: () => void
  onCancel: () => void
  isLoading: boolean
}) {
  const statusConfig = {
    pending: { label: 'Pending Quote', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
    quoted: { label: 'Quote Ready', color: 'bg-blue-500/20 text-blue-400', icon: DollarSign },
    confirmed: { label: 'Confirmed', color: 'bg-green-500/20 text-green-400', icon: Check },
    scheduled: { label: 'Scheduled', color: 'bg-purple-500/20 text-purple-400', icon: Calendar },
    completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400', icon: Check },
    cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400', icon: X },
    expired: { label: 'Expired', color: 'bg-[#8e8e93]/20 text-[#8e8e93]', icon: Clock },
  }

  const status = statusConfig[booking.status as keyof typeof statusConfig] || statusConfig.pending
  const price = booking.quoted_price || booking.estimated_price
  const StatusIcon = status.icon

  return (
    <div className="bg-[#1c1c1e] rounded-xl border border-white/[0.08] overflow-hidden hover:border-white/[0.12] transition-colors">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#0a0a0a] rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-[#0077ff]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-0.5">{booking.property_address}</h3>
              <p className="text-[#8e8e93] text-sm">
                {booking.property_city}, {booking.property_state} {booking.property_zip}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${status.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 p-4 bg-[#0a0a0a] rounded-xl">
          <div>
            <div className="flex items-center gap-1.5 text-[#8e8e93] text-xs mb-1">
              <Package className="w-3.5 h-3.5" />
              Package
            </div>
            <p className="text-white text-sm font-medium">{booking.package_name || 'TBD'}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[#8e8e93] text-xs mb-1">
              <Calendar className="w-3.5 h-3.5" />
              {booking.scheduled_date ? 'Scheduled' : 'Preferred'}
            </div>
            <p className="text-white text-sm font-medium">
              {booking.scheduled_date
                ? format(new Date(booking.scheduled_date), 'MMM d, yyyy')
                : booking.preferred_date
                  ? format(new Date(booking.preferred_date), 'MMM d, yyyy')
                  : 'Flexible'}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[#8e8e93] text-xs mb-1">
              <Clock className="w-3.5 h-3.5" />
              Time
            </div>
            <p className="text-white text-sm font-medium capitalize">
              {booking.scheduled_time || booking.preferred_time_slot || 'Any'}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[#8e8e93] text-xs mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              {booking.quoted_price ? 'Quote' : 'Estimate'}
            </div>
            <p className="text-white text-sm font-medium">
              {price ? `$${price.toLocaleString()}` : 'Pending'}
            </p>
          </div>
        </div>

        {/* Services */}
        {booking.services && booking.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {booking.services.map((service, i) => (
              <span key={i} className="px-2 py-1 bg-white/[0.05] rounded-full text-xs text-[#a1a1a6]">
                {service}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {booking.notes && (
          <p className="text-[#8e8e93] text-sm mb-4 italic">&quot;{booking.notes}&quot;</p>
        )}

        {/* Photographer Tracker - Show for scheduled bookings with listing_id */}
        {booking.status === 'scheduled' && booking.listing_id && isToday(booking.scheduled_date) && (
          <div className="mb-4">
            <PhotographerTracker
              listingId={booking.listing_id}
              propertyAddress={`${booking.property_address}, ${booking.property_city}`}
              scheduledTime={booking.scheduled_time || undefined}
            />
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[#636366] text-xs mb-4">
          Requested {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-white/[0.08]">
          {booking.status === 'quoted' && (
            <button
              onClick={onAcceptQuote}
              disabled={isLoading}
              className="flex-1 py-2.5 bg-[#0077ff] text-white rounded-lg text-sm font-medium hover:bg-[#0066dd] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Accept Quote
                </>
              )}
            </button>
          )}
          {['pending', 'quoted'].includes(booking.status) && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="py-2.5 px-4 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
          <Link
            href={`/book/listing`}
            className="py-2.5 px-4 text-[#a1a1a6] rounded-lg text-sm font-medium hover:bg-white/[0.05] transition-colors ml-auto flex items-center gap-2"
          >
            View Details
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ tab }: { tab: TabType }) {
  const messages = {
    active: {
      title: 'No Active Bookings',
      description: 'Book your first property photography shoot and we\'ll deliver stunning media in 24 hours.',
      showCta: true
    },
    completed: {
      title: 'No Completed Bookings',
      description: 'Your completed shoots will appear here once the media has been delivered.',
      showCta: false
    },
    cancelled: {
      title: 'No Cancelled Bookings',
      description: 'Any cancelled or expired bookings will appear here.',
      showCta: false
    }
  }

  const msg = messages[tab]

  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-[#1c1c1e] rounded-full flex items-center justify-center mx-auto mb-6">
        <Calendar className="w-10 h-10 text-[#8e8e93]" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{msg.title}</h3>
      <p className="text-[#8e8e93] mb-6 max-w-sm mx-auto">
        {msg.description}
      </p>
      {msg.showCta && (
        <Link
          href="/book/listing"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#0077ff] text-white rounded-xl font-medium hover:bg-[#0066dd] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Book Your First Shoot
        </Link>
      )}
    </div>
  )
}
