'use client'

import { useState } from 'react'
import { Plane, Waves, Building2, Car, Clock, AlertTriangle } from 'lucide-react'
import type { AirportProximity, BeachProximity, CommuteDestination, TravelTime } from '@/lib/api/types'

interface CommuteSectionProps {
  airports?: AirportProximity | null
  beaches?: BeachProximity[] | null
  destinations?: CommuteDestination[] | null
  summary?: {
    nearestHighway: string
    nearestHighwayMiles: number
    downtownOrlandoMinutes: number
    mcoAirportMinutes: number
    nearestBeachMinutes: number
  } | null
}

type TabKey = 'airports' | 'beaches' | 'downtown'

function getTrafficBadge(base: number, withTraffic: number) {
  const diff = withTraffic - base
  if (diff <= 5) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-yellow-500">
      <AlertTriangle className="w-3 h-3" />
      +{diff} min traffic
    </span>
  )
}

function TravelCard({
  name,
  code,
  distanceMiles,
  durationMinutes,
  durationWithTraffic,
  features,
  icon: Icon = Car,
}: {
  name: string
  code?: string
  distanceMiles: number
  durationMinutes: number
  durationWithTraffic?: number
  features?: string[]
  icon?: typeof Car
}) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-white/[0.05]">
            <Icon className="w-4 h-4 text-[#a1a1a6]" />
          </div>
          <div>
            <h4 className="font-medium text-white">{name}</h4>
            {code && <span className="text-xs text-[#636366]">{code}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 text-sm">
        <span className="flex items-center gap-1 text-[#a1a1a6]">
          <Car className="w-3.5 h-3.5" />
          {distanceMiles.toFixed(1)} mi
        </span>
        <span className="flex items-center gap-1 text-white font-medium">
          <Clock className="w-3.5 h-3.5 text-[#a1a1a6]" />
          {durationMinutes} min
        </span>
      </div>

      {durationWithTraffic && getTrafficBadge(durationMinutes, durationWithTraffic) && (
        <div className="mt-2">
          {getTrafficBadge(durationMinutes, durationWithTraffic)}
        </div>
      )}

      {features && features.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {features.map((feature) => (
            <span
              key={feature}
              className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400"
            >
              {feature}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ summary }: { summary: CommuteSectionProps['summary'] }) {
  if (!summary) return null

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/[0.08]">
      <h4 className="text-sm font-medium text-white mb-3">Quick Access</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-[#636366]">Downtown Orlando</p>
          <p className="text-white font-medium">{summary.downtownOrlandoMinutes} min</p>
        </div>
        <div>
          <p className="text-[#636366]">MCO Airport</p>
          <p className="text-white font-medium">{summary.mcoAirportMinutes} min</p>
        </div>
        <div>
          <p className="text-[#636366]">Nearest Beach</p>
          <p className="text-white font-medium">{summary.nearestBeachMinutes} min</p>
        </div>
        <div>
          <p className="text-[#636366]">Highway Access</p>
          <p className="text-white font-medium">{summary.nearestHighway} ({summary.nearestHighwayMiles.toFixed(1)} mi)</p>
        </div>
      </div>
    </div>
  )
}

export function CommuteSection({ airports, beaches, destinations, summary }: CommuteSectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('airports')

  // Check if we have any data
  const hasAirports = airports && (airports.mco || airports.sfb || airports.tpa)
  const hasBeaches = beaches && beaches.length > 0
  const hasDowntown = destinations && destinations.some(d => d.type === 'downtown')

  if (!hasAirports && !hasBeaches && !hasDowntown && !summary) {
    return null
  }

  const allTabs: { key: TabKey; label: string; icon: typeof Plane; count: number }[] = [
    { key: 'airports', label: 'Airports', icon: Plane, count: hasAirports ? 3 : 0 },
    { key: 'beaches', label: 'Beaches', icon: Waves, count: beaches?.length || 0 },
    { key: 'downtown', label: 'Downtown', icon: Building2, count: destinations?.filter(d => d.type === 'downtown').length || 0 },
  ]
  const tabs = allTabs.filter(tab => tab.count > 0)

  const airportsList: (TravelTime & { key: string })[] = airports
    ? [
        airports.mco && { ...airports.mco, key: 'mco' },
        airports.sfb && { ...airports.sfb, key: 'sfb' },
        airports.tpa && { ...airports.tpa, key: 'tpa' },
      ].filter(Boolean) as (TravelTime & { key: string })[]
    : []

  return (
    <section className="py-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-1">Travel & Commute</h2>
        <p className="text-sm text-[#a1a1a6]">
          Drive times to airports, beaches, and downtown areas
        </p>
      </div>

      {summary && <SummaryCard summary={summary} />}

      {tabs.length > 0 && (
        <>
          <div className="flex gap-2 mt-6 mb-4 overflow-x-auto pb-2">
            {tabs.map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                  activeTab === key
                    ? 'bg-white text-black font-medium'
                    : 'bg-white/[0.05] text-[#a1a1a6] hover:bg-white/[0.08]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                <span className="text-xs opacity-60">{count}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeTab === 'airports' &&
              airportsList.map((airport) => (
                <TravelCard
                  key={airport.key}
                  name={airport.name}
                  code={airport.code}
                  distanceMiles={airport.distanceMiles}
                  durationMinutes={airport.durationMinutes}
                  durationWithTraffic={airport.durationWithTraffic}
                  icon={Plane}
                />
              ))}

            {activeTab === 'beaches' &&
              beaches?.map((beach, index) => (
                <TravelCard
                  key={index}
                  name={beach.name}
                  distanceMiles={beach.distanceMiles}
                  durationMinutes={beach.durationMinutes}
                  durationWithTraffic={beach.durationWithTraffic}
                  features={beach.features}
                  icon={Waves}
                />
              ))}

            {activeTab === 'downtown' &&
              destinations
                ?.filter((d) => d.type === 'downtown')
                .map((dest) => (
                  <TravelCard
                    key={dest.id}
                    name={dest.name}
                    distanceMiles={dest.distanceMiles}
                    durationMinutes={dest.durationMinutes}
                    durationWithTraffic={dest.durationWithTraffic}
                    icon={Building2}
                  />
                ))}
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-[#636366]">
        Travel times calculated via Google Distance Matrix API
      </p>
    </section>
  )
}
