import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CommunityNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200">
          <MapPin className="h-8 w-8 text-neutral-400" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">Community Not Found</h1>
        <p className="mt-2 text-neutral-600">
          We couldn&apos;t find the community you&apos;re looking for.
        </p>
        <div className="mt-6 flex gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Browse Listings</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
