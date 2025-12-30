'use client'

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google?: {
      maps: typeof google.maps
    }
    initGooglePlaces?: () => void
  }
}

export interface PlaceResult {
  formatted: string
  street: string
  city: string
  state: string
  zip: string
  lat: number
  lng: number
  placeId: string
}

interface GooglePlacesAutocompleteProps {
  value?: string
  onSelect: (place: PlaceResult) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
  restrictToState?: string // e.g., 'FL' to restrict to Florida
}

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script'

// Check if Google Maps is loaded
function isGoogleMapsLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.google?.maps?.places
}

// Load Google Maps script
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isGoogleMapsLoaded()) {
      resolve()
      return
    }

    // Check if script is already loading
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)
    if (existingScript) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (isGoogleMapsLoaded()) {
          clearInterval(checkLoaded)
          resolve()
        }
      }, 100)
      return
    }

    // Create callback function
    window.initGooglePlaces = () => {
      resolve()
    }

    // Create script element
    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`
    script.async = true
    script.defer = true
    script.onerror = () => reject(new Error('Failed to load Google Maps'))

    document.head.appendChild(script)
  })
}

// Parse address components from Google Places result
function parseAddressComponents(
  place: google.maps.places.PlaceResult
): Omit<PlaceResult, 'lat' | 'lng'> {
  const components = place.address_components || []
  const result = {
    formatted: place.formatted_address || '',
    street: '',
    city: '',
    state: '',
    zip: '',
    placeId: place.place_id || '',
  }

  let streetNumber = ''
  let streetName = ''

  for (const component of components) {
    const types = component.types

    if (types.includes('street_number')) {
      streetNumber = component.long_name
    } else if (types.includes('route')) {
      streetName = component.long_name
    } else if (types.includes('locality') || types.includes('sublocality')) {
      result.city = component.long_name
    } else if (types.includes('administrative_area_level_1')) {
      result.state = component.short_name
    } else if (types.includes('postal_code')) {
      result.zip = component.long_name
    }
  }

  result.street = streetNumber ? `${streetNumber} ${streetName}` : streetName

  return result
}

export function GooglePlacesAutocomplete({
  value,
  onSelect,
  placeholder = 'Enter property address',
  label = 'Property Address',
  error,
  disabled,
  className,
  restrictToState = 'FL',
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [inputValue, setInputValue] = useState(value || '')
  const [isSelected, setIsSelected] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Initialize Google Places autocomplete
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

    if (!apiKey) {
      setLoadError('Google Places API key not configured')
      setIsLoading(false)
      return
    }

    let mounted = true

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!mounted || !inputRef.current) return

        // Create autocomplete instance
        const autocomplete = new window.google!.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ['address'],
            componentRestrictions: restrictToState
              ? { country: 'us' }
              : undefined,
            fields: [
              'address_components',
              'formatted_address',
              'geometry',
              'place_id',
            ],
          }
        )

        // Add state bias if specified
        if (restrictToState) {
          // Bias towards Florida
          const floridaBounds = new window.google!.maps.LatLngBounds(
            { lat: 24.396308, lng: -87.634896 }, // SW Florida
            { lat: 31.000968, lng: -79.974307 } // NE Florida
          )
          autocomplete.setBounds(floridaBounds)
        }

        // Handle place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()

          if (!place.geometry?.location) {
            setIsSelected(false)
            return
          }

          const parsed = parseAddressComponents(place)
          const result: PlaceResult = {
            ...parsed,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          }

          setInputValue(parsed.formatted)
          setIsSelected(true)
          onSelect(result)
        })

        autocompleteRef.current = autocomplete
        setIsLoading(false)
      })
      .catch((err) => {
        if (mounted) {
          setLoadError(err.message)
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [onSelect, restrictToState])

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
      setIsSelected(false)
    },
    []
  )

  // Status icon
  const StatusIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    }
    if (loadError || error) {
      return <AlertCircle className="h-4 w-4 text-destructive" />
    }
    if (isSelected) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
    return <MapPin className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor="address-autocomplete" className="text-foreground">
          {label}
        </Label>
      )}

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          <StatusIcon />
        </div>

        <Input
          ref={inputRef}
          id="address-autocomplete"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={cn(
            'pl-10 pr-4',
            error && 'border-destructive focus-visible:ring-destructive',
            isSelected && 'border-green-500/50 focus-visible:ring-green-500/50'
          )}
          autoComplete="off"
        />
      </div>

      {(error || loadError) && (
        <p className="text-sm text-destructive">{error || loadError}</p>
      )}

      {isSelected && (
        <p className="text-xs text-muted-foreground">
          Address verified via Google Maps
        </p>
      )}
    </div>
  )
}

// Separate component for displaying selected address details
interface SelectedAddressDisplayProps {
  address: PlaceResult
  onEdit?: () => void
}

export function SelectedAddressDisplay({
  address,
  onEdit,
}: SelectedAddressDisplayProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-foreground">{address.street}</p>
            <p className="text-sm text-muted-foreground">
              {address.city}, {address.state} {address.zip}
            </p>
          </div>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Change
          </button>
        )}
      </div>
    </div>
  )
}
