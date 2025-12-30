import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET, DELETE } from './route'

// Mock Supabase clients
const mockSupabaseFrom = vi.fn()
const mockStorageUpload = vi.fn()
const mockStorageRemove = vi.fn()
const mockStorageGetPublicUrl = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
    storage: {
      from: () => ({
        upload: mockStorageUpload,
        remove: mockStorageRemove,
        getPublicUrl: mockStorageGetPublicUrl,
      }),
    },
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'user-123' } } }),
      },
    }),
}))

describe('Reference Files API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default successful mocks
    mockStorageUpload.mockResolvedValue({
      data: { path: 'reference-files/test/file.jpg' },
      error: null,
    })

    mockStorageGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/file.jpg' },
    })

    mockStorageRemove.mockResolvedValue({ data: null, error: null })
  })

  describe('POST /api/booking/reference-files', () => {
    it('should require listingId or bookingToken', async () => {
      const formData = new FormData()
      formData.append('files', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg')

      const request = new NextRequest('http://localhost/api/booking/reference-files', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('listingId or bookingToken')
    })

    it('should require at least one file', async () => {
      const formData = new FormData()
      formData.append('listingId', 'listing-123')

      const request = new NextRequest('http://localhost/api/booking/reference-files', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('file')
    })

    it('should reject unsupported file types', async () => {
      const formData = new FormData()
      formData.append('listingId', 'listing-123')
      formData.append('files', new Blob(['test'], { type: 'application/exe' }), 'virus.exe')

      const request = new NextRequest('http://localhost/api/booking/reference-files', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('not allowed')
    })

    it('should reject files over 10MB', async () => {
      // Create a file > 10MB (10MB = 10 * 1024 * 1024 bytes)
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('')
      const largeFile = new Blob([largeContent], { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('listingId', 'listing-123')
      formData.append('files', largeFile, 'large.jpg')

      const request = new NextRequest('http://localhost/api/booking/reference-files', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('10MB')
    })

    it('should reject more than 10 files', async () => {
      const formData = new FormData()
      formData.append('listingId', 'listing-123')

      // Add 11 files
      for (let i = 0; i < 11; i++) {
        formData.append('files', new Blob(['test'], { type: 'image/jpeg' }), `file${i}.jpg`)
      }

      const request = new NextRequest('http://localhost/api/booking/reference-files', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('10')
    })

    it('should accept valid JPEG uploads', async () => {
      mockSupabaseFrom.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { id: 'file-id-123' },
                error: null,
              }),
          }),
        }),
      })

      const formData = new FormData()
      formData.append('listingId', 'listing-123')
      formData.append('fileType', 'property_line')
      formData.append('notes', 'Front property line')
      formData.append('files', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg')

      const request = new NextRequest('http://localhost/api/booking/reference-files', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.uploaded).toBe(1)
      expect(data.files[0].type).toBe('property_line')
    })

    it('should accept PDF files', async () => {
      mockSupabaseFrom.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { id: 'file-id-456' },
                error: null,
              }),
          }),
        }),
      })

      const formData = new FormData()
      formData.append('listingId', 'listing-123')
      formData.append('fileType', 'floor_plan')
      formData.append('files', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'plan.pdf')

      const request = new NextRequest('http://localhost/api/booking/reference-files', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should work with bookingToken instead of listingId', async () => {
      mockSupabaseFrom.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { id: 'file-id-789' },
                error: null,
              }),
          }),
        }),
      })

      const formData = new FormData()
      formData.append('bookingToken', 'booking-token-abc')
      formData.append('files', new Blob(['test'], { type: 'image/png' }), 'test.png')

      const request = new NextRequest('http://localhost/api/booking/reference-files', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/booking/reference-files', () => {
    it('should require listingId or bookingToken', async () => {
      const request = new NextRequest('http://localhost/api/booking/reference-files')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('listingId or bookingToken')
    })

    it('should return files for a listing', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          order: () => ({
            eq: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'file-1',
                    file_name: 'property-line.jpg',
                    file_type: 'property_line',
                    file_size: 1024,
                    mime_type: 'image/jpeg',
                    public_url: 'https://storage.example.com/file1.jpg',
                    notes: 'Front yard',
                    created_at: '2024-12-29T10:00:00Z',
                  },
                ],
                error: null,
              }),
          }),
        }),
      })

      const request = new NextRequest(
        'http://localhost/api/booking/reference-files?listingId=listing-123'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.files).toHaveLength(1)
      expect(data.files[0].filename).toBe('property-line.jpg')
      expect(data.files[0].typeLabel).toBe('Property Line')
    })

    it('should return empty array if no files', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          order: () => ({
            eq: () =>
              Promise.resolve({
                data: [],
                error: null,
              }),
          }),
        }),
      })

      const request = new NextRequest(
        'http://localhost/api/booking/reference-files?listingId=listing-empty'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.files).toHaveLength(0)
    })
  })

  describe('DELETE /api/booking/reference-files', () => {
    it('should require file ID', async () => {
      const request = new NextRequest('http://localhost/api/booking/reference-files', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('File ID')
    })

    it('should return 404 for non-existent file', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: null,
                error: { message: 'Not found' },
              }),
          }),
        }),
      })

      const request = new NextRequest(
        'http://localhost/api/booking/reference-files?id=non-existent'
      )

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should delete file successfully', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { storage_path: 'reference-files/test/file.jpg' },
                  error: null,
                }),
            }),
          }),
        })
        .mockReturnValueOnce({
          delete: () => ({
            eq: () =>
              Promise.resolve({
                data: null,
                error: null,
              }),
          }),
        })

      const request = new NextRequest('http://localhost/api/booking/reference-files?id=file-123')

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockStorageRemove).toHaveBeenCalled()
    })
  })
})

describe('Reference Files File Types', () => {
  const allowedTypes = [
    { mimeType: 'image/jpeg', extension: 'jpg' },
    { mimeType: 'image/png', extension: 'png' },
    { mimeType: 'image/webp', extension: 'webp' },
    { mimeType: 'image/heic', extension: 'heic' },
    { mimeType: 'application/pdf', extension: 'pdf' },
    { mimeType: 'text/plain', extension: 'txt' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockStorageUpload.mockResolvedValue({
      data: { path: 'reference-files/test/file' },
      error: null,
    })
    mockStorageGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/file' },
    })
    mockSupabaseFrom.mockReturnValue({
      insert: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: { id: 'file-id' },
              error: null,
            }),
        }),
      }),
    })
  })

  allowedTypes.forEach(({ mimeType, extension }) => {
    it(`should accept ${mimeType} files`, async () => {
      const formData = new FormData()
      formData.append('listingId', 'listing-123')
      formData.append('files', new Blob(['test'], { type: mimeType }), `test.${extension}`)

      const request = new NextRequest('http://localhost/api/booking/reference-files', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  const disallowedTypes = [
    'application/javascript',
    'application/x-executable',
    'text/html',
    'application/zip',
  ]

  disallowedTypes.forEach((mimeType) => {
    it(`should reject ${mimeType} files`, async () => {
      const formData = new FormData()
      formData.append('listingId', 'listing-123')
      formData.append('files', new Blob(['test'], { type: mimeType }), 'test.bin')

      const request = new NextRequest('http://localhost/api/booking/reference-files', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})
