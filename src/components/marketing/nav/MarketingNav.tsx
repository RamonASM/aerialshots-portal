'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronDown, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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
            ? 'bg-black/80 backdrop-blur-xl border-b border-white/[0.08]'
            : 'bg-transparent'
        )}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group"
          >
            <Image
              src="/asm-logo-light.png"
              alt="Aerial Shots Media"
              width={40}
              height={40}
              className="transition-opacity group-hover:opacity-80"
            />
            <span className="hidden sm:block text-[15px] font-medium text-[#B5ADA6]">
              Aerial Shots Media
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
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
                      'flex items-center gap-1 px-4 py-2 text-[14px] font-medium transition-colors',
                      pathname.startsWith('/services')
                        ? 'text-white'
                        : 'text-[#B5ADA6] hover:text-white'
                    )}
                  >
                    {item.name}
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform',
                        isServicesOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {/* Services Dropdown */}
                  <div
                    className={cn(
                      'absolute top-full left-0 pt-2 transition-all duration-200',
                      isServicesOpen
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 -translate-y-2 pointer-events-none'
                    )}
                  >
                    <div className="w-72 bg-[#0a0a0a] border border-white/[0.06] p-2 shadow-2xl">
                      {servicesDropdown.map((service) => (
                        <Link
                          key={service.name}
                          href={service.href}
                          className="flex flex-col gap-0.5 px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
                        >
                          <span className="text-[14px] font-medium text-white">
                            {service.name}
                          </span>
                          <span className="text-[12px] text-[#8A847F]">
                            {service.description}
                          </span>
                        </Link>
                      ))}
                      <div className="mt-1 pt-1 border-t border-white/[0.06]">
                        <Link
                          href="/services"
                          className="flex items-center justify-between px-3 py-2.5 text-[14px] font-medium text-[#A29991] transition-colors hover:bg-white/[0.04] hover:text-white"
                        >
                          View all services
                          <ArrowRight className="h-3.5 w-3.5" />
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
                    'px-4 py-2 text-[14px] font-medium transition-colors',
                    pathname === item.href
                      ? 'text-white'
                      : 'text-[#B5ADA6] hover:text-white'
                  )}
                >
                  {item.name}
                </Link>
              )
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/sign-in">
              <Button
                variant="ghost"
                className="text-[14px] text-[#B5ADA6] hover:text-white"
              >
                Agent Login
              </Button>
            </Link>
            <Link href="/book">
              <Button
                className="bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[14px] font-medium px-5"
              >
                Book Now
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 -mr-2 text-white"
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

      {/* Mobile Menu */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden transition-all duration-300',
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Menu Panel */}
        <div
          className={cn(
            'absolute top-16 left-0 right-0 max-h-[calc(100vh-4rem)] overflow-y-auto bg-[#0a0a0a] border-b border-white/[0.06] transition-transform duration-300',
            isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'
          )}
        >
          <nav className="p-4 space-y-1">
            {/* Services with submenu */}
            <div className="pb-2 mb-2 border-b border-white/[0.06]">
              <span className="block px-4 py-2 text-[12px] font-medium text-[#A29991] uppercase tracking-wider">
                Services
              </span>
              {servicesDropdown.map((service) => (
                <Link
                  key={service.name}
                  href={service.href}
                  className="flex items-center justify-between px-4 py-3 text-[15px] text-white hover:bg-white/[0.04]"
                >
                  {service.name}
                  <ArrowRight className="h-4 w-4 text-[#8A847F]" />
                </Link>
              ))}
            </div>

            {/* Other nav items */}
            {navigation.filter(item => item.name !== 'Services').map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-4 py-3 text-[15px]',
                  pathname === item.href
                    ? 'text-white bg-white/[0.04]'
                    : 'text-[#B5ADA6] hover:text-white hover:bg-white/[0.04]'
                )}
              >
                {item.name}
                <ArrowRight className="h-4 w-4 text-[#8A847F]" />
              </Link>
            ))}

            {/* CTA Buttons */}
            <div className="pt-4 mt-4 border-t border-white/[0.06] space-y-3">
              <Link href="/sign-in" className="block">
                <Button
                  variant="outline"
                  className="w-full h-12 text-[15px] border-white/[0.12] hover:bg-white/[0.04]"
                >
                  Agent Login
                </Button>
              </Link>
              <Link href="/book" className="block">
                <Button
                  className="w-full h-12 bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[15px] font-medium"
                >
                  Book Now
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </>
  )
}
