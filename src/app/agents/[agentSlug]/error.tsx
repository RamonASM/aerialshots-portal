'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function AgentPortfolioError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-neutral-900">
          Unable to Load Portfolio
        </h2>
        <p className="mt-3 text-neutral-600">
          {error.message || 'Something went wrong while loading this agent portfolio.'}
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button onClick={() => reset()} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <a href="/">Go Home</a>
          </Button>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-neutral-400">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
