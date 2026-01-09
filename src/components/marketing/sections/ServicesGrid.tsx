'use client'

import Link from 'next/link'
import { Camera, Plane, Video, Box, Sofa, FileText, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const services = [
  {
    icon: Camera,
    title: 'HDR Photography',
    description: 'Professional real estate photos with perfect exposure and true-to-life colors.',
    href: '/services/photography',
    featured: false,
  },
  {
    icon: Plane,
    title: 'Drone & Aerial',
    description: 'FAA-certified drone pilots capturing stunning aerial views of properties.',
    href: '/services/drone',
    featured: false,
  },
  {
    icon: Video,
    title: 'Cinematic Video',
    description: 'Smooth, cinematic property tours that bring listings to life.',
    href: '/services/video',
    featured: true,
  },
  {
    icon: Box,
    title: 'Zillow 3D Tours',
    description: 'Interactive 3D walkthroughs that let buyers explore from anywhere.',
    href: '/services/3d-tours',
    featured: false,
  },
  {
    icon: Sofa,
    title: 'Virtual Staging',
    description: 'AI-powered staging that transforms empty rooms into stunning spaces.',
    href: '/services/virtual-staging',
    featured: false,
  },
  {
    icon: FileText,
    title: 'Floor Plans',
    description: '2D and 3D floor plans that help buyers understand the layout.',
    href: '/services/floor-plans',
    featured: false,
  },
]

export function ServicesGrid() {
  return (
    <section className="py-24 sm:py-32 bg-[#0A0A0B]">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-[12px] uppercase tracking-[0.2em] text-[#00D4FF] mb-4 font-marketing">
            Our Services
          </p>
          <h2 className="text-marketing-section text-white mb-4">
            Everything You Need to Sell
          </h2>
          <p className="text-marketing-subhead max-w-2xl mx-auto">
            Complete real estate media packages designed for Central Florida&apos;s top-producing agents.
          </p>
        </div>

        {/* Services grid */}
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <Link
              key={service.title}
              href={service.href}
              className={cn(
                'group relative p-6 sm:p-8 rounded-2xl transition-all duration-300',
                'glass-card-marketing',
                service.featured && 'lg:col-span-1 gradient-border'
              )}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Icon */}
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center mb-5',
                'bg-white/[0.05] border border-white/[0.08]',
                'group-hover:bg-[#00D4FF]/10 group-hover:border-[#00D4FF]/30 transition-all duration-300'
              )}>
                <service.icon className={cn(
                  'h-5 w-5 text-[#A1A1AA]',
                  'group-hover:text-[#00D4FF] transition-colors duration-300'
                )} />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-white mb-2 font-marketing group-hover:text-[#00D4FF] transition-colors">
                {service.title}
              </h3>

              {/* Description */}
              <p className="text-[14px] text-[#A1A1AA] leading-relaxed mb-4 font-marketing-body">
                {service.description}
              </p>

              {/* Learn more link */}
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#00D4FF] opacity-0 group-hover:opacity-100 transition-opacity font-marketing">
                Learn more
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Gradient corner accent on hover */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-[#00D4FF]/10 to-transparent rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>

        {/* View all services CTA */}
        <div className="text-center mt-12">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-[#00D4FF] hover:text-[#33DDFF] transition-colors font-marketing"
          >
            View all services
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
