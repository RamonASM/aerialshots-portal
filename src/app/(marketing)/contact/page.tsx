'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Camera,
  Plane,
  Video,
  Box,
  Sparkles,
  LayoutGrid,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Home,
  Castle,
  MapPin,
  Mail,
  Phone,
  User,
  Calculator,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Square footage tiers (matching database pricing_tiers)
const sqftTiers = [
  { id: 'lt1500', label: 'Under 1,500 sq ft', range: [0, 1500] },
  { id: '1501_2500', label: '1,501 - 2,500 sq ft', range: [1501, 2500] },
  { id: '2501_3500', label: '2,501 - 3,500 sq ft', range: [2501, 3500] },
  { id: '3501_4000', label: '3,501 - 4,000 sq ft', range: [3501, 4000] },
  { id: '4001_5000', label: '4,001 - 5,000 sq ft', range: [4001, 5000] },
  { id: '5001_10000', label: '5,001 - 10,000 sq ft', range: [5001, 10000] },
]

// Property types
const propertyTypes = [
  { id: 'residential', label: 'Residential', icon: Home },
  { id: 'condo', label: 'Condo/Townhome', icon: Building2 },
  { id: 'luxury', label: 'Luxury/Estate', icon: Castle },
]

// Services with base pricing estimates
const services = [
  {
    id: 'photography',
    name: 'HDR Photography',
    icon: Camera,
    description: 'Professional interior & exterior photos',
    basePrice: 150,
    popular: true,
  },
  {
    id: 'drone',
    name: 'Drone & Aerial',
    icon: Plane,
    description: 'FAA-certified aerial photography',
    basePrice: 100,
    popular: true,
  },
  {
    id: 'video',
    name: 'Video Tour',
    icon: Video,
    description: 'Cinematic property walkthrough',
    basePrice: 200,
    popular: false,
  },
  {
    id: '3d-tour',
    name: '3D Virtual Tour',
    icon: Box,
    description: 'Interactive Matterport or Zillow 3D',
    basePrice: 150,
    popular: true,
  },
  {
    id: 'staging',
    name: 'Virtual Staging',
    icon: Sparkles,
    description: 'AI-powered room staging (per room)',
    basePrice: 35,
    popular: false,
  },
  {
    id: 'floor-plan',
    name: 'Floor Plans',
    icon: LayoutGrid,
    description: '2D floor plan with measurements',
    basePrice: 75,
    popular: false,
  },
]

// Package recommendations
const packages = [
  {
    id: 'essentials',
    name: 'Essentials',
    includes: ['photography', 'drone', '3d-tour', 'floor-plan', 'staging'],
    description: 'Perfect for standard listings',
    savings: '15%',
    basePrices: {
      lt1500: 315,
      '1501_2500': 365,
      '2501_3500': 420,
      '3501_4000': 470,
      '4001_5000': 520,
      '5001_10000': 580,
    } as Record<string, number>,
  },
  {
    id: 'signature',
    name: 'Signature',
    includes: ['photography', 'drone', '3d-tour', 'floor-plan', 'staging', 'video'],
    description: 'Most popular for serious sellers',
    savings: '20%',
    basePrices: {
      lt1500: 449,
      '1501_2500': 499,
      '2501_3500': 549,
      '3501_4000': 599,
      '4001_5000': 649,
      '5001_10000': 700,
    } as Record<string, number>,
  },
  {
    id: 'luxury',
    name: 'Luxury',
    includes: ['photography', 'drone', '3d-tour', 'floor-plan', 'staging', 'video'],
    description: 'Premium package for luxury properties',
    savings: '25%',
    basePrices: {
      lt1500: 649,
      '1501_2500': 749,
      '2501_3500': 849,
      '3501_4000': 949,
      '4001_5000': 1000,
      '5001_10000': 1100,
    } as Record<string, number>,
  },
]

type Step = 'property' | 'services' | 'estimate' | 'contact'

export default function EstimatePage() {
  const [step, setStep] = useState<Step>('property')
  const [propertyType, setPropertyType] = useState<string>('')
  const [sqftTier, setSqftTier] = useState<string>('')
  const [location, setLocation] = useState<string>('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [contactInfo, setContactInfo] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Calculate estimate
  const estimate = useMemo(() => {
    if (!sqftTier || selectedServices.length === 0) return null

    // Calculate à la carte total
    const alaCarteTotal = selectedServices.reduce((sum, serviceId) => {
      const service = services.find((s) => s.id === serviceId)
      return sum + (service?.basePrice || 0)
    }, 0)

    // Find best matching package
    const matchingPackages = packages.filter((pkg) =>
      pkg.includes.every((s) => selectedServices.includes(s))
    )

    const recommendedPackage = matchingPackages.length > 0 ? matchingPackages[matchingPackages.length - 1] : null
    const packagePrice = recommendedPackage?.basePrices[sqftTier] || 0

    // Add any services not in the package
    const extraServices = selectedServices.filter(
      (s) => !recommendedPackage?.includes.includes(s)
    )
    const extraCost = extraServices.reduce((sum, serviceId) => {
      const service = services.find((s) => s.id === serviceId)
      return sum + (service?.basePrice || 0)
    }, 0)

    return {
      alaCarteTotal,
      recommendedPackage,
      packagePrice,
      extraCost,
      totalWithPackage: packagePrice + extraCost,
      savings: recommendedPackage ? alaCarteTotal - (packagePrice + extraCost) : 0,
    }
  }, [sqftTier, selectedServices])

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((s) => s !== serviceId)
        : [...prev, serviceId]
    )
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const canProceed = {
    property: propertyType && sqftTier,
    services: selectedServices.length > 0,
    estimate: true,
    contact: contactInfo.name && contactInfo.email,
  }

  const steps: { key: Step; label: string }[] = [
    { key: 'property', label: 'Property' },
    { key: 'services', label: 'Services' },
    { key: 'estimate', label: 'Estimate' },
    { key: 'contact', label: 'Contact' },
  ]

  const currentStepIndex = steps.findIndex((s) => s.key === step)

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-black">
        <section className="relative py-24 md:py-32">
          <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent" />
          <div className="container relative">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 mb-8">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                Estimate Submitted!
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Thanks, {contactInfo.name}! We&apos;ll review your project details and send a
                detailed quote to {contactInfo.email} within 2 hours.
              </p>
              <div className="mt-8 p-6 rounded-xl border border-white/[0.08] bg-[#1c1c1e] text-left">
                <h3 className="font-semibold text-foreground mb-4">Your Estimate Summary</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="text-foreground">Property:</span>{' '}
                    {propertyTypes.find((p) => p.id === propertyType)?.label} •{' '}
                    {sqftTiers.find((t) => t.id === sqftTier)?.label}
                  </p>
                  <p>
                    <span className="text-foreground">Services:</span>{' '}
                    {selectedServices.map((s) => services.find((svc) => svc.id === s)?.name).join(', ')}
                  </p>
                  <p className="text-lg font-semibold text-green-400 mt-4">
                    Estimated Total: ${estimate?.totalWithPackage || estimate?.alaCarteTotal}
                    {estimate?.savings && estimate.savings > 0 && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        (Save ${estimate.savings} with {estimate.recommendedPackage?.name} package)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center rounded-full bg-blue-500 px-8 py-3 font-medium text-white hover:bg-blue-600 transition-colors"
                >
                  Book Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full bg-neutral-800 px-8 py-3 font-medium text-white hover:bg-neutral-700 transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black">
      {/* Hero */}
      <section className="relative py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] border border-white/[0.08] px-4 py-2 text-sm text-[#a1a1a6] mb-6">
              <Calculator className="h-4 w-4" />
              Instant Project Estimate
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Get Your Custom Quote
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Tell us about your property and select services. We&apos;ll provide an instant
              estimate with package recommendations.
            </p>
          </div>
        </div>
      </section>

      {/* Progress Steps */}
      <section className="border-t border-white/5 py-8">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              {steps.map((s, index) => (
                <div key={s.key} className="flex items-center">
                  <button
                    onClick={() => index < currentStepIndex && setStep(s.key)}
                    disabled={index > currentStepIndex}
                    className={cn(
                      'flex items-center gap-2 transition-colors',
                      index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground',
                      index < currentStepIndex && 'cursor-pointer hover:text-[#09f]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                        index < currentStepIndex
                          ? 'bg-[#ff4533] text-white'
                          : index === currentStepIndex
                          ? 'bg-[#ff4533]/20 border border-[#ff4533] text-[#ff4533]'
                          : 'bg-white/[0.05] text-muted-foreground'
                      )}
                    >
                      {index < currentStepIndex ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className="hidden sm:inline text-sm">{s.label}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'w-12 sm:w-24 h-px mx-2',
                        index < currentStepIndex ? 'bg-[#ff4533]' : 'bg-white/[0.08]'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Form Steps */}
      <section className="py-12">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            {/* Step 1: Property Details */}
            {step === 'property' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Property Details</h2>
                  <p className="text-muted-foreground">
                    Tell us about the property you&apos;re listing.
                  </p>
                </div>

                {/* Property Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Property Type
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {propertyTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setPropertyType(type.id)}
                        className={cn(
                          'p-4 rounded-xl border text-center transition-all',
                          propertyType === type.id
                            ? 'border-[#ff4533] bg-[#ff4533]/10'
                            : 'border-white/[0.08] bg-[#1c1c1e] hover:border-white/20'
                        )}
                      >
                        <type.icon
                          className={cn(
                            'h-8 w-8 mx-auto mb-2',
                            propertyType === type.id ? 'text-[#ff4533]' : 'text-muted-foreground'
                          )}
                        />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            propertyType === type.id ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Square Footage */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Square Footage
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {sqftTiers.map((tier) => (
                      <button
                        key={tier.id}
                        onClick={() => setSqftTier(tier.id)}
                        className={cn(
                          'p-3 rounded-lg border text-sm transition-all',
                          sqftTier === tier.id
                            ? 'border-[#ff4533] bg-[#ff4533]/10 text-foreground'
                            : 'border-white/[0.08] bg-[#1c1c1e] text-muted-foreground hover:border-white/20'
                        )}
                      >
                        {tier.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Property Location (City)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Orlando, Winter Park, Tampa..."
                      className="w-full rounded-lg border border-white/[0.08] bg-[#1c1c1e] pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-[#ff4533] focus:outline-none focus:ring-1 focus:ring-[#ff4533]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Services */}
            {step === 'services' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Select Services</h2>
                  <p className="text-muted-foreground">
                    Choose the media services you need for this listing.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={cn(
                        'p-4 rounded-xl border text-left transition-all relative',
                        selectedServices.includes(service.id)
                          ? 'border-[#ff4533] bg-[#ff4533]/10'
                          : 'border-white/[0.08] bg-[#1c1c1e] hover:border-white/20'
                      )}
                    >
                      {service.popular && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 text-xs rounded-full bg-[#ff4533]/20 text-[#ff4533]">
                          Popular
                        </span>
                      )}
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5',
                            selectedServices.includes(service.id)
                              ? 'bg-[#ff4533] border-[#ff4533]'
                              : 'border-white/20'
                          )}
                        >
                          {selectedServices.includes(service.id) && (
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <service.icon
                              className={cn(
                                'h-4 w-4',
                                selectedServices.includes(service.id)
                                  ? 'text-[#ff4533]'
                                  : 'text-muted-foreground'
                              )}
                            />
                            <span className="font-medium text-foreground">{service.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                          <p className="text-sm text-[#a1a1a6] mt-2">From ${service.basePrice}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedServices.length > 0 && (
                  <div className="p-4 rounded-xl border border-[#ff4533]/20 bg-[#ff4533]/5">
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground font-medium">{selectedServices.length}</span>{' '}
                      service{selectedServices.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Estimate */}
            {step === 'estimate' && estimate && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Your Estimate</h2>
                  <p className="text-muted-foreground">
                    Based on your selections, here&apos;s your project estimate.
                  </p>
                </div>

                {/* Property Summary */}
                <div className="p-4 rounded-xl border border-white/[0.08] bg-[#1c1c1e]">
                  <p className="text-sm text-muted-foreground">
                    {propertyTypes.find((p) => p.id === propertyType)?.label} •{' '}
                    {sqftTiers.find((t) => t.id === sqftTier)?.label}
                    {location && ` • ${location}`}
                  </p>
                </div>

                {/* Package Recommendation */}
                {estimate.recommendedPackage && (
                  <div className="p-6 rounded-xl border border-green-500/20 bg-green-500/5">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-foreground">Recommended Package</span>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">
                      {estimate.recommendedPackage.name} Package
                    </h3>
                    <p className="text-muted-foreground mt-1">
                      {estimate.recommendedPackage.description}
                    </p>
                    <div className="mt-4 flex items-baseline gap-3">
                      <span className="text-3xl font-bold text-green-400">
                        ${estimate.packagePrice}
                      </span>
                      {estimate.savings > 0 && (
                        <span className="text-sm text-green-400">
                          Save ${estimate.savings} vs à la carte
                        </span>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/[0.08]">
                      <p className="text-sm text-muted-foreground mb-2">Includes:</p>
                      <div className="flex flex-wrap gap-2">
                        {estimate.recommendedPackage.includes.map((serviceId) => {
                          const service = services.find((s) => s.id === serviceId)
                          return (
                            <span
                              key={serviceId}
                              className="px-2 py-1 text-xs rounded-full bg-white/[0.05] text-muted-foreground"
                            >
                              {service?.name}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* À La Carte Option */}
                <div className="p-6 rounded-xl border border-white/[0.08] bg-[#1c1c1e]">
                  <h3 className="font-semibold text-foreground mb-4">À La Carte Pricing</h3>
                  <div className="space-y-3">
                    {selectedServices.map((serviceId) => {
                      const service = services.find((s) => s.id === serviceId)
                      return (
                        <div key={serviceId} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{service?.name}</span>
                          <span className="text-foreground">${service?.basePrice}</span>
                        </div>
                      )
                    })}
                    <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                      <span className="font-medium text-foreground">À La Carte Total</span>
                      <span className="font-bold text-foreground">${estimate.alaCarteTotal}</span>
                    </div>
                  </div>
                </div>

                {/* Final Total */}
                <div className="p-6 rounded-xl border border-[#ff4533]/20 bg-[#ff4533]/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Best Price</p>
                      <p className="text-3xl font-bold text-foreground">
                        $
                        {estimate.recommendedPackage
                          ? estimate.totalWithPackage
                          : estimate.alaCarteTotal}
                      </p>
                    </div>
                    {estimate.savings > 0 && (
                      <div className="px-4 py-2 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
                        You save ${estimate.savings}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  * Final pricing may vary based on property specifics. We&apos;ll confirm exact
                  pricing in your detailed quote.
                </p>
              </div>
            )}

            {/* Step 4: Contact */}
            {step === 'contact' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Get Your Quote</h2>
                  <p className="text-muted-foreground">
                    Enter your contact info and we&apos;ll send a detailed quote within 2 hours.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Your Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={contactInfo.name}
                        onChange={(e) =>
                          setContactInfo((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="John Smith"
                        className="w-full rounded-lg border border-white/[0.08] bg-[#1c1c1e] pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-[#ff4533] focus:outline-none focus:ring-1 focus:ring-[#ff4533]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type="email"
                        value={contactInfo.email}
                        onChange={(e) =>
                          setContactInfo((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="john@realty.com"
                        className="w-full rounded-lg border border-white/[0.08] bg-[#1c1c1e] pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-[#ff4533] focus:outline-none focus:ring-1 focus:ring-[#ff4533]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number (optional)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type="tel"
                        value={contactInfo.phone}
                        onChange={(e) =>
                          setContactInfo((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="(555) 123-4567"
                        className="w-full rounded-lg border border-white/[0.08] bg-[#1c1c1e] pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-[#ff4533] focus:outline-none focus:ring-1 focus:ring-[#ff4533]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Additional Notes (optional)
                    </label>
                    <textarea
                      value={contactInfo.notes}
                      onChange={(e) =>
                        setContactInfo((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      rows={3}
                      placeholder="Any special requests or property details..."
                      className="w-full rounded-lg border border-white/[0.08] bg-[#1c1c1e] px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-[#ff4533] focus:outline-none focus:ring-1 focus:ring-[#ff4533] resize-none"
                    />
                  </div>
                </div>

                {/* Estimate Summary */}
                {estimate && (
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-[#1c1c1e]">
                    <h3 className="font-semibold text-foreground mb-3">Estimate Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Property</span>
                        <span className="text-foreground">
                          {propertyTypes.find((p) => p.id === propertyType)?.label} •{' '}
                          {sqftTiers.find((t) => t.id === sqftTier)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Services</span>
                        <span className="text-foreground">{selectedServices.length} selected</span>
                      </div>
                      <div className="pt-2 border-t border-white/[0.08] flex justify-between">
                        <span className="font-medium text-foreground">Estimated Total</span>
                        <span className="font-bold text-[#ff4533]">
                          $
                          {estimate.recommendedPackage
                            ? estimate.totalWithPackage
                            : estimate.alaCarteTotal}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-12 flex items-center justify-between">
              <button
                onClick={() => setStep(steps[currentStepIndex - 1]?.key)}
                disabled={currentStepIndex === 0}
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-colors',
                  currentStepIndex === 0
                    ? 'text-muted-foreground cursor-not-allowed'
                    : 'text-foreground hover:bg-white/[0.05]'
                )}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              {step === 'contact' ? (
                <button
                  onClick={handleSubmit}
                  disabled={!canProceed[step] || isSubmitting}
                  className={cn(
                    'inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium transition-colors',
                    canProceed[step] && !isSubmitting
                      ? 'bg-[#ff4533] text-white hover:bg-[#e63d2e]'
                      : 'bg-white/[0.05] text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {isSubmitting ? 'Submitting...' : 'Get My Quote'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => setStep(steps[currentStepIndex + 1]?.key)}
                  disabled={!canProceed[step]}
                  className={cn(
                    'inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium transition-colors',
                    canProceed[step]
                      ? 'bg-[#ff4533] text-white hover:bg-[#e63d2e]'
                      : 'bg-white/[0.05] text-muted-foreground cursor-not-allowed'
                  )}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Alternative Contact */}
      <section className="py-16 border-t border-white/5">
        <div className="container">
          <div className="max-w-xl mx-auto text-center">
            <p className="text-muted-foreground">
              Prefer to talk to someone directly?
            </p>
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="tel:+14075551234"
                className="inline-flex items-center gap-2 text-[#09f] hover:text-[#00bbff]"
              >
                <Phone className="h-4 w-4" />
                (407) 555-1234
              </a>
              <span className="hidden sm:inline text-muted-foreground">•</span>
              <a
                href="mailto:hello@aerialshots.media"
                className="inline-flex items-center gap-2 text-[#09f] hover:text-[#00bbff]"
              >
                <Mail className="h-4 w-4" />
                hello@aerialshots.media
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
