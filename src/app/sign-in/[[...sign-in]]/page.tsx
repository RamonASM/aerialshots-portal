'use client'

import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import { Camera, ArrowLeft, Building2 } from 'lucide-react'

/**
 * Agent Sign-In Page
 * For real estate agents accessing the dashboard
 */
export default function AgentSignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      {/* Subtle gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0077ff]/5 via-transparent to-transparent pointer-events-none" />

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
          <div className="h-9 w-9 rounded-xl bg-[#0077ff] flex items-center justify-center">
            <Camera className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-[17px] font-semibold text-white">
            Agent Portal
          </span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-[22px] font-semibold text-white">Welcome back</h1>
          <p className="mt-2 text-[15px] text-[#a1a1a6]">
            Sign in to manage your listings and media
          </p>
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
                'bg-[#0077ff] hover:bg-[#0066dd] h-11 text-[15px]',
              footerAction: 'hidden',
              identityPreview: 'bg-[#1c1c1e] border-white/[0.08]',
              identityPreviewText: 'text-white',
              identityPreviewEditButton: 'text-[#0077ff]',
              formFieldAction: 'text-[#0077ff]',
              alertText: 'text-[#ff453a]',
              formFieldWarningText: 'text-[#ff9f0a]',
              formFieldSuccessText: 'text-[#30d158]',
            },
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up/agent"
          fallbackRedirectUrl="/dashboard"
        />

        {/* Role switcher */}
        <div className="mt-8 pt-6 border-t border-white/[0.08]">
          <p className="text-center text-[13px] text-[#636366] mb-4">
            Looking for a different portal?
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/sign-in/seller"
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] text-[#a1a1a6] hover:text-white bg-white/[0.02] hover:bg-white/[0.05] rounded-lg border border-white/[0.08] transition-colors"
            >
              <Building2 className="h-4 w-4" />
              Homeowner
            </Link>
            <Link
              href="/sign-in/staff"
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] text-[#a1a1a6] hover:text-white bg-white/[0.02] hover:bg-white/[0.05] rounded-lg border border-white/[0.08] transition-colors"
            >
              <Camera className="h-4 w-4" />
              ASM Team
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
