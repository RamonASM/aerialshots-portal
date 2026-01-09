'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronDown, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Services', href: '/services' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Portfolio', href: '/portfolio' },
  { name: 'About', href: '/about' },
  { name: 'Blog', href: '/blog' },
]

const servicesDropdown = [
  { name: 'Photography', href: '/services/photography', description: 'HDR real estate photography' },
  { name: 'Drone & Aerial', href: '/services/drone', description: 'Licensed FAA Part 107' },
  { name: 'Video Tours', href: '/services/video', description: 'Cinematic property tours' },
  { name: '3D Tours', href: '/services/3d-tours', description: 'Matterport & Zillow 3D' },
  { name: 'Virtual Staging', href: '/services/virtual-staging', description: 'AI-powered staging' },
  { name: 'Floor Plans', href: '/services/floor-plans', description: '2D & 3D floor plans' },
]

export function MarketingNav() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isServicesOpen, setIsServicesOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-[#0A0A0B]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-lg shadow-black/20'
            : 'bg-transparent'
        )}
      >
        <nav className="mx-auto flex h-16 lg:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group flex-shrink-0"
          >
            <Image
              src="/asm-logo-light.png"
              alt="Aerial Shots Media"
              width={40}
              height={40}
              className="transition-all group-hover:scale-105"
            />
            <span className="hidden sm:block text-[15px] font-semibold text-white font-marketing">
              Aerial Shots
            </span>
          </Link>

          {/* Desktop Navigation - Centered */}
          <div className="hidden lg:flex items-center justify-center gap-1 flex-1 px-8">
            {navigation.map((item) => (
              item.name === 'Services' ? (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => setIsServicesOpen(true)}
                  onMouseLeave={() => setIsServicesOpen(false)}
                >
                  <button
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 text-[14px] font-medium transition-colors font-marketing-body',
                      pathname.startsWith('/services')
                        ? 'text-white'
                        : 'text-[#A1A1AA] hover:text-white'
                    )}
                  >
                    {item.name}
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform duration-200',
                        isServicesOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {/* Services Dropdown - Glass effect */}
                  <div
                    className={cn(
                      'absolute top-full left-1/2 -translate-x-1/2 pt-3 transition-all duration-200',
                      isServicesOpen
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 -translate-y-2 pointer-events-none'
                    )}
                  >
                    <div className="w-80 bg-[#141416]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl p-2 shadow-2xl shadow-black/50">
                      {servicesDropdown.map((service) => (
                        <Link
                          key={service.name}
                          href={service.href}
                          className="flex flex-col gap-0.5 px-4 py-3 rounded-lg transition-all hover:bg-white/[0.06] group/item"
                        >
                          <span className="text-[14px] font-medium text-white group-hover/item:text-[#00D4FF] transition-colors font-marketing">
                            {service.name}
                          </span>
                          <span className="text-[12px] text-[#A1A1AA]">
                            {service.description}
                          </span>
                        </Link>
                      ))}
                      <div className="mt-1 pt-1 border-t border-white/[0.06]">
                        <Link
                          href="/services"
                          className="flex items-center justify-between px-4 py-3 rounded-lg text-[14px] font-medium text-[#00D4FF] transition-all hover:bg-white/[0.06] font-marketing"
                        >
                          View all services
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'px-4 py-2 text-[14px] font-medium transition-colors font-marketing-body',
                    pathname === item.href
                      ? 'text-white'
                      : 'text-[#A1A1AA] hover:text-white'
                  )}
                >
                  {item.name}
                </Link>
              )
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <Link href="/sign-in">
              <button
                className="px-4 py-2 text-[14px] font-medium text-[#A1A1AA] hover:text-white transition-colors font-marketing-body"
              >
                Login
              </button>
            </Link>
            <Link href="/book">
              <button
                className="btn-marketing-primary font-marketing"
              >
                Book Now
              </button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 -mr-2 text-white hover:text-[#00D4FF] transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </nav>
      </header>

      {/* Mobile Menu - Full Screen Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden transition-all duration-300',
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Full-screen backdrop */}
        <div
          className={cn(
            'absolute inset-0 bg-[#0A0A0B]/98 backdrop-blur-xl transition-opacity duration-300',
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Menu Content */}
        <div
          className={cn(
            'relative h-full pt-20 pb-8 px-6 overflow-y-auto transition-transform duration-300',
            isMobileMenuOpen ? 'translate-y-0' : '-translate-y-8'
          )}
        >
          <nav className="space-y-1">
            {/* Services Section */}
            <div className="pb-4 mb-4 border-b border-white/[0.08]">
              <span className="block px-2 py-3 text-[12px] font-semibold text-[#00D4FF] uppercase tracking-wider font-marketing">
                Services
              </span>
              {servicesDropdown.map((service) => (
                <Link
                  key={service.name}
                  href={service.href}
                  className="flex items-center justify-between px-2 py-4 text-[18px] font-medium text-white hover:text-[#00D4FF] transition-colors font-marketing"
                >
                  {service.name}
                  <ArrowRight className="h-5 w-5 text-[#A1A1AA]" />
                </Link>
              ))}
            </div>

            {/* Other nav items */}
            {navigation.filter(item => item.name !== 'Services').map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-2 py-4 text-[18px] font-medium transition-colors font-marketing',
                  pathname === item.href
                    ? 'text-[#00D4FF]'
                    : 'text-white hover:text-[#00D4FF]'
                )}
              >
                {item.name}
                <ArrowRight className="h-5 w-5 text-[#A1A1AA]" />
              </Link>
            ))}

            {/* CTA Buttons */}
            <div className="pt-8 mt-4 space-y-4">
              <Link href="/sign-in" className="block">
                <button
                  className="w-full h-14 text-[16px] font-medium border border-white/[0.15] rounded-xl text-white hover:bg-white/[0.05] transition-colors font-marketing"
                >
                  Agent Login
                </button>
              </Link>
              <Link href="/book" className="block">
                <button
                  className="w-full h-14 bg-[#00D4FF] hover:bg-[#33DDFF] text-black text-[16px] font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-[#00D4FF]/30 font-marketing"
                >
                  Book Your Shoot
                </button>
              </Link>
            </div>

            {/* Contact info at bottom */}
            <div className="pt-8 mt-8 border-t border-white/[0.08]">
              <p className="text-[14px] text-[#A1A1AA] font-marketing-body">
                Questions? Call us
              </p>
              <a
                href="tel:+14076926227"
                className="text-[20px] font-semibold text-white hover:text-[#00D4FF] transition-colors font-marketing"
              >
                (407) 692-6227
              </a>
            </div>
          </nav>
        </div>
      </div>
    </>
  )
}
