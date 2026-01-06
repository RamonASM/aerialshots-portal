/**
 * Admin Review Requests Page
 *
 * Manage review request automation and view stats
 */

import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getReviewStats, getReviewSettings } from '@/lib/marketing/reviews/service'
import { ReviewsPageClient } from '@/components/admin/marketing/ReviewsPageClient'

export const metadata = {
  title: 'Review Requests | Admin',
  description: 'Manage review request automation',
}

async function getReviewData() {
  const [stats, settings] = await Promise.all([
    getReviewStats(),
    getReviewSettings(),
  ])

  return { stats, settings }
}

export default async function ReviewsPage() {
  // Auth is handled by admin layout - just get the data
  const supabase = createAdminClient()

  const { stats, settings } = await getReviewData()

  // Get recent requests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentRequests } = await (supabase as any)
    .from('review_requests')
    .select(`
      *,
      agent:agents(id, name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  // Get templates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: templates } = await (supabase as any)
    .from('review_request_templates')
    .select('*')
    .order('is_default', { ascending: false })

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold text-white mb-6">Review Requests</h1>

        <Suspense fallback={<LoadingSkeleton />}>
          <ReviewsPageClient
            stats={stats}
            settings={settings}
            recentRequests={recentRequests || []}
            templates={templates || []}
          />
        </Suspense>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
            <div className="h-4 w-20 bg-white/10 rounded mb-2" />
            <div className="h-8 w-16 bg-white/10 rounded" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
        <div className="h-6 w-40 bg-white/10 rounded mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded mb-2" />
        ))}
      </div>
    </div>
  )
}
