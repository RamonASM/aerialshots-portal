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
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
          <CheckCircle className="h-6 w-6 text-green-400" />
        </div>
        <h3 className="mt-4 font-semibold text-white">Thanks for reaching out!</h3>
        <p className="mt-2 text-[13px] text-green-400">
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
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e]/72 backdrop-blur-xl p-6">
      <h3 className="font-semibold text-white">Get in Touch</h3>
      <p className="mt-1 text-[13px] text-[#636366]">
        Connect with a local expert in {communityName}
      </p>

      {/* Lead Type Toggle */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setLeadType('buyer')}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors ${
            leadType === 'buyer'
              ? 'border-[#0077ff] bg-[#0077ff]/10 text-[#3395ff]'
              : 'border-white/[0.08] text-[#a1a1a6] hover:bg-white/5'
          }`}
        >
          <Home className="h-4 w-4" />
          I want to buy
        </button>
        <button
          type="button"
          onClick={() => setLeadType('seller')}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors ${
            leadType === 'seller'
              ? 'border-green-500 bg-green-500/10 text-green-400'
              : 'border-white/[0.08] text-[#a1a1a6] hover:bg-white/5'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          I want to sell
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="name" className="text-[#a1a1a6]">Name</Label>
          <Input
            id="name"
            {...register('name', { required: 'Name is required' })}
            placeholder="Your name"
            className="mt-1"
          />
          {errors.name && (
            <p className="mt-1 text-[11px] text-red-400">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email" className="text-[#a1a1a6]">Email</Label>
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
            <p className="mt-1 text-[11px] text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone" className="text-[#a1a1a6]">Phone</Label>
          <Input
            id="phone"
            type="tel"
            {...register('phone')}
            placeholder="(555) 123-4567"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="message" className="text-[#a1a1a6]">Message</Label>
          <textarea
            id="message"
            {...register('message')}
            placeholder={
              leadType === 'buyer'
                ? "I'm interested in homes in this area..."
                : "I'm thinking of selling my home..."
            }
            rows={3}
            className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-[15px] text-white placeholder:text-[#636366] focus:border-[#0077ff] focus:outline-none focus:ring-1 focus:ring-[#0077ff] transition-colors"
          />
        </div>

        {error && (
          <p className="text-[13px] text-red-400">{error}</p>
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
