'use client'

import { Camera } from 'lucide-react'

interface PhotographerWorkload {
  id: string
  name: string
  jobCount: number
}

interface WorkloadChartProps {
  workload: PhotographerWorkload[]
}

export function WorkloadChart({ workload }: WorkloadChartProps) {
  const maxJobs = Math.max(...workload.map(p => p.jobCount), 1)

  if (workload.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="h-5 w-5 text-neutral-600" />
          <h3 className="font-semibold text-neutral-900">Photographer Workload</h3>
        </div>
        <p className="text-sm text-neutral-500">No active photographers</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <Camera className="h-5 w-5 text-neutral-600" />
        <h3 className="font-semibold text-neutral-900">Photographer Workload</h3>
      </div>

      <div className="space-y-3">
        {workload.map((photographer) => {
          const percentage = (photographer.jobCount / maxJobs) * 100

          return (
            <div key={photographer.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-neutral-700">
                  {photographer.name}
                </span>
                <span className="text-sm text-neutral-600">
                  {photographer.jobCount} {photographer.jobCount === 1 ? 'job' : 'jobs'}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
