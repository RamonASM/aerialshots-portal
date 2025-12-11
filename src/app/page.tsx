import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">
              Aerial Shots <span className="text-[#ff4533]">Media</span>
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-neutral-400 hover:text-white">
              Agent Dashboard
            </Link>
            <Link href="/admin" className="text-sm text-neutral-400 hover:text-white">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-32">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Real Estate Media
            <br />
            <span className="text-[#ff4533]">Delivered Different</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-400">
            Professional photography, video, drone, and virtual staging for Central Florida real estate agents.
            Your media, organized by use case.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" className="bg-[#ff4533] hover:bg-[#e63d2e]" asChild>
              <Link href="/dashboard">Agent Dashboard</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-neutral-700 text-white hover:bg-neutral-800" asChild>
              <a href="https://aerialshots.media" target="_blank" rel="noopener noreferrer">
                Book a Shoot
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-800 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border border-neutral-800 p-6">
              <h3 className="text-lg font-semibold text-[#ff4533]">Delivery Pages</h3>
              <p className="mt-2 text-neutral-400">
                Media organized by use case: MLS Ready, Social Feed, Stories, Print, and Video.
              </p>
            </div>
            <div className="rounded-lg border border-neutral-800 p-6">
              <h3 className="text-lg font-semibold text-[#ff4533]">Lifestyle Pages</h3>
              <p className="mt-2 text-neutral-400">
                Beautiful buyer-facing pages with neighborhood info, events, and Walk Scores.
              </p>
            </div>
            <div className="rounded-lg border border-neutral-800 p-6">
              <h3 className="text-lg font-semibold text-[#ff4533]">Agent Portfolio</h3>
              <p className="mt-2 text-neutral-400">
                Public profile with your listings, stats, and lead capture.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-neutral-500">
          &copy; {new Date().getFullYear()} Aerial Shots Media. Central Florida Real Estate Photography.
        </div>
      </footer>
    </div>
  )
}
