'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import {
  ArrowLeft,
  Mic,
  MessageSquare,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { VoiceRecorder } from '@/components/storywork/VoiceRecorder'
import type { Database } from '@/lib/supabase/types'
import { storyTypes } from '@/lib/storywork/prompts'

type StoryType = keyof typeof storyTypes

export default function NewStoryPage() {
  const router = useRouter()
  const [step, setStep] = useState<'input' | 'type' | 'questions'>('input')
  const [inputType, setInputType] = useState<'text' | 'voice'>('text')
  const [textInput, setTextInput] = useState('')
  const [title, setTitle] = useState('')
  const [selectedType, setSelectedType] = useState<StoryType | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleInputSubmit = async () => {
    if (!textInput.trim() || !title.trim()) {
      setError('Please provide a title and story details')
      return
    }
    setError(null)
    setStep('type')
  }

  const handleTypeSelect = (type: StoryType) => {
    setSelectedType(type)
    setStep('questions')
  }

  const handleCreateStory = async () => {
    if (!selectedType || !title) return

    setLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/sign-in')
        return
      }

      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('email', user.email!)
        .single()

      if (!agent) {
        setError('Agent not found')
        setLoading(false)
        return
      }

      // Create the story
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: story, error: createError } = await (supabase as any)
        .from('stories')
        .insert({
          agent_id: agent.id,
          title,
          story_type: selectedType,
          status: 'draft',
          input_type: inputType,
          raw_input: textInput,
          guided_answers: JSON.parse(JSON.stringify(answers)),
        })
        .select()
        .single() as { data: { id: string } | null; error: Error | null }

      if (createError) {
        throw createError
      }

      router.push(`/dashboard/storywork/${story?.id}`)
    } catch (err) {
      console.error('Error creating story:', err)
      setError('Failed to create story. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/storywork">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Create New Story</h1>
          <p className="mt-1 text-neutral-600">
            Tell us about a real estate experience to turn into a carousel.
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {['input', 'type', 'questions'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s
                  ? 'bg-[#ff4533] text-white'
                  : i < ['input', 'type', 'questions'].indexOf(step)
                    ? 'bg-green-500 text-white'
                    : 'bg-neutral-200 text-neutral-500'
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && (
              <div
                className={`h-1 w-12 ${
                  i < ['input', 'type', 'questions'].indexOf(step)
                    ? 'bg-green-500'
                    : 'bg-neutral-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Input */}
      {step === 'input' && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-neutral-900">
            Tell Your Story
          </h2>

          {/* Input Type Toggle */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setInputType('text')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                inputType === 'text'
                  ? 'border-[#ff4533] bg-[#ff4533]/5'
                  : 'border-neutral-200'
              }`}
            >
              <MessageSquare
                className={`h-5 w-5 ${
                  inputType === 'text' ? 'text-[#ff4533]' : 'text-neutral-400'
                }`}
              />
              <span
                className={
                  inputType === 'text' ? 'text-[#ff4533]' : 'text-neutral-600'
                }
              >
                Type It
              </span>
            </button>
            <button
              onClick={() => setInputType('voice')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                inputType === 'voice'
                  ? 'border-[#ff4533] bg-[#ff4533]/5'
                  : 'border-neutral-200'
              }`}
            >
              <Mic
                className={`h-5 w-5 ${
                  inputType === 'voice' ? 'text-[#ff4533]' : 'text-neutral-400'
                }`}
              />
              <span
                className={
                  inputType === 'voice' ? 'text-[#ff4533]' : 'text-neutral-600'
                }
              >
                Voice
              </span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Story Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., The Bidding War Win, First-Time Buyer Success"
                className="mt-1"
              />
            </div>

            {inputType === 'text' && (
              <div>
                <Label htmlFor="story">Your Story</Label>
                <Textarea
                  id="story"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Tell us about a recent transaction, listing, or real estate experience. Include details about the client, any challenges, and the outcome..."
                  rows={8}
                  className="mt-1"
                />
                <p className="mt-2 text-sm text-neutral-500">
                  Don't worry about making it perfect - we'll help you structure it.
                </p>
              </div>
            )}

            {inputType === 'voice' && (
              <VoiceRecorder
                onTranscriptionComplete={(transcript) => {
                  setTextInput(transcript)
                  setInputType('text') // Switch to text view to show transcript
                }}
                onCancel={() => setInputType('text')}
              />
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {inputType === 'text' && (
            <div className="mt-6 flex justify-end">
              <Button onClick={handleInputSubmit}>
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Story Type */}
      {step === 'type' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 font-semibold text-neutral-900">
              What type of story is this?
            </h2>
            <p className="mb-6 text-neutral-600">
              Select the narrative structure that best fits your story.
            </p>

            <div className="space-y-4">
              {(Object.entries(storyTypes) as [StoryType, typeof storyTypes.against_the_odds][]).map(
                ([key, type]) => (
                  <button
                    key={key}
                    onClick={() => handleTypeSelect(key)}
                    className="block w-full rounded-lg border-2 border-neutral-200 p-6 text-left transition-all hover:border-[#ff4533]"
                  >
                    <h3 className="font-semibold text-neutral-900">{type.name}</h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {type.description}
                    </p>
                    <p className="mt-2 text-xs font-medium text-[#ff4533]">
                      {type.arc}
                    </p>
                  </button>
                )
              )}
            </div>
          </div>

          <Button variant="ghost" onClick={() => setStep('input')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      )}

      {/* Step 3: Guided Questions */}
      {step === 'questions' && selectedType && (
        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff4533]/10">
                <Sparkles className="h-5 w-5 text-[#ff4533]" />
              </div>
              <div>
                <h2 className="font-semibold text-neutral-900">
                  {storyTypes[selectedType].name}
                </h2>
                <p className="text-sm text-neutral-500">
                  {storyTypes[selectedType].arc}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {storyTypes[selectedType].questions.map((question, i) => (
                <div key={i}>
                  <Label htmlFor={`q${i}`}>
                    {i + 1}. {question}
                  </Label>
                  <Textarea
                    id={`q${i}`}
                    value={answers[`q${i}`] || ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [`q${i}`]: e.target.value }))
                    }
                    rows={3}
                    className="mt-1"
                    placeholder="Your answer..."
                  />
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('type')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleCreateStory} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Story
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
