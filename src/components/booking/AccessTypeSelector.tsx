'use client'

import { Building2, Home, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type OccupancyStatus } from '@/stores/useBookingStore'

interface AccessTypeSelectorProps {
  occupancyStatus: OccupancyStatus
  onOccupancyChange: (status: OccupancyStatus) => void
}

const occupancyOptions = [
  {
    id: 'vacant' as const,
    label: 'Vacant',
    description: 'Property is empty and ready for photography',
    icon: Building2,
  },
  {
    id: 'owner-occupied' as const,
    label: 'Owner Occupied',
    description: 'Current owner will need advance notice',
    icon: Home,
  },
  {
    id: 'tenant-occupied' as const,
    label: 'Tenant Occupied',
    description: 'Tenant coordination required',
    icon: Users,
  },
]

export function AccessTypeSelector({
  occupancyStatus,
  onOccupancyChange,
}: AccessTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-2">
          Property Status
        </p>
        <p className="text-[14px] text-[#8A847F]">
          Help us prepare for the best possible shoot experience.
        </p>
      </div>

      <div className="grid gap-3">
        {occupancyOptions.map((option) => {
          const Icon = option.icon
          const isSelected = occupancyStatus === option.id

          return (
            <button
              key={option.id}
              onClick={() => onOccupancyChange(option.id)}
              className={cn(
                'flex items-start gap-4 p-5 border text-left transition-all',
                isSelected
                  ? 'border-[#A29991] bg-[#A29991]/[0.04]'
                  : 'border-white/[0.08] hover:border-white/[0.16]'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 flex items-center justify-center border shrink-0',
                  isSelected
                    ? 'border-[#A29991] text-[#A29991]'
                    : 'border-white/[0.12] text-[#6a6765]'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-[15px] font-medium text-white block">
                  {option.label}
                </span>
                <span className="text-[13px] text-[#8A847F] block mt-0.5">
                  {option.description}
                </span>
              </div>

              <div
                className={cn(
                  'w-5 h-5 border shrink-0 flex items-center justify-center mt-0.5 transition-colors',
                  isSelected
                    ? 'bg-[#A29991] border-[#A29991]'
                    : 'border-white/[0.24]'
                )}
              >
                {isSelected && (
                  <svg
                    className="w-3.5 h-3.5 text-black"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
