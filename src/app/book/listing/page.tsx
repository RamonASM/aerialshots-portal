'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LISTING_PACKAGES, SQFT_TIERS, type SqftTierId } from '@/lib/pricing/config'
import {
  LISTING_BOOKING_STEPS,
  calculateBookingTotal,
  type BookingFormData,
} from '@/lib/booking/config'
import { ProgressIndicator } from '@/components/booking/ProgressIndicator'
import { PackageStep } from '@/components/booking/PackageStep'
import { AddonsStep } from '@/components/booking/AddonsStep'
import { PropertyStep } from '@/components/booking/PropertyStep'
import { ScheduleStep } from '@/components/booking/ScheduleStep'
import { PaymentStep } from '@/components/booking/PaymentStep'

function ListingBookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get initial values from query params
  const initialPackage = searchParams.get('package') || 'signature'
  const initialSqft = searchParams.get('sqft') as SqftTierId || 'lt2000'

  // Validate initial values
  const validPackage = LISTING_PACKAGES.find(p => p.key === initialPackage)?.key || 'signature'
  const validSqft = SQFT_TIERS.find(t => t.id === initialSqft)?.id || 'lt2000'

  // Form state
  const [formData, setFormData] = useState<Partial<BookingFormData>>({
    packageKey: validPackage,
    sqftTier: validSqft,
    addons: [],
    propertyAddress: '',
    propertyCity: '',
    propertyState: 'FL',
    propertyZip: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  })

  // Calculate total
  const pricing = calculateBookingTotal(formData)
  const selectedPackage = LISTING_PACKAGES.find((p) => p.key === formData.packageKey)

  // Step navigation
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0: // Package
        return !!formData.packageKey && !!formData.sqftTier
      case 1: // Addons
        return true // Optional step
      case 2: // Property
        return (
          !!formData.propertyAddress &&
          !!formData.propertyCity &&
          !!formData.propertyZip
        )
      case 3: // Schedule
        return !!formData.scheduledDate && !!formData.scheduledTime
      case 4: // Payment
        return (
          !!formData.contactName &&
          !!formData.contactEmail &&
          !!formData.contactPhone
        )
      default:
        return false
    }
  }, [currentStep, formData])

  const nextStep = () => {
    if (canProceed() && currentStep < LISTING_BOOKING_STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Form update handlers
  const updateFormData = (updates: Partial<BookingFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const toggleAddon = (addonId: string) => {
    setFormData((prev) => {
      const currentAddons = prev.addons || []
      const exists = currentAddons.some((a) => a.id === addonId)

      return {
        ...prev,
        addons: exists
          ? currentAddons.filter((a) => a.id !== addonId)
          : [...currentAddons, { id: addonId, quantity: 1 }],
      }
    })
  }

  const updateAddonQuantity = (addonId: string, quantity: number) => {
    setFormData((prev) => ({
      ...prev,
      addons: (prev.addons || []).map((a) =>
        a.id === addonId ? { ...a, quantity } : a
      ),
    }))
  }

  // Submit order
  const handleSubmit = async (paymentIntentId: string) => {
    setIsSubmitting(true)
    try {
      // Create order in database with payment intent ID
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          serviceType: 'listing',
          packageName: selectedPackage?.name,
          totalCents: pricing.total * 100,
          paymentIntentId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create order')
      }

      // Order created, payment will be handled by Stripe
    } catch (error) {
      console.error('Order creation error:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <PackageStep
            selectedPackage={formData.packageKey || null}
            selectedSqft={formData.sqftTier || 'lt2000'}
            onPackageSelect={(key) => updateFormData({ packageKey: key })}
            onSqftSelect={(sqft) => updateFormData({ sqftTier: sqft })}
          />
        )
      case 1:
        return (
          <AddonsStep
            selectedAddons={formData.addons || []}
            onToggleAddon={toggleAddon}
            onUpdateQuantity={updateAddonQuantity}
            packageName={selectedPackage?.name || 'Your'}
          />
        )
      case 2:
        return (
          <PropertyStep
            data={{
              address: formData.propertyAddress || '',
              city: formData.propertyCity || '',
              state: formData.propertyState || 'FL',
              zip: formData.propertyZip || '',
              sqft: formData.propertySqft,
              beds: formData.propertyBeds,
              baths: formData.propertyBaths,
              accessInstructions: formData.accessInstructions,
            }}
            onChange={(data) =>
              updateFormData({
                propertyAddress: data.address,
                propertyCity: data.city,
                propertyState: data.state,
                propertyZip: data.zip,
                propertySqft: data.sqft,
                propertyBeds: data.beds,
                propertyBaths: data.baths,
                accessInstructions: data.accessInstructions,
              })
            }
          />
        )
      case 3:
        return (
          <ScheduleStep
            selectedDate={formData.scheduledDate || null}
            selectedTime={formData.scheduledTime || null}
            onDateSelect={(date) => updateFormData({ scheduledDate: date })}
            onTimeSelect={(time) => updateFormData({ scheduledTime: time })}
          />
        )
      case 4:
        return (
          <PaymentStep
            contactData={{
              name: formData.contactName || '',
              email: formData.contactEmail || '',
              phone: formData.contactPhone || '',
              specialInstructions: formData.specialInstructions,
            }}
            onContactChange={(data) =>
              updateFormData({
                contactName: data.name,
                contactEmail: data.email,
                contactPhone: data.phone,
                specialInstructions: data.specialInstructions,
              })
            }
            total={pricing.total}
            breakdown={pricing.breakdown}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/book"
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>

            <h1 className="font-bold text-lg">Book Listing Media</h1>

            {/* Running Total */}
            <div className="text-right">
              <p className="text-xs text-neutral-500">Total</p>
              <p className="font-bold text-lg text-white">
                ${pricing.total.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="border-b border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <ProgressIndicator steps={LISTING_BOOKING_STEPS} currentStep={currentStep} />
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {renderStep()}
      </div>

      {/* Navigation Footer */}
      {currentStep < LISTING_BOOKING_STEPS.length - 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur border-t border-neutral-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all',
                currentStep === 0
                  ? 'opacity-50 cursor-not-allowed text-neutral-500'
                  : 'text-neutral-300 hover:bg-neutral-800'
              )}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className={cn(
                'flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-all',
                canProceed()
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
              )}
            >
              {currentStep === LISTING_BOOKING_STEPS.length - 2 ? (
                <>
                  Continue to Payment
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : currentStep === 1 ? (
                <>
                  {formData.addons?.length === 0 ? 'Skip Add-ons' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
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
      )}

      {/* Spacer for fixed footer */}
      {currentStep < LISTING_BOOKING_STEPS.length - 1 && (
        <div className="h-20" />
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-neutral-400">Loading booking...</p>
      </div>
    </div>
  )
}

export default function ListingBookingPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ListingBookingContent />
    </Suspense>
  )
}
