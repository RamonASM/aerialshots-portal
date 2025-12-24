'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Calendar, Mail, Phone, ArrowRight, Loader2 } from 'lucide-react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const redirectStatus = searchParams.get('redirect_status')

  if (redirectStatus === 'failed' || redirectStatus === 'canceled') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl text-red-400">!</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">
            Payment Issue
          </h1>
          <p className="text-neutral-400 mb-8">
            There was a problem processing your payment. No charges have been made
            to your account.
          </p>
          <div className="space-y-3">
            <Link
              href="/book/listing"
              className="block w-full py-3 px-6 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
            >
              Try Again
            </Link>
            <Link
              href="/pricing"
              className="block w-full py-3 px-6 bg-neutral-800 text-neutral-300 font-medium rounded-xl hover:bg-neutral-700 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Icon */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Booking Confirmed!
          </h1>
          <p className="text-lg text-neutral-400">
            Thank you for choosing Aerial Shots Media.
            <br />
            We&apos;re excited to capture your property!
          </p>
        </div>

        {/* What's Next */}
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">What Happens Next</h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 font-bold">1</span>
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">Confirmation Email</h3>
                <p className="text-sm text-neutral-400">
                  You&apos;ll receive an email confirmation with all your booking details within the next few minutes.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 font-bold">2</span>
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">Photographer Assignment</h3>
                <p className="text-sm text-neutral-400">
                  We&apos;ll assign a photographer and send you their contact info 24 hours before your shoot.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 font-bold">3</span>
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">Shoot Day</h3>
                <p className="text-sm text-neutral-400">
                  Our photographer will arrive at the scheduled time. The shoot typically takes 60-90 minutes.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-green-400 font-bold">4</span>
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">Delivery (24-48 Hours)</h3>
                <p className="text-sm text-neutral-400">
                  You&apos;ll receive all your media via our delivery portal, ready to use on MLS and marketing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6 mb-8">
          <h3 className="font-medium text-white mb-4">Need to Make Changes?</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <a
              href="mailto:support@aerialshots.media"
              className="flex items-center gap-3 text-neutral-300 hover:text-blue-400 transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span>support@aerialshots.media</span>
            </a>
            <a
              href="tel:+14077745070"
              className="flex items-center gap-3 text-neutral-300 hover:text-blue-400 transition-colors"
            >
              <Phone className="w-5 h-5" />
              <span>(407) 774-5070</span>
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard"
            className="flex-1 py-4 px-6 bg-blue-500 text-white font-medium rounded-xl text-center hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            View Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="flex-1 py-4 px-6 bg-neutral-800 text-neutral-300 font-medium rounded-xl text-center hover:bg-neutral-700 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-neutral-400">Loading...</p>
      </div>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SuccessContent />
    </Suspense>
  )
}
