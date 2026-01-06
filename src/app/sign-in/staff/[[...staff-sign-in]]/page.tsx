'use client'

import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import { Camera, ArrowLeft, Users, Video, CheckSquare, Shield } from 'lucide-react'

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

/**
 * Staff Sign-In Page
 * For ASM team members: photographers, videographers, QC, admins
 */
export default function StaffSignInPage() {
  if (!clerkEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <div className="max-w-md text-center text-white">
          <h1 className="text-xl font-semibold">Sign-in temporarily disabled</h1>
          <p className="mt-3 text-sm text-[#a1a1a6]">
            Clerk authentication is paused. Re-enable Clerk keys to restore team sign-in.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      {/* Subtle gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent pointer-events-none" />

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
          <div className="h-9 w-9 rounded-xl bg-purple-500 flex items-center justify-center">
            <Users className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-[17px] font-semibold text-white">
            Team Portal
          </span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-[22px] font-semibold text-white">Team Sign In</h1>
          <p className="mt-2 text-[15px] text-[#a1a1a6]">
            Access your jobs, schedule, and tools
          </p>
        </div>

        {/* Role indicators */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-purple-400 bg-purple-500/10 rounded-full border border-purple-500/20">
            <Camera className="h-3.5 w-3.5" />
            Photographer
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20">
            <Video className="h-3.5 w-3.5" />
            Videographer
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-green-400 bg-green-500/10 rounded-full border border-green-500/20">
            <CheckSquare className="h-3.5 w-3.5" />
            QC Specialist
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-amber-400 bg-amber-500/10 rounded-full border border-amber-500/20">
            <Shield className="h-3.5 w-3.5" />
            Admin
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
                'bg-purple-500 hover:bg-purple-600 h-11 text-[15px]',
              footerAction: 'hidden',
              identityPreview: 'bg-[#1c1c1e] border-white/[0.08]',
              identityPreviewText: 'text-white',
              identityPreviewEditButton: 'text-purple-400',
              formFieldAction: 'text-purple-400',
              alertText: 'text-[#ff453a]',
            },
          }}
          routing="path"
          path="/sign-in/staff"
          fallbackRedirectUrl="/team"
        />

        {/* Note for staff */}
        <div className="mt-6 rounded-xl bg-purple-500/10 border border-purple-500/20 p-4 text-[13px] text-purple-300">
          <p>
            <strong className="text-purple-400">Note:</strong> Your account is linked to your role.
            After signing in, you&apos;ll be directed to your specific dashboard.
          </p>
        </div>

        {/* Role switcher */}
        <div className="mt-8 pt-6 border-t border-white/[0.08]">
          <p className="text-center text-[13px] text-[#636366] mb-4">
            Not a team member?
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] text-[#a1a1a6] hover:text-white bg-white/[0.02] hover:bg-white/[0.05] rounded-lg border border-white/[0.08] transition-colors"
            >
              Agent Sign In
            </Link>
            <Link
              href="/sign-in/partner"
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] text-[#a1a1a6] hover:text-white bg-white/[0.02] hover:bg-white/[0.05] rounded-lg border border-white/[0.08] transition-colors"
            >
              Partner Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
