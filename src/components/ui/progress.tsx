'use client'

import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  showLabel?: boolean
  label?: string
  animated?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

const variantClasses = {
  default: 'bg-blue-600 dark:bg-blue-500',
  success: 'bg-green-600 dark:bg-green-500',
  warning: 'bg-yellow-600 dark:bg-yellow-500',
  error: 'bg-red-600 dark:bg-red-500',
  info: 'bg-cyan-600 dark:bg-cyan-500',
}

export function Progress({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = false,
  className,
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label && (
            <span className="text-neutral-700 dark:text-neutral-300">{label}</span>
          )}
          {showLabel && (
            <span className="text-neutral-500 dark:text-neutral-400">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700',
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            variantClasses[variant],
            animated && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}

interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  showLabel?: boolean
  className?: string
}

const circularVariantClasses = {
  default: 'text-blue-600 dark:text-blue-500',
  success: 'text-green-600 dark:text-green-500',
  warning: 'text-yellow-600 dark:text-yellow-500',
  error: 'text-red-600 dark:text-red-500',
  info: 'text-cyan-600 dark:text-cyan-500',
}

export function CircularProgress({
  value,
  max = 100,
  size = 64,
  strokeWidth = 4,
  variant = 'default',
  showLabel = true,
  className,
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-neutral-200 dark:stroke-neutral-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={cn('transition-all duration-300', circularVariantClasses[variant])}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
          stroke="currentColor"
        />
      </svg>
      {showLabel && (
        <span className="absolute text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

interface StepProgressProps {
  steps: string[]
  currentStep: number
  variant?: 'default' | 'success'
  className?: string
}

export function StepProgress({
  steps,
  currentStep,
  variant = 'default',
  className,
}: StepProgressProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isLast = index === steps.length - 1

          return (
            <div key={step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                    isCompleted
                      ? 'border-green-600 bg-green-600 text-white'
                      : isCurrent
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-neutral-300 bg-white text-neutral-500 dark:border-neutral-600 dark:bg-neutral-800'
                  )}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium',
                    isCurrent || isCompleted
                      ? 'text-neutral-900 dark:text-white'
                      : 'text-neutral-500 dark:text-neutral-400'
                  )}
                >
                  {step}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1',
                    isCompleted
                      ? 'bg-green-600'
                      : 'bg-neutral-300 dark:bg-neutral-600'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
