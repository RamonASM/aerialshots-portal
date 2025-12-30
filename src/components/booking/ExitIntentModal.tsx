'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Gift,
  Clock,
  Mail,
  ArrowRight,
  X,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBookingStore } from '@/stores/useBookingStore'

interface ExitIntentModalProps {
  isOpen: boolean
  onClose: () => void
  onContinue: () => void
}

export function ExitIntentModal({
  isOpen,
  onClose,
  onContinue,
}: ExitIntentModalProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formData = useBookingStore((s) => s.formData)
  const pricing = useBookingStore((s) => s.pricing)

  // Pre-fill email if available
  const displayEmail = email || formData.contactEmail || ''

  const handleEmailSubmit = useCallback(async () => {
    if (!displayEmail || !displayEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Save email to session
      useBookingStore.getState().updateFormData({ contactEmail: displayEmail })

      // Send recovery email
      const response = await fetch('/api/booking/recovery-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: displayEmail,
          sessionId: formData.sessionId,
          packageKey: formData.packageKey,
          total: pricing.total,
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
        // Mark recovery email sent in store
        useBookingStore.getState().markRecoveryEmailSent()
      } else {
        throw new Error('Failed to send email')
      }
    } catch {
      setError('Failed to send email. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [displayEmail, formData.sessionId, formData.packageKey, pricing.total])

  const handleContinue = useCallback(() => {
    onContinue()
    onClose()
  }, [onContinue, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {!isSubmitted ? (
          <>
            <DialogHeader className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Gift className="h-8 w-8 text-blue-400" />
              </div>
              <DialogTitle className="text-2xl font-bold text-white">
                Wait! Don&apos;t leave yet
              </DialogTitle>
              <DialogDescription className="text-neutral-400">
                Your booking progress will be saved. We&apos;ll send you a link
                to continue where you left off.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Special offer */}
              <div className="rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <Clock className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      Complete your booking in the next 24 hours
                    </p>
                    <p className="text-sm text-neutral-400 mt-1">
                      Get <span className="text-green-400 font-semibold">10% off</span> your order with code{' '}
                      <span className="font-mono bg-neutral-800 px-1.5 py-0.5 rounded">
                        COMEBACK10
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Email capture */}
              <div className="space-y-3">
                <Label htmlFor="recovery-email" className="text-white">
                  Email address
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input
                      id="recovery-email"
                      type="email"
                      value={displayEmail}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="pl-10 bg-neutral-800 border-neutral-700"
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button
                    onClick={handleEmailSubmit}
                    disabled={isSubmitting || !displayEmail}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Send
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
              </div>

              {/* Summary of what they're leaving */}
              {pricing.total > 0 && (
                <div className="rounded-lg bg-neutral-800/50 p-4 space-y-2">
                  <p className="text-sm text-neutral-400">Your order so far:</p>
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">
                      {formData.packageKey
                        ? `${formData.packageKey.charAt(0).toUpperCase() + formData.packageKey.slice(1)} Package`
                        : 'Package Selection'}
                    </span>
                    <span className="text-white font-semibold">
                      ${pricing.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Continue button */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleContinue}
                  variant="outline"
                  className="w-full border-neutral-700 hover:bg-neutral-800"
                >
                  Continue Booking
                </Button>
                <button
                  onClick={onClose}
                  className="text-sm text-neutral-500 hover:text-neutral-400 transition-colors"
                >
                  No thanks, I&apos;ll come back later
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Success state */}
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <DialogTitle className="text-2xl font-bold text-white">
                Email sent!
              </DialogTitle>
              <DialogDescription className="text-neutral-400">
                Check your inbox for a link to continue your booking.
                <br />
                <span className="text-green-400">
                  Use code COMEBACK10 for 10% off!
                </span>
              </DialogDescription>

              <div className="pt-4 space-y-2">
                <Button
                  onClick={handleContinue}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Continue Now Instead
                </Button>
                <button
                  onClick={onClose}
                  className="text-sm text-neutral-500 hover:text-neutral-400 transition-colors"
                >
                  I&apos;ll finish later
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
