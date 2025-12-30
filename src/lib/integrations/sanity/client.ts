import { createClient } from '@sanity/client'

// Sanity project configuration from aerialshots-blog
// Matches the existing blog frontend configuration
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'dqyvtgh9'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const apiVersion = '2021-10-21' // Match existing blog frontend

// Blog frontend URL (separate Next.js app)
export const BLOG_URL = process.env.NEXT_PUBLIC_BLOG_URL || 'https://blog.aerialshots.media'

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // Enable CDN for faster reads
  perspective: 'published', // Only fetch published content
})

// Types for Sanity content - aligned with existing blog frontend schema
export interface SanityArticle {
  _id: string
  _createdAt: string
  _updatedAt?: string
  title: string
  slug: { current: string }
  publishedAt: string
  excerpt?: string // Short excerpt for previews
  metaDescription?: string // SEO meta description
  pillar?: string // Pillar content strategy
  featured?: boolean
  categoryTitles?: string[] // Computed field from query
  categories?: Array<{
    _id: string
    title: string
    slug: { current: string }
    categoryType?: string
    description?: string
  }>
  mainImage?: {
    asset?: {
      _id: string
      url: string
    }
  }
  author?: {
    _id: string
    name: string
    image?: {
      asset?: {
        url: string
      }
    }
  }
  introduction?: unknown[] // Portable Text blocks
  mainContent?: unknown[] // Portable Text blocks
  conclusion?: unknown[] // Portable Text blocks
  comparisonItems?: Array<{
    name: string
    description: string
    pros: string[]
    cons: string[]
    pricing?: string
    bestFor?: string
    asmTieIn?: string
    image?: {
      asset?: {
        url: string
      }
    }
  }>
  services?: Array<{
    _id: string
    name: string
    slug: { current: string }
    serviceType: string
  }>
}

export interface SanityCategory {
  _id: string
  title: string
  slug: { current: string }
  categoryType?: string
  description?: string
}

// GROQ queries - aligned with existing blog frontend
export const articleListQuery = `*[_type == "article"] | order(publishedAt desc) {
  _id,
  _createdAt,
  title,
  slug,
  metaDescription,
  pillar,
  publishedAt,
  featured,
  "categoryTitles": categories[]->title
}`

export const featuredArticlesQuery = `*[_type == "article" && featured == true] | order(publishedAt desc) {
  _id,
  title,
  slug,
  metaDescription,
  pillar,
  publishedAt,
  featured,
  "categoryTitles": categories[]->title
}`

export const categoryListQuery = `*[_type == "category"] | order(title asc) {
  _id,
  title,
  slug,
  categoryType,
  description
}`

// Helper to construct full blog URL for articles
export function getBlogArticleUrl(slug: string): string {
  return `${BLOG_URL}/${slug}`
}

// Helper to construct full blog URL for categories
export function getBlogCategoryUrl(slug: string): string {
  return `${BLOG_URL}/category/${slug}`
}
