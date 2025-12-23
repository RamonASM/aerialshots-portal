'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Trash2, Lightbulb, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { Database } from '@/lib/supabase/types'

type AgentTip = Database['public']['Tables']['agent_tips']['Row']

interface ListingOption {
  id: string
  address: string
  city: string | null
  state: string
}

interface TipFormData {
  tip_text: string
  listing_id: string
  category: string
}

export default function TipsPage() {
  const [tips, setTips] = useState<AgentTip[]>([])
  const [listings, setListings] = useState<ListingOption[]>([])
  const [agentId, setAgentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TipFormData>()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!agent) return

      setAgentId(agent.id)

      // Load tips
      const { data: tipsData } = await supabase
        .from('agent_tips')
        .select('*')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })

      if (tipsData) setTips(tipsData)

      // Load listings for dropdown
      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, address, city, state')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })

      if (listingsData) setListings(listingsData)

      setLoading(false)
    }

    loadData()
  }, [supabase])

  const onSubmit = async (data: TipFormData) => {
    if (!agentId) return

    setSaving(true)

    const { data: newTip, error } = await supabase
      .from('agent_tips')
      .insert({
        agent_id: agentId,
        listing_id: data.listing_id || null,
        tip_text: data.tip_text,
        category: data.category || null,
      })
      .select()
      .single()

    if (!error && newTip) {
      setTips([newTip, ...tips])
      reset()
      setShowForm(false)
    }

    setSaving(false)
  }

  const deleteTip = async (tipId: string) => {
    const { error } = await supabase
      .from('agent_tips')
      .delete()
      .eq('id', tipId)

    if (!error) {
      setTips(tips.filter((t) => t.id !== tipId))
    }
  }

  const getListingAddress = (listingId: string | null) => {
    if (!listingId) return 'All Listings'
    const listing = listings.find((l) => l.id === listingId)
    return listing ? `${listing.address}, ${listing.city}` : 'Unknown Listing'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#636366]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-white">Agent Tips</h1>
          <p className="mt-1 text-[#a1a1a6]">
            Share insider knowledge that appears on your property pages.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tip
        </Button>
      </div>

      {/* Add Tip Form */}
      {showForm && (
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
          <h2 className="font-semibold text-white">New Tip</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="tip_text" className="text-[#a1a1a6]">Tip Text *</Label>
              <Textarea
                id="tip_text"
                {...register('tip_text', { required: 'Tip text is required' })}
                placeholder="Share something helpful about this property or neighborhood..."
                rows={3}
                className="mt-1"
              />
              {errors.tip_text && (
                <p className="mt-1 text-[13px] text-red-400">{errors.tip_text.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="listing_id" className="text-[#a1a1a6]">Apply to Listing</Label>
                <select
                  id="listing_id"
                  {...register('listing_id')}
                  className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-[15px] text-white focus:border-[#0077ff] focus:outline-none focus:ring-1 focus:ring-[#0077ff]"
                >
                  <option value="">All Listings (General Tip)</option>
                  {listings.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.address}, {listing.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="category" className="text-[#a1a1a6]">Category</Label>
                <select
                  id="category"
                  {...register('category')}
                  className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-[15px] text-white focus:border-[#0077ff] focus:outline-none focus:ring-1 focus:ring-[#0077ff]"
                >
                  <option value="">Select category</option>
                  <option value="neighborhood">Neighborhood</option>
                  <option value="schools">Schools</option>
                  <option value="commute">Commute</option>
                  <option value="lifestyle">Lifestyle</option>
                  <option value="investment">Investment</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Tip'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tips List */}
      {tips.length > 0 ? (
        <div className="space-y-4">
          {tips.map((tip) => (
            <div
              key={tip.id}
              className="flex items-start gap-4 rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30">
                <Lightbulb className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-white">{tip.tip_text}</p>
                <div className="mt-2 flex items-center gap-4 text-[13px] text-[#636366]">
                  <span>{getListingAddress(tip.listing_id)}</span>
                  {tip.category && (
                    <span className="rounded-full bg-white/5 border border-white/[0.08] px-2 py-0.5 text-[11px] text-[#a1a1a6]">
                      {tip.category}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteTip(tip.id)}
                className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-12 text-center">
          <Lightbulb className="mx-auto h-12 w-12 text-[#636366]" />
          <h3 className="mt-4 font-semibold text-white">No tips yet</h3>
          <p className="mt-2 text-[#a1a1a6]">
            Add tips to share insider knowledge on your property pages.
          </p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Tip
          </Button>
        </div>
      )}
    </div>
  )
}
