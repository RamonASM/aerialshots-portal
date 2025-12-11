import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Camera, Video, Plane, Home, Users, Star, ArrowRight, Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/50 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Camera className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold">
              Aerial Shots <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Media</span>
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/admin" className="text-sm text-slate-400 hover:text-white transition-colors">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 py-24 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/50 px-4 py-1.5 text-sm text-slate-300 backdrop-blur-sm mb-8">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span>Trusted by 500+ Central Florida Agents</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              <span className="block text-white">Real Estate Media</span>
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                Delivered Different
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-400 leading-relaxed mb-10">
              Professional photography, video, drone, and virtual staging for Central Florida real estate.
              Your media, organized by use case and ready to convert.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white border-0 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105"
                asChild
              >
                <Link href="/dashboard">
                  Agent Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white hover:border-slate-600 transition-all duration-300"
                asChild
              >
                <a href="https://aerialshots.media" target="_blank" rel="noopener noreferrer">
                  Book a Shoot
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-16 border-y border-slate-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '500+', label: 'Active Agents', color: 'from-blue-500 to-cyan-400' },
              { value: '2.5M+', label: 'Assets Managed', color: 'from-cyan-500 to-teal-400' },
              { value: '5,000+', label: 'Listings Shot', color: 'from-purple-500 to-pink-400' },
              { value: '4.9★', label: 'Average Rating', color: 'from-amber-500 to-orange-400' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className={`text-3xl sm:text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-1`}>
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need to <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Close Deals</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              From capture to conversion, we handle your media so you can focus on what matters most.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 - Large */}
            <div className="lg:col-span-2 group relative rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-slate-800/30 p-8 backdrop-blur-sm hover:border-slate-700/80 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-500/20">
                  <Camera className="h-7 w-7 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Delivery Pages</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Media organized by use case: MLS Ready, Social Feed, Stories, Print, and Video.
                    Download exactly what you need, when you need it, with contextual tips for maximum impact.
                  </p>
                </div>
              </div>
              <div className="absolute top-4 right-4 text-xs font-medium text-slate-600 uppercase tracking-wider">Featured</div>
            </div>

            {/* Feature 2 */}
            <div className="group relative rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-slate-800/30 p-8 backdrop-blur-sm hover:border-slate-700/80 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center border border-cyan-500/20 mb-4">
                <Home className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Lifestyle Pages</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Beautiful buyer-facing pages with neighborhood info, local events, Walk Scores, and lead capture.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-slate-800/30 p-8 backdrop-blur-sm hover:border-slate-700/80 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/20 mb-4">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Agent Portfolio</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Public profile with your listings, stats, and integrated lead capture to build your brand.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group relative rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-slate-800/30 p-8 backdrop-blur-sm hover:border-slate-700/80 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/20 mb-4">
                <Star className="h-6 w-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Referral Program</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Earn credits for every referral. Redeem for AI tools, discounts, or free shoots.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group relative rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-slate-800/30 p-8 backdrop-blur-sm hover:border-slate-700/80 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/20 mb-4">
                <Video className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Video & Drone</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Cinematic listing videos and FAA-certified drone footage to make your properties stand out.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 to-slate-800/50 p-12 sm:p-16 text-center overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]" />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Elevate Your Listings?
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto mb-8">
                Join 500+ Central Florida agents who trust Aerial Shots Media for their real estate media needs.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white border-0 shadow-lg shadow-blue-500/25"
                  asChild
                >
                  <a href="https://aerialshots.media" target="_blank" rel="noopener noreferrer">
                    Schedule Your First Shoot
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-slate-300 hover:text-white hover:bg-slate-800/50"
                  asChild
                >
                  <Link href="/help">
                    View Pricing
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <Camera className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm text-slate-500">
                &copy; {new Date().getFullYear()} Aerial Shots Media
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <Link href="/help" className="hover:text-slate-300 transition-colors">Help Center</Link>
              <a href="https://aerialshots.media" className="hover:text-slate-300 transition-colors">Main Site</a>
              <span>Central Florida</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
