/**
 * Booking Flow Configuration
 *
 * Multi-step booking with package selection, add-ons, scheduling, and payment
 */

import { LISTING_PACKAGES, RETAINER_PACKAGES, type SqftTierId } from '@/lib/pricing/config'

// Booking flow steps
export const LISTING_BOOKING_STEPS = [
  { id: 'package', label: 'Package', description: 'Choose your package' },
  { id: 'addons', label: 'Add-ons', description: 'Enhance your package' },
  { id: 'property', label: 'Property', description: 'Property details' },
  { id: 'schedule', label: 'Schedule', description: 'Pick a date' },
  { id: 'payment', label: 'Payment', description: 'Complete booking' },
] as const

export type ListingBookingStep = typeof LISTING_BOOKING_STEPS[number]['id']

// Add-on services for listing packages
export interface ListingAddon {
  id: string
  name: string
  description: string
  price: number
  priceType: 'flat' | 'per_unit'
  unit?: string
  popular?: boolean
  category: 'staging' | 'photography' | 'video' | 'delivery'
}

export const LISTING_ADDONS: ListingAddon[] = [
  // Virtual Staging Add-ons
  {
    id: 'extra-staging',
    name: 'Additional Virtual Staging',
    description: 'Stage extra rooms beyond the included package',
    price: 20,
    priceType: 'per_unit',
    unit: 'room',
    category: 'staging',
  },
  {
    id: 'premium-staging',
    name: 'Premium Staging Style',
    description: 'Luxury furniture and decor upgrade for all rooms',
    price: 50,
    priceType: 'flat',
    category: 'staging',
    popular: true,
  },

  // Photography Add-ons
  {
    id: 'extra-twilight',
    name: 'Extra Twilight Photos',
    description: 'Additional virtual twilight conversions',
    price: 25,
    priceType: 'per_unit',
    unit: 'photo',
    category: 'photography',
  },
  {
    id: 'real-twilight',
    name: 'Real Twilight Shoot',
    description: 'On-site twilight photography session',
    price: 150,
    priceType: 'flat',
    category: 'photography',
  },
  {
    id: 'exterior-drone',
    name: 'Extended Aerial Coverage',
    description: 'Additional drone photos and neighborhood aerials',
    price: 75,
    priceType: 'flat',
    category: 'photography',
  },

  // Video Add-ons
  {
    id: 'aerial-video',
    name: 'Aerial Video',
    description: '60-second cinematic drone video',
    price: 150,
    priceType: 'flat',
    category: 'video',
  },
  {
    id: 'social-reel',
    name: 'Social Media Reel',
    description: 'Vertical video optimized for Instagram/TikTok',
    price: 100,
    priceType: 'flat',
    category: 'video',
    popular: true,
  },
  {
    id: 'agent-intro',
    name: 'Agent Introduction',
    description: 'Professional intro video featuring you',
    price: 200,
    priceType: 'flat',
    category: 'video',
  },

  // Delivery Add-ons
  {
    id: 'rush-delivery',
    name: 'Rush Delivery',
    description: 'Same-day delivery (must book before 12pm)',
    price: 75,
    priceType: 'flat',
    category: 'delivery',
    popular: true,
  },
  {
    id: 'next-day',
    name: 'Next Day Delivery',
    description: 'Guaranteed delivery by next business day',
    price: 50,
    priceType: 'flat',
    category: 'delivery',
  },
]

// Booking form data structure
export interface BookingFormData {
  // Step 1: Package selection
  packageKey: string
  sqftTier: SqftTierId

  // Step 2: Add-ons
  addons: Array<{
    id: string
    quantity?: number
  }>

  // Step 3: Property details
  propertyAddress: string
  propertyCity: string
  propertyState: string
  propertyZip: string
  propertySqft?: number
  propertyBeds?: number
  propertyBaths?: number
  accessInstructions?: string

  // Step 4: Scheduling
  scheduledDate?: string
  scheduledTime?: string

  // Step 5: Contact & Payment
  contactName: string
  contactEmail: string
  contactPhone: string
  specialInstructions?: string

  // Agent info (if logged in)
  agentId?: string
}

// Calculate total for booking
export function calculateBookingTotal(data: Partial<BookingFormData>): {
  packagePrice: number
  addonsTotal: number
  subtotal: number
  tax: number
  total: number
  breakdown: Array<{ name: string; price: number; quantity?: number }>
} {
  const breakdown: Array<{ name: string; price: number; quantity?: number }> = []

  // Package price
  let packagePrice = 0
  if (data.packageKey && data.sqftTier) {
    const pkg = LISTING_PACKAGES.find(p => p.key === data.packageKey)
    if (pkg) {
      packagePrice = pkg.pricing[data.sqftTier]
      breakdown.push({ name: `${pkg.name} Package`, price: packagePrice })
    }
  }

  // Add-ons
  let addonsTotal = 0
  if (data.addons) {
    for (const addon of data.addons) {
      const addonConfig = LISTING_ADDONS.find(a => a.id === addon.id)
      if (addonConfig) {
        const quantity = addon.quantity || 1
        const addonPrice = addonConfig.price * quantity
        addonsTotal += addonPrice
        breakdown.push({
          name: addonConfig.name,
          price: addonPrice,
          quantity: addonConfig.priceType === 'per_unit' ? quantity : undefined,
        })
      }
    }
  }

  const subtotal = packagePrice + addonsTotal
  const tax = 0 // Florida has no sales tax on services
  const total = subtotal + tax

  return {
    packagePrice,
    addonsTotal,
    subtotal,
    tax,
    total,
    breakdown,
  }
}

// Availability time slots (simulated)
export interface TimeSlot {
  time: string
  label: string
  available: boolean
}

export const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { time: '08:00', label: '8:00 AM', available: true },
  { time: '09:00', label: '9:00 AM', available: true },
  { time: '10:00', label: '10:00 AM', available: true },
  { time: '11:00', label: '11:00 AM', available: true },
  { time: '12:00', label: '12:00 PM', available: true },
  { time: '13:00', label: '1:00 PM', available: true },
  { time: '14:00', label: '2:00 PM', available: true },
  { time: '15:00', label: '3:00 PM', available: true },
  { time: '16:00', label: '4:00 PM', available: true },
]

// Helper to get package by key
export function getPackageByKey(key: string) {
  return LISTING_PACKAGES.find(p => p.key === key)
}

// Helper to get addon by id
export function getAddonById(id: string) {
  return LISTING_ADDONS.find(a => a.id === id)
}
