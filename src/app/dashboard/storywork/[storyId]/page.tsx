'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Image,
  Download,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/types'
import { storyTypes } from '@/lib/storywork/prompts'

interface Story {
  id: string
  title: string
  story_type: string
  status: string
  raw_input: string | null
  guided_answers: Record<string, string> | null
  generated_content: {
    slides: Array<{
      headline: string
      body: string
      visual_suggestion: string
    }>
    hashtags: string[]
    caption: string
  } | null
}

export default function StoryDetailPage({
  params,
}: {
  params: Promise<{ storyId: string }>
}) {
  const { storyId } = use(params)
  const router = useRouter()
  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function loadStory() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single() as { data: Story | null; error: Error | null }

      if (error || !data) {
        router.push('/dashboard/storywork')
        return
      }

      setStory(data)
      setLoading(false)
    }

    loadStory()
  }, [storyId, supabase, router])

  const handleGenerate = async () => {
    if (!story) return

    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/storywork/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate content')
      }

      setStory((prev) =>
        prev
          ? {
              ...prev,
              generated_content: data.content,
              status: 'completed',
            }
          : null
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (!story) {
    return null
  }

  const storyTypeConfig = storyTypes[story.story_type as keyof typeof storyTypes]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/storywork">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{story.title}</h1>
            <p className="mt-1 text-neutral-600">
              {storyTypeConfig?.name || story.story_type}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            story.status === 'completed'
              ? 'bg-green-100 text-green-700'
              : story.status === 'generating'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-neutral-100 text-neutral-700'
          }`}
        >
          {story.status}
        </span>
      </div>

      {/* Story Input Summary */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-neutral-900">Story Input</h2>

        {story.raw_input && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-neutral-500">Raw Story</h3>
            <p className="mt-1 whitespace-pre-wrap text-neutral-700">
              {story.raw_input}
            </p>
          </div>
        )}

        {story.guided_answers && storyTypeConfig && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-500">
              Guided Answers
            </h3>
            {storyTypeConfig.questions.map((question, i) => {
              const answer = story.guided_answers?.[`q${i}`]
              if (!answer) return null
              return (
                <div key={i} className="rounded-lg bg-neutral-50 p-3">
                  <p className="text-sm font-medium text-neutral-600">
                    {question}
                  </p>
                  <p className="mt-1 text-neutral-700">{answer}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Generate Button */}
      {!story.generated_content && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center">
          <Sparkles className="mx-auto h-12 w-12 text-[#ff4533]" />
          <h2 className="mt-4 font-semibold text-neutral-900">
            Ready to Generate Content
          </h2>
          <p className="mt-2 text-neutral-600">
            Click below to generate carousel slides and social media content.
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button onClick={handleGenerate} disabled={generating} className="mt-6">
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Content (75 credits)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Generated Content */}
      {story.generated_content && (
        <div className="space-y-6">
          {/* Carousel Slides */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-neutral-900">Carousel Slides</h2>
              <Button variant="outline" size="sm" onClick={handleGenerate}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {story.generated_content.slides.map((slide, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-500">
                      Slide {i + 1}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${slide.headline}\n\n${slide.body}`,
                          `slide-${i}`
                        )
                      }
                      className="text-neutral-400 hover:text-neutral-600"
                    >
                      {copied === `slide-${i}` ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <h3 className="font-semibold text-neutral-900">
                    {slide.headline}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-600">{slide.body}</p>
                  <p className="mt-3 text-xs italic text-neutral-400">
                    Visual: {slide.visual_suggestion}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Caption */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-neutral-900">Instagram Caption</h2>
              <button
                onClick={() =>
                  copyToClipboard(story.generated_content!.caption, 'caption')
                }
                className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
              >
                {copied === 'caption' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy
              </button>
            </div>
            <p className="whitespace-pre-wrap text-neutral-700">
              {story.generated_content.caption}
            </p>
          </div>

          {/* Hashtags */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-neutral-900">Hashtags</h2>
              <button
                onClick={() =>
                  copyToClipboard(
                    story.generated_content!.hashtags.join(' '),
                    'hashtags'
                  )
                }
                className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
              >
                {copied === 'hashtags' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {story.generated_content.hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Coming Soon: Carousel Images */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <Image className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-neutral-900">
                  Carousel Images
                </h2>
                <p className="text-sm text-neutral-500">
                  Automatic carousel generation coming soon with Bannerbear
                  integration.
                </p>
              </div>
              <Button variant="outline" disabled>
                <Download className="mr-2 h-4 w-4" />
                Download Carousel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
