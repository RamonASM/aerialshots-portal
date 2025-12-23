import { CheckCircle } from 'lucide-react'
import type { CommunityOverviewContent, CommunityQuickFacts } from '@/lib/supabase/types'

interface OverviewSectionProps {
  name: string
  description?: string | null
  overviewContent?: CommunityOverviewContent | null
  quickFacts?: CommunityQuickFacts | null
}

export function OverviewSection({
  name,
  description,
  overviewContent,
  quickFacts,
}: OverviewSectionProps) {
  return (
    <section>
      <h2 className="text-[22px] font-semibold text-white">
        About {name}
      </h2>

      {/* Description */}
      {description && (
        <p className="mt-4 text-[17px] text-[#a1a1a6] leading-relaxed">
          {description}
        </p>
      )}

      {/* Rich Content Blocks */}
      {overviewContent?.blocks && overviewContent.blocks.length > 0 && (
        <div className="mt-6 space-y-4">
          {overviewContent.blocks.map((block, index) => {
            if (block.type === 'heading') {
              return (
                <h3 key={index} className="text-[17px] font-semibold text-white">
                  {block.content}
                </h3>
              )
            }
            if (block.type === 'list' && block.items) {
              return (
                <ul key={index} className="space-y-2">
                  {block.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[#a1a1a6]">
                      <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              )
            }
            return (
              <p key={index} className="text-[#a1a1a6] leading-relaxed">
                {block.content}
              </p>
            )
          })}
        </div>
      )}

      {/* Highlights */}
      {overviewContent?.highlights && overviewContent.highlights.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-white mb-3">Highlights</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {overviewContent.highlights.map((highlight, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg bg-[#0077ff]/10 border border-[#0077ff]/20 p-3 text-[#3395ff]"
              >
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-[#0077ff]" />
                {highlight}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Facts Grid */}
      {quickFacts && (
        <div className="mt-8 grid gap-4 rounded-xl bg-[#1c1c1e] border border-white/[0.08] p-6 sm:grid-cols-2 lg:grid-cols-3">
          {quickFacts.median_income && (
            <div>
              <div className="text-[13px] text-[#636366]">Median Income</div>
              <div className="text-[17px] font-semibold text-white">
                ${quickFacts.median_income.toLocaleString()}
              </div>
            </div>
          )}
          {quickFacts.avg_commute && (
            <div>
              <div className="text-[13px] text-[#636366]">Avg Commute</div>
              <div className="text-[17px] font-semibold text-white">
                {quickFacts.avg_commute} min
              </div>
            </div>
          )}
          {quickFacts.zip_codes && quickFacts.zip_codes.length > 0 && (
            <div>
              <div className="text-[13px] text-[#636366]">ZIP Codes</div>
              <div className="text-[17px] font-semibold text-white">
                {quickFacts.zip_codes.join(', ')}
              </div>
            </div>
          )}
          {quickFacts.nearby_cities && quickFacts.nearby_cities.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="text-[13px] text-[#636366]">Nearby Cities</div>
              <div className="text-[17px] font-semibold text-white">
                {quickFacts.nearby_cities.join(' • ')}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
