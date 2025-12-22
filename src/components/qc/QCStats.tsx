'use client'

import { Clock, PlayCircle, CheckCircle, Timer } from 'lucide-react'

interface QCStatsProps {
  readyForQC: number
  inProgress: number
  deliveredToday: number
  avgQCTimeMinutes: number
}

export function QCStats({
  readyForQC,
  inProgress,
  deliveredToday,
  avgQCTimeMinutes,
}: QCStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-cyan-500" />
          <span className="text-sm text-neutral-600">Ready for QC</span>
        </div>
        <p className="mt-2 text-3xl font-bold text-neutral-900">{readyForQC}</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-blue-500" />
          <span className="text-sm text-neutral-600">In Progress</span>
        </div>
        <p className="mt-2 text-3xl font-bold text-neutral-900">{inProgress}</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-sm text-neutral-600">Approved Today</span>
        </div>
        <p className="mt-2 text-3xl font-bold text-neutral-900">{deliveredToday}</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-purple-500" />
          <span className="text-sm text-neutral-600">Avg QC Time</span>
        </div>
        <p className="mt-2 text-3xl font-bold text-neutral-900">
          {avgQCTimeMinutes}
          <span className="ml-1 text-base font-normal text-neutral-600">min</span>
        </p>
      </div>
    </div>
  )
}
