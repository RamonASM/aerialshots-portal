'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { SQFT_TIERS, type SqftTierId } from '@/lib/pricing/config'
import {
  useBookingStore,
  useBookingProgress,
  useBookingPricing,
  useCanProceed,
  useEstimatedDuration,
  usePropertyAccess,
  type HomeownerInfo,
} from '@/stores/useBookingStore'
import {
  BookingProgressBar,
  ServiceModeToggle,
  PackageSelector,
  ServiceBuilder,
  RunningTotal,
  AccessTypeSelector,
  VacantAccessForm,
  HomeownerInfoForm,
  HomeownerNotificationPreview,
} from '@/components/booking'
import { GooglePlacesAutocomplete } from '@/components/booking/GooglePlacesAutocomplete'
import { AvailabilityCalendar } from '@/components/booking/AvailabilityCalendar'
import { PaymentStep } from '@/components/booking/PaymentStep'

function ListingBookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Store state and actions
  const {
    currentStep,
    formData,
    isLoading,
    setStep,
    nextStep,
    prevStep,
    updateFormData,
    setPackage,
    setSelectionMode,
    addService,
    removeService,
    updateServiceQuantity,
    setAccessType,
    setOccupancyStatus,
    setHomeownerInfo,
    setNotifyHomeowner,
    setPropertyAddress,
    setSchedule,
    initSession,
    recalculatePricing,
  } = useBookingStore()

  const { isFirstStep, isLastStep, currentStepLabel } = useBookingProgress()
  const pricing = useBookingPricing()
  const canProceed = useCanProceed()
  const estimatedDuration = useEstimatedDuration()
  const { accessType, occupancyStatus, homeownerInfo, notifyHomeowner, isOccupied } =
    usePropertyAccess()

  // Initialize session on mount
  useEffect(() => {
    initSession()

    // Handle initial params
    const packageParam = searchParams.get('package')
    const sqftParam = searchParams.get('sqft') as SqftTierId

    if (packageParam) {
      const validSqft = SQFT_TIERS.find((t) => t.id === sqftParam)?.id || 'lt2000'
      setPackage(packageParam, validSqft)
    }
  }, [searchParams, initSession, setPackage])

  // Handle step navigation
  const handleNext = () => {
    if (canProceed) {
      nextStep()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    prevStep()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle order submission
  const handleSubmit = async (paymentIntentId: string) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          serviceType: 'listing',
          totalCents: pricing.total * 100,
          paymentIntentId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create order')
      }

      // Redirect to success page
      router.push('/book/success')
    } catch (error) {
      console.error('Order creation error:', error)
      throw error
    }
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Services
        return (
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
                Step 01
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-white mb-4">
                Choose Your Services
              </h2>
              <p className="text-[15px] text-[#8A847F]">
                Select a package for the best value, or build your own with individual services.
              </p>
            </div>

            <ServiceModeToggle
              mode={formData.selectionMode}
              onModeChange={setSelectionMode}
            />

            {formData.selectionMode === 'package' ? (
              <PackageSelector
                selectedPackage={formData.packageKey || null}
                selectedSqft={formData.sqftTier}
                onPackageSelect={(key) => setPackage(key, formData.sqftTier)}
                onSqftSelect={(sqft) => setPackage(formData.packageKey || '', sqft)}
              />
            ) : (
              <ServiceBuilder
                sqftTier={formData.sqftTier}
                onSqftChange={(tier) => updateFormData({ sqftTier: tier })}
                selectedServices={formData.selectedServices}
                onAddService={addService}
                onRemoveService={removeService}
                onUpdateQuantity={updateServiceQuantity}
              />
            )}
          </div>
        )

      case 1: // Property
        return (
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
                Step 02
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-white mb-4">
                Property Details
              </h2>
              <p className="text-[15px] text-[#8A847F]">
                Tell us about the property so we can prepare for the best shoot.
              </p>
            </div>

            {/* Property Address */}
            <div className="max-w-xl mx-auto space-y-8">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
                  Property Address
                </p>
                <GooglePlacesAutocomplete
                  value={formData.propertyAddress}
                  onSelect={(place) => {
                    setPropertyAddress({
                      formatted: place.formatted,
                      street: place.street,
                      city: place.city,
                      state: place.state,
                      zip: place.zip,
                      lat: place.lat,
                      lng: place.lng,
                      placeId: place.placeId,
                    })
                  }}
                />
              </div>

              {/* Access Type */}
              <AccessTypeSelector
                occupancyStatus={occupancyStatus}
                onOccupancyChange={setOccupancyStatus}
              />

              {/* Vacant Property Form */}
              {!isOccupied && (
                <VacantAccessForm
                  accessDetails={{
                    lockboxCode: homeownerInfo?.lockboxCode,
                    gateCode: homeownerInfo?.gateCode,
                    accessInstructions: homeownerInfo?.accessInstructions,
                  }}
                  onAccessDetailsChange={(details) => {
                    setHomeownerInfo({
                      name: '',
                      email: '',
                      phone: '',
                      preferredContactMethod: 'email',
                      ...homeownerInfo,
                      ...details,
                    })
                  }}
                />
              )}

              {/* Occupied Property Form */}
              {isOccupied && (
                <>
                  <HomeownerInfoForm
                    homeownerInfo={homeownerInfo}
                    onHomeownerInfoChange={(info) =>
                      setHomeownerInfo({ ...homeownerInfo, ...info } as HomeownerInfo)
                    }
                    occupancyType={occupancyStatus as 'owner-occupied' | 'tenant-occupied'}
                  />
                  <HomeownerNotificationPreview
                    homeownerInfo={homeownerInfo}
                    propertyAddress={formData.propertyAddress}
                    scheduledDate={formData.scheduledDate}
                    scheduledTime={formData.scheduledTime}
                    notifyHomeowner={notifyHomeowner}
                    onNotifyChange={setNotifyHomeowner}
                    occupancyType={occupancyStatus as 'owner-occupied' | 'tenant-occupied'}
                  />
                </>
              )}
            </div>
          </div>
        )

      case 2: // Schedule
        return (
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
                Step 03
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-white mb-4">
                Select Your Date & Time
              </h2>
              <p className="text-[15px] text-[#8A847F]">
                Choose a time that works best for you. We&apos;ll confirm availability.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <AvailabilityCalendar
                selectedDate={formData.scheduledDate}
                selectedTime={formData.scheduledTime}
                onSelect={(date, time) => setSchedule(date, time)}
                lat={formData.propertyLat}
                lng={formData.propertyLng}
              />
            </div>
          </div>
        )

      case 3: // Payment
        return (
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
                Step 04
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-white mb-4">
                Complete Your Booking
              </h2>
              <p className="text-[15px] text-[#8A847F]">
                Review your order and complete payment.
              </p>
            </div>

            <div className="max-w-xl mx-auto">
              <PaymentStep
                contactData={{
                  name: formData.contactName,
                  email: formData.contactEmail,
                  phone: formData.contactPhone,
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
                isSubmitting={isLoading}
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-white/[0.06]">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/book"
              className="flex items-center gap-2 text-[#8A847F] hover:text-white transition-colors text-[14px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>

            <h1 className="text-[15px] font-medium text-white">Book Listing Media</h1>

            {/* Running Total (header) */}
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.15em] text-[#6a6765]">Total</p>
              <p className="font-serif text-lg text-white">
                ${pricing.total.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <BookingProgressBar currentStep={currentStep} />

      {/* Main Content */}
      <div className="container py-12 lg:py-16">
        <div className="grid lg:grid-cols-[1fr,340px] gap-12 lg:gap-16">
          {/* Step Content */}
          <div>{renderStepContent()}</div>

          {/* Sidebar - Running Total (desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-8">
              <RunningTotal
                breakdown={pricing.breakdown}
                subtotal={pricing.subtotal}
                travelFee={pricing.travelFee}
                couponDiscount={pricing.couponDiscount}
                loyaltyDiscount={pricing.loyaltyDiscount}
                total={pricing.total}
                estimatedDuration={estimatedDuration}
                canProceed={canProceed}
                onContinue={handleNext}
                isLastStep={isLastStep}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Footer */}
      {!isLastStep && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur border-t border-white/[0.06]">
          <div className="container py-4 flex items-center justify-between gap-4">
            <button
              onClick={handleBack}
              disabled={isFirstStep}
              className={
                isFirstStep
                  ? 'flex items-center gap-2 px-4 py-3 text-[#6a6765] cursor-not-allowed text-[14px]'
                  : 'flex items-center gap-2 px-4 py-3 text-white hover:text-[#A29991] transition-colors text-[14px]'
              }
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-center">
              <p className="text-[11px] text-[#6a6765]">Total</p>
              <p className="font-serif text-lg text-white">
                ${pricing.total.toLocaleString()}
              </p>
            </div>

            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={
                canProceed
                  ? 'px-6 py-3 bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[14px] font-medium transition-colors'
                  : 'px-6 py-3 bg-white/[0.06] text-[#6a6765] cursor-not-allowed text-[14px] font-medium'
              }
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Spacer for mobile footer */}
      {!isLastStep && <div className="lg:hidden h-24" />}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-[#A29991] animate-spin mx-auto mb-4" />
        <p className="text-[15px] text-[#8A847F]">Loading booking...</p>
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
