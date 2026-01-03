'use client'

import { Key, Lock, DoorOpen, AlertCircle } from 'lucide-react'

interface AccessDetails {
  lockboxCode?: string
  gateCode?: string
  accessInstructions?: string
}

interface VacantAccessFormProps {
  accessDetails: AccessDetails
  onAccessDetailsChange: (details: Partial<AccessDetails>) => void
}

export function VacantAccessForm({
  accessDetails,
  onAccessDetailsChange,
}: VacantAccessFormProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-2">
          Access Information
        </p>
        <p className="text-[14px] text-[#8A847F]">
          Provide entry details so our team can access the property.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Lockbox Code */}
        <div>
          <label className="flex items-center gap-2 text-[13px] text-[#B5ADA6] mb-2">
            <Lock className="w-3.5 h-3.5 text-[#A29991]" />
            Lockbox Code
          </label>
          <input
            type="text"
            value={accessDetails.lockboxCode || ''}
            onChange={(e) => onAccessDetailsChange({ lockboxCode: e.target.value })}
            placeholder="1234"
            className="w-full px-4 py-3 bg-black border border-white/[0.12] text-white placeholder-[#6a6765] text-[15px] focus:outline-none focus:border-[#A29991] transition-colors"
          />
        </div>

        {/* Gate Code */}
        <div>
          <label className="flex items-center gap-2 text-[13px] text-[#B5ADA6] mb-2">
            <Key className="w-3.5 h-3.5 text-[#A29991]" />
            Gate Code (if applicable)
          </label>
          <input
            type="text"
            value={accessDetails.gateCode || ''}
            onChange={(e) => onAccessDetailsChange({ gateCode: e.target.value })}
            placeholder="#1234"
            className="w-full px-4 py-3 bg-black border border-white/[0.12] text-white placeholder-[#6a6765] text-[15px] focus:outline-none focus:border-[#A29991] transition-colors"
          />
        </div>
      </div>

      {/* Access Instructions */}
      <div>
        <label className="flex items-center gap-2 text-[13px] text-[#B5ADA6] mb-2">
          <DoorOpen className="w-3.5 h-3.5 text-[#A29991]" />
          Access Instructions
        </label>
        <textarea
          value={accessDetails.accessInstructions || ''}
          onChange={(e) => onAccessDetailsChange({ accessInstructions: e.target.value })}
          placeholder="Lockbox is on the front door. Please enter through the garage..."
          rows={3}
          className="w-full px-4 py-3 bg-black border border-white/[0.12] text-white placeholder-[#6a6765] text-[15px] focus:outline-none focus:border-[#A29991] transition-colors resize-none"
        />
      </div>

      {/* Security Note */}
      <div className="flex gap-3 p-4 border border-[#A29991]/20 bg-[#A29991]/[0.04]">
        <AlertCircle className="w-4 h-4 text-[#A29991] shrink-0 mt-0.5" />
        <p className="text-[13px] text-[#B5ADA6] leading-relaxed">
          Access codes are encrypted and only shared with the assigned photographer
          on the day of the shoot.
        </p>
      </div>
    </div>
  )
}
