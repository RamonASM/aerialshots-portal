'use client'

import { useState } from 'react'

interface FeedbackFormProps {
  listingId: string
  shareLinkId: string
  agentName?: string
  brandColor?: string
  googleReviewUrl?: string
  onSubmitted?: () => void
}

const DEFAULT_GOOGLE_REVIEW_URL = 'https://g.page/r/CWIr3sKgE7KOEBM/review'

export function FeedbackForm({
  listingId,
  shareLinkId,
  agentName = 'your agent',
  brandColor = '#0066FF',
  googleReviewUrl = DEFAULT_GOOGLE_REVIEW_URL,
  onSubmitted,
}: FeedbackFormProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [showGooglePrompt, setShowGooglePrompt] = useState(false)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [name, setName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating) {
      setError('Please select a rating')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listing_id: listingId,
          share_link_id: shareLinkId,
          rating,
          feedback_text: feedback.trim() || null,
          submitted_by_name: name.trim() || null,
          is_public: isPublic,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      // For high ratings (4-5 stars), show Google review prompt
      if (rating >= 4) {
        setShowGooglePrompt(true)
      } else {
        setIsSubmitted(true)
        onSubmitted?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Google Review Prompt for happy customers
  if (showGooglePrompt) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-6 text-center">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: '#4285f415' }}
        >
          <svg className="w-8 h-8 text-[#4285f4]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          Thank you for your feedback!
        </h3>
        <p className="text-neutral-600 mb-6">
          Would you mind sharing your experience on Google? It helps others find great service!
        </p>
        <div className="flex flex-col gap-3">
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: brandColor }}
            onClick={() => {
              setIsSubmitted(true)
              onSubmitted?.()
            }}
          >
            Leave a Google Review
          </a>
          <button
            onClick={() => {
              setIsSubmitted(true)
              onSubmitted?.()
            }}
            className="text-neutral-500 text-sm hover:text-neutral-700"
          >
            Maybe later
          </button>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-6 text-center">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: `${brandColor}15` }}
        >
          <svg
            className="w-8 h-8"
            style={{ color: brandColor }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Thank you!</h3>
        <p className="text-neutral-600">
          Your feedback helps us improve our service.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">
        How was your experience?
      </h3>
      <p className="text-neutral-500 text-sm mb-6">
        Rate your experience with {agentName}
      </p>

      <form onSubmit={handleSubmit}>
        {/* Star Rating */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(null)}
              className="p-1 transition-transform hover:scale-110 focus:outline-none"
            >
              <svg
                className="w-10 h-10 transition-colors"
                fill={(hoveredRating ?? rating ?? 0) >= star ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{
                  color: (hoveredRating ?? rating ?? 0) >= star ? brandColor : '#d1d5db',
                }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          ))}
        </div>

        {/* Rating Labels */}
        <div className="flex justify-between px-4 mb-6 text-xs text-neutral-400">
          <span>Poor</span>
          <span>Excellent</span>
        </div>

        {/* Feedback Text */}
        <div className="mb-4">
          <label htmlFor="feedback" className="block text-sm font-medium text-neutral-700 mb-1">
            Tell us more (optional)
          </label>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What did you like? How can we improve?"
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 resize-none"
            style={{ ['--tw-ring-color' as string]: brandColor }}
            rows={3}
          />
        </div>

        {/* Name (optional) */}
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
            Your name (optional)
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ ['--tw-ring-color' as string]: brandColor }}
          />
        </div>

        {/* Public Toggle */}
        <label className="flex items-center gap-3 mb-6 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-10 h-6 rounded-full transition-colors ${
                isPublic ? '' : 'bg-neutral-200'
              }`}
              style={isPublic ? { backgroundColor: brandColor } : undefined}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  isPublic ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </div>
          </div>
          <span className="text-sm text-neutral-600">
            Allow my review to be displayed publicly
          </span>
        </label>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !rating}
          className="w-full py-3 rounded-lg text-white font-medium transition-opacity disabled:opacity-50"
          style={{ backgroundColor: brandColor }}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </span>
          ) : (
            'Submit Feedback'
          )}
        </button>
      </form>
    </div>
  )
}
