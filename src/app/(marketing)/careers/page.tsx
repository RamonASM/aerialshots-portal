import { Metadata } from 'next'
import Link from 'next/link'
import {
  Camera,
  Plane,
  Video,
  Palette,
  Users,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Briefcase,
} from 'lucide-react'
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'Careers | Aerial Shots Media',
  description: 'Join the Aerial Shots Media team. We\'re hiring photographers, videographers, drone pilots, and editors to serve Central Florida real estate.',
  openGraph: {
    title: 'Careers | Aerial Shots Media',
    description: 'Join Central Florida\'s premier real estate media team.',
    type: 'website',
  },
}

const openPositions = [
  {
    title: 'Real Estate Photographer',
    type: 'Contract',
    location: 'Orlando Area',
    icon: Camera,
    requirements: [
      'Own professional camera and wide-angle lens',
      'Experience with HDR photography',
      'Reliable vehicle and flexible schedule',
      'Strong attention to detail',
    ],
  },
  {
    title: 'Licensed Drone Pilot',
    type: 'Contract',
    location: 'Central Florida',
    icon: Plane,
    requirements: [
      'FAA Part 107 certification',
      'Own DJI drone (Mavic 3 or equivalent)',
      'Liability insurance ($1M minimum)',
      '50+ hours flight experience',
    ],
  },
  {
    title: 'Videographer',
    type: 'Contract',
    location: 'Tampa/Orlando',
    icon: Video,
    requirements: [
      'Professional video camera and gimbal',
      'Experience with real estate video',
      'Basic editing skills (Premiere/Final Cut)',
      'Portfolio of property videos',
    ],
  },
  {
    title: 'Photo/Video Editor',
    type: 'Remote',
    location: 'Remote',
    icon: Palette,
    requirements: [
      'Proficient in Lightroom and Photoshop',
      'Experience with HDR editing workflows',
      'Fast turnaround capability',
      'Consistent quality output',
    ],
  },
]

const benefits = [
  'Flexible scheduling - work when you want',
  'Competitive per-job compensation',
  'Steady flow of assignments',
  'Equipment and software discounts',
  'Training and skill development',
  'Supportive team environment',
]

const values = [
  {
    title: 'Quality First',
    description: 'We never compromise on the quality of our work.',
  },
  {
    title: 'Client Focus',
    description: 'Our success is measured by our clients\' success.',
  },
  {
    title: 'Continuous Learning',
    description: 'We invest in our team\'s growth and development.',
  },
  {
    title: 'Work-Life Balance',
    description: 'Flexible schedules that fit your lifestyle.',
  },
]

export default function CareersPage() {
  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'

  return (
    <main className="min-h-screen bg-black">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Careers', url: `${SITE_URL}/careers` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-2 text-sm text-blue-400 mb-6">
              <Briefcase className="h-4 w-4" />
              We&apos;re Hiring
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              Join Our Team
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              We&apos;re looking for talented photographers, videographers, and drone pilots
              to join Central Florida&apos;s premier real estate media company.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 border-t border-white/5">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Our Values</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6 text-center"
              >
                <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Open Positions</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              All positions are independent contractor roles with flexible scheduling.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {openPositions.map((position) => (
              <div
                key={position.title}
                className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <position.icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{position.title}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{position.type}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {position.location}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/[0.08]">
                  <h4 className="text-sm font-medium text-foreground mb-3">Requirements:</h4>
                  <ul className="space-y-2">
                    {position.requirements.map((req) => (
                      <li key={req} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 border-t border-white/5">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-4xl mx-auto">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Why Work With Us</h2>
              <p className="mt-4 text-muted-foreground">
                As a member of our team, you&apos;ll enjoy flexibility, competitive pay,
                and the support you need to do your best work.
              </p>
              <ul className="mt-6 space-y-3">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-900 flex items-center justify-center">
              <Users className="h-20 w-20 text-muted-foreground/30" />
            </div>
          </div>
        </div>
      </section>

      {/* Apply CTA */}
      <section className="py-24 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground">
              Ready to Apply?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Send us your portfolio and tell us why you&apos;d be a great fit.
            </p>
            <div className="mt-8">
              <a
                href="mailto:careers@aerialshots.media?subject=Job Application"
                className="inline-flex items-center justify-center rounded-full bg-blue-500 px-8 py-3 font-medium text-white hover:bg-blue-600 transition-colors"
              >
                Apply Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Email: careers@aerialshots.media
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
