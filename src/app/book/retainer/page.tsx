'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Video,
  Calendar,
  Clock,
  Star,
  Users,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  RETAINER_PACKAGES,
  ALA_CARTE_VIDEOS,
  RETAINER_ADDONS,
  formatCurrency,
  BOOKING_URLS,
  type RetainerPackage,
} from '@/lib/pricing/config'

function PackageCard({
  pkg,
  isSelected,
  onSelect,
}: {
  pkg: RetainerPackage
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all',
        isSelected
          ? 'border-purple-500 bg-purple-500/5 ring-2 ring-purple-500/20'
          : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
      )}
      onClick={onSelect}
    >
      {pkg.recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-purple-500 text-white">Most Popular</Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-purple-400">{pkg.tier}</p>
            <CardTitle className="text-2xl text-white">{pkg.name}</CardTitle>
          </div>
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border-2',
              isSelected
                ? 'border-purple-500 bg-purple-500'
                : 'border-neutral-600'
            )}
          >
            {isSelected && <Check className="h-4 w-4 text-white" />}
          </div>
        </div>
        <p className="text-sm text-neutral-400">{pkg.description}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Pricing */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">
              {formatCurrency(pkg.price)}
            </span>
            <span className="text-neutral-400">/mo</span>
          </div>
          <p className="text-sm text-neutral-500">
            {formatCurrency(pkg.alaCarteValue)} value • Save{' '}
            {formatCurrency(pkg.savings)}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 rounded-lg bg-neutral-800/50 p-4">
          <div className="text-center">
            <Video className="mx-auto h-5 w-5 text-purple-400" />
            <p className="mt-1 text-lg font-bold text-white">{pkg.videoCount}</p>
            <p className="text-xs text-neutral-400">Videos</p>
          </div>
          <div className="text-center">
            <Calendar className="mx-auto h-5 w-5 text-purple-400" />
            <p className="mt-1 text-lg font-bold text-white">{pkg.shootDays}</p>
            <p className="text-xs text-neutral-400">Shoot Days</p>
          </div>
          <div className="text-center">
            <Clock className="mx-auto h-5 w-5 text-purple-400" />
            <p className="mt-1 text-lg font-bold text-white">{pkg.turnaround}</p>
            <p className="text-xs text-neutral-400">Turnaround</p>
          </div>
        </div>

        {/* Video Breakdown */}
        <div>
          <p className="mb-2 text-sm font-medium text-neutral-300">
            Video Breakdown
          </p>
          <div className="space-y-2">
            {pkg.videoBreakdown.map((video) => (
              <div
                key={video.type}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-neutral-400">{video.type}</span>
                <span className="font-medium text-white">{video.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Includes */}
        <div>
          <p className="mb-2 text-sm font-medium text-neutral-300">Includes</p>
          <ul className="space-y-1.5">
            {pkg.includes.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-400" />
                <span className="text-neutral-400">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tier Benefits */}
        {pkg.tierBenefits.length > 0 && (
          <div className="rounded-lg bg-purple-500/10 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-purple-400">
              <Star className="h-4 w-4" />
              Tier Benefits
            </p>
            <ul className="space-y-1">
              {pkg.tierBenefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-center gap-2 text-sm text-purple-300"
                >
                  <Zap className="h-3 w-3" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ShootScheduleSection({ pkg }: { pkg: RetainerPackage }) {
  return (
    <Card className="border-neutral-800 bg-neutral-900">
      <CardHeader>
        <CardTitle className="text-lg text-white">
          Your Monthly Shoot Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {pkg.shootSchedule.map((day, i) => (
            <div
              key={i}
              className="rounded-lg border border-neutral-800 bg-neutral-800/50 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <Badge variant="outline" className="border-purple-500 text-purple-400">
                  {day.label}
                </Badge>
                <span className="text-xs text-neutral-500">{day.duration}</span>
              </div>
              <p className="mb-2 font-medium text-white">{day.title}</p>
              <ul className="space-y-1">
                {day.items.map((item, j) => (
                  <li key={j} className="text-sm text-neutral-400">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function RetainerBookingPage() {
  const [selectedPackage, setSelectedPackage] = useState<string>('dominance')

  const pkg = RETAINER_PACKAGES.find((p) => p.key === selectedPackage)!

  const handleBookNow = () => {
    // Open external booking form in new tab
    window.open(BOOKING_URLS.contentRetainer, '_blank')
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/book">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
              <Video className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Content Retainer</h1>
              <p className="text-neutral-400">
                Monthly video subscription for consistent social media content
              </p>
            </div>
          </div>
        </div>

        {/* Package Selection */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Choose Your Package</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {RETAINER_PACKAGES.map((p) => (
              <PackageCard
                key={p.key}
                pkg={p}
                isSelected={selectedPackage === p.key}
                onSelect={() => setSelectedPackage(p.key)}
              />
            ))}
          </div>
        </div>

        {/* Shoot Schedule */}
        <div className="mb-8">
          <ShootScheduleSection pkg={pkg} />
        </div>

        {/* Add-ons */}
        <div className="mb-8">
          <Card className="border-neutral-800 bg-neutral-900">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                Optional Add-ons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {RETAINER_ADDONS.map((addon) => (
                  <div
                    key={addon.name}
                    className="flex items-center justify-between rounded-lg border border-neutral-800 p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{addon.name}</p>
                      <p className="text-sm text-neutral-400">
                        {addon.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">
                        {formatCurrency(addon.price)}
                      </p>
                      <p className="text-xs text-neutral-500">/{addon.period}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* À la Carte Section */}
        <div className="mb-8">
          <Card className="border-neutral-800 bg-neutral-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Users className="h-5 w-5 text-neutral-500" />
                Prefer À La Carte?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-neutral-400">
                Not ready for a retainer? Order individual videos as needed.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {ALA_CARTE_VIDEOS.map((video) => (
                  <div
                    key={video.name}
                    className="rounded-lg border border-neutral-800 bg-neutral-800/50 p-3 text-center"
                  >
                    <p className="text-sm font-medium text-white">{video.name}</p>
                    <p className="text-lg font-bold text-purple-400">
                      {formatCurrency(video.price)}
                    </p>
                    {video.note && (
                      <p className="text-xs text-neutral-500">{video.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 md:p-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <h3 className="text-xl font-bold text-white">
                Ready to dominate social media?
              </h3>
              <p className="text-neutral-400">
                Start your {pkg.name} package today •{' '}
                {formatCurrency(pkg.price)}/month
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/pricing">View Full Pricing</Link>
              </Button>
              <Button
                onClick={handleBookNow}
                className="bg-purple-500 hover:bg-purple-600"
              >
                Book Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* FAQ Teaser */}
        <div className="mt-12 text-center">
          <p className="text-neutral-400">
            Have questions?{' '}
            <Link href="/pricing#faq" className="text-purple-400 hover:underline">
              Check our FAQ
            </Link>{' '}
            or{' '}
            <a
              href="mailto:info@aerialshots.media"
              className="text-purple-400 hover:underline"
            >
              contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
