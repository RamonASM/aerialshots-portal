/**
 * Render Engine Types
 * Core type definitions for the text-to-image rendering system
 */

// =====================
// TEMPLATE TYPES
// =====================

export type TemplateCategory =
  | 'story_archetype'
  | 'listing_marketing'
  | 'carousel_slide'
  | 'social_post'
  | 'agent_branding'
  | 'market_update'

export type LayerType =
  | 'text'
  | 'image'
  | 'shape'
  | 'gradient'
  | 'container'

export type OutputFormat = 'png' | 'jpg' | 'webp'

export type RenderEngine = 'satori_sharp' | 'puppeteer_chrome'

export type RenderPath = 'fast' | 'standard' | 'premium'

export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '1.91:1'

export interface CanvasConfig {
  width: number
  height: number
  backgroundColor?: string
  backgroundImage?: string
}

// =====================
// LAYER DEFINITIONS
// =====================

export interface LayerPosition {
  type?: 'absolute' | 'flex'
  x?: number | string
  y?: number | string
  width?: number | string
  height?: number | string
  anchor?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  zIndex?: number
}

export interface FontStyle {
  family?: string
  familyVariable?: string
  size: number
  weight?: '400' | '500' | '600' | '700' | '800'
  style?: 'normal' | 'italic'
  color: string
  colorVariable?: string
  align?: 'left' | 'center' | 'right'
  lineHeight?: number
  letterSpacing?: number
}

export interface AutoSizeConfig {
  enabled: boolean
  mode?: 'shrink' | 'grow' | 'both'
  minSize?: number
  maxSize?: number
  breakpoints?: Array<{ maxLength: number; fontSize: number }>
}

export interface TextContent {
  text?: string
  variable?: string
  font: FontStyle
  autoSize?: AutoSizeConfig
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  lineClamp?: number
}

export interface ImageContent {
  url?: string
  variable?: string
  fit?: 'cover' | 'contain' | 'fill'
  position?: string
  borderRadius?: number | string
  filter?: {
    brightness?: number
    contrast?: number
    blur?: number
    grayscale?: number
  }
}

export interface ShapeContent {
  shape: 'rectangle' | 'ellipse' | 'line'
  fill?: string
  fillVariable?: string
  stroke?: {
    color: string
    width: number
  }
  borderRadius?: number | string
}

export interface GradientContent {
  type: 'linear' | 'radial'
  angle?: number
  stops: Array<{ position: number; color: string }>
}

export interface ContainerContent {
  direction?: 'row' | 'column'
  justify?: 'start' | 'center' | 'end' | 'space-between'
  align?: 'start' | 'center' | 'end' | 'stretch'
  gap?: number
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number }
  children?: Layer[]
}

export type LayerContent = TextContent | ImageContent | ShapeContent | GradientContent | ContainerContent

export interface Layer {
  id: string
  name?: string
  type: LayerType
  visible?: boolean
  opacity?: number
  position: LayerPosition
  content: LayerContent
}

// =====================
// TEMPLATE DEFINITION
// =====================

export interface TemplateVariable {
  name: string
  displayName?: string
  type: 'string' | 'number' | 'color' | 'image' | 'boolean'
  required?: boolean
  default?: string | number | boolean
  source?: 'user_input' | 'brand_kit' | 'listing' | 'agent' | 'life_here' | 'system'
  path?: string // For nested data access
}

export interface BrandKitBindings {
  primaryColor?: string
  secondaryColor?: string
  fontFamily?: string
  logoUrl?: string
  headshotUrl?: string
}

export interface TemplateDefinition {
  id: string
  slug: string
  version: string
  name: string
  description?: string
  category: TemplateCategory
  subcategory?: string
  extends?: string // Parent template slug
  canvas: CanvasConfig
  layers: Layer[]
  variables?: TemplateVariable[]
  brandKitBindings?: BrandKitBindings
  metadata?: Record<string, unknown>
}

// =====================
// BRAND KIT
// =====================

export interface BrandKit {
  id: string
  name?: string
  primaryColor: string
  secondaryColor?: string
  accentColor?: string
  fontFamily: string
  logoUrl?: string
  headshotUrl?: string
  agentName?: string
  agentTitle?: string
  agentPhone?: string
  brokerageName?: string
  brokerageLogoUrl?: string
}

// =====================
// RENDER INPUT/OUTPUT
// =====================

export interface RenderImageInput {
  templateId?: string
  template?: TemplateDefinition
  variables: Record<string, string | number | boolean>
  brandKit?: BrandKit
  outputFormat?: OutputFormat
  quality?: number
  renderEngine?: RenderEngine
}

export interface RenderImageOutput {
  success: boolean
  imageUrl?: string
  imageBase64?: string
  storageKey?: string
  width: number
  height: number
  format: OutputFormat
  renderTimeMs: number
  renderEngine: RenderEngine
  cached?: boolean
  error?: string
}

export interface SlideRenderInput {
  position: number
  slideType?: string
  headline: string
  body: string
  backgroundImageUrl?: string
  visualSuggestion?: string
}

export interface CarouselRenderInput {
  carouselId?: string
  slides: SlideRenderInput[]
  brandKit: BrandKit
  aspectRatio: AspectRatio
  templateStyle?: string
  outputFormat?: OutputFormat
  webhookUrl?: string
  metadata?: Record<string, unknown>
}

export interface CarouselRenderOutput {
  carouselId: string
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed'
  slides: Array<{
    position: number
    status: 'pending' | 'completed' | 'failed'
    imageUrl?: string
    storageKey?: string
    renderTimeMs?: number
    error?: string
  }>
  totalRenderTimeMs: number
  completedCount: number
  failedCount: number
}

// =====================
// FONT TYPES
// =====================

export interface FontWeight {
  weight: 400 | 500 | 600 | 700 | 800
  data: ArrayBuffer
}

export interface FontDefinition {
  family: string
  weights: FontWeight[]
}

export interface FontRegistry {
  [family: string]: {
    regular?: string // Path or URL
    medium?: string
    semibold?: string
    bold?: string
  }
}

// =====================
// RENDER JOB TYPES
// =====================

export type RenderJobStatus = 'pending' | 'processing' | 'completed' | 'partial' | 'failed' | 'cancelled'

export type RenderJobType = 'single' | 'carousel' | 'batch'

export interface RenderJob {
  id: string
  jobType: RenderJobType
  status: RenderJobStatus
  templateId?: string
  inputData: Record<string, unknown>
  outputUrls?: string[]
  renderEngine?: RenderEngine
  renderTimeMs?: number
  creditsCost?: number
  errorMessage?: string
  createdAt: string
  completedAt?: string
}

// =====================
// LIFE HERE DATA TYPES
// =====================

export interface LifeHereData {
  lifeHereScore?: {
    score: number
    label: string
  }
  walkScore?: number
  transitScore?: number
  bikeScore?: number
  dining?: Array<{
    name: string
    cuisine: string
    rating: number
    distance: string
  }>
  schools?: Array<{
    name: string
    type: string
    rating: number
    distance: string
  }>
  parks?: Array<{
    name: string
    type: string
    distance: string
  }>
  attractions?: Array<{
    name: string
    type: string
    distance: string
    waitTime?: number
  }>
  commute?: {
    airport?: string
    beach?: string
    downtown?: string
    themePark?: string
  }
  events?: Array<{
    name: string
    date: string
    venue: string
  }>
  highlights?: string[]
}

// =====================
// UTILITY TYPES
// =====================

export interface RenderContext {
  variables: Record<string, string | number | boolean>
  brandKit?: BrandKit
  lifeHereData?: LifeHereData
  listingData?: Record<string, unknown>
  agentData?: Record<string, unknown>
}

export interface ResolvedLayer extends Omit<Layer, 'content'> {
  content: LayerContent
  resolvedStyles: Record<string, string | number>
}

export type RenderResult<T> = {
  success: true
  data: T
  metadata?: {
    renderTimeMs: number
    renderEngine: RenderEngine
    cached?: boolean
  }
} | {
  success: false
  error: string
  errorCode?: string
}
