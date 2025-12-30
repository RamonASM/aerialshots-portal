'use client'

import { Lock, Camera, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface SellerAccessLockedProps {
  opsStatus: string | null
  deliveredAt: string | null
}

export function SellerAccessLocked({ opsStatus, deliveredAt }: SellerAccessLockedProps) {
  // Determine the appropriate message based on status
  let message: string
  let title: string
  let Icon = Lock

  if (opsStatus === 'delivered') {
    message = 'Media has been delivered. Please contact your real estate agent for access to the photos.'
    title = 'Contact Your Agent'
    Icon = CheckCircle
  } else if (!opsStatus || opsStatus === 'scheduled') {
    message = 'Photos are not yet available. Check back after the photoshoot has been completed.'
    title = 'Shoot Not Yet Complete'
    Icon = Camera
  } else if (['in_progress', 'shooting'].includes(opsStatus)) {
    message = 'The photoshoot is currently in progress. Photos will be available once processing is complete.'
    title = 'Shoot In Progress'
    Icon = Camera
  } else if (['staged', 'awaiting_editing', 'editing', 'in_editing'].includes(opsStatus)) {
    message = 'Photos are currently being edited and enhanced. They will be available once processing is complete.'
    title = 'Photos Being Processed'
    Icon = Clock
  } else if (['ready_for_qc', 'in_qc'].includes(opsStatus)) {
    message = 'Photos are undergoing quality review. They will be available once your agent approves access.'
    title = 'Quality Review'
    Icon = Clock
  } else {
    message = 'Media access has not been granted for this listing. Please contact your real estate agent.'
    title = 'Access Pending'
    Icon = Lock
  }

  return (
    <Card className="border-neutral-800 bg-neutral-900/50">
      <CardContent className="py-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-neutral-400 max-w-sm mx-auto">
          {message}
        </p>

        {/* Status indicator */}
        {opsStatus && (
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-800 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs text-neutral-400">
              Status: {opsStatus.replace(/_/g, ' ')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
