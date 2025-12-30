import { Metadata } from 'next'
import Link from 'next/link'
import { Calendar, ArrowRight, Tag, ExternalLink, BookOpen } from 'lucide-react'
import { getBlogArticles, getBlogCategories, getBlogArticleUrl, getBlogCategoryUrl, BLOG_URL } from '@/lib/queries/blog'
import type { SanityArticle } from '@/lib/integrations/sanity/client'

export const metadata: Metadata = {
  title: 'Blog | Aerial Shots Media',
  description: 'Tips, guides, and insights about real estate photography, video, drone, 3D tours, and virtual staging. Learn how to market properties effectively.',
  openGraph: {
    title: 'Blog | Aerial Shots Media',
    description: 'Real estate photography tips and insights',
    type: 'website',
  },
}

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// Pillar display names
const pillarNames: Record<string, string> = {
  'pillar-1': 'AI & Technology',
  'pillar-2': 'Market Intelligence',
  'pillar-3': 'Marketing Strategies',
  'pillar-4': 'Professional Media',
}

export default async function BlogPage() {
  const [articles, categories] = await Promise.all([
    getBlogArticles(12),
    getBlogCategories(),
  ])

  const featuredArticle = articles.find(a => a.featured) || articles[0]
  const remainingArticles = articles.filter(a => a._id !== featuredArticle?._id)

  return (
    <main className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-2 text-sm text-blue-400 mb-6">
              <BookOpen className="h-4 w-4" />
              Real Estate Intelligence
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              Insights & Resources
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Tips, guides, and industry insights to help you market properties
              and grow your real estate business.
            </p>
            <div className="mt-8">
              <a
                href={BLOG_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-3 font-medium text-white hover:bg-blue-600 transition-colors"
              >
                Visit Full Blog
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Filter */}
      {categories.length > 0 && (
        <section className="pb-8 border-b border-white/5">
          <div className="container">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <a
                href={BLOG_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium bg-blue-500 text-white"
              >
                All Posts
              </a>
              {categories.slice(0, 6).map((category) => (
                <a
                  key={category._id}
                  href={getBlogCategoryUrl(category.slug.current)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium bg-neutral-800 text-white hover:bg-neutral-700 transition-colors"
                >
                  <Tag className="h-3.5 w-3.5" />
                  {category.title}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Article */}
      {featuredArticle && (
        <section className="py-12">
          <div className="container">
            <FeaturedArticleCard article={featuredArticle} />
          </div>
        </section>
      )}

      {/* Article Grid */}
      <section className="py-12">
        <div className="container">
          {remainingArticles.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {remainingArticles.map((article) => (
                <ArticleCard key={article._id} article={article} />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">No articles yet</h2>
              <p className="text-muted-foreground mt-2">
                Check back soon for helpful real estate media content.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* View All CTA */}
      <section className="py-12 border-t border-white/5">
        <div className="container text-center">
          <a
            href={BLOG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-400 font-medium hover:text-blue-300 transition-colors text-lg"
          >
            View All Articles on Our Blog
            <ExternalLink className="h-5 w-5" />
          </a>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-t from-blue-500/5 to-transparent">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Ready to Elevate Your Listings?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Put these insights into action with professional real estate media.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book/listing"
                className="inline-flex items-center justify-center rounded-full bg-blue-500 px-6 py-3 font-medium text-white hover:bg-blue-600 transition-colors"
              >
                Book a Shoot
              </Link>
              <Link
                href="/portfolio"
                className="inline-flex items-center justify-center rounded-full bg-neutral-800 px-6 py-3 font-medium text-white hover:bg-neutral-700 transition-colors"
              >
                View Portfolio
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

// Featured Article Card (Large) - Links to external blog
function FeaturedArticleCard({ article }: { article: SanityArticle }) {
  const articleUrl = getBlogArticleUrl(article.slug.current)

  return (
    <a
      href={articleUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-white/[0.08] bg-[#1c1c1e] overflow-hidden"
    >
      <div className="grid md:grid-cols-2 gap-0">
        {/* Placeholder for image */}
        <div className="relative aspect-[16/10] md:aspect-auto md:h-full bg-gradient-to-br from-blue-500/10 to-purple-500/10">
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/30" />
          </div>
          <div className="absolute top-4 left-4 flex items-center gap-2">
            {article.featured && (
              <span className="inline-flex items-center rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white">
                Featured
              </span>
            )}
            {article.pillar && (
              <span className="inline-flex items-center rounded-full bg-purple-500/20 border border-purple-500/30 px-3 py-1 text-xs font-medium text-purple-400">
                {pillarNames[article.pillar] || article.pillar}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 flex flex-col justify-center">
          {/* Categories */}
          {article.categoryTitles && article.categoryTitles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {article.categoryTitles.map((title) => (
                <span
                  key={title}
                  className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400"
                >
                  {title}
                </span>
              ))}
            </div>
          )}

          <h2 className="text-2xl md:text-3xl font-bold text-foreground group-hover:text-blue-400 transition-colors">
            {article.title}
          </h2>

          <p className="mt-3 text-muted-foreground line-clamp-3">
            {article.metaDescription}
          </p>

          {/* Meta */}
          <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(article.publishedAt || article._createdAt)}
            </div>
          </div>

          {/* Read more */}
          <div className="mt-6">
            <span className="inline-flex items-center gap-2 text-blue-400 font-medium group-hover:gap-3 transition-all">
              Read Article
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </a>
  )
}

// Regular Article Card - Links to external blog
function ArticleCard({ article }: { article: SanityArticle }) {
  const articleUrl = getBlogArticleUrl(article.slug.current)

  return (
    <a
      href={articleUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-white/[0.08] bg-[#1c1c1e] overflow-hidden"
    >
      {/* Placeholder for image */}
      <div className="relative aspect-[16/10] bg-gradient-to-br from-blue-500/5 to-purple-500/5">
        <div className="absolute inset-0 flex items-center justify-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/20" />
        </div>
        {article.pillar && (
          <div className="absolute top-3 left-3">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400">
              {pillarNames[article.pillar] || article.pillar}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Categories */}
        {article.categoryTitles && article.categoryTitles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {article.categoryTitles.slice(0, 2).map((title) => (
              <span
                key={title}
                className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400"
              >
                {title}
              </span>
            ))}
          </div>
        )}

        <h3 className="font-semibold text-lg text-foreground line-clamp-2 group-hover:text-blue-400 transition-colors">
          {article.title}
        </h3>

        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {article.metaDescription}
        </p>

        {/* Meta */}
        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(article.publishedAt || article._createdAt)}
          </div>
        </div>
      </div>
    </a>
  )
}
