import { cookies } from 'next/headers'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { CheckCircle, Camera, Video, Home, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ code: string }>
}

export const metadata: Metadata = {
  title: 'Get 10% Off Your First Shoot | Aerial Shots Media',
  description: 'Professional real estate photography in Central Florida. Use your referral code to save 10% on your first order!',
}

export default async function ReferralLandingPage({ params }: PageProps) {
  const { code } = await params
  const supabase = createAdminClient()

  // Try to find the referring agent
  let referrer = null

  // First try by referral_code
  const { data: agentByCode } = await supabase
    .from('agents')
    .select('id, name, headshot_url')
    .eq('referral_code', code)
    .single()

  if (agentByCode) {
    referrer = agentByCode
  } else {
    // Try by ID prefix
    const { data: agentById } = await supabase
      .from('agents')
      .select('id, name, headshot_url')
      .ilike('id', `${code}%`)
      .single()

    if (agentById) {
      referrer = agentById
    }
  }

  // Set referral cookie (30-day expiry)
  const cookieStore = await cookies()
  cookieStore.set('referral_code', code, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  const services = [
    {
      icon: Camera,
      title: 'Professional Photography',
      description: 'HDR photos that showcase every property beautifully',
    },
    {
      icon: Video,
      title: 'Cinematic Video',
      description: 'Property walkthroughs that engage buyers',
    },
    {
      icon: Home,
      title: '3D Virtual Tours',
      description: 'Immersive Matterport and Zillow 3D experiences',
    },
  ]

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          {/* Referral Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-[#0077ff] px-4 py-2">
            <Gift className="h-5 w-5" />
            <span className="font-medium">Exclusive Referral Offer</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Save <span className="text-[#0077ff]">10%</span> on Your First Shoot
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-xl text-[#a1a1a6]">
            Professional real estate photography and video services in Central Florida.
            Book your first shoot and save with your exclusive referral discount.
          </p>

          {referrer && (
            <div className="mt-8 flex items-center justify-center gap-3">
              {referrer.headshot_url && (
                <img
                  src={referrer.headshot_url}
                  alt={referrer.name}
                  className="h-12 w-12 rounded-full border-2 border-white/20"
                />
              )}
              <p className="text-[#a1a1a6]">
                Referred by <span className="font-medium text-white">{referrer.name}</span>
              </p>
            </div>
          )}

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="text-lg"
              asChild
            >
              <a
                href="https://www.aerialshots.media/#schedule"
                target="_blank"
                rel="noopener noreferrer"
              >
                Book Your Shoot
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg"
              asChild
            >
              <a
                href="https://www.aerialshots.media"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Our Work
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-[22px] font-semibold text-white">
            What We Offer
          </h2>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {services.map((service) => (
              <div key={service.title} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0077ff]/20 border border-[#0077ff]/30">
                  <service.icon className="h-8 w-8 text-[#0077ff]" />
                </div>
                <h3 className="mt-4 font-semibold text-white">
                  {service.title}
                </h3>
                <p className="mt-2 text-[13px] text-[#a1a1a6]">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[#0a0a0a] py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-[22px] font-semibold text-white">
            How It Works
          </h2>

          <div className="mt-10 space-y-4">
            {[
              {
                step: 1,
                title: 'Book Your Shoot',
                description: 'Choose your services and schedule a time that works for you',
              },
              {
                step: 2,
                title: 'Discount Applied',
                description: 'Your 10% referral discount is automatically applied at checkout',
              },
              {
                step: 3,
                title: 'Same-Day Delivery',
                description: 'Get your professional media delivered within 24 hours',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-4 rounded-xl bg-[#1c1c1e] border border-white/[0.08] p-6"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#0077ff] font-bold text-white">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-[#a1a1a6]">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-[22px] font-semibold text-white">
            Why Agents Choose Us
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              'Same-day turnaround on most shoots',
              'Professional drone photography included',
              'Unlimited revisions',
              'MLS-ready and social media optimized',
              'Easy online booking and delivery',
              'Serving all of Central Florida',
            ].map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4"
              >
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                <span className="text-[#a1a1a6]">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#1c1c1e] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-[28px] font-semibold">Ready to Get Started?</h2>
          <p className="mx-auto mt-4 max-w-xl text-[#a1a1a6]">
            Your 10% discount is ready to use. Book your first shoot today and
            see why agents love working with Aerial Shots Media.
          </p>
          <Button
            size="lg"
            className="mt-8 text-lg"
            asChild
          >
            <a
              href="https://www.aerialshots.media/#schedule"
              target="_blank"
              rel="noopener noreferrer"
            >
              Claim Your 10% Discount
            </a>
          </Button>
          <p className="mt-4 text-[13px] text-[#636366]">
            Referral code: <code className="rounded-lg bg-black/50 border border-white/[0.08] px-2 py-1">{code}</code>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-black">
        <div className="mx-auto max-w-4xl px-4 py-8 text-center sm:px-6 lg:px-8">
          <p className="text-[13px] text-[#a1a1a6]">
            Aerial Shots Media - Central Florida's Premier Real Estate Photography
          </p>
          <p className="mt-2 text-[11px] text-[#636366]">
            Orlando | Tampa | Kissimmee | Daytona Beach
          </p>
        </div>
      </footer>
    </div>
  )
}
