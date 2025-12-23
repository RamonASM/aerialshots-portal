import { Loader2 } from 'lucide-react'

export default function AgentPortfolioLoading() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header Skeleton */}
      <div className="border-b border-white/[0.08] bg-[#1c1c1e]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="h-24 w-24 rounded-full bg-white/10 animate-pulse" />
            {/* Info */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div className="h-8 w-48 bg-white/10 rounded-lg animate-pulse mx-auto sm:mx-0" />
              <div className="h-5 w-64 bg-white/10 rounded-lg animate-pulse mx-auto sm:mx-0" />
              <div className="flex gap-3 justify-center sm:justify-start">
                <div className="h-10 w-32 bg-white/10 rounded-xl animate-pulse" />
                <div className="h-10 w-32 bg-white/10 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="border-b border-white/[0.08] bg-[#0a0a0a]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <div className="h-8 w-16 bg-white/10 rounded-lg animate-pulse mx-auto" />
                <div className="h-4 w-24 bg-white/10 rounded-lg animate-pulse mx-auto mt-2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Listings Grid Skeleton */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="h-8 w-48 bg-white/10 rounded-lg animate-pulse" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-[#1c1c1e] border border-white/[0.08]">
              <div className="aspect-[4/3] bg-white/10 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 w-3/4 bg-white/10 rounded-lg animate-pulse" />
                <div className="h-4 w-1/2 bg-white/10 rounded-lg animate-pulse" />
                <div className="flex gap-4">
                  <div className="h-4 w-16 bg-white/10 rounded-lg animate-pulse" />
                  <div className="h-4 w-16 bg-white/10 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loading Indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-[#1c1c1e] border border-white/[0.08] px-4 py-2 text-white">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-[13px]">Loading portfolio...</span>
      </div>
    </div>
  )
}
