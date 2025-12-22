import { Loader2 } from 'lucide-react'

export default function CommunityLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Skeleton */}
      <div className="relative h-[400px] bg-neutral-200 animate-pulse">
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="mx-auto max-w-7xl">
            <div className="h-12 w-64 bg-neutral-300 rounded mb-4" />
            <div className="h-6 w-96 bg-neutral-300 rounded" />
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Overview */}
            <div className="space-y-4">
              <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-neutral-200 rounded animate-pulse" />
                <div className="h-4 w-full bg-neutral-200 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-neutral-200 rounded animate-pulse" />
              </div>
            </div>

            {/* Subdivisions */}
            <div className="space-y-4">
              <div className="h-8 w-48 bg-neutral-200 rounded animate-pulse" />
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-40 bg-neutral-200 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="h-64 bg-neutral-200 rounded-lg animate-pulse" />
            <div className="h-48 bg-neutral-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-white">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading community...</span>
      </div>
    </div>
  )
}
