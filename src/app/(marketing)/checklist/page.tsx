import { Metadata } from 'next'
import Link from 'next/link'
import {
  CheckCircle2,
  Flower2,
  Camera,
  Clock,
  Lightbulb,
  Download,
  ArrowRight,
  AlertCircle,
  ThumbsUp,
} from 'lucide-react'
import { ChecklistClient } from './ChecklistClient'
import { BreadcrumbJsonLd, HowToJsonLd } from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'Pre-Shoot Checklist | Aerial Shots Media',
  description: 'Prepare your property for professional real estate photography. Complete checklist for sellers and agents to maximize your listing photos.',
  openGraph: {
    title: 'Pre-Shoot Checklist | Aerial Shots Media',
    description: 'Prepare your property for professional photography',
    type: 'website',
  },
}

// Priority type
type Priority = 'high' | 'medium' | 'low'

interface ChecklistItem {
  id: string
  text: string
  priority: Priority
}

interface ChecklistSectionData {
  id: string
  title: string
  icon: string // Icon name as string (resolved in client component)
  color: string
  items: ChecklistItem[]
}

// Checklist sections and items
export const checklistSections: ChecklistSectionData[] = [
  {
    id: 'exterior',
    title: 'Exterior',
    icon: 'Home',
    color: 'blue',
    items: [
      { id: 'ext-1', text: 'Mow lawn and trim edges', priority: 'high' },
      { id: 'ext-2', text: 'Remove garbage cans and bins', priority: 'high' },
      { id: 'ext-3', text: 'Park cars away from property or out of view', priority: 'high' },
      { id: 'ext-4', text: 'Remove garden hoses and yard tools', priority: 'medium' },
      { id: 'ext-5', text: 'Clean pool and remove debris/toys', priority: 'high' },
      { id: 'ext-6', text: 'Add fresh mulch or flowers if needed', priority: 'low' },
      { id: 'ext-7', text: 'Power wash driveway and walkways', priority: 'medium' },
      { id: 'ext-8', text: 'Clean windows (exterior)', priority: 'medium' },
      { id: 'ext-9', text: 'Remove sports equipment (bikes, balls, etc.)', priority: 'high' },
      { id: 'ext-10', text: 'Store holiday decorations', priority: 'high' },
    ],
  },
  {
    id: 'kitchen',
    title: 'Kitchen',
    icon: 'Sparkles',
    color: 'amber',
    items: [
      { id: 'kit-1', text: 'Clear all countertops completely', priority: 'high' },
      { id: 'kit-2', text: 'Remove magnets and papers from refrigerator', priority: 'high' },
      { id: 'kit-3', text: 'Hide dish soap, sponges, and cleaning supplies', priority: 'high' },
      { id: 'kit-4', text: 'Remove dish drying rack', priority: 'medium' },
      { id: 'kit-5', text: 'Clean sink and faucets (no water spots)', priority: 'high' },
      { id: 'kit-6', text: 'Empty garbage and hide trash can', priority: 'high' },
      { id: 'kit-7', text: 'Hide small appliances (toaster, coffee maker, etc.)', priority: 'medium' },
      { id: 'kit-8', text: 'Clean stovetop and oven (visible parts)', priority: 'medium' },
      { id: 'kit-9', text: 'Add simple staging (bowl of fruit, vase)', priority: 'low' },
      { id: 'kit-10', text: 'Ensure all cabinet doors are closed', priority: 'high' },
    ],
  },
  {
    id: 'living-spaces',
    title: 'Living Spaces',
    icon: 'Lightbulb',
    color: 'purple',
    items: [
      { id: 'liv-1', text: 'Remove personal photos and memorabilia', priority: 'high' },
      { id: 'liv-2', text: 'Hide remotes, electronics, and cables', priority: 'medium' },
      { id: 'liv-3', text: 'Fluff and arrange pillows and throws', priority: 'medium' },
      { id: 'liv-4', text: 'Remove pet beds, toys, and bowls', priority: 'high' },
      { id: 'liv-5', text: 'Clear coffee tables and end tables', priority: 'high' },
      { id: 'liv-6', text: 'Open curtains and blinds fully', priority: 'high' },
      { id: 'liv-7', text: 'Vacuum carpets and rugs', priority: 'medium' },
      { id: 'liv-8', text: 'Remove excessive furniture for space', priority: 'medium' },
      { id: 'liv-9', text: 'Turn off ceiling fans', priority: 'medium' },
      { id: 'liv-10', text: 'Add fresh flowers or plants', priority: 'low' },
    ],
  },
  {
    id: 'bedrooms',
    title: 'Bedrooms',
    icon: 'Home',
    color: 'cyan',
    items: [
      { id: 'bed-1', text: 'Make beds with crisp, neutral bedding', priority: 'high' },
      { id: 'bed-2', text: 'Remove clothes from floors and chairs', priority: 'high' },
      { id: 'bed-3', text: 'Clear nightstands (remove clutter)', priority: 'high' },
      { id: 'bed-4', text: 'Hide laundry baskets', priority: 'high' },
      { id: 'bed-5', text: 'Close closet doors', priority: 'high' },
      { id: 'bed-6', text: 'Remove personal items from dressers', priority: 'medium' },
      { id: 'bed-7', text: 'Open curtains for natural light', priority: 'high' },
      { id: 'bed-8', text: 'Turn on all lamps and lights', priority: 'medium' },
      { id: 'bed-9', text: 'Add decorative pillows sparingly', priority: 'low' },
      { id: 'bed-10', text: 'Remove TV if possible or turn off', priority: 'medium' },
    ],
  },
  {
    id: 'bathrooms',
    title: 'Bathrooms',
    icon: 'Sparkles',
    color: 'green',
    items: [
      { id: 'bath-1', text: 'Remove ALL toiletries from counters', priority: 'high' },
      { id: 'bath-2', text: 'Hide toilet brush and plunger', priority: 'high' },
      { id: 'bath-3', text: 'Replace towels with fresh, matching set', priority: 'high' },
      { id: 'bath-4', text: 'Close toilet lid', priority: 'high' },
      { id: 'bath-5', text: 'Remove bath mats', priority: 'medium' },
      { id: 'bath-6', text: 'Clean mirrors (no spots or streaks)', priority: 'high' },
      { id: 'bath-7', text: 'Remove soap scum from shower doors', priority: 'high' },
      { id: 'bath-8', text: 'Hide trash cans', priority: 'high' },
      { id: 'bath-9', text: 'Remove suction cup items from shower', priority: 'medium' },
      { id: 'bath-10', text: 'Add simple decor (candle, plant)', priority: 'low' },
    ],
  },
  {
    id: 'garage-laundry',
    title: 'Garage & Laundry',
    icon: 'Car',
    color: 'rose',
    items: [
      { id: 'gar-1', text: 'Park cars outside or away', priority: 'high' },
      { id: 'gar-2', text: 'Organize tools and equipment neatly', priority: 'medium' },
      { id: 'gar-3', text: 'Sweep floors clean', priority: 'medium' },
      { id: 'gar-4', text: 'Remove obvious clutter and boxes', priority: 'high' },
      { id: 'gar-5', text: 'Turn on lights for visibility', priority: 'medium' },
      { id: 'gar-6', text: 'Empty laundry machines', priority: 'high' },
      { id: 'gar-7', text: 'Clear laundry room counters', priority: 'high' },
      { id: 'gar-8', text: 'Hide detergent and cleaning supplies', priority: 'medium' },
    ],
  },
]

// General tips
const generalTips = [
  {
    icon: Clock,
    title: 'Timing Matters',
    description: 'Complete prep 30-60 minutes before scheduled shoot time.',
  },
  {
    icon: Lightbulb,
    title: 'All Lights On',
    description: 'Turn on every light in the house, including closets and under cabinets.',
  },
  {
    icon: Flower2,
    title: 'Fresh & Clean',
    description: 'Open windows beforehand for fresh air. Add fresh flowers for a pop of color.',
  },
  {
    icon: AlertCircle,
    title: 'Secure Pets',
    description: 'Keep pets secure and away from shoot areas. Remove evidence of pets.',
  },
]

// Common mistakes to avoid
const mistakes = [
  'Leaving personal photos visible (family portraits, refrigerator photos)',
  'Forgetting to remove toilet paper from counters',
  'Leaving garbage cans or recycling bins in view',
  'Not opening blinds/curtains for natural light',
  'Having ceiling fans spinning during shoot',
  'Parking cars in the driveway or garage',
]

export default function ChecklistPage() {
  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'

  // Generate HowTo steps from checklist sections
  const howToSteps = checklistSections.flatMap(section =>
    section.items
      .filter(item => item.priority === 'high')
      .slice(0, 2)
      .map(item => ({
        name: `${section.title}: ${item.text}`,
        text: item.text,
      }))
  )

  return (
    <main className="min-h-screen bg-black">
      {/* Structured Data for SEO */}
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Pre-Shoot Checklist', url: `${SITE_URL}/checklist` },
        ]}
      />
      <HowToJsonLd
        name="How to Prepare Your Home for Real Estate Photography"
        description="Complete checklist for preparing your property for professional real estate photography. Follow these steps to ensure your listing photos look their best."
        totalTime="PT1H"
        steps={howToSteps}
      />

      {/* Hero Section */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-4 py-2 text-sm text-green-400 mb-6">
              <CheckCircle2 className="h-4 w-4" />
              Free Preparation Guide
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              Pre-Shoot Checklist
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Prepare your property like a pro. Follow this comprehensive checklist
              to ensure your listing photos look their absolute best.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#checklist"
                className="inline-flex items-center justify-center rounded-full bg-blue-500 px-6 py-3 font-medium text-white hover:bg-blue-600 transition-colors"
              >
                View Checklist
              </a>
              <DownloadButton />
            </div>
          </div>
        </div>
      </section>

      {/* General Tips */}
      <section className="py-12 border-b border-white/5">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Quick Tips for Success
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {generalTips.map((tip) => (
              <div
                key={tip.title}
                className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6"
              >
                <tip.icon className="h-8 w-8 text-blue-400 mb-4" />
                <h3 className="font-semibold text-foreground">{tip.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Checklist */}
      <section id="checklist" className="py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <ChecklistClient sections={checklistSections} />
          </div>
        </div>
      </section>

      {/* Common Mistakes */}
      <section className="py-16 bg-gradient-to-b from-transparent via-red-500/5 to-transparent">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground">
                Common Mistakes to Avoid
              </h2>
              <p className="mt-2 text-muted-foreground">
                Don&apos;t let these common oversights affect your photos.
              </p>
            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
              <ul className="space-y-3">
                {mistakes.map((mistake, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-muted-foreground"
                  >
                    <div className="shrink-0 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                      <span className="text-xs font-bold text-red-400">!</span>
                    </div>
                    {mistake}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Print Version */}
      <section className="py-16 border-t border-white/5">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <ThumbsUp className="h-10 w-10 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground">
              Share with Your Seller
            </h2>
            <p className="mt-2 text-muted-foreground">
              Download a printable PDF version to share with your sellers before the shoot.
            </p>
            <div className="mt-6">
              <DownloadButton variant="large" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-t from-blue-500/5 to-transparent">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <Camera className="h-12 w-12 text-blue-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-foreground">
              Ready for Your Shoot?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Once your property is prepped, book your professional photography
              session and watch your listing shine.
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
                View Our Work
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

// Download button component (server-side placeholder, client handles PDF)
function DownloadButton({ variant = 'default' }: { variant?: 'default' | 'large' }) {
  const className = variant === 'large'
    ? 'inline-flex items-center justify-center rounded-full bg-neutral-800 px-8 py-3 font-medium text-white hover:bg-neutral-700 transition-colors'
    : 'inline-flex items-center justify-center rounded-full bg-neutral-800 px-6 py-3 font-medium text-white hover:bg-neutral-700 transition-colors'

  return (
    <button className={className}>
      <Download className="mr-2 h-4 w-4" />
      Download PDF
    </button>
  )
}
