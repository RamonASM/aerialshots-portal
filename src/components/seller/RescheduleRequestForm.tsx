'use client'

import { useState } from 'react'
import {
  Calendar,
  Clock,
  X,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface RescheduleRequestFormProps {
  token: string
  currentDate: string
  onClose: () => void
  onSuccess: () => void
}

interface RequestedSlot {
  date: string
  time_preference: 'morning' | 'afternoon' | 'anytime'
  specific_time?: string
}

export function RescheduleRequestForm({
  token,
  currentDate,
  onClose,
  onSuccess,
}: RescheduleRequestFormProps) {
  const [slots, setSlots] = useState<RequestedSlot[]>([
    { date: '', time_preference: 'anytime' },
  ])
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get minimum date (tomorrow)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  const addSlot = () => {
    if (slots.length < 3) {
      setSlots([...slots, { date: '', time_preference: 'anytime' }])
    }
  }

  const removeSlot = (index: number) => {
    if (slots.length > 1) {
      setSlots(slots.filter((_, i) => i !== index))
    }
  }

  const updateSlot = (index: number, updates: Partial<RequestedSlot>) => {
    setSlots(slots.map((slot, i) => (i === index ? { ...slot, ...updates } : slot)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate at least one date is selected
    const validSlots = slots.filter(s => s.date)
    if (validSlots.length === 0) {
      setError('Please select at least one preferred date')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/seller/${token}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_slots: validSlots,
          reason: reason || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit request')
      }

      onSuccess()
    } catch (err) {
      console.error('Reschedule error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-neutral-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-400" />
            Request Reschedule
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Currently scheduled for{' '}
            {new Date(currentDate).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preferred Dates */}
          <div className="space-y-4">
            <Label className="text-neutral-200">Preferred Dates</Label>

            {slots.map((slot, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      type="date"
                      value={slot.date}
                      min={minDate}
                      onChange={(e) => updateSlot(index, { date: e.target.value })}
                      className="bg-neutral-800 border-neutral-700 text-white"
                    />
                  </div>
                  <select
                    value={slot.time_preference}
                    onChange={(e) =>
                      updateSlot(index, {
                        time_preference: e.target.value as RequestedSlot['time_preference'],
                      })
                    }
                    className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white text-sm"
                  >
                    <option value="anytime">Anytime</option>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                  </select>
                  {slots.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSlot(index)}
                      className="text-neutral-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {slots.length < 3 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addSlot}
                className="text-blue-400 hover:text-blue-300 w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add another option
              </Button>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label className="text-neutral-200">Reason (optional)</Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Let us know why you need to reschedule..."
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white placeholder:text-neutral-500 text-sm resize-none h-20"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-neutral-700 text-neutral-300"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
