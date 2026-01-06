'use client'

import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { Home, ArrowLeft, Images, Download, Share2 } from 'lucide-react'

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

/**
 * Seller/Homeowner Sign-Up Page
 * For property owners creating an account to view their media
 */
export default function SellerSignUpPage() {
  if (!clerkEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <div className="max-w-md text-center text-white">
          <h1 className="text-xl font-semibold">Sign-up temporarily disabled</h1>
          <p className="mt-3 text-sm text-[#a1a1a6]">
            Clerk authentication is paused. Re-enable Clerk keys to restore homeowner sign-up.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12">
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
          <h1 className="text-[22px] font-semibold text-white">Access Your Property Media</h1>
          <p className="mt-2 text-[15px] text-[#a1a1a6]">
            View and download photos, videos, and marketing materials
          </p>
        </div>

        {/* What you can do */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-[13px] text-[#a1a1a6]">
            <Images className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>View all property photos and videos</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[#a1a1a6]">
            <Download className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>Download high-resolution files</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[#a1a1a6]">
            <Share2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>Share with family and friends</span>
          </div>
        </div>

        {/* Clerk Sign-Up Component */}
        <SignUp
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
          path="/sign-up/seller"
          signInUrl="/sign-in/seller"
          forceRedirectUrl="/dashboard/seller"
        />

        {/* Info box */}
        <div className="mt-6 rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-[13px] text-green-300">
          <p>
            <strong className="text-green-400">Tip:</strong> Use the same email that your
            real estate agent has on file to automatically connect your account.
          </p>
        </div>

        {/* Already have an account */}
        <div className="mt-8 text-center">
          <p className="text-[13px] text-[#636366]">
            Already have an account?{' '}
            <Link
              href="/sign-in/seller"
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
