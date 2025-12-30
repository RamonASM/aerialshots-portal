/**
 * Storage Cleanup Cron Endpoint
 *
 * Runs daily to clean up expired files from temporary storage buckets.
 *
 * Schedule: Daily at 3:00 AM UTC (via Vercel Cron or similar)
 *
 * Usage:
 *   POST /api/cron/storage-cleanup
 *   Headers: Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server'
import { createStorageCleanup } from '@/lib/storage/cleanup'

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('[Storage Cleanup] CRON_SECRET not configured')
    return false
  }

  if (!authHeader) {
    return false
  }

  const token = authHeader.replace('Bearer ', '')
  return token === cronSecret
}

export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cleanup = createStorageCleanup()
    const result = await cleanup.runFullCleanup()

    // Log results
    console.log('[Storage Cleanup] Completed:', {
      totalDeleted: result.totalDeleted,
      totalErrors: result.totalErrors,
      duration: `${new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime()}ms`,
    })

    if (result.totalErrors > 0) {
      console.warn('[Storage Cleanup] Errors:', result.results.flatMap((r) => r.errors))
    }

    return NextResponse.json({
      success: true,
      summary: {
        deletedFiles: result.totalDeleted,
        errors: result.totalErrors,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
      },
      details: result.results.map((r) => ({
        bucket: r.bucket,
        stage: r.stage,
        deleted: r.deletedCount,
        errors: r.errors.length,
      })),
    })
  } catch (error) {
    console.error('[Storage Cleanup] Failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cleanup failed',
      },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing in development
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  return POST(request)
}
