'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Send, Loader2, CheckCircle, Home, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CommunityLeadFormProps {
  communityName: string
  communityId: string
}

interface LeadFormData {
  name: string
  email: string
  phone: string
  message: string
}

type LeadType = 'buyer' | 'seller'

export function CommunityLeadForm({ communityName, communityId }: CommunityLeadFormProps) {
  const [leadType, setLeadType] = useState<LeadType>('buyer')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LeadFormData>()

  const onSubmit = async (data: LeadFormData) => {
    try {
      setError(null)

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          source: 'community_page',
          community_id: communityId,
          community_name: communityName,
          lead_type: leadType,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit')
      }

      setIsSubmitted(true)
      reset()
    } catch {
      setError('Something went wrong. Please try again.')
    }
  }

  if (isSubmitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="mt-4 font-semibold text-green-900">Thanks for reaching out!</h3>
        <p className="mt-2 text-sm text-green-700">
          A local expert will be in touch with you soon.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setIsSubmitted(false)}
        >
          Send another message
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <h3 className="font-semibold text-neutral-900">Get in Touch</h3>
      <p className="mt-1 text-sm text-neutral-500">
        Connect with a local expert in {communityName}
      </p>

      {/* Lead Type Toggle */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setLeadType('buyer')}
          className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            leadType === 'buyer'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          <Home className="h-4 w-4" />
          I want to buy
        </button>
        <button
          type="button"
          onClick={() => setLeadType('seller')}
          className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            leadType === 'seller'
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          I want to sell
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register('name', { required: 'Name is required' })}
            placeholder="Your name"
            className="mt-1"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
            placeholder="you@example.com"
            className="mt-1"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            {...register('phone')}
            placeholder="(555) 123-4567"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="message">Message</Label>
          <textarea
            id="message"
            {...register('message')}
            placeholder={
              leadType === 'buyer'
                ? "I'm interested in homes in this area..."
                : "I'm thinking of selling my home..."
            }
            rows={3}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Message
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
