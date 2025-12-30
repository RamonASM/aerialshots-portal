'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Play, Star, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const stats = [
  { value: '500+', label: 'Agents Served' },
  { value: '15K+', label: 'Properties Shot' },
  { value: '24hr', label: 'Turnaround' },
  { value: '5.0', label: 'Google Rating', icon: Star },
]

const trustPoints = [
  'FAA Part 107 Licensed',
  'Zillow Showcase Certified',
  'Same-Day Booking',
]

interface HeroSectionProps {
  variant?: 'default' | 'video'
  videoUrl?: string
}

export function HeroSection({ variant = 'default', videoUrl }: HeroSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)

  useEffect(() => {
    // Auto-play video when in viewport
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Autoplay blocked, show play button
            })
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.5 }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {/* Gradient overlay */}
        <div className="absolute inset-0 gradient-radial-blue z-10" />

        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-[#0077ff]/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-[#3395ff]/8 rounded-full blur-[120px] animate-float animation-delay-1000" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />

        {/* Video background (optional) */}
        {variant === 'video' && videoUrl && (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            src={videoUrl}
            muted
            loop
            playsInline
          />
        )}
      </div>

      {/* Content */}
      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="text-center">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] border border-white/[0.08] px-4 py-2 mb-8 animate-fade-in-up">
            <span className="flex h-2 w-2 rounded-full bg-[#34c759]" />
            <span className="text-[13px] text-[#a1a1a6]">
              Trusted by 500+ Central Florida agents
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-display-2xl text-white mb-6 animate-fade-in-up animation-delay-100">
            Real Estate Media
            <br />
            <span className="text-gradient-blue">That Sells Homes Faster</span>
          </h1>

          {/* Subheadline */}
          <p className="text-body-lg max-w-2xl mx-auto mb-8 animate-fade-in-up animation-delay-200">
            Professional photography, drone, video tours, 3D walkthroughs, and virtual staging.
            Delivered in 24 hours. Prices starting at $175.
          </p>

          {/* Trust points */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-10 animate-fade-in-up animation-delay-300">
            {trustPoints.map((point) => (
              <div
                key={point}
                className="flex items-center gap-2 text-[14px] text-[#a1a1a6]"
              >
                <CheckCircle2 className="h-4 w-4 text-[#0077ff]" />
                {point}
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up animation-delay-400">
            <Link href="/book">
              <Button
                size="lg"
                className="h-14 px-8 bg-[#0077ff] hover:bg-[#0062cc] text-white text-[16px] font-semibold rounded-xl shadow-lg shadow-[#0077ff]/25 transition-all hover:shadow-xl hover:shadow-[#0077ff]/30 hover:scale-[1.02]"
              >
                Book Your Shoot
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/portfolio">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-[16px] font-medium rounded-xl border-white/[0.16] hover:bg-white/[0.05] hover:border-white/[0.24]"
              >
                <Play className="mr-2 h-5 w-5" />
                View Our Work
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-3xl mx-auto animate-fade-in-up animation-delay-500">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={cn(
                  'text-center',
                  index < stats.length - 1 && 'sm:border-r sm:border-white/[0.08]'
                )}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-3xl font-bold text-white">{stat.value}</span>
                  {stat.icon && (
                    <stat.icon className="h-5 w-5 text-[#ffcc00] fill-[#ffcc00]" />
                  )}
                </div>
                <span className="text-[13px] text-[#8e8e93]">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-fade-in animation-delay-1000">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[12px] text-[#8e8e93] uppercase tracking-widest">
            Scroll
          </span>
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-white/50 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  )
}
