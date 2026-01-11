'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface Prediction {
  description: string
  placeId: string
  mainText: string
  secondaryText: string
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

// Generate a session token for billing optimization
function generateSessionToken(): string {
  return crypto.randomUUID()
}

export function GooglePlacesAutocomplete({
  value,
  onSelect,
  placeholder = 'Enter property address',
  label = 'Property Address',
  error,
  disabled,
  className,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const sessionTokenRef = useRef<string>(generateSessionToken())
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState(value || '')
  const [isSelected, setIsSelected] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  // Fetch autocomplete predictions from our server-side API
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setPredictions([])
      return
    }

    setIsLoading(true)
    setLoadError(null)

    try {
      const params = new URLSearchParams({
        input,
        sessiontoken: sessionTokenRef.current,
      })

      const response = await fetch(`/api/places/autocomplete?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch predictions')
      }

      setPredictions(data.predictions || [])
      setShowDropdown(data.predictions?.length > 0)
    } catch (err) {
      console.error('[Places] Fetch error:', err)
      setLoadError(err instanceof Error ? err.message : 'Failed to search addresses')
      setPredictions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch place details when a prediction is selected
  const fetchPlaceDetails = useCallback(
    async (placeId: string) => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const params = new URLSearchParams({
          placeId,
          sessiontoken: sessionTokenRef.current,
        })

        const response = await fetch(`/api/places/autocomplete?${params}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch place details')
        }

        // Generate new session token after completing a session
        sessionTokenRef.current = generateSessionToken()

        const result: PlaceResult = {
          formatted: data.formatted,
          street: data.street,
          city: data.city,
          state: data.state,
          zip: data.zip,
          lat: data.lat,
          lng: data.lng,
          placeId: data.placeId,
        }

        setInputValue(result.formatted)
        setIsSelected(true)
        setPredictions([])
        setShowDropdown(false)
        onSelect(result)
      } catch (err) {
        console.error('[Places] Details error:', err)
        setLoadError(err instanceof Error ? err.message : 'Failed to get address details')
      } finally {
        setIsLoading(false)
      }
    },
    [onSelect]
  )

  // Handle input change with debounce
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInputValue(newValue)
      setIsSelected(false)
      setHighlightedIndex(-1)

      // Debounce the API call
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(() => {
        fetchPredictions(newValue)
      }, 300)
    },
    [fetchPredictions]
  )

  // Handle prediction selection
  const handleSelectPrediction = useCallback(
    (prediction: Prediction) => {
      setInputValue(prediction.description)
      fetchPlaceDetails(prediction.placeId)
    },
    [fetchPlaceDetails]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown || predictions.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex((prev) =>
            prev < predictions.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev))
          break
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < predictions.length) {
            handleSelectPrediction(predictions[highlightedIndex])
          }
          break
        case 'Escape':
          setShowDropdown(false)
          setHighlightedIndex(-1)
          break
      }
    },
    [showDropdown, predictions, highlightedIndex, handleSelectPrediction]
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

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
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0) {
              setShowDropdown(true)
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'pl-10 pr-4',
            error && 'border-destructive focus-visible:ring-destructive',
            isSelected && 'border-green-500/50 focus-visible:ring-green-500/50'
          )}
          autoComplete="off"
        />

        {/* Predictions dropdown */}
        {showDropdown && predictions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover shadow-lg"
          >
            {predictions.map((prediction, index) => (
              <button
                key={prediction.placeId}
                type="button"
                className={cn(
                  'flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors',
                  'hover:bg-accent focus:bg-accent focus:outline-none',
                  index === highlightedIndex && 'bg-accent'
                )}
                onClick={() => handleSelectPrediction(prediction)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span className="font-medium text-foreground">
                  {prediction.mainText}
                </span>
                <span className="text-xs text-muted-foreground">
                  {prediction.secondaryText}
                </span>
              </button>
            ))}
          </div>
        )}
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
