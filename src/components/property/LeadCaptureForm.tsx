'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Send, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface LeadFormData {
  name: string
  email: string
  phone: string
  message: string
}

interface LeadCaptureFormProps {
  listingId: string
  agentId: string | null
  address: string
  brandColor?: string
}

export function LeadCaptureForm({
  listingId,
  agentId,
  address,
  brandColor = '#0077ff',
}: LeadCaptureFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>()

  const onSubmit = async (data: LeadFormData) => {
    try {
      setError(null)

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          agent_id: agentId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          message: data.message,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit inquiry')
      }

      setSubmitted(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-8 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
        <h3 className="mt-4 text-[17px] font-semibold text-white">
          Thanks for your interest!
        </h3>
        <p className="mt-2 text-[15px] text-[#a1a1a6]">
          We've received your inquiry and will be in touch soon.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-[13px] text-[#a1a1a6]">Name *</Label>
        <Input
          id="name"
          {...register('name', { required: 'Name is required' })}
          placeholder="Your full name"
          className="mt-1.5"
        />
        {errors.name && (
          <p className="mt-1.5 text-[13px] text-[#ff453a]">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email" className="text-[13px] text-[#a1a1a6]">Email *</Label>
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
          placeholder="your@email.com"
          className="mt-1.5"
        />
        {errors.email && (
          <p className="mt-1.5 text-[13px] text-[#ff453a]">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="phone" className="text-[13px] text-[#a1a1a6]">Phone</Label>
        <Input
          id="phone"
          type="tel"
          {...register('phone')}
          placeholder="(555) 123-4567"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="message" className="text-[13px] text-[#a1a1a6]">Message</Label>
        <Textarea
          id="message"
          {...register('message')}
          placeholder={`I'm interested in ${address}. Please contact me with more information.`}
          rows={4}
          className="mt-1.5"
        />
      </div>

      {error && <p className="text-[13px] text-[#ff453a]">{error}</p>}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
        style={{ backgroundColor: brandColor }}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Send Inquiry
          </>
        )}
      </Button>

      <p className="text-center text-[11px] text-[#636366]">
        By submitting, you agree to receive communications about this property.
      </p>
    </form>
  )
}
