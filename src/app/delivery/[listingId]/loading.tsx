import { Loader2 } from 'lucide-react'

export default function DeliveryLoading() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header Skeleton */}
      <header className="border-b border-neutral-800 bg-neutral-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="h-8 w-40 bg-neutral-800 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-neutral-800 rounded animate-pulse" />
            <div className="h-9 w-24 bg-neutral-800 rounded animate-pulse" />
          </div>
        </div>
      </header>

      {/* Hero Skeleton */}
      <div className="relative h-[40vh] bg-neutral-900 animate-pulse">
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="mx-auto max-w-7xl">
            <div className="h-10 w-80 bg-neutral-800 rounded mb-3" />
            <div className="h-6 w-48 bg-neutral-800 rounded" />
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="border-b border-neutral-800 bg-neutral-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 w-24 bg-neutral-800 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-[4/3] bg-neutral-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Loading Indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-2 text-white">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading your media...</span>
      </div>
    </div>
  )
}
