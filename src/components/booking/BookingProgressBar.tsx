'use client'

import { cn } from '@/lib/utils'
import { BOOKING_STEPS } from '@/stores/useBookingStore'

interface BookingProgressBarProps {
  currentStep: number
  className?: string
}

export function BookingProgressBar({ currentStep, className }: BookingProgressBarProps) {
  return (
    <div className={cn('border-b border-white/[0.06]', className)}>
      <div className="container">
        <div className="flex">
          {BOOKING_STEPS.map((step, index) => {
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            const isLast = index === BOOKING_STEPS.length - 1

            return (
              <div
                key={step.id}
                className={cn(
                  'flex-1 relative',
                  !isLast && 'border-r border-white/[0.06]'
                )}
              >
                <div
                  className={cn(
                    'py-6 px-4 transition-colors',
                    isActive && 'bg-[#A29991]/[0.04]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'text-[11px] uppercase tracking-[0.15em] font-medium',
                        isActive
                          ? 'text-[#A29991]'
                          : isCompleted
                          ? 'text-[#B5ADA6]'
                          : 'text-[#6a6765]'
                      )}
                    >
                      {step.shortLabel}
                    </span>
                    <span
                      className={cn(
                        'text-[14px] hidden sm:block',
                        isActive
                          ? 'text-white'
                          : isCompleted
                          ? 'text-[#B5ADA6]'
                          : 'text-[#6a6765]'
                      )}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Progress bar at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5">
                    <div
                      className={cn(
                        'h-full transition-all',
                        isActive
                          ? 'bg-[#A29991]'
                          : isCompleted
                          ? 'bg-[#A29991]/50'
                          : 'bg-transparent'
                      )}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
