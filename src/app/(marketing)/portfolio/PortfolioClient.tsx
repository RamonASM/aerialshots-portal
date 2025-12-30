'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import {
  PortfolioGrid,
  useLightbox,
  StagingShowcase,
  type PortfolioItem,
} from '@/components/marketing/portfolio'

// Dynamic import for Lightbox (only loaded when needed)
const Lightbox = dynamic(
  () => import('@/components/marketing/portfolio').then(mod => mod.Lightbox),
  { ssr: false }
)

interface PortfolioClientProps {
  items: PortfolioItem[]
  stagingExamples: Array<{
    id: string
    before: string
    after: string
    room: string
    style: string
  }>
}

export function PortfolioClient({ items, stagingExamples }: PortfolioClientProps) {
  const lightbox = useLightbox(items)
  const [showStagingShowcase, setShowStagingShowcase] = useState(false)

  return (
    <div className="space-y-16">
      {/* Virtual Staging Showcase */}
      {stagingExamples.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Virtual Staging
              </h2>
              <p className="text-muted-foreground mt-1">
                See the transformation with our virtual staging
              </p>
            </div>
            <button
              onClick={() => setShowStagingShowcase(!showStagingShowcase)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {showStagingShowcase ? 'Hide' : 'Show'} showcase
            </button>
          </div>

          {showStagingShowcase && (
            <StagingShowcase examples={stagingExamples} />
          )}
        </div>
      )}

      {/* Main Portfolio Grid */}
      <div>
        <PortfolioGrid
          items={items}
          onItemClick={(item, index) => lightbox.open(index)}
        />
      </div>

      {/* Lightbox */}
      <Lightbox
        items={items}
        currentIndex={lightbox.currentIndex}
        isOpen={lightbox.isOpen}
        onClose={lightbox.close}
        onNavigate={lightbox.navigate}
      />
    </div>
  )
}
