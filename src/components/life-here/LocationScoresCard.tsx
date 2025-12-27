'use client'

import { useState } from 'react'
import {
  Utensils,
  ShoppingBag,
  Dumbbell,
  Car,
  Plane,
  Palmtree,
  MapPin,
  Building2,
  Users,
  Briefcase,
  Heart,
  ChefHat
} from 'lucide-react'

// Life Here Score types
type ScoreLabel = 'Exceptional' | 'Excellent' | 'Good' | 'Fair' | 'Limited' | string
type LifestyleProfile = 'balanced' | 'family' | 'professional' | 'active' | 'foodie' | string

interface ScoreData {
  score: number
  label: string
  description?: string
  highlights?: Record<string, unknown>
}

interface LifeHereScoreData {
  score: number
  label: string
  profile: string
  description: string
}

interface ProfileInfo {
  name: string
  description: string
  emphasis: string[]
}

interface LocationScoresCardProps {
  lifeHereScore?: LifeHereScoreData | null
  diningScore?: ScoreData | null
  convenienceScore?: ScoreData | null
  lifestyleScore?: ScoreData | null
  commuteScore?: ScoreData | null
  profileInfo?: ProfileInfo | null
  availableProfiles?: LifestyleProfile[]
  onProfileChange?: (profile: LifestyleProfile) => void
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#22c55e' // green - Exceptional
  if (score >= 70) return '#3b82f6' // blue - Excellent
  if (score >= 50) return '#eab308' // yellow - Good
  if (score >= 30) return '#f97316' // orange - Fair
  return '#ef4444' // red - Limited
}

function getScoreColorClass(score: number): string {
  if (score >= 90) return 'text-green-500'
  if (score >= 70) return 'text-blue-500'
  if (score >= 50) return 'text-yellow-500'
  if (score >= 30) return 'text-orange-500'
  return 'text-red-500'
}

function getLabelColorClass(label: string): string {
  switch (label) {
    case 'Exceptional': return 'bg-green-500/10 text-green-400 border-green-500/20'
    case 'Excellent': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'Good': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    case 'Fair': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'Limited': return 'bg-red-500/10 text-red-400 border-red-500/20'
    default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }
}

const PROFILE_ICONS: Record<string, typeof Users> = {
  balanced: Users,
  family: Heart,
  professional: Briefcase,
  active: Dumbbell,
  foodie: ChefHat,
}

const PROFILE_NAMES: Record<string, string> = {
  balanced: 'Balanced',
  family: 'Family',
  professional: 'Professional',
  active: 'Active',
  foodie: 'Foodie',
}

function CircularProgress({ score, size = 100, strokeWidth = 8 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference
  const color = getScoreColor(score)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-[10px] text-[#636366] uppercase tracking-wide">/ 100</span>
      </div>
    </div>
  )
}

function MiniScoreBar({ score, label }: { score: number; label: string }) {
  const color = getScoreColor(score)

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[#a1a1a6]">{label}</span>
        <span className="text-xs font-medium text-white">{score}</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function ScoreCard({
  icon: Icon,
  label,
  score,
  highlights,
}: {
  icon: typeof Utensils
  label: string
  score: ScoreData
  highlights?: React.ReactNode
}) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-white/[0.04]">
            <Icon className="w-4 h-4 text-white/60" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">{label}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${getLabelColorClass(score.label)}`}>
              {score.label}
            </span>
          </div>
        </div>
        <div className={`text-2xl font-bold ${getScoreColorClass(score.score)}`}>
          {score.score}
        </div>
      </div>

      {score.description && (
        <p className="text-xs text-[#636366] mb-3 leading-relaxed">
          {score.description}
        </p>
      )}

      {highlights && (
        <div className="pt-3 border-t border-white/[0.06]">
          {highlights}
        </div>
      )}
    </div>
  )
}

export function LocationScoresCard({
  lifeHereScore,
  diningScore,
  convenienceScore,
  lifestyleScore,
  commuteScore,
  profileInfo,
  availableProfiles = ['balanced', 'family', 'professional', 'active', 'foodie'],
  onProfileChange,
}: LocationScoresCardProps) {
  const [selectedProfile, setSelectedProfile] = useState<LifestyleProfile>(
    lifeHereScore?.profile || 'balanced'
  )

  // Don't render if no scores available
  if (!lifeHereScore && !diningScore && !convenienceScore && !lifestyleScore && !commuteScore) {
    return null
  }

  const handleProfileChange = (profile: LifestyleProfile) => {
    setSelectedProfile(profile)
    onProfileChange?.(profile)
  }

  return (
    <section className="py-8">
      {/* Header with Overall Score */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-8">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Life Here Score</h2>
          <p className="text-sm text-[#636366]">
            Our proprietary lifestyle quality assessment for Central Florida
          </p>
        </div>

        {lifeHereScore && (
          <div className="flex items-center gap-4">
            <CircularProgress score={lifeHereScore.score} />
            <div>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${getLabelColorClass(lifeHereScore.label)}`}>
                {lifeHereScore.label}
              </span>
              <p className="text-xs text-[#636366] mt-2 max-w-[200px]">
                {lifeHereScore.description}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Profile Selector */}
      {availableProfiles.length > 1 && (
        <div className="mb-6">
          <p className="text-xs text-[#636366] mb-2">Lifestyle Profile:</p>
          <div className="flex flex-wrap gap-2">
            {availableProfiles.map((profile) => {
              const Icon = PROFILE_ICONS[profile] || Users
              const isSelected = selectedProfile === profile
              return (
                <button
                  key={profile}
                  onClick={() => handleProfileChange(profile)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${isSelected
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-white/[0.04] text-[#a1a1a6] border border-white/[0.06] hover:bg-white/[0.08]'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {PROFILE_NAMES[profile] || profile}
                </button>
              )
            })}
          </div>
          {profileInfo && (
            <p className="text-xs text-[#636366] mt-2">{profileInfo.description}</p>
          )}
        </div>
      )}

      {/* Score Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {diningScore && (
          <ScoreCard
            icon={Utensils}
            label="Dining"
            score={diningScore}
            highlights={
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-semibold text-white">
                    {(diningScore.highlights?.restaurantCount as number) || 0}
                  </div>
                  <div className="text-[10px] text-[#636366]">Restaurants</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">
                    {(diningScore.highlights?.topRated as number) || 0}
                  </div>
                  <div className="text-[10px] text-[#636366]">Top Rated</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">
                    {(diningScore.highlights?.cuisineTypes as number) || 0}
                  </div>
                  <div className="text-[10px] text-[#636366]">Cuisines</div>
                </div>
              </div>
            }
          />
        )}

        {convenienceScore && (
          <ScoreCard
            icon={ShoppingBag}
            label="Convenience"
            score={convenienceScore}
            highlights={
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#636366]">Nearest Grocery</span>
                  <span className="text-white">
                    {((convenienceScore.highlights?.nearestGroceryMiles as number) || 0).toFixed(1)} mi
                  </span>
                </div>
                {Boolean(convenienceScore.highlights?.has24HourPharmacy) && (
                  <div className="flex items-center gap-1 text-xs text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                    24-hour pharmacy nearby
                  </div>
                )}
              </div>
            }
          />
        )}

        {lifestyleScore && (
          <ScoreCard
            icon={Dumbbell}
            label="Lifestyle"
            score={lifestyleScore}
            highlights={
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-semibold text-white">
                    {(lifestyleScore.highlights?.gymCount as number) || 0}
                  </div>
                  <div className="text-[10px] text-[#636366]">Gyms</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">
                    {(lifestyleScore.highlights?.parkCount as number) || 0}
                  </div>
                  <div className="text-[10px] text-[#636366]">Parks</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">
                    {(lifestyleScore.highlights?.entertainmentVenues as number) || 0}
                  </div>
                  <div className="text-[10px] text-[#636366]">Entertainment</div>
                </div>
              </div>
            }
          />
        )}

        {commuteScore && (
          <ScoreCard
            icon={Car}
            label="Commute"
            score={commuteScore}
            highlights={
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-[#636366]">
                    <Plane className="w-3 h-3" /> MCO Airport
                  </span>
                  <span className="text-white">
                    {(commuteScore.highlights?.airportMinutes as number) || 0} min
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-[#636366]">
                    <Palmtree className="w-3 h-3" /> Nearest Beach
                  </span>
                  <span className="text-white">
                    {(commuteScore.highlights?.beachMinutes as number) || 0} min
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-[#636366]">
                    <Building2 className="w-3 h-3" /> Downtown
                  </span>
                  <span className="text-white">
                    {(commuteScore.highlights?.downtownMinutes as number) || 0} min
                  </span>
                </div>
                {Boolean(commuteScore.highlights?.themeParkMinutes) && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-[#636366]">
                      <MapPin className="w-3 h-3" /> Theme Parks
                    </span>
                    <span className="text-white">
                      {commuteScore.highlights?.themeParkMinutes as number} min
                    </span>
                  </div>
                )}
              </div>
            }
          />
        )}
      </div>

      {/* Mini Score Summary Bar */}
      {(diningScore || convenienceScore || lifestyleScore || commuteScore) && (
        <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex gap-4">
            {diningScore && <MiniScoreBar score={diningScore.score} label="Dining" />}
            {convenienceScore && <MiniScoreBar score={convenienceScore.score} label="Convenience" />}
            {lifestyleScore && <MiniScoreBar score={lifestyleScore.score} label="Lifestyle" />}
            {commuteScore && <MiniScoreBar score={commuteScore.score} label="Commute" />}
          </div>
        </div>
      )}

      <p className="mt-4 text-[10px] text-[#636366]">
        Life Here Score is a proprietary metric designed for Central Florida. Scores based on
        nearby amenities, services, and travel times to key destinations.
      </p>
    </section>
  )
}
