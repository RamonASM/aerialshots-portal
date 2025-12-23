import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Camera, Video, Home, Users, Star, ArrowRight, Sparkles, Play } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Subtle Background Gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0077ff]/5 via-transparent to-transparent" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.08] bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-[#0077ff] flex items-center justify-center">
              <Camera className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">
              Aerial Shots Media
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <a href="https://aerialshots.media" target="_blank" rel="noopener noreferrer">
                Book a Shoot
              </a>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard">
                Agent Portal
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="mx-auto max-w-4xl px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full glass-light px-4 py-2 text-sm text-[#a1a1a6] mb-8">
            <Sparkles className="h-4 w-4 text-[#0077ff]" />
            <span>Trusted by 500+ Central Florida Agents</span>
          </div>

          {/* Headline */}
          <h1 className="text-[44px] sm:text-[56px] lg:text-[72px] font-semibold tracking-[-0.02em] leading-[1.05] mb-6">
            <span className="block">Real Estate Media</span>
            <span className="block text-gradient-blue">Delivered Different</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-xl text-[17px] sm:text-lg text-[#a1a1a6] leading-relaxed mb-10">
            Professional photography, video, drone, and virtual staging.
            Your media, organized by use case and ready to convert.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/dashboard">
                Open Agent Portal
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="https://aerialshots.media" target="_blank" rel="noopener noreferrer">
                <Play className="mr-2 h-4 w-4" />
                See Our Work
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-white/[0.08]">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '500+', label: 'Active Agents' },
              { value: '2.5M+', label: 'Assets Managed' },
              { value: '5,000+', label: 'Listings Shot' },
              { value: '4.9', label: 'Average Rating', suffix: '★' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-white mb-1">
                  {stat.value}{stat.suffix && <span className="text-[#0077ff]">{stat.suffix}</span>}
                </div>
                <div className="text-[13px] text-[#636366] uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-[34px] sm:text-[44px] font-semibold tracking-[-0.02em] mb-4">
              Everything You Need
            </h2>
            <p className="text-[#a1a1a6] text-[17px] max-w-lg mx-auto">
              From capture to conversion, we handle your media so you can focus on closing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Feature 1 - Delivery Pages (Large) */}
            <div className="lg:col-span-2 group glass glass-hover rounded-2xl p-8 transition-all duration-200">
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-[#0077ff]/10 flex items-center justify-center">
                  <Camera className="h-6 w-6 text-[#0077ff]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">Delivery Pages</h3>
                    <span className="text-[11px] font-medium text-[#0077ff] uppercase tracking-wider bg-[#0077ff]/10 px-2 py-0.5 rounded-full">
                      Featured
                    </span>
                  </div>
                  <p className="text-[#a1a1a6] text-[15px] leading-relaxed">
                    Media organized by use case: MLS Ready, Social Feed, Stories, Print, and Video.
                    Download exactly what you need with contextual tips for maximum impact.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2 - Lifestyle Pages */}
            <div className="group glass glass-hover rounded-2xl p-6 transition-all duration-200">
              <div className="h-11 w-11 rounded-xl bg-[#0077ff]/10 flex items-center justify-center mb-4">
                <Home className="h-5 w-5 text-[#0077ff]" />
              </div>
              <h3 className="text-[15px] font-semibold mb-2">Property Websites</h3>
              <p className="text-[#a1a1a6] text-[13px] leading-relaxed">
                Beautiful buyer-facing pages with neighborhood info, local events, and lead capture.
              </p>
            </div>

            {/* Feature 3 - Agent Portfolio */}
            <div className="group glass glass-hover rounded-2xl p-6 transition-all duration-200">
              <div className="h-11 w-11 rounded-xl bg-[#0077ff]/10 flex items-center justify-center mb-4">
                <Users className="h-5 w-5 text-[#0077ff]" />
              </div>
              <h3 className="text-[15px] font-semibold mb-2">Agent Portfolio</h3>
              <p className="text-[#a1a1a6] text-[13px] leading-relaxed">
                Public profile with your listings, stats, and integrated lead capture.
              </p>
            </div>

            {/* Feature 4 - Referral Program */}
            <div className="group glass glass-hover rounded-2xl p-6 transition-all duration-200">
              <div className="h-11 w-11 rounded-xl bg-[#0077ff]/10 flex items-center justify-center mb-4">
                <Star className="h-5 w-5 text-[#0077ff]" />
              </div>
              <h3 className="text-[15px] font-semibold mb-2">Referral Program</h3>
              <p className="text-[#a1a1a6] text-[13px] leading-relaxed">
                Earn credits for referrals. Redeem for AI tools, discounts, or free shoots.
              </p>
            </div>

            {/* Feature 5 - Video & Drone */}
            <div className="group glass glass-hover rounded-2xl p-6 transition-all duration-200">
              <div className="h-11 w-11 rounded-xl bg-[#0077ff]/10 flex items-center justify-center mb-4">
                <Video className="h-5 w-5 text-[#0077ff]" />
              </div>
              <h3 className="text-[15px] font-semibold mb-2">Video & Drone</h3>
              <p className="text-[#a1a1a6] text-[13px] leading-relaxed">
                Cinematic listing videos and FAA-certified drone footage that stands out.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="relative glass rounded-3xl p-12 sm:p-16 text-center overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0077ff]/5 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.02em] mb-4">
                Ready to Elevate Your Listings?
              </h2>
              <p className="text-[#a1a1a6] text-[17px] max-w-md mx-auto mb-8">
                Join 500+ Central Florida agents who trust us for their real estate media.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" asChild>
                  <a href="https://aerialshots.media" target="_blank" rel="noopener noreferrer">
                    Schedule Your First Shoot
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="ghost" asChild>
                  <a href="https://aerialshots.media/pricing" target="_blank" rel="noopener noreferrer">
                    View Pricing
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-md bg-[#0077ff] flex items-center justify-center">
                <Camera className="h-2.5 w-2.5 text-white" />
              </div>
              <span className="text-[13px] text-[#636366]">
                © {new Date().getFullYear()} Aerial Shots Media
              </span>
            </div>
            <div className="flex items-center gap-6 text-[13px] text-[#636366]">
              <a href="https://aerialshots.media" className="hover:text-white transition-colors">
                Main Site
              </a>
              <Link href="/admin" className="hover:text-white transition-colors">
                Team
              </Link>
              <span>Central Florida</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
