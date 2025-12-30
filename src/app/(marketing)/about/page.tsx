import { Metadata } from 'next'
import Link from 'next/link'
import {
  Award,
  Shield,
  Camera,
  Video,
  Plane,
  Home,
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { getTeamMembers, getCompanyStats } from '@/lib/queries/team'
import {
  OrganizationJsonLd,
  BreadcrumbJsonLd,
  HowToJsonLd,
} from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'About Us | Aerial Shots Media',
  description: 'Meet the team behind Aerial Shots Media. FAA Part 107 certified drone operators and professional photographers serving Central Florida real estate.',
  openGraph: {
    title: 'About Us | Aerial Shots Media',
    description: 'Professional real estate media for Central Florida',
    type: 'website',
  },
}

// Certifications data
const certifications = [
  {
    name: 'FAA Part 107',
    description: 'Licensed commercial drone operators',
    icon: Plane,
    color: 'blue',
  },
  {
    name: 'Zillow Showcase',
    description: 'Certified Zillow media partner',
    icon: Home,
    color: 'purple',
  },
  {
    name: 'Matterport Certified',
    description: '3D tour capture specialists',
    icon: Camera,
    color: 'cyan',
  },
  {
    name: 'Insured & Bonded',
    description: '$2M liability coverage',
    icon: Shield,
    color: 'green',
  },
]

// Equipment showcase
const equipment = [
  {
    category: 'Drones',
    items: ['DJI Mavic 3 Pro', 'DJI Mini 4 Pro', 'DJI Air 3'],
    description: 'Latest DJI technology for stunning aerial footage',
  },
  {
    category: 'Cameras',
    items: ['Sony A7R IV', 'Sony A7 III', 'Canon EOS R5'],
    description: 'Full-frame mirrorless for maximum detail',
  },
  {
    category: 'Lenses',
    items: ['Sony 16-35mm f/2.8', 'Laowa 12mm f/2.8', 'Sony 24-70mm f/2.8'],
    description: 'Ultra-wide angles for spacious interiors',
  },
  {
    category: '3D Capture',
    items: ['Matterport Pro3', 'Ricoh Theta Z1'],
    description: 'Professional 3D scanning equipment',
  },
  {
    category: 'Video',
    items: ['DJI RS 3 Pro Gimbal', 'Atomos Ninja V', 'Aputure 600d'],
    description: 'Cinematic stabilization and monitoring',
  },
  {
    category: 'Lighting',
    items: ['Godox AD600 Pro', 'Aputure 300x', 'LED panels'],
    description: 'Professional flash and continuous lighting',
  },
]

// Process steps
const processSteps = [
  {
    step: 1,
    title: 'Book Online',
    description: 'Select your package and schedule a convenient time. Same-day booking available.',
    duration: '2 min',
  },
  {
    step: 2,
    title: 'We Shoot',
    description: 'Our team arrives on time with professional equipment. Average shoot: 60-90 minutes.',
    duration: '60-90 min',
  },
  {
    step: 3,
    title: 'Expert Editing',
    description: 'HDR processing, color correction, and enhancement by our editing team.',
    duration: '12-24 hrs',
  },
  {
    step: 4,
    title: 'Delivery',
    description: 'Access your media via our client portal. Download, share, or MLS-ready delivery.',
    duration: 'Instant',
  },
  {
    step: 5,
    title: 'Publish',
    description: 'We push directly to Zillow, MLS, and other platforms. One-click syndication.',
    duration: '1-click',
  },
]

export default async function AboutPage() {
  const [teamMembers, stats] = await Promise.all([
    getTeamMembers(),
    getCompanyStats(),
  ])

  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'

  return (
    <main className="min-h-screen bg-black">
      {/* Structured Data for SEO */}
      <OrganizationJsonLd />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'About Us', url: `${SITE_URL}/about` },
        ]}
      />
      <HowToJsonLd
        name="How to Book Real Estate Photography"
        description="Book professional real estate photography with Aerial Shots Media in just a few simple steps. From booking to delivery, we've streamlined the process."
        totalTime="PT26H"
        steps={[
          { name: 'Book Online', text: 'Select your package and schedule a convenient time. Same-day booking available.' },
          { name: 'We Shoot', text: 'Our team arrives on time with professional equipment. Average shoot: 60-90 minutes.' },
          { name: 'Expert Editing', text: 'HDR processing, color correction, and enhancement by our editing team.' },
          { name: 'Delivery', text: 'Access your media via our client portal. Download, share, or MLS-ready delivery.' },
          { name: 'Publish', text: 'We push directly to Zillow, MLS, and other platforms. One-click syndication.' },
        ]}
      />

      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-2 text-sm text-blue-400 mb-6">
              <Award className="h-4 w-4" />
              Central Florida&apos;s Premier Real Estate Media
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              Elevating Real Estate
              <span className="block text-blue-400">Through Visual Excellence</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Since 2019, we&apos;ve helped thousands of real estate professionals
              showcase properties with stunning photography, cinematic video,
              and immersive 3D tours.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard value={stats.totalListings.toLocaleString()} label="Properties Shot" icon={Camera} />
            <StatCard value={`${stats.totalAgents}+`} label="Agents Served" icon={Users} />
            <StatCard value={`${stats.yearsInBusiness}+ Years`} label="In Business" icon={Clock} />
            <StatCard value={`${stats.citiesServed}+`} label="Cities Covered" icon={MapPin} />
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 border-t border-white/5">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Our Mission</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                We believe every property deserves to be seen at its best. Our mission is to
                provide real estate professionals with world-class visual content that helps
                them sell homes faster and for higher prices.
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Founded in Orlando, we combine cutting-edge technology with artistic vision
                to create media that doesn&apos;t just document spaces—it tells stories and
                evokes emotions that drive buyers to act.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Same-day turnaround available
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  100% satisfaction guarantee
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  MLS-ready delivery
                </div>
              </div>
            </div>
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-neutral-900">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Video className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Company showcase video</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-20 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">
              Certified Professionals
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Our team holds industry-leading certifications and maintains the highest
              standards of professionalism, safety, and quality.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {certifications.map((cert) => (
              <CertificationCard key={cert.name} {...cert} />
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 border-t border-white/5">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">
              Meet the Team
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Our talented team of photographers, videographers, and editors are
              passionate about creating stunning visual content.
            </p>
          </div>

          {teamMembers.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {teamMembers.map((member) => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Placeholder team members */}
              <PlaceholderTeamCard
                name="Professional Photographers"
                role="Capture Team"
                description="Expert in HDR photography and composition"
              />
              <PlaceholderTeamCard
                name="Drone Pilots"
                role="Aerial Team"
                description="FAA Part 107 certified operators"
              />
              <PlaceholderTeamCard
                name="Video Editors"
                role="Post-Production"
                description="Cinematic color grading and effects"
              />
            </div>
          )}
        </div>
      </section>

      {/* Equipment Section */}
      <section className="py-20 border-t border-white/5">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">
              Professional Equipment
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              We invest in the latest technology to ensure every shot meets our
              exacting standards for quality and detail.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipment.map((category) => (
              <EquipmentCard key={category.category} {...category} />
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">
              Our Process
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              From booking to delivery, we&apos;ve streamlined every step to make
              working with us effortless.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500 via-blue-400 to-blue-500/20" />

              {processSteps.map((step, index) => (
                <ProcessStep
                  key={step.step}
                  {...step}
                  isLast={index === processSteps.length - 1}
                  isEven={index % 2 === 0}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-white/5">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <Sparkles className="h-12 w-12 text-blue-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-foreground">
              Ready to Elevate Your Listings?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join hundreds of real estate professionals who trust us with their
              property media. Book your first shoot today.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book/listing"
                className="inline-flex items-center justify-center rounded-full bg-blue-500 px-8 py-3 font-medium text-white hover:bg-blue-600 transition-colors"
              >
                Book a Shoot
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/portfolio"
                className="inline-flex items-center justify-center rounded-full bg-neutral-800 px-8 py-3 font-medium text-white hover:bg-neutral-700 transition-colors"
              >
                View Portfolio
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

// Component: Stat Card
function StatCard({
  value,
  label,
  icon: Icon,
}: {
  value: string
  label: string
  icon: typeof Camera
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6 text-center">
      <Icon className="h-8 w-8 text-blue-400 mx-auto mb-3" />
      <div className="text-3xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

// Component: Certification Card
function CertificationCard({
  name,
  description,
  icon: Icon,
  color,
}: {
  name: string
  description: string
  icon: typeof Camera
  color: string
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
  }

  return (
    <div className={`rounded-xl border p-6 ${colorClasses[color]}`}>
      <Icon className="h-10 w-10 mb-4" />
      <h3 className="font-semibold text-lg text-foreground">{name}</h3>
      <p className="text-sm mt-1 opacity-80">{description}</p>
    </div>
  )
}

// Component: Team Member Card
function TeamMemberCard({
  member,
}: {
  member: {
    id: string
    name: string
    role: string
    teamRole: string | null
    certifications: string[]
  }
}) {
  const roleLabel = member.teamRole
    ? member.teamRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    : member.role

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 mx-auto mb-4 flex items-center justify-center">
        <span className="text-2xl font-bold text-foreground">
          {member.name.split(' ').map(n => n[0]).join('')}
        </span>
      </div>
      <h3 className="font-semibold text-lg text-foreground text-center">
        {member.name}
      </h3>
      <p className="text-sm text-muted-foreground text-center mt-1">
        {roleLabel}
      </p>
      {member.certifications.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mt-4">
          {member.certifications.slice(0, 2).map((cert) => (
            <span
              key={cert}
              className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400"
            >
              {cert}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Component: Placeholder Team Card
function PlaceholderTeamCard({
  name,
  role,
  description,
}: {
  name: string
  role: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 mx-auto mb-4 flex items-center justify-center">
        <Users className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <h3 className="font-semibold text-lg text-foreground text-center">
        {name}
      </h3>
      <p className="text-sm text-blue-400 text-center mt-1">{role}</p>
      <p className="text-sm text-muted-foreground text-center mt-3">
        {description}
      </p>
    </div>
  )
}

// Component: Equipment Card
function EquipmentCard({
  category,
  items,
  description,
}: {
  category: string
  items: string[]
  description: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
      <h3 className="font-semibold text-lg text-foreground">{category}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Component: Process Step
function ProcessStep({
  step,
  title,
  description,
  duration,
  isLast,
  isEven,
}: {
  step: number
  title: string
  description: string
  duration: string
  isLast: boolean
  isEven: boolean
}) {
  return (
    <div className={`relative flex items-start gap-6 pb-12 ${isLast ? 'pb-0' : ''}`}>
      {/* Step number */}
      <div className="absolute left-8 md:left-1/2 -translate-x-1/2 z-10">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white">
          {step}
        </div>
      </div>

      {/* Content */}
      <div className={`ml-24 md:ml-0 md:w-[calc(50%-3rem)] ${isEven ? 'md:mr-auto md:pr-8 md:text-right' : 'md:ml-auto md:pl-8'}`}>
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <div className={`flex items-center gap-2 ${isEven ? 'md:justify-end' : ''}`}>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
              {duration}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        </div>
      </div>
    </div>
  )
}
