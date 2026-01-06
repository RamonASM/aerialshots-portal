/**
 * Stripe Catalog Sync API
 *
 * POST /api/admin/stripe/sync - Sync all pricing to Stripe
 * GET /api/admin/stripe/sync - Get sync status
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireStaffAccess } from '@/lib/auth/server-access'
import {
  syncAllToStripe,
  getStripeSyncStatus,
  syncPackagesToStripe,
  syncServicesToStripe,
  syncRetainersToStripe,
} from '@/lib/payments/stripe-catalog'

/**
 * GET - Get Stripe sync status
 */
export async function GET() {
  try {
    await requireStaffAccess(['admin'])

    const status = await getStripeSyncStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('[Stripe Sync] Error getting status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get sync status' },
      { status: 500 }
    )
  }
}

/**
 * POST - Sync pricing to Stripe
 */
export async function POST(request: NextRequest) {
  try {
    await requireStaffAccess(['admin'])

    const body = await request.json().catch(() => ({}))
    const { type = 'all' } = body as { type?: 'all' | 'packages' | 'services' | 'retainers' }

    let result

    switch (type) {
      case 'packages':
        result = await syncPackagesToStripe()
        break
      case 'services':
        result = await syncServicesToStripe()
        break
      case 'retainers':
        result = await syncRetainersToStripe()
        break
      case 'all':
      default:
        result = await syncAllToStripe()
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Stripe Sync] Error syncing:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync to Stripe' },
      { status: 500 }
    )
  }
}
