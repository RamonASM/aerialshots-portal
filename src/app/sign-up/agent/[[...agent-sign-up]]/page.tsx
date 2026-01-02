'use client'

import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { Camera, ArrowLeft, CheckCircle } from 'lucide-react'

/**
 * Agent Sign-Up Page
 * For new real estate agents creating an account
 */
export default function AgentSignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12">
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
          <h1 className="text-[22px] font-semibold text-white">Create your account</h1>
          <p className="mt-2 text-[15px] text-[#a1a1a6]">
            Join hundreds of Central Florida agents using ASM
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-[13px] text-[#a1a1a6]">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>24-hour photo turnaround</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[#a1a1a6]">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>Professional HDR photography & video</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-[#a1a1a6]">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>AI-powered property marketing</span>
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
                'bg-[#0077ff] hover:bg-[#0066dd] h-11 text-[15px]',
              footerAction: 'hidden',
              identityPreview: 'bg-[#1c1c1e] border-white/[0.08]',
              identityPreviewText: 'text-white',
              identityPreviewEditButton: 'text-[#0077ff]',
              formFieldAction: 'text-[#0077ff]',
              alertText: 'text-[#ff453a]',
            },
          }}
          routing="path"
          path="/sign-up/agent"
          signInUrl="/sign-in"
          forceRedirectUrl="/dashboard"
        />

        {/* Already have an account */}
        <div className="mt-8 text-center">
          <p className="text-[13px] text-[#636366]">
            Already have an account?{' '}
            <Link
              href="/sign-in"
              className="text-[#0077ff] hover:text-[#3395ff] transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
