import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Package,
  Phone,
  Mail,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  Home,
  FileText,
} from 'lucide-react'
import { formatCurrency } from '@/lib/pricing/config'
import { toDollars } from '@/lib/payments/stripe'
import { OrderMessages } from '@/components/dashboard/OrderMessages'

// Status badge colors
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Pending Payment' },
  paid: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Paid' },
  confirmed: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Confirmed' },
  scheduled: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Scheduled' },
  in_progress: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'In Progress' },
  completed: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Completed' },
  delivered: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Delivered' },
  cancelled: { bg: 'bg-neutral-500/10', text: 'text-neutral-400', label: 'Cancelled' },
  refunded: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Refunded' },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get agent
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name')
    .eq('email', user.email!)
    .single()

  if (!agent) {
    redirect('/login')
  }

  // Get order
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('agent_id', agent.id)
    .single()

  if (!order) {
    notFound()
  }

  // Get status history
  const { data: statusHistory } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  // Get client messages if order has a listing
  let clientMessages: any[] = []
  if (order.listing_id) {
    const { data: messages } = await supabase
      .from('client_messages')
      .select('*')
      .eq('listing_id', order.listing_id)
      .order('created_at', { ascending: true })
    clientMessages = messages || []
  }

  const status = STATUS_STYLES[order.status] || STATUS_STYLES.pending
  const services = (order.services as any[]) || []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">
              {order.package_name} Package
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
          <p className="text-neutral-400">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {formatCurrency(toDollars(order.total_cents))}
          </div>
          <div className="text-sm text-neutral-500">
            {order.payment_status === 'succeeded' ? 'Paid' : 'Payment pending'}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Property Info */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-400" />
              Property Details
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Address</p>
                <p className="text-white flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 text-neutral-400" />
                  <span>
                    {order.property_address}
                    <br />
                    {order.property_city}, {order.property_state} {order.property_zip}
                  </span>
                </p>
              </div>

              {(order.property_beds || order.property_baths || order.property_sqft) && (
                <div className="flex gap-6 text-sm">
                  {order.property_beds && (
                    <div>
                      <span className="text-neutral-500">Beds:</span>{' '}
                      <span className="text-white">{order.property_beds}</span>
                    </div>
                  )}
                  {order.property_baths && (
                    <div>
                      <span className="text-neutral-500">Baths:</span>{' '}
                      <span className="text-white">{order.property_baths}</span>
                    </div>
                  )}
                  {order.property_sqft && (
                    <div>
                      <span className="text-neutral-500">Sqft:</span>{' '}
                      <span className="text-white">{order.property_sqft.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Schedule */}
          {order.scheduled_at && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Scheduled Shoot
              </h2>

              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Date</p>
                  <p className="text-white font-medium">
                    {formatDate(order.scheduled_at)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Time</p>
                  <p className="text-white font-medium">
                    {formatTime(order.scheduled_at)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Services */}
          {services.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-green-400" />
                Add-on Services
              </h2>

              <ul className="space-y-2">
                {services.map((service: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>{service.id || service.name}</span>
                    {service.quantity && service.quantity > 1 && (
                      <span className="text-neutral-500">x{service.quantity}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Special Instructions */}
          {order.special_instructions && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                Special Instructions
              </h2>
              <p className="text-neutral-300 whitespace-pre-wrap">
                {order.special_instructions}
              </p>
            </div>
          )}

          {/* Status History */}
          {statusHistory && statusHistory.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-neutral-400" />
                Status History
              </h2>

              <div className="space-y-3">
                {statusHistory.map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-neutral-600 mt-1.5" />
                    <div>
                      <p className="text-neutral-300">
                        Status changed to{' '}
                        <span className="font-medium text-white">
                          {entry.new_status}
                        </span>
                      </p>
                      <p className="text-neutral-500 text-xs">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client Messages */}
          <OrderMessages
            listingId={order.listing_id}
            messages={clientMessages}
            agentName={agent.name}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="font-semibold text-white mb-4">Contact</h2>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-neutral-500 mb-0.5">Name</p>
                <p className="text-white">{order.contact_name}</p>
              </div>
              <div>
                <p className="text-neutral-500 mb-0.5">Email</p>
                <a
                  href={`mailto:${order.contact_email}`}
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  {order.contact_email}
                </a>
              </div>
              {order.contact_phone && (
                <div>
                  <p className="text-neutral-500 mb-0.5">Phone</p>
                  <a
                    href={`tel:${order.contact_phone}`}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    {order.contact_phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Subtotal</span>
                <span className="text-white">
                  {formatCurrency(toDollars(order.subtotal_cents))}
                </span>
              </div>
              {order.discount_cents > 0 && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Discount</span>
                  <span className="text-green-400">
                    -{formatCurrency(toDollars(order.discount_cents))}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-neutral-800">
                <span className="font-medium text-white">Total</span>
                <span className="font-bold text-white">
                  {formatCurrency(toDollars(order.total_cents))}
                </span>
              </div>
              <div className="pt-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                    order.payment_status === 'succeeded'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}
                >
                  {order.payment_status === 'succeeded' ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  {order.payment_status === 'succeeded' ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Need Help */}
          <div className="bg-neutral-800/50 border border-neutral-800 rounded-xl p-6">
            <h3 className="font-medium text-white mb-2">Need Help?</h3>
            <p className="text-sm text-neutral-400 mb-4">
              Contact our support team for any questions about your order.
            </p>
            <a
              href="mailto:support@aerialshots.media"
              className="block w-full py-2 px-4 bg-neutral-700 text-white text-center rounded-lg hover:bg-neutral-600 transition-colors text-sm"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
