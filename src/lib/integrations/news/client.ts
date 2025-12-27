// News API Integration
// Local news and community updates

import type { NewsArticle, CommunityDiscussion, NewsData, CuratedUpdate } from '@/lib/api/types'
import { getCuratedItemsNearLocation } from '@/lib/queries/curated-items'

const NEWS_API_KEY = process.env.NEWS_API_KEY
const NEWS_API_BASE = 'https://newsapi.org/v2'

interface NewsApiArticle {
  source: { id: string | null; name: string }
  author: string | null
  title: string
  description: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
  content: string | null
}

interface NewsApiResponse {
  status: string
  totalResults: number
  articles: NewsApiArticle[]
}

interface RedditPost {
  data: {
    id: string
    title: string
    subreddit: string
    score: number
    num_comments: number
    permalink: string
    created_utc: number
    selftext?: string
    url?: string
  }
}

interface RedditResponse {
  data: {
    children: RedditPost[]
  }
}

/**
 * Get local news from News API
 */
async function fetchNews(
  query: string,
  options: {
    sortBy?: 'relevancy' | 'popularity' | 'publishedAt'
    pageSize?: number
    language?: string
  } = {}
): Promise<NewsApiArticle[]> {
  if (!NEWS_API_KEY) {
    console.warn('NEWS_API_KEY not configured')
    return []
  }

  try {
    const params = new URLSearchParams({
      q: query,
      sortBy: options.sortBy || 'publishedAt',
      pageSize: (options.pageSize || 20).toString(),
      language: options.language || 'en',
      apiKey: NEWS_API_KEY,
    })

    const response = await fetch(`${NEWS_API_BASE}/everything?${params}`, {
      next: { revalidate: 1800 }, // Cache for 30 minutes
    })

    if (!response.ok) {
      console.error('News API error:', response.status)
      return []
    }

    const data: NewsApiResponse = await response.json()
    return data.articles || []
  } catch (error) {
    console.error('Error fetching news:', error)
    return []
  }
}

/**
 * Get top headlines for a location
 */
async function fetchHeadlines(
  category?: string,
  pageSize: number = 10
): Promise<NewsApiArticle[]> {
  if (!NEWS_API_KEY) return []

  try {
    const params = new URLSearchParams({
      country: 'us',
      pageSize: pageSize.toString(),
      apiKey: NEWS_API_KEY,
    })

    if (category) {
      params.set('category', category)
    }

    const response = await fetch(`${NEWS_API_BASE}/top-headlines?${params}`, {
      next: { revalidate: 1800 },
    })

    if (!response.ok) return []

    const data: NewsApiResponse = await response.json()
    return data.articles || []
  } catch {
    return []
  }
}

/**
 * Transform News API article to our format
 */
function toNewsArticle(article: NewsApiArticle): NewsArticle {
  return {
    id: Buffer.from(article.url).toString('base64').slice(0, 32),
    title: article.title,
    description: article.description || undefined,
    source: article.source.name,
    url: article.url,
    imageUrl: article.urlToImage || undefined,
    publishedAt: article.publishedAt,
    category: undefined, // News API doesn't provide category in search
  }
}

/**
 * Get Orlando-area local news
 */
export async function getLocalNews(
  lat: number,
  lng: number,
  limit: number = 15
): Promise<NewsArticle[]> {
  // Determine the city/region based on coordinates
  // For Central Florida, we'll use Orlando as the main search term
  const searchTerms = [
    'Orlando Florida',
    'Central Florida',
    'Orange County Florida',
  ]

  // Try each search term until we get results
  for (const term of searchTerms) {
    const articles = await fetchNews(term, {
      pageSize: limit,
      sortBy: 'publishedAt',
    })

    if (articles.length > 0) {
      return articles.slice(0, limit).map(toNewsArticle)
    }
  }

  // Fallback to Florida news
  const floridaNews = await fetchNews('Florida', {
    pageSize: limit,
    sortBy: 'publishedAt',
  })

  return floridaNews.slice(0, limit).map(toNewsArticle)
}

/**
 * Get Reddit discussions for the area
 */
export async function getRedditDiscussions(
  lat: number,
  lng: number,
  limit: number = 10
): Promise<CommunityDiscussion[]> {
  // Determine relevant subreddits based on location
  // For Central Florida, these are the main ones
  const subreddits = ['orlando', 'florida', 'centralflorida']

  try {
    const results: CommunityDiscussion[] = []

    for (const subreddit of subreddits) {
      if (results.length >= limit) break

      const response = await fetch(
        `https://www.reddit.com/r/${subreddit}/hot.json?limit=10`,
        {
          headers: {
            'User-Agent': 'LifeHereAPI/1.0',
          },
          next: { revalidate: 1800 }, // Cache for 30 minutes
        }
      )

      if (!response.ok) continue

      const data: RedditResponse = await response.json()

      for (const post of data.data.children) {
        if (results.length >= limit) break

        results.push({
          id: post.data.id,
          title: post.data.title,
          subreddit: post.data.subreddit,
          score: post.data.score,
          commentCount: post.data.num_comments,
          url: `https://reddit.com${post.data.permalink}`,
          createdAt: new Date(post.data.created_utc * 1000).toISOString(),
        })
      }
    }

    return results.slice(0, limit)
  } catch (error) {
    console.error('Error fetching Reddit:', error)
    return []
  }
}

/**
 * Get curated updates from our database
 */
export async function getCuratedUpdates(
  lat: number,
  lng: number,
  limit: number = 10
): Promise<CuratedUpdate[]> {
  const items = await getCuratedItemsNearLocation(lat, lng, 15) // 15 mile radius

  return items.slice(0, limit).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description || undefined,
    category: item.category as CuratedUpdate['category'],
    sourceUrl: item.source_url || undefined,
    createdAt: item.created_at,
  }))
}

/**
 * Get complete news data for a location
 */
export async function getNewsData(
  lat: number,
  lng: number
): Promise<NewsData> {
  const [articles, discussions, curatedUpdates] = await Promise.all([
    getLocalNews(lat, lng, 15),
    getRedditDiscussions(lat, lng, 10),
    getCuratedUpdates(lat, lng, 10),
  ])

  return {
    articles,
    discussions,
    curatedUpdates,
  }
}

/**
 * Get real estate news
 */
export async function getRealEstateNews(limit: number = 10): Promise<NewsArticle[]> {
  const articles = await fetchNews('Florida real estate housing market', {
    pageSize: limit,
    sortBy: 'publishedAt',
  })

  return articles.slice(0, limit).map(toNewsArticle)
}

/**
 * Get business news for the area
 */
export async function getBusinessNews(
  lat: number,
  lng: number,
  limit: number = 10
): Promise<NewsArticle[]> {
  const articles = await fetchNews('Orlando business economy development', {
    pageSize: limit,
    sortBy: 'publishedAt',
  })

  return articles.slice(0, limit).map(toNewsArticle)
}
