'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Users,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  CheckCircle,
  Flame,
  Filter,
  Trash2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/types'

type Lead = Database['public']['Tables']['leads']['Row'] & {
  listing?: { address: string; city: string; state: string } | null
}

type FilterStatus = 'all' | 'new' | 'contacted' | 'closed'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadLeads() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!agent) return

      const { data } = await supabase
        .from('leads')
        .select(`
          *,
          listing:listings (address, city, state)
        `)
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })

      if (data) setLeads(data as unknown as Lead[])
      setLoading(false)
    }

    loadLeads()
  }, [supabase])

  // Filter leads based on selected filter
  const filteredLeads = useMemo(() => {
    if (filter === 'all') return leads
    return leads.filter((l) => l.status === filter)
  }, [leads, filter])

  // Count by status
  const counts = useMemo(() => ({
    all: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    closed: leads.filter((l) => l.status === 'closed').length,
  }), [leads])

  // Check if lead is "hot" (less than 24 hours old)
  const isHotLead = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
    return hoursAgo < 24
  }

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // Select all visible
  const selectAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredLeads.map((l) => l.id)))
    }
  }

  // Bulk update status
  const bulkUpdateStatus = async (status: string) => {
    if (selectedIds.size === 0) return
    setBulkActionLoading(true)

    const ids = Array.from(selectedIds)
    const { error } = await supabase
      .from('leads')
      .update({ status })
      .in('id', ids)

    if (!error) {
      setLeads(leads.map((l) =>
        selectedIds.has(l.id) ? { ...l, status } : l
      ))
      setSelectedIds(new Set())
    }

    setBulkActionLoading(false)
  }

  // Update single lead status
  const updateLeadStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)

    if (!error) {
      setLeads(leads.map((l) => (l.id === id ? { ...l, status } : l)))
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const hoursAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (hoursAgo < 1) {
      const minsAgo = Math.floor(hoursAgo * 60)
      return `${minsAgo}m ago`
    }
    if (hoursAgo < 24) {
      return `${Math.floor(hoursAgo)}h ago`
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#636366]" />
      </div>
    )
  }

  const filterTabs: { key: FilterStatus; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: 'text-white' },
    { key: 'new', label: 'New', color: 'text-amber-400' },
    { key: 'contacted', label: 'Contacted', color: 'text-[#0077ff]' },
    { key: 'closed', label: 'Closed', color: 'text-green-500' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-white">Leads</h1>
          <p className="mt-1 text-[#a1a1a6]">
            Inquiries from your property and lifestyle pages.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <p className="text-[13px] text-[#636366]">Total</p>
          <p className="text-[28px] font-semibold text-white">{counts.all}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <p className="text-[13px] text-[#636366]">New</p>
            {counts.new > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-black">
                {counts.new}
              </span>
            )}
          </div>
          <p className="text-[28px] font-semibold text-amber-400">{counts.new}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <p className="text-[13px] text-[#636366]">Contacted</p>
          <p className="text-[28px] font-semibold text-[#0077ff]">{counts.contacted}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <p className="text-[13px] text-[#636366]">Closed</p>
          <p className="text-[28px] font-semibold text-green-500">{counts.closed}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-4">
        <Filter className="h-4 w-4 text-[#636366]" />
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setFilter(tab.key)
              setSelectedIds(new Set())
            }}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${
              filter === tab.key
                ? 'bg-white/10 ' + tab.color
                : 'text-[#636366] hover:text-[#a1a1a6] hover:bg-white/5'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-[11px] opacity-60">({counts[tab.key]})</span>
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-[#0077ff]/30 bg-[#0077ff]/10 p-4">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#0077ff] font-medium">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[13px] text-[#a1a1a6] hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkUpdateStatus('contacted')}
              disabled={bulkActionLoading}
            >
              {bulkActionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Mark Contacted</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkUpdateStatus('closed')}
              disabled={bulkActionLoading}
              className="text-green-400 hover:text-green-400"
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              Close All
            </Button>
          </div>
        </div>
      )}

      {/* Leads List */}
      {filteredLeads.length > 0 ? (
        <div className="space-y-3">
          {/* Select All Header */}
          {filteredLeads.length > 1 && (
            <div className="flex items-center gap-3 px-4">
              <button
                onClick={selectAll}
                className={`h-5 w-5 rounded border transition-all ${
                  selectedIds.size === filteredLeads.length
                    ? 'border-[#0077ff] bg-[#0077ff]'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                {selectedIds.size === filteredLeads.length && (
                  <CheckCircle className="h-full w-full text-white p-0.5" />
                )}
              </button>
              <span className="text-[13px] text-[#636366]">
                {selectedIds.size === filteredLeads.length ? 'Deselect all' : 'Select all'}
              </span>
            </div>
          )}

          {filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              isHot={lead.created_at ? isHotLead(lead.created_at) : false}
              isSelected={selectedIds.has(lead.id)}
              onToggleSelect={() => toggleSelection(lead.id)}
              onUpdateStatus={(status) => updateLeadStatus(lead.id, status)}
              formatDate={formatDate}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-[#636366]" />
          <h3 className="mt-4 font-semibold text-white">
            {filter === 'all' ? 'No leads yet' : `No ${filter} leads`}
          </h3>
          <p className="mt-2 text-[#a1a1a6]">
            {filter === 'all'
              ? 'Leads will appear here when potential buyers inquire through your property pages.'
              : `You don't have any leads with "${filter}" status.`}
          </p>
        </div>
      )}
    </div>
  )
}

function LeadCard({
  lead,
  isHot,
  isSelected,
  onToggleSelect,
  onUpdateStatus,
  formatDate,
}: {
  lead: Lead
  isHot: boolean
  isSelected: boolean
  onToggleSelect: () => void
  onUpdateStatus: (status: string) => void
  formatDate: (date: string) => string
}) {
  const statusColors: Record<string, string> = {
    new: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    contacted: 'bg-[#0077ff]/20 text-[#3395ff] border-[#0077ff]/30',
    closed: 'bg-green-500/20 text-green-400 border-green-500/30',
  }

  return (
    <div
      className={`rounded-xl border bg-[#1c1c1e] p-5 transition-all ${
        isSelected ? 'border-[#0077ff]/50 bg-[#0077ff]/5' : 'border-white/[0.08]'
      }`}
    >
      <div className="flex gap-4">
        {/* Checkbox */}
        <button
          onClick={onToggleSelect}
          className={`mt-1 h-5 w-5 flex-shrink-0 rounded border transition-all ${
            isSelected
              ? 'border-[#0077ff] bg-[#0077ff]'
              : 'border-white/20 hover:border-white/40'
          }`}
        >
          {isSelected && <CheckCircle className="h-full w-full text-white p-0.5" />}
        </button>

        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-white">{lead.name}</h3>

                {/* Hot Lead Badge */}
                {isHot && lead.status === 'new' && (
                  <span className="flex items-center gap-1 rounded-full bg-orange-500/20 border border-orange-500/30 px-2 py-0.5 text-[11px] font-medium text-orange-400">
                    <Flame className="h-3 w-3" />
                    Hot
                  </span>
                )}

                {/* Status Badge */}
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    statusColors[lead.status || ''] || 'bg-white/5 text-[#a1a1a6] border-white/[0.08]'
                  }`}
                >
                  {lead.status?.toUpperCase()}
                </span>
              </div>

              <div className="mt-2 space-y-1">
                <p className="flex items-center gap-2 text-[13px] text-[#a1a1a6]">
                  <Mail className="h-4 w-4" />
                  <a
                    href={`mailto:${lead.email}`}
                    className="hover:text-[#0077ff] transition-colors"
                  >
                    {lead.email}
                  </a>
                </p>
                {lead.phone && (
                  <p className="flex items-center gap-2 text-[13px] text-[#a1a1a6]">
                    <Phone className="h-4 w-4" />
                    <a
                      href={`tel:${lead.phone}`}
                      className="hover:text-[#0077ff] transition-colors"
                    >
                      {lead.phone}
                    </a>
                  </p>
                )}
                {lead.listing && (
                  <p className="flex items-center gap-2 text-[13px] text-[#a1a1a6]">
                    <MapPin className="h-4 w-4" />
                    {lead.listing.address}, {lead.listing.city}, {lead.listing.state}
                  </p>
                )}
                <p className="flex items-center gap-2 text-[13px] text-[#636366]">
                  <Clock className="h-4 w-4" />
                  {lead.created_at ? formatDate(lead.created_at) : 'Unknown'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateStatus('contacted')}
                disabled={lead.status !== 'new'}
              >
                Mark Contacted
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateStatus('closed')}
                disabled={lead.status === 'closed'}
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Close
              </Button>
            </div>
          </div>

          {lead.message && (
            <div className="mt-4 rounded-xl bg-[#0a0a0a] border border-white/[0.08] p-4">
              <div className="flex items-start gap-2">
                <MessageSquare className="mt-0.5 h-4 w-4 text-[#636366]" />
                <p className="text-[13px] text-[#a1a1a6]">{lead.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
