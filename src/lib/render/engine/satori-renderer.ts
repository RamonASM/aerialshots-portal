/**
 * Satori + Sharp Renderer
 * Fast path for simple text overlays and solid color templates
 */

import satori from 'satori'
import sharp from 'sharp'
import type {
  TemplateDefinition,
  Layer,
  TextContent,
  ImageContent,
  ShapeContent,
  GradientContent,
  ContainerContent,
  BrandKit,
  RenderContext,
  RenderImageInput,
  RenderImageOutput,
  OutputFormat,
} from '../types'
import { loadFonts, AVAILABLE_FONTS, DEFAULT_FONT } from './fonts'
import { resolveVariables, resolveColor, calculateAutoSize } from './variable-resolver'

// =====================
// CONSTANTS
// =====================

const DEFAULT_CANVAS = {
  width: 1080,
  height: 1350,
  backgroundColor: '#000000',
}

// Allowed image URL domains (whitelist approach for security)
const ALLOWED_IMAGE_DOMAINS = [
  // Supabase Storage
  'supabase.co',
  'supabase.in',
  // CDNs
  'cdn.aerialshots.media',
  'images.aerialshots.media',
  // Google Cloud Storage
  'storage.googleapis.com',
  // AWS S3
  's3.amazonaws.com',
  // Cloudflare
  'imagedelivery.net',
  'cloudflare-ipfs.com',
  // Common CDNs
  'cloudinary.com',
  'res.cloudinary.com',
  'imgix.net',
  // Placeholder services (for development)
  'via.placeholder.com',
  'placehold.co',
  'picsum.photos',
]

// Blocked IP patterns (SSRF protection)
const BLOCKED_IP_PATTERNS = [
  /^127\./, // Localhost
  /^10\./, // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private Class B
  /^192\.168\./, // Private Class C
  /^169\.254\./, // Link-local
  /^0\./, // Current network
  /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, // CGNAT
  /^localhost$/i,
  /^::1$/, // IPv6 localhost
  /^fc00:/i, // IPv6 private
  /^fe80:/i, // IPv6 link-local
]

// =====================
// SECURITY FUNCTIONS
// =====================

/**
 * Get additional allowed domains from environment
 * This allows explicit configuration of trusted domains in development
 */
function getAdditionalAllowedDomains(): string[] {
  const devDomains = process.env.DEV_ALLOW_IMAGE_DOMAINS
  if (!devDomains) return []
  return devDomains.split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
}

/**
 * Validate image URL to prevent SSRF attacks
 * Uses a whitelist approach with blocked IP patterns
 *
 * SECURITY: Whitelist is enforced in ALL environments.
 * To allow additional domains in development, set DEV_ALLOW_IMAGE_DOMAINS env var.
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false

  try {
    const parsed = new URL(url)

    // Only allow HTTPS in production
    // Allow HTTP only in development for local dev servers
    const isSecure = parsed.protocol === 'https:'
    const isDevHttp = parsed.protocol === 'http:' && process.env.NODE_ENV === 'development'
    if (!isSecure && !isDevHttp) return false

    // Block dangerous protocols
    if (['file:', 'javascript:', 'data:', 'vbscript:'].includes(parsed.protocol)) {
      return false
    }

    // Check hostname against blocked IP patterns (SSRF protection)
    const hostname = parsed.hostname.toLowerCase()
    if (BLOCKED_IP_PATTERNS.some(pattern => pattern.test(hostname))) {
      return false
    }

    // Build complete list of allowed domains
    const allAllowedDomains = [
      ...ALLOWED_IMAGE_DOMAINS,
      ...getAdditionalAllowedDomains(),
    ]

    // Check if hostname is in allowed domains
    const isAllowedDomain = allAllowedDomains.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    )

    // SECURITY: Always enforce domain whitelist in ALL environments
    // This prevents SSRF attacks via compromised legitimate domains
    if (!isAllowedDomain) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[Render Security] Blocked image URL from non-whitelisted domain: ${hostname}. ` +
          `Add to DEV_ALLOW_IMAGE_DOMAINS env var if needed for testing.`
        )
      }
      return false
    }

    return true
  } catch {
    // Invalid URL
    return false
  }
}

/**
 * Sanitize text content to prevent XSS in SVG
 * Removes HTML tags and escapes special characters
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return ''

  return text
    // Remove any HTML/XML tags
    .replace(/<[^>]*>/g, '')
    // Escape remaining angle brackets
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Remove script-like patterns
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    // Limit length to prevent DoS
    .slice(0, 10000)
}

// =====================
// MAIN RENDER FUNCTION
// =====================

/**
 * Render a template to an image using Satori + Sharp
 */
export async function renderWithSatori(
  input: RenderImageInput
): Promise<RenderImageOutput> {
  const startTime = Date.now()

  try {
    const template = input.template
    if (!template) {
      return {
        success: false,
        width: 0,
        height: 0,
        format: input.outputFormat || 'png',
        renderTimeMs: Date.now() - startTime,
        renderEngine: 'satori_sharp',
        error: 'Template is required',
      }
    }

    const canvas = {
      ...DEFAULT_CANVAS,
      ...template.canvas,
    }

    // Build render context
    const context: RenderContext = {
      variables: input.variables,
      brandKit: input.brandKit,
    }

    // Resolve font family from brand kit or template
    const fontFamily = input.brandKit?.fontFamily ||
      template.variables?.find(v => v.name === 'fontFamily')?.default as string ||
      DEFAULT_FONT

    // Load fonts
    const fonts = await loadFonts(fontFamily)

    // Build the element tree from layers
    const element = buildElementTree(template.layers, context, canvas.width, canvas.height)

    // Create root element with background
    const rootElement = createRootElement(canvas, element, context)

    // Render to SVG
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svg = await satori(rootElement as any, {
      width: canvas.width,
      height: canvas.height,
      fonts,
    })

    // Convert SVG to image format
    const format = input.outputFormat || 'png'
    const quality = input.quality || 90
    const imageBuffer = await convertSvgToImage(svg, format, quality)
    const base64 = imageBuffer.toString('base64')

    return {
      success: true,
      imageBase64: base64,
      width: canvas.width,
      height: canvas.height,
      format,
      renderTimeMs: Date.now() - startTime,
      renderEngine: 'satori_sharp',
    }
  } catch (error) {
    return {
      success: false,
      width: 0,
      height: 0,
      format: input.outputFormat || 'png',
      renderTimeMs: Date.now() - startTime,
      renderEngine: 'satori_sharp',
      error: error instanceof Error ? error.message : 'Render failed',
    }
  }
}

// =====================
// ELEMENT BUILDERS
// =====================

/**
 * Create the root element with background
 */
function createRootElement(
  canvas: { width: number; height: number; backgroundColor?: string; backgroundImage?: string },
  children: unknown,
  context: RenderContext
) {
  const bgColor = resolveColor(canvas.backgroundColor, context) || '#000000'

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: bgColor,
        position: 'relative',
      },
      children,
    },
  }
}

/**
 * Build element tree from layers
 */
function buildElementTree(
  layers: Layer[],
  context: RenderContext,
  canvasWidth: number,
  canvasHeight: number
): unknown {
  // Sort by zIndex
  const sortedLayers = [...layers]
    .filter(l => l.visible !== false)
    .sort((a, b) => (a.position.zIndex || 0) - (b.position.zIndex || 0))

  const elements = sortedLayers.map(layer =>
    buildLayerElement(layer, context, canvasWidth, canvasHeight)
  ).filter(Boolean)

  return elements.length === 1 ? elements[0] : elements
}

/**
 * Build a single layer element
 */
function buildLayerElement(
  layer: Layer,
  context: RenderContext,
  canvasWidth: number,
  canvasHeight: number
): unknown {
  switch (layer.type) {
    case 'text':
      return buildTextElement(layer, context, canvasWidth)
    case 'image':
      return buildImageElement(layer, context)
    case 'shape':
      return buildShapeElement(layer, context)
    case 'gradient':
      return buildGradientElement(layer, context)
    case 'container':
      return buildContainerElement(layer, context, canvasWidth, canvasHeight)
    default:
      return null
  }
}

/**
 * Build text element
 */
function buildTextElement(
  layer: Layer,
  context: RenderContext,
  canvasWidth: number
): unknown {
  const content = layer.content as TextContent
  const position = layer.position

  // Resolve text content
  let text = content.text || ''
  if (content.variable && context.variables[content.variable] !== undefined) {
    text = String(context.variables[content.variable])
  }

  // Resolve variables in text (handlebars-like)
  text = resolveVariables(text, context)

  // Sanitize text to prevent XSS attacks
  text = sanitizeText(text)

  // Apply text transform
  if (content.textTransform === 'uppercase') text = text.toUpperCase()
  else if (content.textTransform === 'lowercase') text = text.toLowerCase()
  else if (content.textTransform === 'capitalize') {
    text = text.replace(/\b\w/g, l => l.toUpperCase())
  }

  // Resolve font settings
  const fontFamily = content.font.familyVariable
    ? String(context.variables[content.font.familyVariable] || context.brandKit?.fontFamily || DEFAULT_FONT)
    : content.font.family || DEFAULT_FONT

  // Auto-size calculation
  let fontSize = content.font.size
  if (content.autoSize?.enabled) {
    fontSize = calculateAutoSize(text, content.autoSize, canvasWidth)
  }

  // Resolve color
  const color = content.font.colorVariable
    ? resolveColor(context.variables[content.font.colorVariable] as string, context)
    : content.font.color

  // Build position styles
  const positionStyles = buildPositionStyles(position)

  return {
    type: 'div',
    props: {
      style: {
        ...positionStyles,
        fontFamily,
        fontSize,
        fontWeight: parseInt(content.font.weight || '400'),
        fontStyle: content.font.style || 'normal',
        color,
        textAlign: content.font.align || 'left',
        lineHeight: content.font.lineHeight || 1.3,
        letterSpacing: content.font.letterSpacing || 0,
        opacity: layer.opacity ?? 1,
        ...(content.lineClamp && {
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: content.lineClamp,
          WebkitBoxOrient: 'vertical',
        }),
      },
      children: text,
    },
  }
}

/**
 * Build image element
 */
function buildImageElement(
  layer: Layer,
  context: RenderContext
): unknown {
  const content = layer.content as ImageContent
  const position = layer.position

  // Resolve image URL
  let imageUrl = content.url || ''
  if (content.variable && context.variables[content.variable]) {
    imageUrl = String(context.variables[content.variable])
  }

  // Handle brand kit image bindings
  if (content.variable === 'logoUrl' && context.brandKit?.logoUrl) {
    imageUrl = context.brandKit.logoUrl
  } else if (content.variable === 'headshotUrl' && context.brandKit?.headshotUrl) {
    imageUrl = context.brandKit.headshotUrl
  }

  if (!imageUrl) return null

  // Validate image URL to prevent SSRF attacks
  if (!isValidImageUrl(imageUrl)) {
    console.warn(`[Render] Blocked invalid image URL: ${imageUrl.slice(0, 100)}`)
    return null
  }

  const positionStyles = buildPositionStyles(position)

  return {
    type: 'img',
    props: {
      src: imageUrl,
      style: {
        ...positionStyles,
        objectFit: content.fit || 'cover',
        objectPosition: content.position || 'center',
        borderRadius: content.borderRadius || 0,
        opacity: layer.opacity ?? 1,
        ...(content.filter && {
          filter: buildFilterString(content.filter),
        }),
      },
    },
  }
}

/**
 * Build shape element
 */
function buildShapeElement(
  layer: Layer,
  context: RenderContext
): unknown {
  const content = layer.content as ShapeContent
  const position = layer.position

  // Resolve fill color
  const fill = content.fillVariable
    ? resolveColor(context.variables[content.fillVariable] as string, context)
    : content.fill || 'transparent'

  const positionStyles = buildPositionStyles(position)

  const shapeStyles: Record<string, unknown> = {
    ...positionStyles,
    backgroundColor: fill,
    opacity: layer.opacity ?? 1,
  }

  if (content.borderRadius) {
    shapeStyles.borderRadius = content.borderRadius
  }

  if (content.shape === 'ellipse') {
    shapeStyles.borderRadius = '50%'
  }

  if (content.stroke) {
    shapeStyles.border = `${content.stroke.width}px solid ${content.stroke.color}`
  }

  return {
    type: 'div',
    props: {
      style: shapeStyles,
    },
  }
}

/**
 * Build gradient element
 */
function buildGradientElement(
  layer: Layer,
  context: RenderContext
): unknown {
  const content = layer.content as GradientContent
  const position = layer.position

  const positionStyles = buildPositionStyles(position)

  // Build gradient string
  const stops = content.stops
    .map(s => `${s.color} ${s.position * 100}%`)
    .join(', ')

  let backgroundImage: string
  if (content.type === 'radial') {
    backgroundImage = `radial-gradient(${stops})`
  } else {
    const angle = content.angle ?? 180
    backgroundImage = `linear-gradient(${angle}deg, ${stops})`
  }

  return {
    type: 'div',
    props: {
      style: {
        ...positionStyles,
        backgroundImage,
        opacity: layer.opacity ?? 1,
      },
    },
  }
}

/**
 * Build container element
 */
function buildContainerElement(
  layer: Layer,
  context: RenderContext,
  canvasWidth: number,
  canvasHeight: number
): unknown {
  const content = layer.content as ContainerContent
  const position = layer.position

  const positionStyles = buildPositionStyles(position)

  // Build children
  const children = content.children?.map(child =>
    buildLayerElement(child, context, canvasWidth, canvasHeight)
  ).filter(Boolean)

  const containerStyles: Record<string, unknown> = {
    ...positionStyles,
    display: 'flex',
    flexDirection: content.direction || 'column',
    justifyContent: mapJustify(content.justify),
    alignItems: mapAlign(content.align),
    gap: content.gap || 0,
    opacity: layer.opacity ?? 1,
  }

  if (content.padding) {
    if (typeof content.padding === 'number') {
      containerStyles.padding = content.padding
    } else {
      containerStyles.paddingTop = content.padding.top || 0
      containerStyles.paddingRight = content.padding.right || 0
      containerStyles.paddingBottom = content.padding.bottom || 0
      containerStyles.paddingLeft = content.padding.left || 0
    }
  }

  return {
    type: 'div',
    props: {
      style: containerStyles,
      children,
    },
  }
}

// =====================
// HELPER FUNCTIONS
// =====================

/**
 * Build CSS position styles from layer position
 */
function buildPositionStyles(position: Layer['position']): Record<string, unknown> {
  const styles: Record<string, unknown> = {}

  if (position.type === 'absolute' || !position.type) {
    styles.position = 'absolute'

    // Handle anchor-based positioning
    const anchor = position.anchor || 'top-left'

    if (typeof position.x === 'number') {
      if (anchor.includes('right')) {
        styles.right = position.x
      } else if (anchor.includes('center')) {
        styles.left = position.x
        styles.transform = 'translateX(-50%)'
      } else {
        styles.left = position.x
      }
    } else if (position.x) {
      styles.left = position.x
    }

    if (typeof position.y === 'number') {
      if (anchor.includes('bottom')) {
        styles.bottom = position.y
      } else if (anchor === 'center' || anchor === 'center-left' || anchor === 'center-right') {
        styles.top = position.y
        styles.transform = styles.transform
          ? `${styles.transform} translateY(-50%)`
          : 'translateY(-50%)'
      } else {
        styles.top = position.y
      }
    } else if (position.y) {
      styles.top = position.y
    }
  } else {
    styles.position = 'relative'
  }

  if (position.width) {
    styles.width = typeof position.width === 'number' ? position.width : position.width
  }
  if (position.height) {
    styles.height = typeof position.height === 'number' ? position.height : position.height
  }

  return styles
}

/**
 * Build CSS filter string
 */
function buildFilterString(filter: ImageContent['filter']): string {
  if (!filter) return 'none'

  const parts: string[] = []
  if (filter.brightness !== undefined) parts.push(`brightness(${filter.brightness})`)
  if (filter.contrast !== undefined) parts.push(`contrast(${filter.contrast})`)
  if (filter.blur !== undefined) parts.push(`blur(${filter.blur}px)`)
  if (filter.grayscale !== undefined) parts.push(`grayscale(${filter.grayscale})`)

  return parts.length > 0 ? parts.join(' ') : 'none'
}

/**
 * Map justify content value
 */
function mapJustify(value?: string): string {
  switch (value) {
    case 'start': return 'flex-start'
    case 'end': return 'flex-end'
    case 'center': return 'center'
    case 'space-between': return 'space-between'
    default: return 'flex-start'
  }
}

/**
 * Map align items value
 */
function mapAlign(value?: string): string {
  switch (value) {
    case 'start': return 'flex-start'
    case 'end': return 'flex-end'
    case 'center': return 'center'
    case 'stretch': return 'stretch'
    default: return 'flex-start'
  }
}

/**
 * Convert SVG to image format using Sharp
 */
async function convertSvgToImage(
  svg: string,
  format: OutputFormat,
  quality: number
): Promise<Buffer> {
  const svgBuffer = Buffer.from(svg)

  switch (format) {
    case 'jpg':
      return sharp(svgBuffer)
        .jpeg({ quality })
        .toBuffer()
    case 'webp':
      return sharp(svgBuffer)
        .webp({ quality })
        .toBuffer()
    case 'png':
    default:
      return sharp(svgBuffer)
        .png()
        .toBuffer()
  }
}

export { AVAILABLE_FONTS }
