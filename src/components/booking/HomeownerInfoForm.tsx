'use client'

import { User, Mail, Phone, MessageSquare, PawPrint, Key, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type HomeownerInfo } from '@/stores/useBookingStore'

interface HomeownerInfoFormProps {
  homeownerInfo: HomeownerInfo | undefined
  onHomeownerInfoChange: (info: Partial<HomeownerInfo>) => void
  occupancyType: 'owner-occupied' | 'tenant-occupied'
}

const contactMethods = [
  { id: 'email' as const, label: 'Email', icon: Mail },
  { id: 'phone' as const, label: 'Call', icon: Phone },
  { id: 'text' as const, label: 'Text', icon: MessageSquare },
]

export function HomeownerInfoForm({
  homeownerInfo,
  onHomeownerInfoChange,
  occupancyType,
}: HomeownerInfoFormProps) {
  const personLabel = occupancyType === 'owner-occupied' ? 'Homeowner' : 'Tenant'

  const updateField = (field: keyof HomeownerInfo, value: string) => {
    onHomeownerInfoChange({
      ...homeownerInfo,
      [field]: value,
    } as Partial<HomeownerInfo>)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-2">
          {personLabel} Contact
        </p>
        <p className="text-[14px] text-[#8A847F]">
          We&apos;ll coordinate the shoot directly with the {personLabel.toLowerCase()}.
        </p>
      </div>

      {/* Name & Contact */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 text-[13px] text-[#B5ADA6] mb-2">
            <User className="w-3.5 h-3.5 text-[#A29991]" />
            {personLabel} Name *
          </label>
          <input
            type="text"
            value={homeownerInfo?.name || ''}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="John Smith"
            className="w-full px-4 py-3 bg-black border border-white/[0.12] text-white placeholder-[#6a6765] text-[15px] focus:outline-none focus:border-[#A29991] transition-colors"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-[13px] text-[#B5ADA6] mb-2">
            <Phone className="w-3.5 h-3.5 text-[#A29991]" />
            Phone Number *
          </label>
          <input
            type="tel"
            value={homeownerInfo?.phone || ''}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="(407) 555-1234"
            className="w-full px-4 py-3 bg-black border border-white/[0.12] text-white placeholder-[#6a6765] text-[15px] focus:outline-none focus:border-[#A29991] transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-[13px] text-[#B5ADA6] mb-2">
          <Mail className="w-3.5 h-3.5 text-[#A29991]" />
          Email Address
        </label>
        <input
          type="email"
          value={homeownerInfo?.email || ''}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="john@example.com"
          className="w-full px-4 py-3 bg-black border border-white/[0.12] text-white placeholder-[#6a6765] text-[15px] focus:outline-none focus:border-[#A29991] transition-colors"
        />
      </div>

      {/* Preferred Contact Method */}
      <div>
        <label className="text-[13px] text-[#B5ADA6] mb-3 block">
          Preferred Contact Method
        </label>
        <div className="flex gap-2">
          {contactMethods.map((method) => {
            const Icon = method.icon
            const isSelected = homeownerInfo?.preferredContactMethod === method.id

            return (
              <button
                key={method.id}
                onClick={() => updateField('preferredContactMethod', method.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 border text-[14px] font-medium transition-colors',
                  isSelected
                    ? 'bg-[#A29991] border-[#A29991] text-black'
                    : 'bg-transparent border-white/[0.12] text-white hover:border-white/[0.24]'
                )}
              >
                <Icon className="w-4 h-4" />
                {method.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.06]" />

      {/* Additional Details */}
      <div className="space-y-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#6a6765]">
          Additional Details (Optional)
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-[13px] text-[#B5ADA6] mb-2">
              <Key className="w-3.5 h-3.5 text-[#A29991]" />
              Gate Code
            </label>
            <input
              type="text"
              value={homeownerInfo?.gateCode || ''}
              onChange={(e) => updateField('gateCode', e.target.value)}
              placeholder="#1234"
              className="w-full px-4 py-3 bg-black border border-white/[0.12] text-white placeholder-[#6a6765] text-[15px] focus:outline-none focus:border-[#A29991] transition-colors"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-[13px] text-[#B5ADA6] mb-2">
              <PawPrint className="w-3.5 h-3.5 text-[#A29991]" />
              Pets on Property
            </label>
            <input
              type="text"
              value={homeownerInfo?.petInfo || ''}
              onChange={(e) => updateField('petInfo', e.target.value)}
              placeholder="2 dogs, will be secured"
              className="w-full px-4 py-3 bg-black border border-white/[0.12] text-white placeholder-[#6a6765] text-[15px] focus:outline-none focus:border-[#A29991] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-[13px] text-[#B5ADA6] mb-2">
            <FileText className="w-3.5 h-3.5 text-[#A29991]" />
            Special Instructions
          </label>
          <textarea
            value={homeownerInfo?.accessInstructions || ''}
            onChange={(e) => updateField('accessInstructions', e.target.value)}
            placeholder="Ring doorbell on arrival. Please remove shoes..."
            rows={3}
            className="w-full px-4 py-3 bg-black border border-white/[0.12] text-white placeholder-[#6a6765] text-[15px] focus:outline-none focus:border-[#A29991] transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  )
}
