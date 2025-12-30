/**
 * Sold Map Component
 *
 * Interactive map showing sold properties
 */

'use client'

import { useState, useEffect } from 'react'
import { MapPin, Home, DollarSign, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SoldProperty {
  id: string
  address: string
  city: string
  state: string
  lat: number
  lng: number
  soldPrice: number
  soldDate?: string
  beds?: number
  baths?: number
  sqft?: number
  imageUrl?: string
}

interface SoldMapProps {
  properties: SoldProperty[]
  brandColor?: string
  className?: string
}

export function SoldMap({
  properties,
  brandColor = '#0077ff',
  className,
}: SoldMapProps) {
  const [selectedProperty, setSelectedProperty] = useState<SoldProperty | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Calculate map center from properties
  const center = calculateCenter(properties)
  const zoom = calculateZoom(properties)

  // For MVP, show a static map with markers
  // TODO: Integrate with Google Maps or Mapbox for full interactivity
  const staticMapUrl = generateStaticMapUrl(properties, center, zoom, brandColor)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Map */}
      <div className="relative rounded-xl border border-white/[0.08] overflow-hidden bg-[#1c1c1e]">
        {/* Map Container */}
        <div className="relative h-[400px]">
          {staticMapUrl ? (
            <img
              src={staticMapUrl}
              alt="Map of sold properties"
              className="h-full w-full object-cover"
              onLoad={() => setMapLoaded(true)}
            />
          ) : (
            // Fallback: CSS Grid Map Visualization
            <div className="h-full p-4">
              <CSSMapVisualization
                properties={properties}
                brandColor={brandColor}
                onSelect={setSelectedProperty}
                selectedId={selectedProperty?.id}
              />
            </div>
          )}

          {/* Loading overlay */}
          {!mapLoaded && staticMapUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1c1c1e]">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: brandColor,
                  borderRightColor: brandColor,
                }}
              />
            </div>
          )}

          {/* Stats Overlay */}
          <div className="absolute bottom-4 left-4 rounded-lg bg-black/70 backdrop-blur-sm px-4 py-2">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: brandColor }}
                />
                <span className="text-white font-medium">{properties.length}</span>
                <span className="text-[#a1a1a6]">Sold Properties</span>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" style={{ color: brandColor }} />
                <span className="text-white font-medium">
                  ${formatVolume(totalVolume(properties))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Property Card */}
      {selectedProperty && (
        <PropertyCard
          property={selectedProperty}
          brandColor={brandColor}
          onClose={() => setSelectedProperty(null)}
        />
      )}

      {/* Property List (Compact) */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {properties.slice(0, 6).map((property) => (
          <button
            key={property.id}
            onClick={() => setSelectedProperty(property)}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
              selectedProperty?.id === property.id
                ? 'border-transparent'
                : 'border-white/[0.08] bg-[#1c1c1e] hover:border-white/[0.15]'
            )}
            style={
              selectedProperty?.id === property.id
                ? { backgroundColor: `${brandColor}15`, borderColor: `${brandColor}40` }
                : undefined
            }
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${brandColor}20` }}
            >
              <MapPin className="h-4 w-4" style={{ color: brandColor }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {property.address}
              </p>
              <p className="text-[12px] text-[#636366]">
                {property.city}, {property.state} · ${(property.soldPrice / 1000).toFixed(0)}K
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * CSS-based map visualization as fallback when no map API available
 */
function CSSMapVisualization({
  properties,
  brandColor,
  onSelect,
  selectedId,
}: {
  properties: SoldProperty[]
  brandColor: string
  onSelect: (property: SoldProperty) => void
  selectedId?: string
}) {
  // Normalize coordinates to percentage positions
  const bounds = getBounds(properties)
  const padding = 0.1 // 10% padding

  return (
    <div className="relative h-full w-full">
      {/* Grid Background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${brandColor}20 1px, transparent 1px),
            linear-gradient(to bottom, ${brandColor}20 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Property Markers */}
      {properties.map((property) => {
        const x = normalizeCoord(property.lng, bounds.minLng, bounds.maxLng, padding)
        const y = 100 - normalizeCoord(property.lat, bounds.minLat, bounds.maxLat, padding)

        return (
          <button
            key={property.id}
            onClick={() => onSelect(property)}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125"
            style={{
              left: `${x}%`,
              top: `${y}%`,
            }}
          >
            <div
              className={cn(
                'rounded-full p-1.5 shadow-lg',
                selectedId === property.id ? 'ring-2 ring-white' : ''
              )}
              style={{ backgroundColor: brandColor }}
            >
              <Home className="h-3 w-3 text-white" />
            </div>
            {/* Price Tag on Hover */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-0.5 text-[10px] text-white opacity-0 hover:opacity-100 transition-opacity">
              ${(property.soldPrice / 1000).toFixed(0)}K
            </div>
          </button>
        )
      })}
    </div>
  )
}

function PropertyCard({
  property,
  brandColor,
  onClose,
}: {
  property: SoldProperty
  brandColor: string
  onClose: () => void
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          {property.imageUrl && (
            <img
              src={property.imageUrl}
              alt={property.address}
              className="h-20 w-28 rounded-lg object-cover"
            />
          )}
          <div>
            <h4 className="font-semibold text-white">{property.address}</h4>
            <p className="text-[13px] text-[#636366]">
              {property.city}, {property.state}
            </p>
            <div className="mt-2 flex items-center gap-3 text-[13px]">
              <span className="font-medium" style={{ color: brandColor }}>
                ${property.soldPrice.toLocaleString()}
              </span>
              {property.beds && (
                <span className="text-[#a1a1a6]">{property.beds} bed</span>
              )}
              {property.baths && (
                <span className="text-[#a1a1a6]">{property.baths} bath</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[#636366] hover:text-white transition-colors"
        >
          <span className="sr-only">Close</span>
          ×
        </button>
      </div>
    </div>
  )
}

// Utility functions
function calculateCenter(properties: SoldProperty[]): { lat: number; lng: number } {
  if (properties.length === 0) return { lat: 28.5383, lng: -81.3792 } // Orlando default

  const sum = properties.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  )
  return {
    lat: sum.lat / properties.length,
    lng: sum.lng / properties.length,
  }
}

function calculateZoom(properties: SoldProperty[]): number {
  if (properties.length <= 1) return 12
  const bounds = getBounds(properties)
  const latRange = bounds.maxLat - bounds.minLat
  const lngRange = bounds.maxLng - bounds.minLng
  const maxRange = Math.max(latRange, lngRange)

  if (maxRange > 2) return 8
  if (maxRange > 1) return 9
  if (maxRange > 0.5) return 10
  if (maxRange > 0.2) return 11
  return 12
}

function getBounds(properties: SoldProperty[]) {
  if (properties.length === 0) {
    return { minLat: 28, maxLat: 29, minLng: -82, maxLng: -81 }
  }
  return properties.reduce(
    (acc, p) => ({
      minLat: Math.min(acc.minLat, p.lat),
      maxLat: Math.max(acc.maxLat, p.lat),
      minLng: Math.min(acc.minLng, p.lng),
      maxLng: Math.max(acc.maxLng, p.lng),
    }),
    { minLat: Infinity, maxLat: -Infinity, minLng: Infinity, maxLng: -Infinity }
  )
}

function normalizeCoord(
  value: number,
  min: number,
  max: number,
  padding: number
): number {
  const range = max - min
  const paddedMin = min - range * padding
  const paddedMax = max + range * padding
  const paddedRange = paddedMax - paddedMin
  return ((value - paddedMin) / paddedRange) * 100
}

function totalVolume(properties: SoldProperty[]): number {
  return properties.reduce((sum, p) => sum + p.soldPrice, 0)
}

function formatVolume(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`
  return amount.toString()
}

function generateStaticMapUrl(
  properties: SoldProperty[],
  center: { lat: number; lng: number },
  zoom: number,
  brandColor: string
): string | null {
  // This would generate a Google Static Maps URL
  // For now, return null to use CSS fallback
  // TODO: Implement with actual Google Maps API key
  return null
}
