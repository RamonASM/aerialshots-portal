import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from 'date-fns'

export const metadata: Metadata = {
  title: 'Dashboard | Client Portal',
}

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get client account
  // Note: client_accounts table exists in migration but types need regeneration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: client } = await (supabase as any)
    .from('client_accounts')
    .select('*')
    .eq('auth_user_id', user?.id)
    .single() as { data: { id: string; first_name: string | null; last_name: string | null; email: string } | null }

  // Get recent bookings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bookings } = await (supabase as any)
    .from('client_bookings')
    .select('*')
    .eq('client_id', client?.id)
    .order('created_at', { ascending: false })
    .limit(5) as { data: Array<{ id: string; status: string; property_address: string; property_city: string; property_state: string; created_at: string }> | null }

  // Get media from delivered orders (via share links)
  const clientEmail = client?.email
  const { data: shareLinks } = clientEmail ? await supabase
    .from('share_links')
    .select(`
      id,
      share_token,
      created_at,
      listing:listings(
        id,
        address,
        city,
        ops_status,
        delivered_at
      )
    `)
    .eq('client_email', clientEmail)
    .order('created_at', { ascending: false })
    .limit(5) : { data: null }

  interface BookingRecord { id: string; status: string; property_address: string; property_city: string; property_state: string; created_at: string }
  interface ShareLinkRecord { id: string; share_token: string; created_at: string; listing?: { id?: string; address?: string; city?: string; ops_status?: string; delivered_at?: string } }

  const stats = {
    totalBookings: bookings?.length || 0,
    pendingBookings: bookings?.filter((b: BookingRecord) => ['pending', 'quoted', 'confirmed'].includes(b.status)).length || 0,
    completedBookings: bookings?.filter((b: BookingRecord) => b.status === 'completed').length || 0,
    mediaDeliveries: (shareLinks as ShareLinkRecord[] | null)?.filter((s) => s.listing?.ops_status === 'delivered').length || 0,
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Welcome back{client?.first_name ? `, ${client.first_name}` : ''}
          </h1>
          <p className="text-[#a1a1a6]">
            Manage your bookings and access your property media.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link
            href="/book/listing"
            className="group p-6 bg-gradient-to-br from-[#0077ff] to-[#0055cc] rounded-xl hover:shadow-lg hover:shadow-[#0077ff]/20 transition-all"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-1">Book New Shoot</h3>
            <p className="text-white/70 text-sm">Schedule photography for your property</p>
          </Link>

          <Link
            href="/client/bookings"
            className="group p-6 bg-[#1c1c1e] rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-all"
          >
            <div className="w-12 h-12 bg-[#0a0a0a] rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#0077ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-1">My Bookings</h3>
            <p className="text-[#8e8e93] text-sm">View and manage your scheduled shoots</p>
          </Link>

          <Link
            href="/client/media"
            className="group p-6 bg-[#1c1c1e] rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-all"
          >
            <div className="w-12 h-12 bg-[#0a0a0a] rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-1">My Media</h3>
            <p className="text-[#8e8e93] text-sm">Access photos, videos, and tours</p>
          </Link>

          <Link
            href="/client/settings"
            className="group p-6 bg-[#1c1c1e] rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-all"
          >
            <div className="w-12 h-12 bg-[#0a0a0a] rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#a1a1a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-1">Settings</h3>
            <p className="text-[#8e8e93] text-sm">Manage your account preferences</p>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-[#1c1c1e] rounded-xl border border-white/[0.08]">
            <p className="text-[#8e8e93] text-sm mb-1">Total Bookings</p>
            <p className="text-2xl font-bold text-white">{stats.totalBookings}</p>
          </div>
          <div className="p-4 bg-[#1c1c1e] rounded-xl border border-white/[0.08]">
            <p className="text-[#8e8e93] text-sm mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.pendingBookings}</p>
          </div>
          <div className="p-4 bg-[#1c1c1e] rounded-xl border border-white/[0.08]">
            <p className="text-[#8e8e93] text-sm mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-400">{stats.completedBookings}</p>
          </div>
          <div className="p-4 bg-[#1c1c1e] rounded-xl border border-white/[0.08]">
            <p className="text-[#8e8e93] text-sm mb-1">Media Delivered</p>
            <p className="text-2xl font-bold text-purple-400">{stats.mediaDeliveries}</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Bookings */}
          <div className="bg-[#1c1c1e] rounded-xl border border-white/[0.08] overflow-hidden">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="font-semibold text-white">Recent Bookings</h2>
              <Link href="/client/bookings" className="text-sm text-[#0077ff] hover:text-[#3395ff]">
                View All
              </Link>
            </div>
            {bookings && bookings.length > 0 ? (
              <div className="divide-y divide-white/[0.08]">
                {bookings.map((booking) => (
                  <div key={booking.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-medium">{booking.property_address}</p>
                        <p className="text-[#8e8e93] text-sm">
                          {booking.property_city}, {booking.property_state}
                        </p>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>
                    <p className="text-[#8e8e93] text-xs mt-2">
                      {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-[#8e8e93] mb-4">No bookings yet</p>
                <Link
                  href="/book/listing"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0077ff] text-white rounded-lg text-sm font-medium hover:bg-[#0066dd] transition-colors"
                >
                  Book Your First Shoot
                </Link>
              </div>
            )}
          </div>

          {/* Recent Media */}
          <div className="bg-[#1c1c1e] rounded-xl border border-white/[0.08] overflow-hidden">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="font-semibold text-white">Recent Media</h2>
              <Link href="/client/media" className="text-sm text-[#0077ff] hover:text-[#3395ff]">
                View All
              </Link>
            </div>
            {shareLinks && shareLinks.length > 0 ? (
              <div className="divide-y divide-white/[0.08]">
                {shareLinks.map((link) => (
                  <a
                    key={link.id}
                    href={`/portal/${link.share_token}`}
                    className="block p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-medium">
                          {(link.listing as { address?: string })?.address || 'Property'}
                        </p>
                        <p className="text-[#8e8e93] text-sm">
                          {(link.listing as { city?: string })?.city || 'Unknown'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (link.listing as { ops_status?: string })?.ops_status === 'delivered'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {(link.listing as { ops_status?: string })?.ops_status === 'delivered' ? 'Ready' : 'Processing'}
                      </span>
                    </div>
                    <p className="text-[#8e8e93] text-xs mt-2">
                      {formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}
                    </p>
                  </a>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-[#8e8e93]">No media delivered yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-[#1c1c1e] rounded-xl border border-white/[0.08]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold mb-1">Need Help?</h3>
              <p className="text-[#8e8e93] text-sm">
                Our team is here to assist you with any questions.
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="tel:+14074551985"
                className="flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] rounded-lg text-white text-sm hover:bg-[#151515] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Us
              </a>
              <a
                href="mailto:support@aerialshots.media"
                className="flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] rounded-lg text-white text-sm hover:bg-[#151515] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    quoted: 'bg-blue-500/20 text-blue-400',
    confirmed: 'bg-green-500/20 text-green-400',
    scheduled: 'bg-purple-500/20 text-purple-400',
    completed: 'bg-green-500/20 text-green-400',
    cancelled: 'bg-red-500/20 text-red-400',
    expired: 'bg-[#8e8e93]/20 text-[#8e8e93]',
  }

  const labels = {
    pending: 'Pending',
    quoted: 'Quote Sent',
    confirmed: 'Confirmed',
    scheduled: 'Scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  )
}
