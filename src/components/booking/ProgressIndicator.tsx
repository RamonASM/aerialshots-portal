'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  label: string
}

interface ProgressIndicatorProps {
  steps: readonly Step[]
  currentStep: number
  className?: string
}

export function ProgressIndicator({ steps, currentStep, className }: ProgressIndicatorProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Desktop Progress */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                  index < currentStep
                    ? 'bg-blue-500 text-white'
                    : index === currentStep
                    ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400'
                    : 'bg-neutral-800 text-neutral-500'
                )}
              >
                {index < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium whitespace-nowrap',
                  index <= currentStep ? 'text-white' : 'text-neutral-500'
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-4">
                <div
                  className={cn(
                    'h-full transition-all',
                    index < currentStep ? 'bg-blue-500' : 'bg-neutral-700'
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile Progress */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-neutral-400">{steps[currentStep].label}</span>
        </div>
        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
