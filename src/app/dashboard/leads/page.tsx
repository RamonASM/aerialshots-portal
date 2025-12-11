import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users, Mail, Phone, MessageSquare, MapPin, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function LeadsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get agent
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('email', user.email!)
    .single()

  if (!agent) {
    redirect('/login')
  }

  // Get leads with listing info
  const { data: leads } = await supabase
    .from('leads')
    .select(`
      *,
      listing:listings (address, city, state)
    `)
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })

  const newLeads = leads?.filter((l) => l.status === 'new') || []
  const contactedLeads = leads?.filter((l) => l.status === 'contacted') || []
  const closedLeads = leads?.filter((l) => l.status === 'closed') || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Leads</h1>
        <p className="mt-1 text-neutral-600">
          Inquiries from your property and lifestyle pages.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-600">New</p>
          <p className="text-2xl font-bold text-amber-600">{newLeads.length}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-600">Contacted</p>
          <p className="text-2xl font-bold text-blue-600">{contactedLeads.length}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-600">Closed</p>
          <p className="text-2xl font-bold text-green-600">{closedLeads.length}</p>
        </div>
      </div>

      {/* Leads List */}
      {leads && leads.length > 0 ? (
        <div className="space-y-4">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-neutral-300" />
          <h3 className="mt-4 font-semibold text-neutral-900">No leads yet</h3>
          <p className="mt-2 text-neutral-600">
            Leads will appear here when potential buyers inquire through your property pages.
          </p>
        </div>
      )}
    </div>
  )
}

function LeadCard({ lead }: { lead: any }) {
  const statusColors: Record<string, string> = {
    new: 'bg-amber-100 text-amber-700',
    contacted: 'bg-blue-100 text-blue-700',
    closed: 'bg-green-100 text-green-700',
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-neutral-900">{lead.name}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                statusColors[lead.status] || 'bg-neutral-100 text-neutral-700'
              }`}
            >
              {lead.status?.toUpperCase()}
            </span>
          </div>

          <div className="mt-2 space-y-1">
            <p className="flex items-center gap-2 text-sm text-neutral-600">
              <Mail className="h-4 w-4" />
              <a href={`mailto:${lead.email}`} className="hover:underline">
                {lead.email}
              </a>
            </p>
            {lead.phone && (
              <p className="flex items-center gap-2 text-sm text-neutral-600">
                <Phone className="h-4 w-4" />
                <a href={`tel:${lead.phone}`} className="hover:underline">
                  {lead.phone}
                </a>
              </p>
            )}
            {lead.listing && (
              <p className="flex items-center gap-2 text-sm text-neutral-600">
                <MapPin className="h-4 w-4" />
                {lead.listing.address}, {lead.listing.city}, {lead.listing.state}
              </p>
            )}
            <p className="flex items-center gap-2 text-sm text-neutral-500">
              <Clock className="h-4 w-4" />
              {formatDate(lead.created_at)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <form action={`/api/leads/${lead.id}/status`} method="POST">
            <input type="hidden" name="status" value="contacted" />
            <Button variant="outline" size="sm" type="submit" disabled={lead.status !== 'new'}>
              Mark Contacted
            </Button>
          </form>
          <form action={`/api/leads/${lead.id}/status`} method="POST">
            <input type="hidden" name="status" value="closed" />
            <Button variant="outline" size="sm" type="submit" disabled={lead.status === 'closed'}>
              <CheckCircle className="mr-1 h-4 w-4" />
              Close
            </Button>
          </form>
        </div>
      </div>

      {lead.message && (
        <div className="mt-4 rounded-lg bg-neutral-50 p-4">
          <div className="flex items-start gap-2">
            <MessageSquare className="mt-0.5 h-4 w-4 text-neutral-400" />
            <p className="text-sm text-neutral-700">{lead.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
