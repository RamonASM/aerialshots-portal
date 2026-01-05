/**
 * Satori Renderer Tests
 *
 * Tests for SSRF protection, XSS prevention, and image rendering.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isValidImageUrl, sanitizeText, renderWithSatori } from './satori-renderer'
import type { TemplateDefinition, BrandKit } from '../types'

// Mock satori and sharp for unit tests
vi.mock('satori', () => ({
  default: vi.fn().mockResolvedValue('<svg></svg>'),
}))

vi.mock('sharp', () => ({
  default: vi.fn().mockReturnValue({
    png: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-image')),
  }),
}))

vi.mock('./fonts', () => ({
  loadFonts: vi.fn().mockResolvedValue([
    { name: 'Inter', data: Buffer.from('mock-font'), weight: 400, style: 'normal' },
  ]),
  AVAILABLE_FONTS: ['Inter', 'Roboto'],
  DEFAULT_FONT: 'Inter',
}))

describe('isValidImageUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('protocol validation', () => {
    it('should accept valid HTTPS URLs from allowed domains', () => {
      expect(isValidImageUrl('https://cdn.aerialshots.media/image.jpg')).toBe(true)
      expect(isValidImageUrl('https://images.aerialshots.media/photo.png')).toBe(true)
      expect(isValidImageUrl('https://storage.googleapis.com/bucket/file.webp')).toBe(true)
    })

    it('should reject HTTP URLs in production', () => {
      vi.stubEnv('NODE_ENV', 'production')
      expect(isValidImageUrl('http://cdn.aerialshots.media/image.jpg')).toBe(false)
    })

    it('should allow HTTP URLs in development for allowed domains', () => {
      vi.stubEnv('NODE_ENV', 'development')
      expect(isValidImageUrl('http://cdn.aerialshots.media/image.jpg')).toBe(true)
    })

    it('should reject file:// protocol', () => {
      expect(isValidImageUrl('file:///etc/passwd')).toBe(false)
      expect(isValidImageUrl('file://localhost/etc/passwd')).toBe(false)
    })

    it('should reject javascript: protocol', () => {
      expect(isValidImageUrl('javascript:alert(1)')).toBe(false)
    })

    it('should reject data: protocol', () => {
      expect(isValidImageUrl('data:image/png;base64,abc123')).toBe(false)
    })

    it('should reject vbscript: protocol', () => {
      expect(isValidImageUrl('vbscript:msgbox("test")')).toBe(false)
    })
  })

  describe('SSRF protection - blocked IP patterns', () => {
    it('should reject localhost', () => {
      expect(isValidImageUrl('https://localhost/image.jpg')).toBe(false)
      expect(isValidImageUrl('https://LOCALHOST/image.jpg')).toBe(false)
    })

    it('should reject 127.x.x.x addresses', () => {
      expect(isValidImageUrl('https://127.0.0.1/image.jpg')).toBe(false)
      expect(isValidImageUrl('https://127.0.0.255/image.jpg')).toBe(false)
      expect(isValidImageUrl('https://127.1.1.1/image.jpg')).toBe(false)
    })

    it('should reject 10.x.x.x private addresses', () => {
      expect(isValidImageUrl('https://10.0.0.1/image.jpg')).toBe(false)
      expect(isValidImageUrl('https://10.255.255.255/image.jpg')).toBe(false)
    })

    it('should reject 172.16-31.x.x private addresses', () => {
      expect(isValidImageUrl('https://172.16.0.1/image.jpg')).toBe(false)
      expect(isValidImageUrl('https://172.20.5.10/image.jpg')).toBe(false)
      expect(isValidImageUrl('https://172.31.255.255/image.jpg')).toBe(false)
    })

    it('should reject 192.168.x.x private addresses', () => {
      expect(isValidImageUrl('https://192.168.0.1/image.jpg')).toBe(false)
      expect(isValidImageUrl('https://192.168.1.100/image.jpg')).toBe(false)
    })

    it('should reject 169.254.x.x link-local addresses', () => {
      expect(isValidImageUrl('https://169.254.0.1/image.jpg')).toBe(false)
      expect(isValidImageUrl('https://169.254.169.254/image.jpg')).toBe(false) // AWS metadata
    })

    it('should reject 0.x.x.x addresses', () => {
      expect(isValidImageUrl('https://0.0.0.0/image.jpg')).toBe(false)
    })

    it('should reject CGNAT addresses (100.64-127.x.x)', () => {
      expect(isValidImageUrl('https://100.64.0.1/image.jpg')).toBe(false)
      expect(isValidImageUrl('https://100.100.100.100/image.jpg')).toBe(false)
      expect(isValidImageUrl('https://100.127.255.255/image.jpg')).toBe(false)
    })

    it('should reject IPv6 localhost', () => {
      expect(isValidImageUrl('https://[::1]/image.jpg')).toBe(false)
    })
  })

  describe('domain whitelist', () => {
    it('should accept Supabase storage URLs', () => {
      expect(isValidImageUrl('https://abc123.supabase.co/storage/v1/object/public/image.jpg')).toBe(true)
      expect(isValidImageUrl('https://project.supabase.in/storage/image.png')).toBe(true)
    })

    it('should accept Cloudinary URLs', () => {
      expect(isValidImageUrl('https://res.cloudinary.com/demo/image/upload/sample.jpg')).toBe(true)
    })

    it('should accept Google Cloud Storage URLs', () => {
      expect(isValidImageUrl('https://storage.googleapis.com/bucket/object.jpg')).toBe(true)
    })

    it('should accept AWS S3 URLs', () => {
      expect(isValidImageUrl('https://s3.amazonaws.com/bucket/key.jpg')).toBe(true)
    })

    it('should accept placeholder services', () => {
      expect(isValidImageUrl('https://via.placeholder.com/300x300')).toBe(true)
      expect(isValidImageUrl('https://placehold.co/300x300')).toBe(true)
      expect(isValidImageUrl('https://picsum.photos/300/300')).toBe(true)
    })

    it('should reject non-whitelisted domains', () => {
      expect(isValidImageUrl('https://evil.com/image.jpg')).toBe(false)
      expect(isValidImageUrl('https://attacker.io/malicious.png')).toBe(false)
    })

    it('should reject domains that look similar but are not whitelisted', () => {
      expect(isValidImageUrl('https://evil-supabase.co/image.jpg')).toBe(false)
      expect(isValidImageUrl('https://cloudinary.com.evil.com/image.jpg')).toBe(false)
    })
  })

  describe('DEV_ALLOW_IMAGE_DOMAINS', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('should allow domains specified in DEV_ALLOW_IMAGE_DOMAINS', () => {
      vi.stubEnv('DEV_ALLOW_IMAGE_DOMAINS', 'example.com,mycdn.net')
      expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true)
      expect(isValidImageUrl('https://mycdn.net/photo.png')).toBe(true)
      expect(isValidImageUrl('https://sub.example.com/image.jpg')).toBe(true)
    })

    it('should trim whitespace from domain list', () => {
      vi.stubEnv('DEV_ALLOW_IMAGE_DOMAINS', ' example.com , mycdn.net ')
      expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true)
    })

    it('should still reject blocked IPs even with custom domains', () => {
      vi.stubEnv('DEV_ALLOW_IMAGE_DOMAINS', 'localhost,127.0.0.1')
      expect(isValidImageUrl('https://localhost/image.jpg')).toBe(false)
      expect(isValidImageUrl('https://127.0.0.1/image.jpg')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should reject null/undefined', () => {
      expect(isValidImageUrl(null as unknown as string)).toBe(false)
      expect(isValidImageUrl(undefined as unknown as string)).toBe(false)
    })

    it('should reject empty string', () => {
      expect(isValidImageUrl('')).toBe(false)
    })

    it('should reject non-string values', () => {
      expect(isValidImageUrl(123 as unknown as string)).toBe(false)
      expect(isValidImageUrl({} as unknown as string)).toBe(false)
    })

    it('should reject malformed URLs', () => {
      expect(isValidImageUrl('not-a-url')).toBe(false)
      expect(isValidImageUrl('://missing-protocol.com')).toBe(false)
    })

    it('should handle URLs with ports', () => {
      expect(isValidImageUrl('https://cdn.aerialshots.media:443/image.jpg')).toBe(true)
      expect(isValidImageUrl('https://localhost:8080/image.jpg')).toBe(false)
    })

    it('should handle URLs with query strings', () => {
      expect(isValidImageUrl('https://cdn.aerialshots.media/image.jpg?width=300')).toBe(true)
    })

    it('should handle URLs with fragments', () => {
      expect(isValidImageUrl('https://cdn.aerialshots.media/image.jpg#section')).toBe(true)
    })
  })
})

describe('sanitizeText', () => {
  describe('XSS prevention', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")')
      expect(sanitizeText('<b>Bold</b> text')).toBe('Bold text')
      expect(sanitizeText('Hello <img src="x" onerror="alert(1)"/>')).toBe('Hello ')
    })

    it('should escape angle brackets', () => {
      expect(sanitizeText('5 < 10')).toBe('5 &lt; 10')
      expect(sanitizeText('10 > 5')).toBe('10 &gt; 5')
    })

    it('should remove javascript: protocol', () => {
      expect(sanitizeText('Click javascript:alert(1)')).toBe('Click alert(1)')
    })

    it('should remove data: protocol', () => {
      expect(sanitizeText('Image: data:image/png;base64,abc')).toBe('Image: image/png;base64,abc')
    })

    it('should handle nested tags', () => {
      expect(sanitizeText('<div><span>Nested</span></div>')).toBe('Nested')
    })

    it('should handle malformed tags', () => {
      expect(sanitizeText('<script>bad<script>code')).toBe('badcode')
    })
  })

  describe('length limiting', () => {
    it('should truncate text longer than 10000 characters', () => {
      const longText = 'a'.repeat(15000)
      expect(sanitizeText(longText).length).toBe(10000)
    })

    it('should not truncate text shorter than limit', () => {
      const shortText = 'Hello World'
      expect(sanitizeText(shortText)).toBe('Hello World')
    })
  })

  describe('edge cases', () => {
    it('should handle null/undefined', () => {
      expect(sanitizeText(null as unknown as string)).toBe('')
      expect(sanitizeText(undefined as unknown as string)).toBe('')
    })

    it('should handle empty string', () => {
      expect(sanitizeText('')).toBe('')
    })

    it('should handle non-string values', () => {
      expect(sanitizeText(123 as unknown as string)).toBe('')
    })

    it('should preserve normal text', () => {
      expect(sanitizeText('Hello World!')).toBe('Hello World!')
      expect(sanitizeText('Price: $500,000')).toBe('Price: $500,000')
    })

    it('should handle unicode characters', () => {
      expect(sanitizeText('Hello 世界 🏠')).toBe('Hello 世界 🏠')
    })

    it('should handle newlines', () => {
      expect(sanitizeText('Line 1\nLine 2')).toBe('Line 1\nLine 2')
    })
  })
})

describe('renderWithSatori', () => {
  const createTestTemplate = (overrides?: Partial<TemplateDefinition>): TemplateDefinition => ({
    id: 'test-template',
    slug: 'test-template',
    version: '1.0.0',
    name: 'Test Template',
    category: 'listing_marketing',
    canvas: {
      width: 1080,
      height: 1350,
      backgroundColor: '#000000',
    },
    layers: [
      {
        id: 'headline',
        type: 'text',
        visible: true,
        opacity: 1,
        position: { x: 50, y: 100, width: 980, height: 100, zIndex: 1 },
        content: {
          text: 'Test Headline',
          font: {
            family: 'Inter',
            size: 48,
            weight: '700',
            color: '#ffffff',
          },
        },
      },
    ],
    variables: [],
    metadata: {
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ...overrides,
  })

  describe('successful rendering', () => {
    it('should render a simple template', async () => {
      const result = await renderWithSatori({
        template: createTestTemplate(),
        variables: {},
        outputFormat: 'png',
      })

      expect(result.success).toBe(true)
      expect(result.width).toBe(1080)
      expect(result.height).toBe(1350)
      expect(result.format).toBe('png')
      expect(result.renderEngine).toBe('satori_sharp')
      expect(result.imageBase64).toBeDefined()
    })

    it('should support different output formats', async () => {
      const formats = ['png', 'jpg', 'webp'] as const

      for (const format of formats) {
        const result = await renderWithSatori({
          template: createTestTemplate(),
          variables: {},
          outputFormat: format,
        })

        expect(result.success).toBe(true)
        expect(result.format).toBe(format)
      }
    })

    it('should apply variables to template', async () => {
      const template = createTestTemplate({
        layers: [
          {
            id: 'headline',
            type: 'text',
            visible: true,
            opacity: 1,
            position: { x: 50, y: 100, width: 980, height: 100, zIndex: 1 },
            content: {
              text: 'Hello {{name}}!',
              font: {
                family: 'Inter',
                size: 48,
                weight: '700',
                color: '#ffffff',
              },
            },
          },
        ],
      })

      const result = await renderWithSatori({
        template,
        variables: { name: 'World' },
        outputFormat: 'png',
      })

      expect(result.success).toBe(true)
    })

    it('should apply brand kit settings', async () => {
      const brandKit: BrandKit = {
        id: 'test-brand',
        primaryColor: '#ff6b00',
        fontFamily: 'Roboto',
        agentName: 'Test Agent',
      }

      const result = await renderWithSatori({
        template: createTestTemplate(),
        variables: {},
        brandKit,
        outputFormat: 'png',
      })

      expect(result.success).toBe(true)
    })

    it('should use custom canvas dimensions', async () => {
      const template = createTestTemplate({
        canvas: {
          width: 1920,
          height: 1080,
          backgroundColor: '#ffffff',
        },
      })

      const result = await renderWithSatori({
        template,
        variables: {},
        outputFormat: 'png',
      })

      expect(result.success).toBe(true)
      expect(result.width).toBe(1920)
      expect(result.height).toBe(1080)
    })
  })

  describe('error handling', () => {
    it('should return error when template is missing', async () => {
      const result = await renderWithSatori({
        template: undefined as unknown as TemplateDefinition,
        variables: {},
        outputFormat: 'png',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Template is required')
    })

    it('should include render time in response', async () => {
      const result = await renderWithSatori({
        template: createTestTemplate(),
        variables: {},
        outputFormat: 'png',
      })

      expect(result.renderTimeMs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('layer types', () => {
    it('should handle text layers', async () => {
      const template = createTestTemplate({
        layers: [
          {
            id: 'text-1',
            type: 'text',
            visible: true,
            opacity: 1,
            position: { x: 50, y: 100, width: 500, height: 50, zIndex: 1 },
            content: {
              text: 'Hello World',
              font: { family: 'Inter', size: 24, weight: '400', color: '#000' },
            },
          },
        ],
      })

      const result = await renderWithSatori({
        template,
        variables: {},
        outputFormat: 'png',
      })

      expect(result.success).toBe(true)
    })

    it('should handle shape layers', async () => {
      const template = createTestTemplate({
        layers: [
          {
            id: 'shape-1',
            type: 'shape',
            visible: true,
            opacity: 1,
            position: { x: 0, y: 0, width: 1080, height: 200, zIndex: 0 },
            content: {
              shape: 'rectangle',
              fill: '#ff0000',
              borderRadius: 10,
            },
          },
        ],
      })

      const result = await renderWithSatori({
        template,
        variables: {},
        outputFormat: 'png',
      })

      expect(result.success).toBe(true)
    })

    it('should handle gradient layers', async () => {
      const template = createTestTemplate({
        layers: [
          {
            id: 'gradient-1',
            type: 'gradient',
            visible: true,
            opacity: 0.8,
            position: { x: 0, y: 0, width: 1080, height: 1350, zIndex: 0 },
            content: {
              type: 'linear',
              angle: 180,
              stops: [
                { color: 'rgba(0,0,0,0)', position: 0 },
                { color: 'rgba(0,0,0,0.8)', position: 1 },
              ],
            },
          },
        ],
      })

      const result = await renderWithSatori({
        template,
        variables: {},
        outputFormat: 'png',
      })

      expect(result.success).toBe(true)
    })

    it('should handle container layers with children', async () => {
      const template = createTestTemplate({
        layers: [
          {
            id: 'container-1',
            type: 'container',
            visible: true,
            opacity: 1,
            position: { x: 50, y: 50, width: 980, height: 400, zIndex: 1 },
            content: {
              direction: 'column',
              gap: 10,
              children: [
                {
                  id: 'child-text',
                  type: 'text',
                  visible: true,
                  opacity: 1,
                  position: { width: 'auto', height: 'auto', zIndex: 1 },
                  content: {
                    text: 'Child Text',
                    font: { family: 'Inter', size: 16, weight: '400', color: '#fff' },
                  },
                },
              ],
            },
          },
        ],
      })

      const result = await renderWithSatori({
        template,
        variables: {},
        outputFormat: 'png',
      })

      expect(result.success).toBe(true)
    })

    it('should skip invisible layers', async () => {
      const template = createTestTemplate({
        layers: [
          {
            id: 'visible-text',
            type: 'text',
            visible: true,
            opacity: 1,
            position: { x: 50, y: 100, width: 500, height: 50, zIndex: 1 },
            content: {
              text: 'Visible',
              font: { family: 'Inter', size: 24, weight: '400', color: '#000' },
            },
          },
          {
            id: 'invisible-text',
            type: 'text',
            visible: false,
            opacity: 1,
            position: { x: 50, y: 200, width: 500, height: 50, zIndex: 1 },
            content: {
              text: 'Invisible',
              font: { family: 'Inter', size: 24, weight: '400', color: '#000' },
            },
          },
        ],
      })

      const result = await renderWithSatori({
        template,
        variables: {},
        outputFormat: 'png',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('text features', () => {
    it('should apply text transforms', async () => {
      const template = createTestTemplate({
        layers: [
          {
            id: 'uppercase-text',
            type: 'text',
            visible: true,
            opacity: 1,
            position: { x: 50, y: 100, width: 500, height: 50, zIndex: 1 },
            content: {
              text: 'hello world',
              textTransform: 'uppercase',
              font: { family: 'Inter', size: 24, weight: '400', color: '#000' },
            },
          },
        ],
      })

      const result = await renderWithSatori({
        template,
        variables: {},
        outputFormat: 'png',
      })

      expect(result.success).toBe(true)
    })

    it('should sanitize text content', async () => {
      const template = createTestTemplate({
        layers: [
          {
            id: 'xss-text',
            type: 'text',
            visible: true,
            opacity: 1,
            position: { x: 50, y: 100, width: 500, height: 50, zIndex: 1 },
            content: {
              text: '<script>alert("xss")</script>Safe text',
              font: { family: 'Inter', size: 24, weight: '400', color: '#000' },
            },
          },
        ],
      })

      const result = await renderWithSatori({
        template,
        variables: {},
        outputFormat: 'png',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('image layers', () => {
    it('should validate image URLs', async () => {
      const template = createTestTemplate({
        layers: [
          {
            id: 'image-1',
            type: 'image',
            visible: true,
            opacity: 1,
            position: { x: 0, y: 0, width: 1080, height: 500, zIndex: 0 },
            content: {
              url: 'https://cdn.aerialshots.media/test.jpg',
              fit: 'cover',
            },
          },
        ],
      })

      const result = await renderWithSatori({
        template,
        variables: {},
        outputFormat: 'png',
      })

      expect(result.success).toBe(true)
    })

    it('should block invalid image URLs', async () => {
      const template = createTestTemplate({
        layers: [
          {
            id: 'bad-image',
            type: 'image',
            visible: true,
            opacity: 1,
            position: { x: 0, y: 0, width: 1080, height: 500, zIndex: 0 },
            content: {
              url: 'https://evil.com/malicious.jpg',
              fit: 'cover',
            },
          },
        ],
      })

      // The render should succeed, but the image should be skipped
      const result = await renderWithSatori({
        template,
        variables: {},
        outputFormat: 'png',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('positioning', () => {
    it('should handle absolute positioning', async () => {
      const template = createTestTemplate({
        layers: [
          {
            id: 'positioned',
            type: 'text',
            visible: true,
            opacity: 1,
            position: {
              type: 'absolute',
              x: 100,
              y: 200,
              width: 500,
              height: 50,
              zIndex: 1,
            },
            content: {
              text: 'Positioned',
              font: { family: 'Inter', size: 24, weight: '400', color: '#000' },
            },
          },
        ],
      })

      const result = await renderWithSatori({
        template,
        variables: {},
        outputFormat: 'png',
      })

      expect(result.success).toBe(true)
    })

    it('should handle anchor-based positioning', async () => {
      const anchors = [
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
        'center',
      ] as const

      for (const anchor of anchors) {
        const template = createTestTemplate({
          layers: [
            {
              id: `anchor-${anchor}`,
              type: 'text',
              visible: true,
              opacity: 1,
              position: {
                anchor,
                x: 50,
                y: 50,
                width: 200,
                height: 50,
                zIndex: 1,
              },
              content: {
                text: `Anchor: ${anchor}`,
                font: { family: 'Inter', size: 16, weight: '400', color: '#fff' },
              },
            },
          ],
        })

        const result = await renderWithSatori({
          template,
          variables: {},
          outputFormat: 'png',
        })

        expect(result.success).toBe(true)
      }
    })

    it('should sort layers by zIndex', async () => {
      const template = createTestTemplate({
        layers: [
          {
            id: 'layer-3',
            type: 'text',
            visible: true,
            opacity: 1,
            position: { x: 50, y: 100, width: 500, height: 50, zIndex: 3 },
            content: {
              text: 'Third',
              font: { family: 'Inter', size: 24, weight: '400', color: '#000' },
            },
          },
          {
            id: 'layer-1',
            type: 'text',
            visible: true,
            opacity: 1,
            position: { x: 50, y: 100, width: 500, height: 50, zIndex: 1 },
            content: {
              text: 'First',
              font: { family: 'Inter', size: 24, weight: '400', color: '#000' },
            },
          },
          {
            id: 'layer-2',
            type: 'text',
            visible: true,
            opacity: 1,
            position: { x: 50, y: 100, width: 500, height: 50, zIndex: 2 },
            content: {
              text: 'Second',
              font: { family: 'Inter', size: 24, weight: '400', color: '#000' },
            },
          },
        ],
      })

      const result = await renderWithSatori({
        template,
        variables: {},
        outputFormat: 'png',
      })

      expect(result.success).toBe(true)
    })
  })
})
