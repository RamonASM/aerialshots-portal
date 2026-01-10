import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST() {
  const { userId } = await auth()

  // If user is signed in with Clerk, redirect to Clerk's sign-out
  if (userId) {
    // Clerk handles sign-out via redirect to their hosted sign-out page
    // After sign-out, it redirects to the afterSignOutUrl configured in Clerk dashboard
    // or we can specify it in the URL
    const signOutUrl = new URL('/sign-in', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')

    // Use Clerk's sign-out endpoint which clears the session
    const clerkSignOutUrl = `https://clerk.${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('pk_live_') ? '' : 'accounts.dev/'}sign-out?redirect_url=${encodeURIComponent(signOutUrl.toString())}`

    // For Clerk, we redirect to clear cookies by going to sign-in page
    // The middleware will handle the session invalidation
    return NextResponse.redirect(signOutUrl)
  }

  // Fallback redirect if no user
  return NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
}
