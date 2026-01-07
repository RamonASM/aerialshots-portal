'use client'

import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import { Home, ArrowLeft, Camera, Images, Video, Briefcase, Users } from 'lucide-react'

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

/**
 * Seller/Homeowner Sign-In Page
 * For property owners to view their media deliveries
 */
export default function SellerSignInPage() {
  if (!clerkEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <div className="max-w-md text-center text-white">
          <h1 className="text-xl font-semibold">Sign-in temporarily disabled</h1>
          <p className="mt-3 text-sm text-[#a1a1a6]">
            Clerk authentication is paused. Re-enable Clerk keys to restore homeowner sign-in.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      {/* Subtle gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-green-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-[420px]">
        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[13px] text-[#636366] hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Header */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="h-9 w-9 rounded-xl bg-green-500 flex items-center justify-center">
            <Home className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-[17px] font-semibold text-white">
            Homeowner Portal
          </span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-[22px] font-semibold text-white">View Your Media</h1>
          <p className="mt-2 text-[15px] text-[#a1a1a6]">
            Access your property photos, videos, and marketing materials
          </p>
        </div>

        {/* What you can access */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-green-400 bg-green-500/10 rounded-full border border-green-500/20">
            <Images className="h-3.5 w-3.5" />
            Photos
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20">
            <Video className="h-3.5 w-3.5" />
            Videos
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-purple-400 bg-purple-500/10 rounded-full border border-purple-500/20">
            <Camera className="h-3.5 w-3.5" />
            Virtual Tours
          </div>
        </div>

        {/* Clerk Sign-In Component */}
        <SignIn
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-none bg-transparent p-0',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              socialButtonsBlockButton:
                'border-white/[0.08] text-white hover:bg-white/[0.05] h-11',
              dividerLine: 'bg-white/[0.08]',
              dividerText: 'text-[#636366]',
              formFieldLabel: 'text-[#a1a1a6] text-[13px]',
              formFieldInput:
                'bg-[#1c1c1e] border-white/[0.08] text-white placeholder:text-[#636366] h-11',
              formButtonPrimary:
                'bg-green-500 hover:bg-green-600 h-11 text-[15px]',
              footerAction: 'hidden',
              identityPreview: 'bg-[#1c1c1e] border-white/[0.08]',
              identityPreviewText: 'text-white',
              identityPreviewEditButton: 'text-green-400',
              formFieldAction: 'text-green-400',
              alertText: 'text-[#ff453a]',
            },
          }}
          routing="path"
          path="/sign-in/seller"
          signUpUrl="/sign-up/seller"
          forceRedirectUrl="/dashboard/seller"
        />

        {/* Info box */}
        <div className="mt-6 rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-[13px] text-green-300">
          <p>
            <strong className="text-green-400">First time here?</strong> Your real estate agent
            should have sent you an invitation. Use the same email to access your property media.
          </p>
        </div>

        {/* Role switcher */}
        <div className="mt-8 pt-6 border-t border-white/[0.08]">
          <p className="text-center text-[14px] font-medium text-white mb-2">
            Not a homeowner?
          </p>
          <p className="text-center text-[13px] text-[#636366] mb-4">
            Choose the portal that matches your role
          </p>
          <div className="space-y-2">
            <Link
              href="/sign-in"
              className="flex items-center gap-3 px-4 py-3 text-[#a1a1a6] hover:text-white bg-white/[0.02] hover:bg-white/[0.05] rounded-xl border border-white/[0.08] transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Camera className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-[13px] font-medium">Agent Portal</p>
                <p className="text-[11px] text-[#636366]">Real estate agents managing listings</p>
              </div>
            </Link>
            <Link
              href="/sign-in/staff"
              className="flex items-center gap-3 px-4 py-3 text-[#a1a1a6] hover:text-white bg-white/[0.02] hover:bg-white/[0.05] rounded-xl border border-white/[0.08] transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-[13px] font-medium">Team Portal</p>
                <p className="text-[11px] text-[#636366]">For ASM photographers, videographers & QC</p>
              </div>
            </Link>
            <Link
              href="/sign-in/partner"
              className="flex items-center gap-3 px-4 py-3 text-[#a1a1a6] hover:text-white bg-white/[0.02] hover:bg-white/[0.05] rounded-xl border border-white/[0.08] transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Briefcase className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="text-[13px] font-medium">Partner Portal</p>
                <p className="text-[11px] text-[#636366]">Business partners & team managers</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
