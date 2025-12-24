'use client'

import { useState } from 'react'
import { Check, ArrowRight, Calendar, Video, Clock, Sparkles } from 'lucide-react'
import {
  RETAINER_PACKAGES,
  ALA_CARTE_VIDEOS,
  BOOKING_URLS,
  formatCurrency,
  type RetainerPackage,
} from '@/lib/pricing/config'
import { cn } from '@/lib/utils'

function PackageCard({ pkg, isSelected, onSelect }: {
  pkg: RetainerPackage
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative text-left rounded-2xl p-5 transition-all w-full',
        isSelected
          ? 'bg-blue-500/10 border-2 border-blue-500'
          : 'bg-neutral-900 border-2 border-transparent hover:border-neutral-700'
      )}
    >
      {pkg.recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-bold rounded-full uppercase tracking-wider whitespace-nowrap">
            Most Popular
          </span>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
            {pkg.tier}
          </div>
          <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
        </div>
        <div
          className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
            isSelected
              ? 'border-blue-500 bg-blue-500'
              : 'border-neutral-600'
          )}
        >
          {isSelected && (
            <Check className="w-3 h-3 text-white" />
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-3xl font-bold text-white">
          {formatCurrency(pkg.price)}
        </span>
        <span className="text-neutral-500 text-sm">/mo</span>
      </div>
      <div className="text-sm mb-3">
        <span className="text-neutral-500">{pkg.videoCount} videos</span>
        <span className="mx-2 text-neutral-700">·</span>
        <span className="text-green-400 font-medium">
          Save {formatCurrency(pkg.savings)}
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        <span className="px-2.5 py-1 bg-blue-500/15 rounded text-xs font-medium text-blue-400">
          {pkg.shootDays} shoot days
        </span>
        {pkg.turnaround !== 'Standard' && (
          <span className="px-2.5 py-1 bg-green-500/15 rounded text-xs font-medium text-green-400">
            {pkg.turnaround} edits
          </span>
        )}
      </div>
    </button>
  )
}

function PackageDetails({ pkg }: { pkg: RetainerPackage }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800 bg-gradient-to-r from-blue-500/5 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs uppercase tracking-wider px-2 py-1 bg-neutral-800 rounded text-neutral-400">
                {pkg.tier}
              </span>
              <h3 className="text-2xl font-bold text-white">{pkg.name}</h3>
            </div>
            <p className="text-sm text-neutral-400 max-w-lg">{pkg.description}</p>
          </div>
          <div className="text-left md:text-right flex-shrink-0">
            <div className="text-4xl font-bold text-white">
              {formatCurrency(pkg.price)}
              <span className="text-lg text-neutral-500 font-normal">/mo</span>
            </div>
            <div className="text-sm">
              <span className="text-neutral-500">{formatCurrency(pkg.alaCarteValue)} value</span>
              <span className="mx-2 text-neutral-700">·</span>
              <span className="text-green-400 font-medium">Save {formatCurrency(pkg.savings)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Video Breakdown */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-4 flex items-center gap-2">
              <Video className="w-4 h-4" />
              Monthly Deliverables
            </h4>
            <div className="space-y-2">
              {pkg.videoBreakdown.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg"
                >
                  <span className="text-sm font-medium text-neutral-300">{item.type}</span>
                  <span className="text-blue-400 font-bold text-sm">x{item.count}</span>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <span className="text-sm font-medium text-neutral-300">Branding Photos</span>
                <span className="text-green-400 font-bold text-sm">Included</span>
              </div>
            </div>
          </div>

          {/* Column 2: Shoot Schedule */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Shoot Schedule
            </h4>
            <div className="space-y-3">
              {pkg.shootSchedule.map((day, i) => (
                <div key={i} className="p-3 bg-neutral-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">{day.label}</span>
                    <span className="text-xs text-neutral-500">{day.duration}</span>
                  </div>
                  <div className="text-xs text-blue-400 mb-1">{day.title}</div>
                  <ul className="text-xs text-neutral-500 space-y-0.5">
                    {day.items.map((item, j) => (
                      <li key={j}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: What's Included */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Everything Included
            </h4>
            <div className="space-y-2">
              {pkg.includes.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Check className="text-green-400 w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-neutral-400">{item}</span>
                </div>
              ))}
              {pkg.tierBenefits.length > 0 && (
                <>
                  <div className="border-t border-neutral-700 my-3" />
                  {pkg.tierBenefits.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="text-amber-400 w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-amber-400 font-medium">{item}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            Month-to-month. No contracts. Cancel anytime.
          </p>
          <a
            href={BOOKING_URLS.contentRetainer}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  )
}

export function RetainerPackages() {
  const [selectedPackage, setSelectedPackage] = useState('dominance')
  const selected = RETAINER_PACKAGES.find(p => p.key === selectedPackage)!

  return (
    <div className="space-y-8">
      {/* How It Works - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: '✍️', title: 'We Write Everything', desc: 'Scripts delivered 48hrs before your shoot' },
          { icon: '📱', title: 'Teleprompter On Set', desc: 'No memorization. Just read and look great.' },
          { icon: '📅', title: 'Only 2 Days/Month', desc: 'One content day, one on-call day' },
          { icon: '🤝', title: 'Month-to-Month', desc: "No contracts. Stay because the work is great." },
        ].map((item, i) => (
          <div key={i} className="p-4 bg-neutral-900 rounded-xl border border-neutral-800 text-center">
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="font-semibold text-sm text-white mb-1">{item.title}</div>
            <div className="text-xs text-neutral-500 leading-relaxed">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Package Selector Cards */}
      <div>
        <p className="text-sm font-medium text-neutral-400 mb-3 text-center uppercase tracking-wider">
          Select Your Package
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {RETAINER_PACKAGES.map((pkg) => (
            <PackageCard
              key={pkg.key}
              pkg={pkg}
              isSelected={selectedPackage === pkg.key}
              onSelect={() => setSelectedPackage(pkg.key)}
            />
          ))}
        </div>
      </div>

      {/* Selected Package Details */}
      <PackageDetails pkg={selected} />

      {/* À La Carte Section */}
      <div className="p-6 bg-neutral-900/50 rounded-xl border border-neutral-800">
        <h4 className="text-lg font-semibold text-white mb-4 text-center">
          À La Carte Video Pricing
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {ALA_CARTE_VIDEOS.map((video) => (
            <div key={video.name} className="p-3 bg-neutral-800/50 rounded-lg text-center">
              <div className="text-sm font-medium text-white mb-1">{video.name}</div>
              <div className="text-lg font-bold text-blue-400">{formatCurrency(video.price)}</div>
              {video.note && (
                <div className="text-xs text-neutral-500 mt-1">{video.note}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
