'use client'

import { cn } from '@/lib/utils'
import { type SelectionMode } from '@/stores/useBookingStore'

interface ServiceModeToggleProps {
  mode: SelectionMode
  onModeChange: (mode: SelectionMode) => void
}

export function ServiceModeToggle({ mode, onModeChange }: ServiceModeToggleProps) {
  return (
    <div className="mb-12">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4 text-center">
        How would you like to book?
      </p>

      <div className="flex border border-white/[0.12] max-w-md mx-auto">
        <button
          onClick={() => onModeChange('package')}
          className={cn(
            'flex-1 py-4 px-6 text-[15px] font-medium transition-colors',
            mode === 'package'
              ? 'bg-[#A29991] text-black'
              : 'bg-transparent text-white hover:bg-white/[0.04]'
          )}
        >
          <span className="block font-serif text-lg mb-1">Package</span>
          <span className="block text-[13px] opacity-70">
            {mode === 'package' ? 'Best value bundles' : 'Best value bundles'}
          </span>
        </button>

        <button
          onClick={() => onModeChange('individual')}
          className={cn(
            'flex-1 py-4 px-6 text-[15px] font-medium transition-colors border-l border-white/[0.12]',
            mode === 'individual'
              ? 'bg-[#A29991] text-black'
              : 'bg-transparent text-white hover:bg-white/[0.04]'
          )}
        >
          <span className="block font-serif text-lg mb-1">A La Carte</span>
          <span className="block text-[13px] opacity-70">
            {mode === 'individual' ? 'Pick what you need' : 'Pick what you need'}
          </span>
        </button>
      </div>
    </div>
  )
}
