import Link from 'next/link'
import Image from 'next/image'
import { Mail, Phone, MapPin, Instagram, Facebook, Linkedin, Twitter, Youtube, Globe } from 'lucide-react'

// Types for agent social links
export interface AgentSocialLinks {
  instagram?: string
  facebook?: string
  linkedin?: string
  twitter?: string
  youtube?: string
  tiktok?: string
  website?: string
}

export interface AgentFooterProps {
  name: string
  email?: string
  phone?: string
  brokerage?: string
  socialLinks?: AgentSocialLinks
  footerText?: string
  showPoweredBy?: boolean
}

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
    { name: 'Book Now', href: '/book' },
  ],
  portals: [
    { name: 'Agent Portal', href: '/sign-in' },
    { name: 'Homeowner Portal', href: '/sign-in/seller' },
    { name: 'Team Portal', href: '/sign-in/staff' },
    { name: 'Partner Portal', href: '/sign-in/partner' },
  ],
  legal: [
    { name: 'Terms of Service', href: '/legal/terms' },
    { name: 'Privacy Policy', href: '/legal/privacy' },
    { name: 'Copyright', href: '/legal/copyright' },
  ],
}

const companySocialLinks = [
  { name: 'Instagram', href: 'https://instagram.com/aerialshotsmedia', icon: Instagram },
  { name: 'Facebook', href: 'https://facebook.com/aerialshotsmedia', icon: Facebook },
  { name: 'LinkedIn', href: 'https://linkedin.com/company/aerialshotsmedia', icon: Linkedin },
]

// Icon mapping for agent social links
const socialIconMap: Record<keyof AgentSocialLinks, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
  tiktok: Instagram, // Use Instagram icon as placeholder for TikTok
  website: Globe,
}

// URL prefix mapping for social platforms
const socialUrlPrefix: Record<keyof AgentSocialLinks, string> = {
  instagram: 'https://instagram.com/',
  facebook: 'https://facebook.com/',
  linkedin: 'https://linkedin.com/in/',
  twitter: 'https://twitter.com/',
  youtube: 'https://youtube.com/@',
  tiktok: 'https://tiktok.com/@',
  website: '', // No prefix for website URLs
}

interface MarketingFooterProps {
  agent?: AgentFooterProps
}

export function MarketingFooter({ agent }: MarketingFooterProps = {}) {
  const currentYear = new Date().getFullYear()

  // If agent is provided, render agent-specific footer
  if (agent) {
    return <AgentFooter agent={agent} currentYear={currentYear} />
  }

  return (
    <footer className="bg-[#0A0A0B] border-t border-white/[0.06]">
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-7">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src="/asm-logo-light.png"
                alt="Aerial Shots Media"
                width={40}
                height={40}
                className="transition-opacity group-hover:opacity-80"
              />
              <span className="text-[15px] font-semibold text-white font-marketing">
                Aerial Shots Media
              </span>
            </Link>

            <p className="mt-4 text-[14px] text-[#A1A1AA] leading-relaxed max-w-sm font-marketing-body">
              Central Florida&apos;s premier real estate media company. Professional photography,
              drone, video, 3D tours, and virtual staging for top-producing agents.
            </p>

            {/* Contact Info */}
            <div className="mt-6 space-y-3">
              <a
                href="mailto:hello@aerialshots.media"
                className="flex items-center gap-2.5 text-[14px] text-[#A1A1AA] hover:text-[#00D4FF] transition-colors font-marketing-body"
              >
                <Mail className="h-4 w-4 text-[#00D4FF]" />
                hello@aerialshots.media
              </a>
              <a
                href="tel:+14076926227"
                className="flex items-center gap-2.5 text-[14px] text-[#A1A1AA] hover:text-[#00D4FF] transition-colors font-marketing-body"
              >
                <Phone className="h-4 w-4 text-[#00D4FF]" />
                (407) 692-6227
              </a>
              <div className="flex items-center gap-2.5 text-[14px] text-[#71717A] font-marketing-body">
                <MapPin className="h-4 w-4 text-[#00D4FF]/60" />
                Orlando, FL
              </div>
            </div>

            {/* Social Links */}
            <div className="mt-6 flex items-center gap-3">
              {companySocialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#A1A1AA] transition-all hover:bg-[#00D4FF]/10 hover:border-[#00D4FF]/30 hover:text-[#00D4FF]"
                  aria-label={social.name}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-[12px] font-semibold text-[#00D4FF] uppercase tracking-[0.15em] font-marketing">
              Services
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-[#A1A1AA] hover:text-white transition-colors font-marketing-body"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[12px] font-semibold text-[#00D4FF] uppercase tracking-[0.15em] font-marketing">
              Company
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-[#A1A1AA] hover:text-white transition-colors font-marketing-body"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-[12px] font-semibold text-[#00D4FF] uppercase tracking-[0.15em] font-marketing">
              Resources
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-[#A1A1AA] hover:text-white transition-colors font-marketing-body"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h3 className="text-[12px] font-semibold text-[#00D4FF] uppercase tracking-[0.15em] font-marketing">
              Portals
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.portals.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-[#A1A1AA] hover:text-white transition-colors font-marketing-body"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-[12px] font-semibold text-[#00D4FF] uppercase tracking-[0.15em] font-marketing">
              Legal
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-[#A1A1AA] hover:text-white transition-colors font-marketing-body"
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
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[13px] text-[#71717A] font-marketing-body">
              &copy; {currentYear} Aerial Shots Media. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 text-[13px] text-[#71717A] font-marketing-body">
                <span className="h-2 w-2 rounded-full bg-[#00D4FF]" />
                FAA Part 107 Licensed
              </span>
              <span className="flex items-center gap-2 text-[13px] text-[#71717A] font-marketing-body">
                <span className="h-2 w-2 rounded-full bg-[#7C3AED]" />
                Zillow Certified
              </span>
              <span className="flex items-center gap-2 text-[13px] text-[#A1A1AA] font-marketing-body">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-white/[0.05] text-[10px]">🏠</span>
                Built in Orlando
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Agent-specific footer component
function AgentFooter({ agent, currentYear }: { agent: AgentFooterProps; currentYear: number }) {
  // Build social links from agent data
  const agentSocialLinks = agent.socialLinks
    ? (Object.entries(agent.socialLinks) as [keyof AgentSocialLinks, string | undefined][])
        .filter(([, value]) => value)
        .map(([platform, handle]) => {
          const Icon = socialIconMap[platform]
          // If it's already a full URL, use it; otherwise, prepend the platform prefix
          const href = handle!.startsWith('http')
            ? handle!
            : `${socialUrlPrefix[platform]}${handle}`
          return { name: platform, href, icon: Icon }
        })
    : []

  return (
    <footer className="bg-[#0A0A0B] border-t border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center text-center">
          {/* Agent Name */}
          <h3 className="text-xl font-semibold text-white font-marketing">{agent.name}</h3>

          {/* Brokerage */}
          {agent.brokerage && (
            <p className="mt-1 text-[14px] text-[#A1A1AA] font-marketing-body">{agent.brokerage}</p>
          )}

          {/* Contact Info */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            {agent.email && (
              <a
                href={`mailto:${agent.email}`}
                className="flex items-center gap-2 text-[14px] text-[#A1A1AA] hover:text-[#00D4FF] transition-colors font-marketing-body"
              >
                <Mail className="h-4 w-4 text-[#00D4FF]" />
                {agent.email}
              </a>
            )}
            {agent.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="flex items-center gap-2 text-[14px] text-[#A1A1AA] hover:text-[#00D4FF] transition-colors font-marketing-body"
              >
                <Phone className="h-4 w-4 text-[#00D4FF]" />
                {agent.phone}
              </a>
            )}
          </div>

          {/* Social Links */}
          {agentSocialLinks.length > 0 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              {agentSocialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#A1A1AA] transition-all hover:bg-[#00D4FF]/10 hover:border-[#00D4FF]/30 hover:text-[#00D4FF]"
                  aria-label={social.name}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}

          {/* Custom Footer Text */}
          {agent.footerText && (
            <p className="mt-6 text-[14px] text-[#71717A] max-w-md font-marketing-body">
              {agent.footerText}
            </p>
          )}

          {/* Powered By (conditional) */}
          {agent.showPoweredBy !== false && (
            <div className="mt-8 pt-6 border-t border-white/[0.06] w-full">
              <p className="text-[12px] text-[#52525B] font-marketing-body">
                Media by{' '}
                <a
                  href="https://aerialshots.media"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00D4FF] hover:text-[#33DDFF] transition-colors"
                >
                  Aerial Shots Media
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <p className="text-center text-[12px] text-[#52525B] font-marketing-body">
            &copy; {currentYear} {agent.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
