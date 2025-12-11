'use client'

import { ExternalLink } from 'lucide-react'
import { getCuratedCategoryInfo, type CuratedItem } from '@/lib/utils/category-info'

interface WhatsComingSectionProps {
  items: CuratedItem[]
}

export function WhatsComingSection({ items }: WhatsComingSectionProps) {
  if (items.length === 0) return null

  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-neutral-900">What's Coming</h2>
        <p className="mt-2 text-neutral-600">
          New developments and changes in the neighborhood
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const categoryInfo = getCuratedCategoryInfo(item.category)

            return (
              <div
                key={item.id}
                className="rounded-lg border border-neutral-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                    style={{ backgroundColor: categoryInfo.color + '20' }}
                  >
                    {categoryInfo.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: categoryInfo.color }}
                      >
                        {categoryInfo.title}
                      </span>
                    </div>
                    <h3 className="mt-2 font-semibold text-neutral-900">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="mt-1 text-sm text-neutral-600">
                        {item.description}
                      </p>
                    )}
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-sm text-[#ff4533] hover:underline"
                      >
                        Learn more
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
