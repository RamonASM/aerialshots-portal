'use client'

import { MapPin, Train, Bike } from 'lucide-react'

interface ScoreData {
  score: number
  description: string
  explanation: string
}

interface LocationScoresCardProps {
  walkScore?: ScoreData | null
  transitScore?: ScoreData | null
  bikeScore?: ScoreData | null
  overall?: {
    score: number
    description: string
  } | null
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#22c55e' // green
  if (score >= 50) return '#eab308' // yellow
  return '#ef4444' // red
}

function getScoreColorClass(score: number): string {
  if (score >= 70) return 'text-green-500'
  if (score >= 50) return 'text-yellow-500'
  return 'text-red-500'
}

function CircularProgress({ score, size = 80, strokeWidth = 6 }: { score: number; size?: number; strokeWidth?: number }) {
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
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-white">{score}</span>
      </div>
    </div>
  )
}

function ScoreItem({
  icon: Icon,
  label,
  score,
  description,
  explanation,
}: {
  icon: typeof MapPin
  label: string
  score: ScoreData
  description?: string
  explanation?: string
}) {
  return (
    <div className="flex flex-col items-center text-center p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[#636366]" />
        <span className="text-sm font-medium text-[#a1a1a6]">{label}</span>
      </div>
      <CircularProgress score={score.score} />
      <p className={`mt-3 text-sm font-medium ${getScoreColorClass(score.score)}`}>
        {score.description}
      </p>
      {explanation && (
        <p className="mt-1 text-xs text-[#636366] leading-relaxed">
          {explanation}
        </p>
      )}
    </div>
  )
}

export function LocationScoresCard({
  walkScore,
  transitScore,
  bikeScore,
  overall,
}: LocationScoresCardProps) {
  // Don't render if no scores available
  if (!walkScore && !transitScore && !bikeScore) {
    return null
  }

  const scores = [
    { key: 'walk', icon: MapPin, label: 'Walk Score', data: walkScore },
    { key: 'transit', icon: Train, label: 'Transit Score', data: transitScore },
    { key: 'bike', icon: Bike, label: 'Bike Score', data: bikeScore },
  ].filter((s) => s.data !== null && s.data !== undefined)

  return (
    <section className="py-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-1">Location Scores</h2>
        {overall && (
          <p className="text-sm text-[#a1a1a6]">
            Overall: <span className={getScoreColorClass(overall.score)}>{overall.score}</span>{' '}
            <span className="text-[#636366]">· {overall.description}</span>
          </p>
        )}
      </div>

      <div className={`grid gap-4 ${scores.length === 1 ? 'grid-cols-1 max-w-xs' : scores.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {scores.map(({ key, icon, label, data }) => (
          <ScoreItem
            key={key}
            icon={icon}
            label={label}
            score={data!}
            explanation={data!.explanation}
          />
        ))}
      </div>

      <p className="mt-4 text-xs text-[#636366]">
        Scores provided by Walk Score®
      </p>
    </section>
  )
}
