import { NextRequest, NextResponse } from 'next/server'
import { getStaffAccess } from '@/lib/auth/server-access'
import { createAdminClient } from '@/lib/supabase/admin'

type RawAsset = Record<string, unknown>

function inferFileType(url: string | null | undefined): string | null {
  if (!url) return null
  const lower = url.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.mp4')) return 'video/mp4'
  return null
}

function normalizeAsset(asset: RawAsset): RawAsset {
  const metadata = (asset.metadata as Record<string, unknown> | null)
    ?? (asset.template_data as Record<string, unknown> | null)
    ?? {}
  const tags = (asset.tags as string[] | null | undefined)
    ?? (metadata.tags as string[] | undefined)
    ?? []
  const fileUrl = (asset.file_url as string | null | undefined)
    ?? (asset.image_url as string | null | undefined)
    ?? (asset.image_url_jpg as string | null | undefined)
    ?? (asset.image_url_png as string | null | undefined)
    ?? null
  const fileType = (asset.file_type as string | null | undefined)
    ?? (metadata.file_type as string | undefined)
    ?? inferFileType(fileUrl)
  const fileSize = (asset.file_size as number | null | undefined)
    ?? (metadata.file_size as number | undefined)
    ?? null
  const width = (asset.width as number | null | undefined)
    ?? (metadata.width as number | undefined)
    ?? null
  const height = (asset.height as number | null | undefined)
    ?? (metadata.height as number | undefined)
    ?? null
  const isFavorite = (asset.is_favorite as boolean | null | undefined)
    ?? (metadata.is_favorite as boolean | undefined)
    ?? false
  const downloadCount = (asset.download_count as number | null | undefined)
    ?? (metadata.download_count as number | undefined)
    ?? 0

  return {
    ...asset,
    metadata,
    tags,
    file_url: fileUrl,
    file_type: fileType,
    file_size: fileSize,
    width,
    height,
    is_favorite: isFavorite,
    download_count: downloadCount,
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!await getStaffAccess()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createAdminClient()
    const searchParams = request.nextUrl.searchParams
    const limit = Math.max(0, Number(searchParams.get('limit') || 0))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('marketing_assets')
      .select('*')
      .order('created_at', { ascending: false })

    if (limit > 0) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ assets: [] })
      }
      throw error
    }

    const assets = (data || []).map((asset: RawAsset) => normalizeAsset(asset))
    return NextResponse.json({ assets })
  } catch (error) {
    console.error('Error fetching marketing assets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch marketing assets' },
      { status: 500 }
    )
  }
}
