'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Sparkles,
  FileText,
  Copy,
  Check,
  Download,
  Loader2,
  RefreshCw,
  Code,
  Eye,
  Coins,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchWithTimeout, FETCH_TIMEOUTS, isTimeoutError } from '@/lib/utils/fetch-with-timeout'

interface BlogSection {
  title: string
  content: string
  keywords?: string[]
}

interface BlogContent {
  title: string
  metaDescription: string
  slug: string
  sections: BlogSection[]
  seoKeywords: string[]
  estimatedReadTime: number
}

interface BlogEditorProps {
  campaignId: string
  campaignName: string
  listingAddress: string
  agentName: string
  initialBlog: Partial<BlogContent> | null
  creditBalance?: number
}

export function BlogEditor({
  campaignId,
  campaignName,
  listingAddress,
  agentName,
  initialBlog,
  creditBalance = 0,
}: BlogEditorProps) {
  const router = useRouter()
  const [blog, setBlog] = useState<BlogContent | null>(
    initialBlog && initialBlog.title
      ? {
          title: initialBlog.title,
          metaDescription: initialBlog.metaDescription || '',
          slug: initialBlog.slug || '',
          sections: initialBlog.sections || [],
          seoKeywords: initialBlog.seoKeywords || [],
          estimatedReadTime: initialBlog.estimatedReadTime || 5,
        }
      : null
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(!initialBlog?.title)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'preview' | 'html' | 'markdown'>('preview')

  useEffect(() => {
    if (!initialBlog?.title) {
      generateBlog()
    }
  }, [])

  const generateBlog = async () => {
    setIsGenerating(true)
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchWithTimeout(`/api/campaigns/${campaignId}/blog`, {
        method: 'POST',
        timeout: FETCH_TIMEOUTS.GENERATION,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate blog')
      }

      const data = await response.json()
      setBlog(data.blog)
    } catch (err) {
      if (isTimeoutError(err)) {
        setError('Blog generation is taking longer than expected. Please try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate blog')
      }
    } finally {
      setIsGenerating(false)
      setIsLoading(false)
    }
  }

  const handleCopy = async (field: string, content: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleDownload = async (format: 'html' | 'markdown') => {
    try {
      const response = await fetchWithTimeout(`/api/campaigns/${campaignId}/blog?format=${format}`, {
        timeout: FETCH_TIMEOUTS.DEFAULT,
      })
      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${blog?.slug || 'blog'}.${format === 'html' ? 'html' : 'md'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to download file')
    }
  }

  const renderMarkdown = (content: string) => {
    // Simple markdown to text conversion for preview
    return content
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-flex">
            <div className="absolute inset-0 animate-ping">
              <FileText className="h-12 w-12 text-orange-500/50" />
            </div>
            <FileText className="h-12 w-12 text-orange-500" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-white">
            {isGenerating ? 'Generating Your Blog Post' : 'Loading...'}
          </h2>
          <p className="mt-2 text-neutral-400">
            Creating SEO-optimized content for your listing...
          </p>
        </div>
      </div>
    )
  }

  if (error && !blog) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white">
            Couldn't Generate Blog
          </h2>
          <p className="mt-2 text-neutral-400">{error}</p>
          <Button
            onClick={generateBlog}
            className="mt-4 bg-orange-500 hover:bg-orange-600"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!blog) return null

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/campaigns/${campaignId}`}
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-4">
              {/* Credit Balance */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/50 border border-neutral-700">
                <Coins className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-medium text-white">{creditBalance}</span>
                <span className="text-xs text-neutral-400">credits</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-500" />
                <span className="font-semibold text-white">ListingLaunch</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">SEO Blog Post</h1>
              <p className="mt-1 text-neutral-400">{listingAddress}</p>
            </div>
            <Button
              variant="outline"
              onClick={generateBlog}
              disabled={isGenerating}
              className="border-neutral-700"
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Regenerate
            </Button>
          </div>
        </div>

        {/* SEO Meta Section */}
        <div className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">SEO Metadata</h2>

          {/* Title */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-neutral-400">Title Tag</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy('title', blog.title)}
              >
                {copiedField === 'title' ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <div className="p-3 rounded-lg bg-neutral-800 text-white">
              {blog.title}
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              {blog.title.length}/60 characters
            </p>
          </div>

          {/* Meta Description */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-neutral-400">Meta Description</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy('meta', blog.metaDescription)}
              >
                {copiedField === 'meta' ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <div className="p-3 rounded-lg bg-neutral-800 text-white text-sm">
              {blog.metaDescription}
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              {blog.metaDescription.length}/160 characters
            </p>
          </div>

          {/* URL Slug */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-neutral-400">URL Slug</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy('slug', blog.slug)}
              >
                {copiedField === 'slug' ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <div className="p-3 rounded-lg bg-neutral-800 text-neutral-400 text-sm font-mono">
              /blog/{blog.slug}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="text-sm font-medium text-neutral-400 block mb-2">
              SEO Keywords
            </label>
            <div className="flex flex-wrap gap-2">
              {blog.seoKeywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-2 py-1 rounded-full bg-orange-500/10 text-orange-400 text-sm"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-4 flex items-center gap-2">
          <Button
            variant={viewMode === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('preview')}
            className={viewMode === 'preview' ? 'bg-orange-500' : 'border-neutral-700'}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button
            variant={viewMode === 'html' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('html')}
            className={viewMode === 'html' ? 'bg-orange-500' : 'border-neutral-700'}
          >
            <Code className="mr-2 h-4 w-4" />
            HTML
          </Button>
          <Button
            variant={viewMode === 'markdown' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('markdown')}
            className={viewMode === 'markdown' ? 'bg-orange-500' : 'border-neutral-700'}
          >
            <FileText className="mr-2 h-4 w-4" />
            Markdown
          </Button>
        </div>

        {/* Blog Content */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
          {viewMode === 'preview' ? (
            <article className="p-8 prose prose-invert max-w-none">
              <h1 className="text-3xl font-bold text-white mb-6">{blog.title}</h1>
              <p className="text-sm text-neutral-500 mb-8">
                {blog.estimatedReadTime} min read | By {agentName}
              </p>

              {blog.sections.map((section, index) => (
                <section key={index} className="mb-8">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    {section.title}
                  </h2>
                  <div className="text-neutral-300 whitespace-pre-wrap">
                    {renderMarkdown(section.content)}
                  </div>
                </section>
              ))}
            </article>
          ) : (
            <div className="p-4">
              <pre className="p-4 rounded-lg bg-neutral-800 text-neutral-300 text-sm overflow-x-auto whitespace-pre-wrap">
                {viewMode === 'html'
                  ? generateHTML(blog, agentName)
                  : generateMarkdown(blog)}
              </pre>
            </div>
          )}
        </div>

        {/* Download Buttons */}
        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => handleDownload('html')}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            <Download className="mr-2 h-4 w-4" />
            Download HTML
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDownload('markdown')}
            className="border-neutral-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Markdown
          </Button>
          <Button
            variant="outline"
            onClick={() => handleCopy('full', generateMarkdown(blog))}
            className="border-neutral-700"
          >
            {copiedField === 'full' ? (
              <Check className="mr-2 h-4 w-4 text-green-500" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Copy All
          </Button>
        </div>
      </main>
    </div>
  )
}

function generateMarkdown(blog: BlogContent): string {
  let md = `# ${blog.title}\n\n`
  for (const section of blog.sections) {
    md += `## ${section.title}\n\n${section.content}\n\n`
  }
  md += `---\n\n**Keywords:** ${blog.seoKeywords.join(', ')}\n`
  return md
}

// HTML escape utility to prevent XSS attacks
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Escape for HTML attribute contexts (allows safe quotes for attribute values)
function escapeHtmlAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function generateHTML(blog: BlogContent, agentName: string): string {
  const safeTitle = escapeHtml(blog.title)
  const safeMetaDesc = escapeHtmlAttr(blog.metaDescription)
  const safeKeywords = blog.seoKeywords.map(k => escapeHtmlAttr(k)).join(', ')
  const safeAgentName = escapeHtml(agentName)

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${safeMetaDesc}">
  <meta name="keywords" content="${safeKeywords}">
  <title>${safeTitle}</title>
</head>
<body>
  <article>
    <h1>${safeTitle}</h1>
    <p class="meta">${blog.estimatedReadTime} min read | By ${safeAgentName}</p>
`
  for (const section of blog.sections) {
    const safeSectionTitle = escapeHtml(section.title)
    const safeSectionContent = escapeHtml(section.content).replace(/\n/g, '</p>\n      <p>')
    html += `
    <section>
      <h2>${safeSectionTitle}</h2>
      <p>${safeSectionContent}</p>
    </section>`
  }
  html += `
  </article>
</body>
</html>`
  return html
}
