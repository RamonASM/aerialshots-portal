import { NextRequest, NextResponse } from 'next/server'
import { requireStaffAccess } from '@/lib/auth/server-access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireStaffAccess(['admin'])

    // Note: API keys table not yet implemented
    return NextResponse.json(
      {
        error: 'API keys table not yet implemented',
        apiKey: null,
        usage: {
          total: 0,
          daily: {},
          byEndpoint: {},
          avgResponseTime: 0,
          recentLogs: [],
        },
      },
      { status: 404 }
    )
  } catch (error) {
    console.error('Error fetching API key:', error)
    return NextResponse.json(
      { error: 'Failed to fetch API key' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireStaffAccess(['admin'])

    // Note: API keys table not yet implemented
    return NextResponse.json(
      { error: 'API keys table not yet implemented. Please run database migrations.' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error updating API key:', error)
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireStaffAccess(['admin'])

    // Note: API keys table not yet implemented
    return NextResponse.json(
      { error: 'API keys table not yet implemented. Please run database migrations.' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    )
  }
}
