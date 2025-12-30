import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Type for Phase 1 migration table (not yet in generated types)
// TODO: Remove this after types are regenerated with `npx supabase gen types`
interface BookingReferenceFile {
  id: string
  listing_id: string | null
  booking_token: string | null
  file_name: string
  file_type: string
  file_size: number
  mime_type: string
  storage_path: string
  public_url: string
  notes: string | null
  uploaded_by: string | null
  created_at: string
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
  'text/plain',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 10

const FILE_TYPE_LABELS: Record<string, string> = {
  property_line: 'Property Line',
  access_code: 'Access Code/Gate Info',
  example_shot: 'Example/Reference Shot',
  special_instructions: 'Special Instructions',
  floor_plan: 'Floor Plan',
  other: 'Other',
}

/**
 * POST /api/booking/reference-files
 * Upload reference files for a booking
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const listingId = formData.get('listingId') as string
    const bookingToken = formData.get('bookingToken') as string
    const fileType = formData.get('fileType') as string || 'other'
    const notes = formData.get('notes') as string || ''
    const files = formData.getAll('files') as File[]

    // Validate required fields
    if (!listingId && !bookingToken) {
      return NextResponse.json(
        { error: 'listingId or bookingToken is required' },
        { status: 400 }
      )
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required' },
        { status: 400 }
      )
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      )
    }

    // Validate file types and sizes
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} not allowed. Allowed: JPG, PNG, WebP, HEIC, PDF, TXT` },
          { status: 400 }
        )
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of 10MB` },
          { status: 400 }
        )
      }
    }

    // Get user if authenticated
    const supabaseClient = await createClient()
    const { data: { user } } = await supabaseClient.auth.getUser()

    const supabase = createAdminClient()
    const uploadedFiles: Array<{
      id: string
      filename: string
      url: string
      type: string
    }> = []

    // Upload each file
    for (const file of files) {
      const buffer = await file.arrayBuffer()
      const fileBuffer = Buffer.from(buffer)

      // Generate unique filename
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 8)
      const extension = file.name.split('.').pop() || 'bin'
      const storagePath = `reference-files/${listingId || bookingToken}/${timestamp}-${randomId}.${extension}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('booking-attachments')
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('[Reference Files] Upload error:', uploadError)
        continue // Skip failed uploads but continue with others
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('booking-attachments')
        .getPublicUrl(uploadData.path)

      // Save metadata to database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fileRecord, error: dbError } = await (supabase as any)
        .from('booking_reference_files')
        .insert({
          listing_id: listingId || null,
          booking_token: bookingToken || null,
          file_name: file.name,
          file_type: fileType,
          file_size: file.size,
          mime_type: file.type,
          storage_path: uploadData.path,
          public_url: publicUrl,
          notes: notes || null,
          uploaded_by: user?.id || null,
        })
        .select('id')
        .single() as { data: { id: string } | null; error: Error | null }

      if (dbError || !fileRecord) {
        console.error('[Reference Files] DB error:', dbError)
        continue
      }

      uploadedFiles.push({
        id: fileRecord.id,
        filename: file.name,
        url: publicUrl,
        type: fileType,
      })
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: 'Failed to upload any files' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      uploaded: uploadedFiles.length,
      total: files.length,
      files: uploadedFiles,
    })
  } catch (error) {
    console.error('[Reference Files API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to upload reference files' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/booking/reference-files
 * Get reference files for a listing or booking
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const listingId = searchParams.get('listingId')
    const bookingToken = searchParams.get('bookingToken')

    if (!listingId && !bookingToken) {
      return NextResponse.json(
        { error: 'listingId or bookingToken is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('booking_reference_files')
      .select('*')
      .order('created_at', { ascending: false })

    if (listingId) {
      query = query.eq('listing_id', listingId)
    } else if (bookingToken) {
      query = query.eq('booking_token', bookingToken)
    }

    const { data: files, error } = await query as { data: BookingReferenceFile[] | null; error: Error | null }

    if (error || !files) {
      throw error || new Error('Failed to fetch files')
    }

    return NextResponse.json({
      success: true,
      files: files.map((file) => ({
        id: file.id,
        filename: file.file_name,
        type: file.file_type,
        typeLabel: FILE_TYPE_LABELS[file.file_type] || 'Other',
        size: file.file_size,
        mimeType: file.mime_type,
        url: file.public_url,
        notes: file.notes,
        uploadedAt: file.created_at,
      })),
    })
  } catch (error) {
    console.error('[Reference Files API] GET Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reference files' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/booking/reference-files
 * Delete a reference file
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get file record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: file, error: fetchError } = await (supabase as any)
      .from('booking_reference_files')
      .select('storage_path')
      .eq('id', fileId)
      .single() as { data: { storage_path: string } | null; error: Error | null }

    if (fetchError || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('booking-attachments')
      .remove([file.storage_path])

    if (storageError) {
      console.error('[Reference Files] Storage delete error:', storageError)
    }

    // Delete from database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabase as any)
      .from('booking_reference_files')
      .delete()
      .eq('id', fileId)

    if (dbError) {
      throw dbError
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    })
  } catch (error) {
    console.error('[Reference Files API] DELETE Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
