'use client'

import { useState, useCallback } from 'react'
import { ArrowLeft, ArrowRight, Loader2, Check, Camera, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuoteFormData, ServiceType } from '@/lib/pricing/quote-config'
import {
  PROPERTY_TYPES,
  SQFT_RANGES,
  TIMELINE_OPTIONS,
  PACKAGE_OPTIONS,
  ADDITIONAL_SERVICES,
  SOCIAL_PRESENCE_OPTIONS,
  CONTENT_GOALS,
  BUDGET_RANGES,
  TEAM_SIZE_OPTIONS,
  CHALLENGE_OPTIONS,
  REFERRAL_SOURCES,
} from '@/lib/pricing/quote-config'

// Step components
function ServiceTypeStep({
  value,
  onChange,
}: {
  value?: ServiceType
  onChange: (v: ServiceType) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          What can we help you with?
        </h2>
        <p className="text-neutral-400">
          Select the service that best fits your needs
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <button
          onClick={() => onChange('listing')}
          className={cn(
            'p-6 rounded-2xl border-2 text-left transition-all',
            value === 'listing'
              ? 'bg-blue-500/10 border-blue-500'
              : 'bg-neutral-900 border-neutral-700 hover:border-neutral-500'
          )}
        >
          <Camera className="w-8 h-8 text-blue-400 mb-3" />
          <h3 className="text-xl font-bold text-white mb-1">Listing Media</h3>
          <p className="text-sm text-neutral-400">
            Photography, video, drone, 3D tours for a specific property
          </p>
          <p className="text-xs text-neutral-500 mt-2">From $315/property</p>
        </button>
        <button
          onClick={() => onChange('retainer')}
          className={cn(
            'p-6 rounded-2xl border-2 text-left transition-all',
            value === 'retainer'
              ? 'bg-blue-500/10 border-blue-500'
              : 'bg-neutral-900 border-neutral-700 hover:border-neutral-500'
          )}
        >
          <Video className="w-8 h-8 text-purple-400 mb-3" />
          <h3 className="text-xl font-bold text-white mb-1">Content Retainer</h3>
          <p className="text-sm text-neutral-400">
            Monthly video content to grow your brand and generate leads
          </p>
          <p className="text-xs text-neutral-500 mt-2">From $1,488/month</p>
        </button>
      </div>
    </div>
  )
}

function SingleSelectStep({
  title,
  subtitle,
  options,
  value,
  onChange,
}: {
  title: string
  subtitle?: string
  options: readonly { value: string; label: string; description?: string; emoji?: string; recommended?: boolean }[]
  value?: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{title}</h2>
        {subtitle && <p className="text-neutral-400">{subtitle}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3 max-w-xl mx-auto">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition-all relative',
              value === opt.value
                ? 'bg-blue-500/10 border-blue-500'
                : 'bg-neutral-900 border-neutral-700 hover:border-neutral-500'
            )}
          >
            {opt.recommended && (
              <span className="absolute -top-2 right-4 px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
                Popular
              </span>
            )}
            <div className="flex items-center gap-3">
              {opt.emoji && <span className="text-2xl">{opt.emoji}</span>}
              <div>
                <p className="font-medium text-white">{opt.label}</p>
                {opt.description && (
                  <p className="text-sm text-neutral-500">{opt.description}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function MultiSelectStep({
  title,
  subtitle,
  options,
  values,
  onChange,
  maxSelections,
}: {
  title: string
  subtitle?: string
  options: readonly { value: string; label: string }[]
  values: string[]
  onChange: (v: string[]) => void
  maxSelections?: number
}) {
  const toggle = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val))
    } else if (!maxSelections || values.length < maxSelections) {
      onChange([...values, val])
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{title}</h2>
        {subtitle && <p className="text-neutral-400">{subtitle}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition-all',
              values.includes(opt.value)
                ? 'bg-blue-500/10 border-blue-500'
                : 'bg-neutral-900 border-neutral-700 hover:border-neutral-500'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                  values.includes(opt.value)
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-neutral-600'
                )}
              >
                {values.includes(opt.value) && <Check className="w-3 h-3 text-white" />}
              </div>
              <p className="font-medium text-white text-sm">{opt.label}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function TextInputStep({
  title,
  subtitle,
  placeholder,
  value,
  onChange,
  type = 'text',
  required = true,
}: {
  title: string
  subtitle?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'email' | 'tel'
  required?: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{title}</h2>
        {subtitle && <p className="text-neutral-400">{subtitle}</p>}
      </div>
      <div className="max-w-md mx-auto">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full px-4 py-4 bg-neutral-900 border-2 border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none transition-all text-lg"
        />
      </div>
    </div>
  )
}

function TextAreaStep({
  title,
  subtitle,
  placeholder,
  value,
  onChange,
}: {
  title: string
  subtitle?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{title}</h2>
        {subtitle && <p className="text-neutral-400">{subtitle}</p>}
      </div>
      <div className="max-w-md mx-auto">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full px-4 py-4 bg-neutral-900 border-2 border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none transition-all resize-none"
        />
      </div>
    </div>
  )
}

function SuccessStep({ formData }: { formData: QuoteFormData }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
        <Check className="w-10 h-10 text-green-400" />
      </div>
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          You&apos;re all set, {formData.name?.split(' ')[0]}!
        </h2>
        <p className="text-neutral-400 max-w-md mx-auto">
          We&apos;ve received your request and sent a confirmation to{' '}
          <span className="text-white">{formData.email}</span>. Our team will reach out within 24 hours.
        </p>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-md mx-auto text-left">
        <h3 className="font-semibold text-white mb-3">What happens next?</h3>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
            <span className="text-neutral-400">Review your request and prepare a custom quote</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
            <span className="text-neutral-400">Quick call to discuss your needs and answer questions</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
            <span className="text-neutral-400">Schedule your shoot or start your content retainer</span>
          </li>
        </ol>
      </div>
      <p className="text-sm text-neutral-500">
        Questions? Call us at{' '}
        <a href="tel:+14077745070" className="text-blue-400 hover:underline">
          (407) 774-5070
        </a>
      </p>
    </div>
  )
}

// Main wizard component
export function QuoteWizard() {
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [formData, setFormData] = useState<QuoteFormData>({
    serviceType: undefined as unknown as ServiceType,
    name: '',
    email: '',
    phone: '',
    additionalServices: [],
    contentGoals: [],
  })

  const updateField = useCallback(<K extends keyof QuoteFormData>(
    field: K,
    value: QuoteFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  // Define steps based on service type
  const listingSteps = [
    'serviceType',
    'propertyType',
    'approximateSqft',
    'timeline',
    'interestedPackage',
    'additionalServices',
    'propertyAddress',
    'name',
    'email',
    'phone',
    'additionalNotes',
  ]

  const retainerSteps = [
    'serviceType',
    'currentSocialPresence',
    'contentGoals',
    'teamSize',
    'biggestChallenge',
    'monthlyBudget',
    'howDidYouHear',
    'businessName',
    'name',
    'email',
    'phone',
    'additionalNotes',
  ]

  const steps = formData.serviceType === 'retainer' ? retainerSteps : listingSteps
  const currentStepKey = steps[step]
  const totalSteps = steps.length
  const progress = ((step + 1) / totalSteps) * 100

  const canProceed = () => {
    switch (currentStepKey) {
      case 'serviceType':
        return !!formData.serviceType
      case 'propertyType':
        return !!formData.propertyType
      case 'approximateSqft':
        return !!formData.approximateSqft
      case 'timeline':
        return !!formData.timeline
      case 'interestedPackage':
        return !!formData.interestedPackage
      case 'additionalServices':
        return true // Optional
      case 'propertyAddress':
        return !!formData.propertyAddress?.trim()
      case 'currentSocialPresence':
        return !!formData.currentSocialPresence
      case 'contentGoals':
        return (formData.contentGoals?.length || 0) > 0
      case 'teamSize':
        return !!formData.teamSize
      case 'biggestChallenge':
        return !!formData.biggestChallenge
      case 'monthlyBudget':
        return !!formData.monthlyBudget
      case 'howDidYouHear':
        return !!formData.howDidYouHear
      case 'businessName':
        return !!formData.businessName?.trim()
      case 'name':
        return !!formData.name?.trim()
      case 'email':
        return !!formData.email?.trim() && formData.email.includes('@')
      case 'phone':
        return !!formData.phone?.trim()
      case 'additionalNotes':
        return true // Optional
      default:
        return true
    }
  }

  const handleNext = async () => {
    if (step < totalSteps - 1) {
      setStep(step + 1)
    } else {
      // Submit
      setIsSubmitting(true)
      try {
        const response = await fetch('/api/quote/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (response.ok) {
          setIsComplete(true)
        } else {
          throw new Error('Failed to submit')
        }
      } catch {
        alert('Something went wrong. Please try again or call us at (407) 774-5070.')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  if (isComplete) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6">
        <SuccessStep formData={formData} />
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStepKey) {
      case 'serviceType':
        return (
          <ServiceTypeStep
            value={formData.serviceType}
            onChange={(v) => updateField('serviceType', v)}
          />
        )

      // Listing Media steps
      case 'propertyType':
        return (
          <SingleSelectStep
            title="What type of property?"
            options={PROPERTY_TYPES}
            value={formData.propertyType}
            onChange={(v) => updateField('propertyType', v)}
          />
        )
      case 'approximateSqft':
        return (
          <SingleSelectStep
            title="What&apos;s the approximate size?"
            subtitle="This helps us give you an accurate quote"
            options={SQFT_RANGES}
            value={formData.approximateSqft}
            onChange={(v) => updateField('approximateSqft', v)}
          />
        )
      case 'timeline':
        return (
          <SingleSelectStep
            title="When do you need this done?"
            options={TIMELINE_OPTIONS}
            value={formData.timeline}
            onChange={(v) => updateField('timeline', v)}
          />
        )
      case 'interestedPackage':
        return (
          <SingleSelectStep
            title="Which package interests you?"
            subtitle="Don't worry, we can adjust this later"
            options={PACKAGE_OPTIONS}
            value={formData.interestedPackage}
            onChange={(v) => updateField('interestedPackage', v)}
          />
        )
      case 'additionalServices':
        return (
          <MultiSelectStep
            title="Any add-ons you&apos;re interested in?"
            subtitle="Select all that apply (optional)"
            options={ADDITIONAL_SERVICES}
            values={formData.additionalServices || []}
            onChange={(v) => updateField('additionalServices', v)}
          />
        )
      case 'propertyAddress':
        return (
          <TextInputStep
            title="What&apos;s the property address?"
            subtitle="Or the general area if you don't have it yet"
            placeholder="123 Main St, Orlando, FL"
            value={formData.propertyAddress || ''}
            onChange={(v) => updateField('propertyAddress', v)}
          />
        )

      // Content Retainer steps
      case 'currentSocialPresence':
        return (
          <SingleSelectStep
            title="What&apos;s your current social media presence?"
            options={SOCIAL_PRESENCE_OPTIONS}
            value={formData.currentSocialPresence}
            onChange={(v) => updateField('currentSocialPresence', v)}
          />
        )
      case 'contentGoals':
        return (
          <MultiSelectStep
            title="What are your content goals?"
            subtitle="Select up to 3 that matter most"
            options={CONTENT_GOALS}
            values={formData.contentGoals || []}
            onChange={(v) => updateField('contentGoals', v)}
            maxSelections={3}
          />
        )
      case 'teamSize':
        return (
          <SingleSelectStep
            title="How big is your team?"
            options={TEAM_SIZE_OPTIONS}
            value={formData.teamSize}
            onChange={(v) => updateField('teamSize', v)}
          />
        )
      case 'biggestChallenge':
        return (
          <SingleSelectStep
            title="What&apos;s your biggest content challenge?"
            options={CHALLENGE_OPTIONS}
            value={formData.biggestChallenge}
            onChange={(v) => updateField('biggestChallenge', v)}
          />
        )
      case 'monthlyBudget':
        return (
          <SingleSelectStep
            title="What&apos;s your monthly content budget?"
            subtitle="This helps us recommend the right package"
            options={BUDGET_RANGES}
            value={formData.monthlyBudget}
            onChange={(v) => updateField('monthlyBudget', v)}
          />
        )
      case 'howDidYouHear':
        return (
          <SingleSelectStep
            title="How did you hear about us?"
            options={REFERRAL_SOURCES}
            value={formData.howDidYouHear}
            onChange={(v) => updateField('howDidYouHear', v)}
          />
        )
      case 'businessName':
        return (
          <TextInputStep
            title="What&apos;s your business name?"
            placeholder="The Smith Team / Keller Williams"
            value={formData.businessName || ''}
            onChange={(v) => updateField('businessName', v)}
          />
        )

      // Common steps
      case 'name':
        return (
          <TextInputStep
            title="What&apos;s your name?"
            placeholder="Your full name"
            value={formData.name}
            onChange={(v) => updateField('name', v)}
          />
        )
      case 'email':
        return (
          <TextInputStep
            title="What&apos;s your email?"
            subtitle="We'll send your quote and confirmation here"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(v) => updateField('email', v)}
            type="email"
          />
        )
      case 'phone':
        return (
          <TextInputStep
            title="What&apos;s your phone number?"
            subtitle="For quick questions about your project"
            placeholder="(407) 555-1234"
            value={formData.phone}
            onChange={(v) => updateField('phone', v)}
            type="tel"
          />
        )
      case 'additionalNotes':
        return (
          <TextAreaStep
            title="Anything else we should know?"
            subtitle="Optional - share any specific needs or questions"
            placeholder="Tell us more about your project..."
            value={formData.additionalNotes || ''}
            onChange={(v) => updateField('additionalNotes', v)}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-[500px] flex flex-col">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-neutral-500 mt-2 text-center">
          Step {step + 1} of {totalSteps}
        </p>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center animate-in fade-in duration-200">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-800">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
            step === 0
              ? 'text-neutral-600 cursor-not-allowed'
              : 'text-neutral-400 hover:text-white'
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={handleNext}
          disabled={!canProceed() || isSubmitting}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all',
            canProceed() && !isSubmitting
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : step === totalSteps - 1 ? (
            <>
              Submit Request
              <Check className="w-4 h-4" />
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
