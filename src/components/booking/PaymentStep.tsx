'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Lock, CreditCard, AlertCircle, Loader2, Calendar, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/pricing/config'
import { CouponCodeInput } from './CouponCodeInput'
import { LoyaltyPointsSelector, useLoyaltyPoints } from './LoyaltyPointsSelector'
import { useBookingStore } from '@/stores/useBookingStore'

// Load Stripe outside of component to avoid recreating on each render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface ContactData {
  name: string
  email: string
  phone: string
  specialInstructions?: string
}

interface PaymentStepProps {
  contactData: ContactData
  onContactChange: (data: Partial<ContactData>) => void
  total: number
  breakdown: Array<{ name: string; price: number; quantity?: number }>
  onSubmit: (paymentIntentId: string) => Promise<void>
  isSubmitting: boolean
  showDiscounts?: boolean
}

export function PaymentStep({
  contactData,
  onContactChange,
  total,
  breakdown,
  onSubmit,
  isSubmitting,
  showDiscounts = true,
}: PaymentStepProps) {
  const { formData, applyCoupon, removeCoupon, setLoyaltyPoints, pricing } = useBookingStore()
  const { points: loyaltyPoints, isLoading: loyaltyLoading } = useLoyaltyPoints()

  // Apply coupon discount to total
  const couponDiscount = pricing.couponDiscount || 0
  const loyaltyDiscount = formData.loyaltyPointsValue || 0
  const finalTotal = Math.max(0, total - couponDiscount - loyaltyDiscount)

  const handleCouponApply = (code: string, discount: number, type: 'percent' | 'fixed') => {
    applyCoupon(code, discount, type)
  }

  const handleCouponRemove = () => {
    removeCoupon()
  }

  const handleLoyaltyChange = (points: number, value: number) => {
    setLoyaltyPoints(points, value)
  }
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingIntent, setIsLoadingIntent] = useState(false)

  // Create payment intent when we have enough info (with finalTotal)
  useEffect(() => {
    const createPaymentIntent = async () => {
      if (!contactData.email || !contactData.name || finalTotal <= 0) return
      if (clientSecret) return // Don't recreate if we already have one

      setIsLoadingIntent(true)
      setError(null)

      try {
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: finalTotal,
            email: contactData.email,
            name: contactData.name,
            couponCode: formData.couponCode,
            loyaltyPoints: formData.loyaltyPointsToRedeem,
          }),
        })

        const data = await response.json()

        if (data.error) {
          setError(data.error)
        } else {
          setClientSecret(data.clientSecret)
          setPaymentIntentId(data.paymentIntentId)
        }
      } catch (err) {
        setError('Failed to initialize payment. Please try again.')
      } finally {
        setIsLoadingIntent(false)
      }
    }

    const timer = setTimeout(createPaymentIntent, 500)
    return () => clearTimeout(timer)
  }, [contactData.email, contactData.name, finalTotal, clientSecret, formData.couponCode, formData.loyaltyPointsToRedeem])

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-white mb-2">
          Complete Your Booking
        </h3>
        <p className="text-neutral-400">
          Enter your contact details and payment information.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Contact & Payment Form */}
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-white flex items-center gap-2">
              Contact Information
            </h4>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={contactData.name}
                onChange={(e) => onContactChange({ name: e.target.value })}
                placeholder="John Smith"
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={contactData.email}
                onChange={(e) => onContactChange({ email: e.target.value })}
                placeholder="john@example.com"
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Phone *
              </label>
              <input
                type="tel"
                value={contactData.phone}
                onChange={(e) => onContactChange({ phone: e.target.value })}
                placeholder="(407) 555-1234"
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Special Instructions
              </label>
              <textarea
                value={contactData.specialInstructions || ''}
                onChange={(e) => onContactChange({ specialInstructions: e.target.value })}
                placeholder="Any special requests or notes for your shoot..."
                rows={3}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Discounts Section */}
          {showDiscounts && (
            <div className="space-y-4 pt-4 border-t border-neutral-800">
              <h4 className="font-medium text-white">Discounts & Rewards</h4>

              {/* Coupon Code */}
              <CouponCodeInput
                subtotal={total}
                onApply={handleCouponApply}
                onRemove={handleCouponRemove}
              />

              {/* Loyalty Points */}
              {!loyaltyLoading && loyaltyPoints > 0 && (
                <LoyaltyPointsSelector
                  maxPoints={loyaltyPoints}
                  pointsValue={0.01}
                  orderTotal={total - couponDiscount}
                  onPointsChange={handleLoyaltyChange}
                />
              )}
            </div>
          )}

          {/* Payment Section */}
          <div className="space-y-4 pt-4 border-t border-neutral-800">
            <h4 className="font-medium text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Details
            </h4>

            {isLoadingIntent ? (
              <div className="p-8 bg-neutral-900 rounded-xl border border-neutral-800 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
                <span className="ml-2 text-neutral-500">Loading payment form...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">Payment Error</p>
                  <p className="text-red-400/80 text-sm mt-1">{error}</p>
                </div>
              </div>
            ) : clientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#3b82f6',
                      colorBackground: '#171717',
                      colorText: '#ffffff',
                      colorDanger: '#ef4444',
                      borderRadius: '8px',
                    },
                    rules: {
                      '.Input': {
                        backgroundColor: '#262626',
                        border: '1px solid #404040',
                      },
                    },
                  },
                }}
              >
                <CheckoutForm
                  onSubmit={onSubmit}
                  isSubmitting={isSubmitting}
                  total={finalTotal}
                  paymentIntentId={paymentIntentId!}
                />
              </Elements>
            ) : (
              <div className="p-8 bg-neutral-900 rounded-xl border border-neutral-800 text-center">
                <p className="text-neutral-500">
                  Enter your name and email above to continue to payment
                </p>
              </div>
            )}

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-sm text-neutral-500">
              <Lock className="w-4 h-4" />
              <span>Payments secured by Stripe</span>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 sticky top-24">
            <h4 className="font-medium text-white mb-4">Order Summary</h4>

            <div className="space-y-3 mb-6">
              {breakdown.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-neutral-400">
                    {item.name}
                    {item.quantity && item.quantity > 1 && (
                      <span className="text-neutral-500"> x{item.quantity}</span>
                    )}
                  </span>
                  <span className="text-white">{formatCurrency(item.price)}</span>
                </div>
              ))}

              {/* Coupon discount */}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-400">
                    Coupon ({formData.couponCode})
                  </span>
                  <span className="text-green-400">-{formatCurrency(couponDiscount)}</span>
                </div>
              )}

              {/* Loyalty points discount */}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-400">
                    Loyalty Points ({formData.loyaltyPointsToRedeem})
                  </span>
                  <span className="text-amber-400">-{formatCurrency(loyaltyDiscount)}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-neutral-800">
              {(couponDiscount > 0 || loyaltyDiscount > 0) && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-500">Subtotal</span>
                  <span className="text-neutral-500 line-through">
                    {formatCurrency(total)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium text-white">Total</span>
                <span className="text-2xl font-bold text-white">
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-neutral-800/50 rounded-lg">
              <p className="text-sm text-neutral-400">
                <strong className="text-white">24-48 Hour Delivery</strong>
                <br />
                Your photos and media will be delivered within 24-48 hours after
                the shoot, often same-day for morning appointments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Checkout form component (inside Stripe Elements)
function CheckoutForm({
  onSubmit,
  isSubmitting,
  total,
  paymentIntentId,
}: {
  onSubmit: (paymentIntentId: string) => Promise<void>
  isSubmitting: boolean
  total: number
  paymentIntentId: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) return

    setIsProcessing(true)
    setError(null)

    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setError(submitError.message || 'Payment failed')
        setIsProcessing(false)
        return
      }

      // Call parent submit handler which will create the order with payment intent ID
      await onSubmit(paymentIntentId)

      // Confirm the payment
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/book/success`,
        },
      })

      if (confirmError) {
        setError(confirmError.message || 'Payment failed')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing || isSubmitting}
        className={cn(
          'w-full py-4 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2',
          isProcessing || isSubmitting
            ? 'bg-neutral-700 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        )}
      >
        {isProcessing || isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Pay {formatCurrency(total)} & Book Shoot
          </>
        )}
      </button>
    </form>
  )
}
