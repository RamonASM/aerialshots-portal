'use client'

import { useState } from 'react'
import {
  Calendar,
  Clock,
  Camera,
  User,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RescheduleRequestForm } from './RescheduleRequestForm'

interface ScheduleInfoProps {
  token: string
  listing: {
    id: string
    address: string
    city: string
    state: string
    zip: string
    scheduled_at: string | null
    ops_status: string | null
    is_rush: boolean
  }
  photographer: {
    id: string
    name: string
    phone: string | null
  } | null
  pendingReschedule?: {
    id: string
    requested_slots: unknown
    created_at: string
  }
}

export function ScheduleInfo({
  token,
  listing,
  photographer,
  pendingReschedule,
}: ScheduleInfoProps) {
  const [showRescheduleForm, setShowRescheduleForm] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const scheduledAt = listing.scheduled_at

  // Prep instructions
  const prepInstructions = [
    'Turn on all lights including lamps and under-cabinet lights',
    'Open all blinds and curtains',
    'Remove cars from driveway',
    'Tidy up countertops and personal items',
    'Make all beds and arrange pillows',
    'Close toilet lids',
    'Turn off ceiling fans',
    'Put away pet food bowls and crates if possible',
    'Secure pets during the shoot',
  ]

  // Cancel pending reschedule request
  const handleCancelReschedule = async () => {
    setIsCancelling(true)
    try {
      const response = await fetch(`/api/seller/${token}/reschedule`, {
        method: 'DELETE',
      })

      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error cancelling reschedule:', error)
    } finally {
      setIsCancelling(false)
    }
  }

  if (!scheduledAt) {
    return (
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardContent className="py-8 text-center">
          <Calendar className="h-10 w-10 mx-auto text-neutral-500 mb-4" />
          <p className="text-neutral-400">No shoot scheduled yet.</p>
          <p className="text-sm text-neutral-500 mt-1">
            Your agent will schedule the shoot and you&apos;ll receive an update.
          </p>
        </CardContent>
      </Card>
    )
  }

  const date = new Date(scheduledAt)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  const isPast = date < new Date()

  return (
    <div className="space-y-4">
      {/* Pending Reschedule Alert */}
      {pendingReschedule && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-300">
                  Reschedule Request Pending
                </p>
                <p className="text-xs text-amber-400/80 mt-1">
                  Submitted {new Date(pendingReschedule.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelReschedule}
                disabled={isCancelling}
                className="text-amber-400 hover:text-amber-300"
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Cancel'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Card */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-neutral-200 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              Scheduled Shoot
            </CardTitle>
            {listing.is_rush && (
              <Badge className="bg-red-500/20 text-red-400">Rush</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date & Time */}
          <div className="p-4 bg-neutral-800/50 rounded-lg">
            <p className="text-lg font-semibold text-white">{formattedDate}</p>
            <div className="flex items-center gap-2 mt-1 text-neutral-400">
              <Clock className="h-4 w-4" />
              <span>{formattedTime}</span>
            </div>
          </div>

          {/* Photographer */}
          {photographer && (
            <div className="flex items-center gap-3 p-3 bg-neutral-800/30 rounded-lg">
              <div className="p-2 bg-neutral-800 rounded-full">
                <Camera className="h-4 w-4 text-neutral-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{photographer.name}</p>
                <p className="text-xs text-neutral-400">Assigned Photographer</p>
              </div>
            </div>
          )}

          {/* Reschedule Button */}
          {!isPast && !pendingReschedule && (
            <Button
              variant="outline"
              className="w-full border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              onClick={() => setShowRescheduleForm(true)}
            >
              Request Reschedule
            </Button>
          )}

          {isPast && listing.ops_status !== 'delivered' && (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <CheckCircle className="h-4 w-4" />
              Shoot completed
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prep Instructions */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-neutral-200">
            Prep Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {prepInstructions.map((instruction, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-neutral-400">
                <span className="text-blue-400 mt-1">•</span>
                {instruction}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Reschedule Form Modal */}
      {showRescheduleForm && (
        <RescheduleRequestForm
          token={token}
          currentDate={scheduledAt}
          onClose={() => setShowRescheduleForm(false)}
          onSuccess={() => {
            setShowRescheduleForm(false)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
