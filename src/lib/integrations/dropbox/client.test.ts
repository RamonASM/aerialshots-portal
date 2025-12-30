/**
 * Dropbox Integration Tests
 *
 * TDD tests for Dropbox folder monitoring and auto-upload
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  DropboxClient,
  listFolderContents,
  detectNewPhotos,
  downloadFile,
  setupFolderMonitor,
  type DropboxFile,
  type DropboxFolderMonitor,
  type DropboxWebhookEvent,
} from './client'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Dropbox Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DROPBOX_APP_KEY = 'test-app-key'
    process.env.DROPBOX_APP_SECRET = 'test-app-secret'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Folder Listing', () => {
    it('should list folder contents', async () => {
      const mockFiles: DropboxFile[] = [
        {
          id: 'id:file1',
          name: 'photo1.jpg',
          path_lower: '/edited/photo1.jpg',
          path_display: '/Edited/photo1.jpg',
          type: 'file',
          size: 1024000,
          client_modified: '2024-01-01T00:00:00Z',
          server_modified: '2024-01-01T00:00:01Z',
        },
        {
          id: 'id:file2',
          name: 'photo2.jpg',
          path_lower: '/edited/photo2.jpg',
          path_display: '/Edited/photo2.jpg',
          type: 'file',
          size: 2048000,
          client_modified: '2024-01-01T01:00:00Z',
          server_modified: '2024-01-01T01:00:01Z',
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: mockFiles,
          cursor: 'cursor-abc123',
          has_more: false,
        }),
      })

      const result = await listFolderContents('access-token', '/Edited')

      expect(result.files).toHaveLength(2)
      expect(result.cursor).toBe('cursor-abc123')
      expect(result.has_more).toBe(false)
    })

    it('should filter by file extension', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [
            { id: 'id:1', name: 'photo1.jpg', type: 'file', path_lower: '/edited/photo1.jpg' },
            { id: 'id:2', name: 'document.pdf', type: 'file', path_lower: '/edited/document.pdf' },
            { id: 'id:3', name: 'photo2.png', type: 'file', path_lower: '/edited/photo2.png' },
          ],
          cursor: 'cursor-123',
          has_more: false,
        }),
      })

      const result = await listFolderContents('access-token', '/Edited', {
        extensions: ['.jpg', '.png'],
      })

      expect(result.files).toHaveLength(2)
      expect(result.files.every((f) => f.name.endsWith('.jpg') || f.name.endsWith('.png'))).toBe(true)
    })

    it('should handle pagination with cursor', async () => {
      // First page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [{ id: 'id:1', name: 'photo1.jpg', type: 'file', path_lower: '/edited/photo1.jpg' }],
          cursor: 'cursor-page1',
          has_more: true,
        }),
      })

      // Second page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [{ id: 'id:2', name: 'photo2.jpg', type: 'file', path_lower: '/edited/photo2.jpg' }],
          cursor: 'cursor-page2',
          has_more: false,
        }),
      })

      const result = await listFolderContents('access-token', '/Edited', { fetchAll: true })

      expect(result.files).toHaveLength(2)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle empty folders', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [],
          cursor: 'cursor-empty',
          has_more: false,
        }),
      })

      const result = await listFolderContents('access-token', '/Empty')

      expect(result.files).toHaveLength(0)
    })

    it('should handle folder not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: { '.tag': 'path', path: { '.tag': 'not_found' } },
        }),
      })

      await expect(listFolderContents('access-token', '/NonExistent')).rejects.toThrow('not found')
    })
  })

  describe('New Photo Detection', () => {
    it('should detect new photos since last check', async () => {
      const lastCursor = 'old-cursor-123'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [
            {
              id: 'id:new1',
              name: 'new-photo.jpg',
              type: 'file',
              path_lower: '/edited/new-photo.jpg',
              '.tag': 'file',
            },
          ],
          cursor: 'new-cursor-456',
          has_more: false,
        }),
      })

      const result = await detectNewPhotos('access-token', lastCursor)

      expect(result.newFiles).toHaveLength(1)
      expect(result.newCursor).toBe('new-cursor-456')
      expect(result.newFiles[0].name).toBe('new-photo.jpg')
    })

    it('should handle no new changes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [],
          cursor: 'same-cursor',
          has_more: false,
        }),
      })

      const result = await detectNewPhotos('access-token', 'same-cursor')

      expect(result.newFiles).toHaveLength(0)
    })

    it('should filter out deleted files', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [
            { id: 'id:1', name: 'new-photo.jpg', '.tag': 'file', path_lower: '/edited/new-photo.jpg' },
            { id: 'id:2', name: 'deleted.jpg', '.tag': 'deleted', path_lower: '/edited/deleted.jpg' },
          ],
          cursor: 'new-cursor',
          has_more: false,
        }),
      })

      const result = await detectNewPhotos('access-token', 'old-cursor')

      expect(result.newFiles).toHaveLength(1)
      expect(result.newFiles[0].name).toBe('new-photo.jpg')
    })
  })

  describe('File Download', () => {
    it('should download file content', async () => {
      const mockBlob = new Blob(['test content'], { type: 'image/jpeg' })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
        headers: new Headers({
          'dropbox-api-result': JSON.stringify({ name: 'photo.jpg', size: 12 }),
        }),
      })

      const result = await downloadFile('access-token', '/Edited/photo.jpg')

      expect(result.blob).toBeDefined()
      expect(result.metadata.name).toBe('photo.jpg')
    })

    it('should get temporary download link', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          link: 'https://dl.dropboxusercontent.com/temp-link',
          metadata: { name: 'photo.jpg' },
        }),
      })

      const client = new DropboxClient('access-token')
      const link = await client.getTemporaryLink('/Edited/photo.jpg')

      expect(link).toContain('dropboxusercontent.com')
    })
  })

  describe('Folder Monitor Setup', () => {
    it('should create folder monitor', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [],
          cursor: 'initial-cursor-123',
          has_more: false,
        }),
      })

      const monitor = await setupFolderMonitor('access-token', '/Edited', {
        auto_create_listing: true,
        default_service_package: 'essentials',
      })

      expect(monitor.folder_path).toBe('/Edited')
      expect(monitor.cursor).toBe('initial-cursor-123')
      expect(monitor.auto_create_listing).toBe(true)
    })

    it('should validate folder exists before monitoring', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: { '.tag': 'path', path: { '.tag': 'not_found' } },
        }),
      })

      await expect(
        setupFolderMonitor('access-token', '/NonExistent')
      ).rejects.toThrow()
    })
  })

  describe('DropboxClient Class', () => {
    it('should initialize with access token', () => {
      const client = new DropboxClient('test-access-token')

      expect(client).toBeDefined()
      expect(client.isAuthenticated()).toBe(true)
    })

    it('should list folder through client', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entries: [{ id: 'id:1', name: 'photo.jpg', type: 'file' }],
          cursor: 'cursor',
          has_more: false,
        }),
      })

      const client = new DropboxClient('access-token')
      const files = await client.listFolder('/Edited')

      expect(files).toHaveLength(1)
    })

    it('should check for changes since cursor', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          changes: true,
        }),
      })

      const client = new DropboxClient('access-token')
      const hasChanges = await client.hasChanges('cursor-123')

      expect(hasChanges).toBe(true)
    })

    it('should refresh access token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          expires_in: 14400,
        }),
      })

      const client = new DropboxClient('old-token', 'refresh-token')
      const newToken = await client.refreshToken()

      expect(newToken).toBe('new-access-token')
    })
  })

  describe('Webhook Event Processing', () => {
    it('should parse webhook notification', () => {
      const event: DropboxWebhookEvent = {
        list_folder: {
          accounts: ['dbid:AAH4f99', 'dbid:BBH4f99'],
        },
      }

      expect(event.list_folder.accounts).toHaveLength(2)
    })

    it('should identify relevant account in webhook', () => {
      const event: DropboxWebhookEvent = {
        list_folder: {
          accounts: ['dbid:AAH4f99', 'dbid:BBH4f99'],
        },
      }

      const isRelevant = event.list_folder.accounts.includes('dbid:AAH4f99')
      expect(isRelevant).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '60' }),
        json: async () => ({ error_summary: 'too_many_requests' }),
      })

      await expect(
        listFolderContents('access-token', '/Test')
      ).rejects.toThrow(/rate/i)
    })

    it('should handle expired access token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error_summary: 'expired_access_token' }),
      })

      await expect(
        listFolderContents('access-token', '/Test')
      ).rejects.toThrow(/expired|unauthorized/i)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        listFolderContents('access-token', '/Test')
      ).rejects.toThrow('Network error')
    })
  })
})
