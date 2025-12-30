/**
 * Review Link Tracking
 *
 * Tracks when an agent clicks the review link and redirects to the actual review page
 */

import { NextRequest, NextResponse } from 'next/server'
import { trackReviewClick } from '@/lib/marketing/reviews/service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token) {
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL))
  }

  // Track the click and get the review URL
  const reviewUrl = await trackReviewClick(token)

  if (!reviewUrl) {
    // Token not found or expired, redirect to home
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL))
  }

  // Redirect to the actual review page
  return NextResponse.redirect(reviewUrl)
}
