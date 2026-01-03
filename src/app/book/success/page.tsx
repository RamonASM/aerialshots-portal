'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Calendar, Mail, Phone, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const redirectStatus = searchParams.get('redirect_status')

  if (redirectStatus === 'failed' || redirectStatus === 'canceled') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 border border-red-400/50 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="font-serif text-2xl text-white mb-4">
            Payment Issue
          </h1>
          <p className="text-[15px] text-[#8A847F] mb-10">
            There was a problem processing your payment. No charges have been made
            to your account.
          </p>
          <div className="space-y-3">
            <Link
              href="/book/listing"
              className="block w-full py-4 px-6 bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[15px] font-medium transition-colors"
            >
              Try Again
            </Link>
            <Link
              href="/pricing"
              className="block w-full py-4 px-6 border border-white/[0.12] hover:border-white/[0.24] text-white text-[15px] font-medium transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black py-24 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Icon */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 border border-[#A29991] flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-10 h-10 text-[#A29991]" />
          </div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
            Booking Confirmed
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-white mb-4">
            Thank You
          </h1>
          <p className="text-[17px] text-[#8A847F] leading-relaxed">
            We&apos;re excited to capture your property.
          </p>
        </div>

        {/* What's Next */}
        <div className="border border-white/[0.08] mb-12">
          <div className="p-6 border-b border-white/[0.06]">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991]">
              What Happens Next
            </p>
          </div>

          <div className="divide-y divide-white/[0.06]">
            <div className="flex gap-6 p-6">
              <div className="shrink-0 w-10 h-10 border border-[#A29991] flex items-center justify-center text-[#A29991] text-[14px] font-medium">
                01
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-white mb-1">Confirmation Email</h3>
                <p className="text-[14px] text-[#8A847F]">
                  You&apos;ll receive an email confirmation with all your booking details within the next few minutes.
                </p>
              </div>
            </div>

            <div className="flex gap-6 p-6">
              <div className="shrink-0 w-10 h-10 border border-[#A29991] flex items-center justify-center text-[#A29991] text-[14px] font-medium">
                02
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-white mb-1">Photographer Assignment</h3>
                <p className="text-[14px] text-[#8A847F]">
                  We&apos;ll assign a photographer and send you their contact info 24 hours before your shoot.
                </p>
              </div>
            </div>

            <div className="flex gap-6 p-6">
              <div className="shrink-0 w-10 h-10 border border-[#A29991] flex items-center justify-center text-[#A29991] text-[14px] font-medium">
                03
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-white mb-1">Shoot Day</h3>
                <p className="text-[14px] text-[#8A847F]">
                  Our photographer will arrive at the scheduled time. The shoot typically takes 60-90 minutes.
                </p>
              </div>
            </div>

            <div className="flex gap-6 p-6">
              <div className="shrink-0 w-10 h-10 border border-[#A29991] bg-[#A29991]/10 flex items-center justify-center text-[#A29991] text-[14px] font-medium">
                04
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-white mb-1">Delivery (24-48 Hours)</h3>
                <p className="text-[14px] text-[#8A847F]">
                  You&apos;ll receive all your media via our delivery portal, ready to use on MLS and marketing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="border border-white/[0.08] p-6 mb-12">
          <h3 className="text-[15px] font-medium text-white mb-4">Need to Make Changes?</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <a
              href="mailto:support@aerialshots.media"
              className="flex items-center gap-3 text-[14px] text-[#B5ADA6] hover:text-[#A29991] transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>support@aerialshots.media</span>
            </a>
            <a
              href="tel:+14077745070"
              className="flex items-center gap-3 text-[14px] text-[#B5ADA6] hover:text-[#A29991] transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>(407) 774-5070</span>
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard"
            className="flex-1 py-4 px-6 bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[15px] font-medium text-center transition-colors flex items-center justify-center gap-2"
          >
            View Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="flex-1 py-4 px-6 border border-white/[0.12] hover:border-white/[0.24] text-white text-[15px] font-medium text-center transition-colors"
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
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-[#A29991] animate-spin mx-auto mb-4" />
        <p className="text-[15px] text-[#8A847F]">Loading...</p>
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
