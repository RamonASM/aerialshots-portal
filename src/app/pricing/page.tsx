'use client'

import { useState, useRef } from 'react'
import { Camera, Video, MessageSquare } from 'lucide-react'
import { ListingPackages } from '@/components/pricing/ListingPackages'
import { RetainerPackages } from '@/components/pricing/RetainerPackages'
import { QuoteWizard } from '@/components/quote/QuoteWizard'
import { cn } from '@/lib/utils'

type Tab = 'listing' | 'retainer'

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('listing')
  const quoteRef = useRef<HTMLDivElement>(null)

  const scrollToQuote = () => {
    quoteRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-5">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">
              Transparent Pricing
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Real Estate Media That Sells
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            No hidden fees. No surprises. See our complete pricing before you commit.
            <span className="block mt-1 text-neutral-500 text-base">
              Orlando • Tampa • Central Florida
            </span>
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1 bg-neutral-900 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab('listing')}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all',
                activeTab === 'listing'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-neutral-400 hover:text-white'
              )}
            >
              <Camera className="w-4 h-4" />
              <span>Listing Media</span>
              <span className="hidden sm:inline text-xs opacity-75">Per-Property</span>
            </button>
            <button
              onClick={() => setActiveTab('retainer')}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all',
                activeTab === 'retainer'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-neutral-400 hover:text-white'
              )}
            >
              <Video className="w-4 h-4" />
              <span>Content Retainers</span>
              <span className="hidden sm:inline text-xs opacity-75">Monthly</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in duration-300">
          {activeTab === 'listing' ? (
            <ListingPackages />
          ) : (
            <RetainerPackages />
          )}
        </div>

        {/* Quote Request Section */}
        <div ref={quoteRef} className="mt-20 scroll-mt-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-4">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 text-xs font-semibold uppercase tracking-wider">
                Get Your Custom Quote
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Let&apos;s Find the Perfect Fit
            </h2>
            <p className="text-neutral-400 max-w-xl mx-auto">
              Answer a few quick questions and we&apos;ll prepare a personalized recommendation for your needs.
            </p>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 md:p-10">
            <QuoteWizard />
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '500+', label: 'Properties Shot' },
            { value: '24hr', label: 'Avg Turnaround' },
            { value: '100%', label: 'Satisfaction' },
            { value: '5.0', label: 'Google Rating' },
          ].map((stat, i) => (
            <div key={i} className="p-4">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-neutral-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
