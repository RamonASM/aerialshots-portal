'use client'

import { MapPin, Home, Ruler } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PropertyData {
  address: string
  city: string
  state: string
  zip: string
  sqft?: number
  beds?: number
  baths?: number
  accessInstructions?: string
}

interface PropertyStepProps {
  data: PropertyData
  onChange: (data: Partial<PropertyData>) => void
}

export function PropertyStep({ data, onChange }: PropertyStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-white mb-2">
          Property Details
        </h3>
        <p className="text-neutral-400">
          Tell us about the property we&apos;ll be photographing.
        </p>
      </div>

      {/* Address Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-400">
          <MapPin className="w-4 h-4" />
          <span>Property Address</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Street Address *
          </label>
          <input
            type="text"
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="123 Main Street"
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              City *
            </label>
            <input
              type="text"
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="Orlando"
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              State
            </label>
            <input
              type="text"
              value={data.state}
              onChange={(e) => onChange({ state: e.target.value })}
              placeholder="FL"
              maxLength={2}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              ZIP Code *
            </label>
            <input
              type="text"
              value={data.zip}
              onChange={(e) => onChange({ zip: e.target.value })}
              placeholder="32801"
              maxLength={10}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div className="space-y-4 pt-4 border-t border-neutral-800">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-400">
          <Home className="w-4 h-4" />
          <span>Property Info (Optional)</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Bedrooms
            </label>
            <input
              type="number"
              value={data.beds || ''}
              onChange={(e) => onChange({ beds: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="3"
              min={0}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Bathrooms
            </label>
            <input
              type="number"
              value={data.baths || ''}
              onChange={(e) => onChange({ baths: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="2"
              min={0}
              step={0.5}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Sqft
            </label>
            <input
              type="number"
              value={data.sqft || ''}
              onChange={(e) => onChange({ sqft: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="2,000"
              min={0}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Access Instructions */}
      <div className="space-y-4 pt-4 border-t border-neutral-800">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-400">
          <Ruler className="w-4 h-4" />
          <span>Access Instructions (Optional)</span>
        </div>

        <textarea
          value={data.accessInstructions || ''}
          onChange={(e) => onChange({ accessInstructions: e.target.value })}
          placeholder="Lockbox code, gate code, or any special instructions for accessing the property..."
          rows={3}
          className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
        />
      </div>
    </div>
  )
}
