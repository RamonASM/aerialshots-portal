/**
 * Drip Campaign Cron Job
 *
 * Processes pending drip email steps and sends them
 * Should be called every 15 minutes via Vercel cron
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDuePendingSteps, processEnrollmentStep } from '@/lib/marketing/drip/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds for processing

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get due enrollments
  const dueEnrollments = await getDuePendingSteps({ limit: 50 })

  if (dueEnrollments.length === 0) {
    return NextResponse.json({ message: 'No pending drip emails', processed: 0 })
  }

  let processedCount = 0
  let errorCount = 0
  const errors: string[] = []

  for (const enrollment of dueEnrollments) {
    try {
      const result = await processEnrollmentStep(enrollment.id)

      if (result.success) {
        processedCount++
      } else {
        errorCount++
        errors.push(`Enrollment ${enrollment.id}: ${result.error}`)
      }
    } catch (error) {
      errorCount++
      errors.push(`Enrollment ${enrollment.id}: ${error}`)
    }
  }

  return NextResponse.json({
    message: `Processed ${dueEnrollments.length} enrollments`,
    processed: processedCount,
    errors: errorCount,
    errorDetails: errors.length > 0 ? errors.slice(0, 10) : undefined,
  })
}
