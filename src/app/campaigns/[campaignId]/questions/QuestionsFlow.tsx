'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  MessageSquare,
  Lightbulb,
  Coins,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchWithTimeout, FETCH_TIMEOUTS, isTimeoutError } from '@/lib/utils/fetch-with-timeout'
import type { GeneratedQuestion } from '@/lib/supabase/types'

interface QuestionsFlowProps {
  campaignId: string
  campaignName: string
  listingAddress: string
  agentName: string
  agentHeadshotUrl: string | null
  initialQuestions: GeneratedQuestion[]
  previousAnswers: Record<string, string>
  creditBalance?: number
}

const STORAGE_KEY_PREFIX = 'listinglaunch_answers_'

export function QuestionsFlow({
  campaignId,
  campaignName,
  listingAddress,
  agentName,
  agentHeadshotUrl,
  initialQuestions,
  previousAnswers,
  creditBalance = 0,
}: QuestionsFlowProps) {
  const router = useRouter()
  const [questions, setQuestions] = useState<GeneratedQuestion[]>(initialQuestions)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(!initialQuestions.length)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Initialize answers from localStorage or previousAnswers
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${campaignId}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Merge with previousAnswers (server answers take precedence if newer)
          return { ...parsed, ...previousAnswers }
        } catch {
          return previousAnswers
        }
      }
    }
    return previousAnswers
  })

  // Auto-save answers to localStorage on change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${campaignId}`, JSON.stringify(answers))
      setLastSaved(new Date())
    }
  }, [answers, campaignId])

  // Clear localStorage on successful submit
  const clearSavedAnswers = () => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${campaignId}`)
  }

  // Track if we should fetch questions (avoid running twice in strict mode)
  const shouldFetchQuestions = initialQuestions.length === 0

  // Fetch questions if not provided
  useEffect(() => {
    if (!shouldFetchQuestions) return

    const controller = new AbortController()
    let isMounted = true

    const fetchQuestions = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchWithTimeout(`/api/campaigns/${campaignId}/questions`, {
          method: 'POST',
          signal: controller.signal,
          timeout: FETCH_TIMEOUTS.GENERATION,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to generate questions')
        }

        const data = await response.json()
        if (isMounted) {
          setQuestions(data.questions || [])
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') return
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load questions')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchQuestions()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [campaignId, shouldFetchQuestions])

  const retryFetchQuestions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchWithTimeout(`/api/campaigns/${campaignId}/questions`, {
        method: 'POST',
        timeout: FETCH_TIMEOUTS.GENERATION,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate questions')
      }

      const data = await response.json()
      setQuestions(data.questions || [])
    } catch (err) {
      if (isTimeoutError(err)) {
        setError('Question generation is taking longer than expected. Please try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load questions')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Convert answers to array format
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }))

      const response = await fetchWithTimeout(`/api/campaigns/${campaignId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersArray }),
        timeout: FETCH_TIMEOUTS.DEFAULT,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit answers')
      }

      // Clear saved answers from localStorage on success
      clearSavedAnswers()

      // Redirect to campaign dashboard
      router.push(`/campaigns/${campaignId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answers')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentQuestion = questions[currentIndex]
  const answeredCount = Object.values(answers).filter(a => a.trim()).length
  const canSubmit = answeredCount >= 3 // Require at least 3 answers

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-flex">
            <div className="absolute inset-0 animate-ping">
              <Sparkles className="h-12 w-12 text-orange-500/50" />
            </div>
            <Sparkles className="h-12 w-12 text-orange-500" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-white">
            Generating Your Questions
          </h2>
          <p className="mt-2 text-neutral-400">
            Creating personalized questions based on neighborhood research...
          </p>
        </div>
      </div>
    )
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white">
            Couldn't Load Questions
          </h2>
          <p className="mt-2 text-neutral-400">{error}</p>
          <Button
            onClick={retryFetchQuestions}
            className="mt-4 bg-orange-500 hover:bg-orange-600"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/campaigns/${campaignId}`}
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
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

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Campaign Info */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Quick Questions</h1>
          <p className="mt-2 text-neutral-400">
            Help us personalize your content for {listingAddress}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-neutral-400">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-neutral-400">
              {answeredCount} answered
            </span>
          </div>
          <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
            {/* Question Context */}
            {currentQuestion.context && (
              <div className="mb-4 flex items-start gap-2 text-sm text-neutral-500">
                <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{currentQuestion.context}</span>
              </div>
            )}

            {/* Question */}
            <h2 className="text-xl font-semibold text-white mb-4">
              {currentQuestion.question}
            </h2>

            {/* Answer Input */}
            <textarea
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              placeholder="Type your answer here..."
              className="w-full h-32 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
            />

            {/* Suggestion */}
            {currentQuestion.suggestedFollowUp && answers[currentQuestion.id]?.trim() && (
              <div className="mt-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-sm text-orange-400">
                  <strong>Follow-up:</strong> {currentQuestion.suggestedFollowUp}
                </p>
              </div>
            )}

            {/* Category Badge */}
            {currentQuestion.category && (
              <div className="mt-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400">
                  {currentQuestion.category}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="border-neutral-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-3">
            {currentIndex < questions.length - 1 ? (
              <Button
                onClick={handleNext}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Content...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Carousels
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Skip to Submit */}
        {canSubmit && currentIndex < questions.length - 1 && (
          <div className="mt-4 text-center">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="text-sm text-neutral-400 hover:text-white underline"
            >
              Skip remaining questions and generate content
            </button>
          </div>
        )}

        {/* Question Navigation Dots */}
        <div className="mt-8 flex justify-center gap-2">
          {questions.map((q, index) => {
            const isAnswered = !!answers[q.id]?.trim()
            const isCurrent = index === currentIndex

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(index)}
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  isCurrent
                    ? 'bg-orange-500 w-6'
                    : isAnswered
                    ? 'bg-green-500'
                    : 'bg-neutral-700 hover:bg-neutral-600'
                }`}
                title={`Question ${index + 1}${isAnswered ? ' (answered)' : ''}`}
              />
            )
          })}
        </div>
      </main>
    </div>
  )
}
