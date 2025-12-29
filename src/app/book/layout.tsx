import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book Real Estate Photography | Aerial Shots Media',
  description: 'Book professional real estate photography, drone shots, 3D tours, and video in Central Florida. Get an instant quote and schedule your shoot online.',
  openGraph: {
    title: 'Book Real Estate Photography | Aerial Shots Media',
    description: 'Professional real estate media services in Central Florida. Photos, video, drone, 3D tours, and more.',
    type: 'website',
  },
}

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="https://aerialshots.media" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0077ff] to-[#00c6ff] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-white font-semibold text-lg">Aerial Shots Media</span>
            </a>
            <div className="flex items-center gap-4">
              <a
                href="tel:+14074551985"
                className="text-[#a1a1a6] hover:text-white transition-colors text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="hidden sm:inline">(407) 455-1985</span>
              </a>
              <a
                href="https://app.aerialshots.media/login"
                className="text-sm text-[#0077ff] hover:text-[#3395ff] transition-colors font-medium"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#0a0a0a] py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[#8e8e93] text-sm">
              &copy; {new Date().getFullYear()} Aerial Shots Media. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="https://aerialshots.media/terms" className="text-[#8e8e93] hover:text-white text-sm transition-colors">
                Terms
              </a>
              <a href="https://aerialshots.media/privacy" className="text-[#8e8e93] hover:text-white text-sm transition-colors">
                Privacy
              </a>
              <a href="mailto:hello@aerialshots.media" className="text-[#8e8e93] hover:text-white text-sm transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
