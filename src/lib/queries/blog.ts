import { unstable_cache } from 'next/cache'
import {
  sanityClient,
  articleListQuery,
  featuredArticlesQuery,
  categoryListQuery,
  getBlogArticleUrl,
  type SanityArticle,
  type SanityCategory,
} from '@/lib/integrations/sanity/client'

const CACHE_REVALIDATION = 3600 // 1 hour

// Re-export URL helper for use in pages
export { getBlogArticleUrl, getBlogCategoryUrl, BLOG_URL } from '@/lib/integrations/sanity/client'

/**
 * Fetch all published blog articles
 * Articles link to the separate blog frontend
 */
export const getBlogArticles = unstable_cache(
  async (limit = 20): Promise<SanityArticle[]> => {
    try {
      const query = `*[_type == "article"] | order(publishedAt desc) [0...${limit}] {
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
      const articles = await sanityClient.fetch<SanityArticle[]>(query)
      return articles || []
    } catch (error) {
      console.error('Failed to fetch blog articles:', error)
      return []
    }
  },
  ['blog-articles'],
  { revalidate: CACHE_REVALIDATION, tags: ['blog'] }
)

/**
 * Fetch featured articles (marked as featured in Sanity)
 */
export const getFeaturedBlogArticles = unstable_cache(
  async (limit = 6): Promise<SanityArticle[]> => {
    try {
      const query = `*[_type == "article" && featured == true] | order(publishedAt desc) [0...${limit}] {
        _id,
        title,
        slug,
        metaDescription,
        pillar,
        publishedAt,
        featured,
        "categoryTitles": categories[]->title
      }`
      const articles = await sanityClient.fetch<SanityArticle[]>(query)
      return articles || []
    } catch (error) {
      console.error('Failed to fetch featured blog articles:', error)
      return []
    }
  },
  ['featured-blog-articles'],
  { revalidate: CACHE_REVALIDATION, tags: ['blog'] }
)

/**
 * Fetch all blog categories
 */
export const getBlogCategories = unstable_cache(
  async (): Promise<SanityCategory[]> => {
    try {
      const categories = await sanityClient.fetch<SanityCategory[]>(categoryListQuery)
      return categories || []
    } catch (error) {
      console.error('Failed to fetch blog categories:', error)
      return []
    }
  },
  ['blog-categories'],
  { revalidate: CACHE_REVALIDATION, tags: ['blog'] }
)

/**
 * Get articles by pillar (content strategy pillars)
 */
export const getArticlesByPillar = unstable_cache(
  async (pillar: string, limit = 10): Promise<SanityArticle[]> => {
    try {
      const query = `*[_type == "article" && pillar == $pillar] | order(publishedAt desc) [0...${limit}] {
        _id,
        title,
        slug,
        metaDescription,
        pillar,
        publishedAt,
        featured,
        "categoryTitles": categories[]->title
      }`
      const articles = await sanityClient.fetch<SanityArticle[]>(query, { pillar })
      return articles || []
    } catch (error) {
      console.error('Failed to fetch articles by pillar:', error)
      return []
    }
  },
  ['blog-articles-by-pillar'],
  { revalidate: CACHE_REVALIDATION, tags: ['blog'] }
)

/**
 * Get categories by type (pillar, city, etc.)
 */
export const getCategoriesByType = unstable_cache(
  async (categoryType: string): Promise<SanityCategory[]> => {
    try {
      const query = `*[_type == "category" && categoryType == $categoryType] | order(title asc) {
        _id,
        title,
        slug,
        categoryType,
        description
      }`
      const categories = await sanityClient.fetch<SanityCategory[]>(query, { categoryType })
      return categories || []
    } catch (error) {
      console.error('Failed to fetch categories by type:', error)
      return []
    }
  },
  ['blog-categories-by-type'],
  { revalidate: CACHE_REVALIDATION, tags: ['blog'] }
)

/**
 * Fetch a single blog article by slug
 */
export const getBlogArticle = unstable_cache(
  async (slug: string): Promise<SanityArticle | null> => {
    try {
      const query = `*[_type == "article" && slug.current == $slug][0] {
        _id,
        _createdAt,
        title,
        slug,
        excerpt,
        introduction,
        conclusion,
        metaDescription,
        pillar,
        publishedAt,
        featured,
        mainImage {
          asset-> {
            _id,
            url
          }
        },
        author-> {
          _id,
          name,
          image {
            asset-> { url }
          }
        },
        categories[]-> {
          _id,
          title,
          slug
        },
        comparisonItems[] {
          name,
          description,
          pros,
          cons,
          pricing,
          bestFor,
          image {
            asset-> { url }
          }
        },
        "categoryTitles": categories[]->title
      }`
      const article = await sanityClient.fetch<SanityArticle | null>(query, { slug })
      return article
    } catch (error) {
      console.error('Failed to fetch blog article:', error)
      return null
    }
  },
  ['blog-article'],
  { revalidate: CACHE_REVALIDATION, tags: ['blog'] }
)

/**
 * Fetch related articles by category
 */
export const getRelatedArticles = unstable_cache(
  async (currentArticleId: string, categoryIds: string[], limit = 3): Promise<SanityArticle[]> => {
    try {
      if (!categoryIds || categoryIds.length === 0) {
        return []
      }
      const query = `*[_type == "article" && _id != $currentArticleId && count((categories[]->_id)[@ in $categoryIds]) > 0] | order(publishedAt desc) [0...${limit}] {
        _id,
        title,
        slug,
        metaDescription,
        pillar,
        publishedAt,
        featured,
        mainImage {
          asset-> {
            url
          }
        },
        "categoryTitles": categories[]->title
      }`
      const articles = await sanityClient.fetch<SanityArticle[]>(query, {
        currentArticleId,
        categoryIds,
      })
      return articles || []
    } catch (error) {
      console.error('Failed to fetch related articles:', error)
      return []
    }
  },
  ['blog-related-articles'],
  { revalidate: CACHE_REVALIDATION, tags: ['blog'] }
)
