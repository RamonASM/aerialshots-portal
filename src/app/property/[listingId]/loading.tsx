import { Loader2 } from 'lucide-react'

export default function PropertyLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Skeleton */}
      <div className="relative h-[50vh] bg-neutral-200 animate-pulse" />

      {/* Property Details Skeleton */}
      <div className="border-b border-neutral-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-neutral-200 rounded animate-pulse" />
              <div className="h-5 w-48 bg-neutral-200 rounded animate-pulse" />
            </div>
            <div className="h-10 w-32 bg-neutral-200 rounded animate-pulse" />
          </div>
          <div className="mt-4 flex gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 w-20 bg-neutral-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Photo Gallery Skeleton */}
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[4/3] bg-neutral-200 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="h-12 w-full bg-neutral-200 rounded-lg animate-pulse" />
            <div className="h-64 bg-neutral-200 rounded-lg animate-pulse" />
            <div className="h-80 bg-neutral-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-white">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading property...</span>
      </div>
    </div>
  )
}
