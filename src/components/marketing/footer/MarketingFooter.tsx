import Link from 'next/link'
import { Mail, Phone, MapPin, Instagram, Facebook, Linkedin } from 'lucide-react'

const footerLinks = {
  services: [
    { name: 'Photography', href: '/services/photography' },
    { name: 'Drone & Aerial', href: '/services/drone' },
    { name: 'Video Tours', href: '/services/video' },
    { name: '3D Tours', href: '/services/3d-tours' },
    { name: 'Virtual Staging', href: '/services/virtual-staging' },
    { name: 'Floor Plans', href: '/services/floor-plans' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Portfolio', href: '/portfolio' },
    { name: 'Blog', href: '/blog' },
    { name: 'Careers', href: '/careers' },
    { name: 'Contact', href: '/contact' },
  ],
  resources: [
    { name: 'Pre-Shoot Checklist', href: '/checklist' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'FAQs', href: '/faqs' },
    { name: 'Agent Portal', href: '/sign-in' },
    { name: 'Book Now', href: '/book' },
  ],
  legal: [
    { name: 'Terms of Service', href: '/legal/terms' },
    { name: 'Privacy Policy', href: '/legal/privacy' },
    { name: 'Copyright', href: '/legal/copyright' },
  ],
}

const socialLinks = [
  { name: 'Instagram', href: 'https://instagram.com/aerialshotsmedia', icon: Instagram },
  { name: 'Facebook', href: 'https://facebook.com/aerialshotsmedia', icon: Facebook },
  { name: 'LinkedIn', href: 'https://linkedin.com/company/aerialshotsmedia', icon: Linkedin },
]

export function MarketingFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#0a0a0a] border-t border-white/[0.08]">
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="text-xl font-bold tracking-tight text-white transition-opacity group-hover:opacity-80">
                ASM
              </span>
              <span className="text-[15px] font-medium text-[#a1a1a6]">
                Aerial Shots Media
              </span>
            </Link>

            <p className="mt-4 text-[14px] text-[#8e8e93] leading-relaxed max-w-sm">
              Central Florida&apos;s premier real estate media company. Professional photography,
              drone, video, 3D tours, and virtual staging for top-producing agents.
            </p>

            {/* Contact Info */}
            <div className="mt-6 space-y-3">
              <a
                href="mailto:hello@aerialshots.media"
                className="flex items-center gap-2.5 text-[14px] text-[#a1a1a6] hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4 text-white/50" />
                hello@aerialshots.media
              </a>
              <a
                href="tel:+14075551234"
                className="flex items-center gap-2.5 text-[14px] text-[#a1a1a6] hover:text-white transition-colors"
              >
                <Phone className="h-4 w-4 text-white/50" />
                (407) 555-1234
              </a>
              <div className="flex items-center gap-2.5 text-[14px] text-[#8e8e93]">
                <MapPin className="h-4 w-4 text-white/50" />
                Orlando, FL
              </div>
            </div>

            {/* Social Links */}
            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-[#a1a1a6] transition-all hover:bg-[#ff4533]/10 hover:text-[#ff4533]"
                  aria-label={social.name}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
              Services
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-[#a1a1a6] hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
              Company
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-[#a1a1a6] hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
              Resources
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-[#a1a1a6] hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
              Legal
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-[#a1a1a6] hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/[0.08]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[13px] text-[#8e8e93]">
              &copy; {currentYear} Aerial Shots Media. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 text-[13px] text-[#8e8e93]">
                <span className="h-2 w-2 rounded-full bg-[#34c759]" />
                FAA Part 107 Licensed
              </span>
              <span className="flex items-center gap-2 text-[13px] text-[#8e8e93]">
                <span className="h-2 w-2 rounded-full bg-white/40" />
                Zillow Certified
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
