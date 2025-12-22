import { Loader2 } from 'lucide-react'

export default function AgentPortfolioLoading() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="h-24 w-24 rounded-full bg-neutral-200 animate-pulse" />
            {/* Info */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse mx-auto sm:mx-0" />
              <div className="h-5 w-64 bg-neutral-200 rounded animate-pulse mx-auto sm:mx-0" />
              <div className="flex gap-3 justify-center sm:justify-start">
                <div className="h-10 w-32 bg-neutral-200 rounded animate-pulse" />
                <div className="h-10 w-32 bg-neutral-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="bg-white border-b border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <div className="h-8 w-16 bg-neutral-200 rounded animate-pulse mx-auto" />
                <div className="h-4 w-24 bg-neutral-200 rounded animate-pulse mx-auto mt-2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Listings Grid Skeleton */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-lg overflow-hidden bg-white shadow-sm">
              <div className="aspect-[4/3] bg-neutral-200 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 w-3/4 bg-neutral-200 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-neutral-200 rounded animate-pulse" />
                <div className="flex gap-4">
                  <div className="h-4 w-16 bg-neutral-200 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-neutral-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loading Indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-white">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading portfolio...</span>
      </div>
    </div>
  )
}
