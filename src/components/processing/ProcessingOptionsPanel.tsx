'use client'

import { useState } from 'react'
import {
  Sun,
  Moon,
  Cloud,
  Leaf,
  Car,
  Tv,
  Flame,
  Palette,
  ChevronDown,
  ChevronUp,
  Sliders,
  Eye,
  Sparkles,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'

// Type definitions matching FoundDR backend
export type PresetName = 'natural' | 'signature' | 'airy' | 'deep' | 'golden' | 'twilight'
export type SkyMode = 'original' | 'enhanced' | 'fluffy_wispy' | 'fluffy' | 'wispy' | 'clear_blue' | 'twilight_sunset' | 'twilight_blue_hour'
export type TVContent = 'black' | 'beach' | 'mountain' | 'city' | 'nature'
export type TwilightStyle = 'sunset' | 'blue_hour' | 'golden'

export interface ProcessingOptions {
  // HDR Processing
  preset: PresetName
  window_pull: boolean
  perspective_correction: boolean

  // Sky Replacement
  sky_mode: SkyMode

  // Grass Enhancement
  grass_greening: boolean
  grass_intensity: number

  // Object Removal
  auto_remove_objects: boolean
  remove_classes: string[]

  // Day-to-Dusk
  day_to_dusk: boolean
  twilight_style: TwilightStyle

  // TV Screen
  tv_screen: TVContent

  // Fireplace
  fireplace_fire: boolean
}

// Default options
const DEFAULT_OPTIONS: ProcessingOptions = {
  preset: 'natural',
  window_pull: true,
  perspective_correction: true,
  sky_mode: 'original',
  grass_greening: false,
  grass_intensity: 0.7,
  auto_remove_objects: false,
  remove_classes: ['car', 'truck', 'person', 'trash_can'],
  day_to_dusk: false,
  twilight_style: 'sunset',
  tv_screen: 'black',
  fireplace_fire: false,
}

// Preset descriptions
const PRESET_OPTIONS: { value: PresetName; label: string; description: string }[] = [
  { value: 'natural', label: 'Natural', description: 'Balanced, true-to-life' },
  { value: 'signature', label: 'Signature', description: 'Bright, clean, professional' },
  { value: 'airy', label: 'Airy', description: 'Light, ethereal feel' },
  { value: 'deep', label: 'Deep', description: 'Rich, dramatic contrast' },
  { value: 'golden', label: 'Golden', description: 'Warm afternoon light' },
  { value: 'twilight', label: 'Twilight', description: 'Dusk/blue hour tones' },
]

// Sky options
const SKY_OPTIONS: { value: SkyMode; label: string }[] = [
  { value: 'original', label: 'Keep Original' },
  { value: 'enhanced', label: 'Enhance Original' },
  { value: 'fluffy_wispy', label: 'Fluffy + Wispy Clouds' },
  { value: 'fluffy', label: 'Fluffy Clouds' },
  { value: 'wispy', label: 'Wispy Clouds' },
  { value: 'clear_blue', label: 'Clear Blue Sky' },
  { value: 'twilight_sunset', label: 'Twilight Sunset' },
  { value: 'twilight_blue_hour', label: 'Twilight Blue Hour' },
]

// TV content options
const TV_OPTIONS: { value: TVContent; label: string }[] = [
  { value: 'black', label: 'Black (Remove Reflections)' },
  { value: 'beach', label: 'Beach Scene' },
  { value: 'mountain', label: 'Mountain Landscape' },
  { value: 'city', label: 'City Skyline' },
  { value: 'nature', label: 'Nature Scene' },
]

// Twilight style options
const TWILIGHT_OPTIONS: { value: TwilightStyle; label: string }[] = [
  { value: 'sunset', label: 'Sunset (Orange/Pink)' },
  { value: 'blue_hour', label: 'Blue Hour (Deep Blue)' },
  { value: 'golden', label: 'Golden Hour (Warm)' },
]

// Object removal classes
const REMOVAL_CLASSES = [
  { id: 'car', label: 'Cars' },
  { id: 'truck', label: 'Trucks' },
  { id: 'person', label: 'People' },
  { id: 'trash_can', label: 'Trash Cans' },
  { id: 'stop_sign', label: 'Signs' },
]

interface ProcessingOptionsPanelProps {
  value: ProcessingOptions
  onChange: (options: ProcessingOptions) => void
  disabled?: boolean
  className?: string
  variant?: 'full' | 'compact'
}

export function ProcessingOptionsPanel({
  value = DEFAULT_OPTIONS,
  onChange,
  disabled = false,
  className = '',
  variant = 'full',
}: ProcessingOptionsPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['preset', 'enhancement'])
  )

  const toggleSection = (section: string) => {
    const next = new Set(expandedSections)
    if (next.has(section)) {
      next.delete(section)
    } else {
      next.add(section)
    }
    setExpandedSections(next)
  }

  const updateOption = <K extends keyof ProcessingOptions>(
    key: K,
    newValue: ProcessingOptions[K]
  ) => {
    onChange({ ...value, [key]: newValue })
  }

  const toggleRemovalClass = (classId: string) => {
    const current = value.remove_classes || []
    const next = current.includes(classId)
      ? current.filter((c) => c !== classId)
      : [...current, classId]
    updateOption('remove_classes', next)
  }

  if (variant === 'compact') {
    return (
      <div className={`rounded-lg border bg-card p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Processing Options</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Preset</Label>
            <Select
              value={value.preset}
              onValueChange={(v) => updateOption('preset', v as PresetName)}
              disabled={disabled}
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sky</Label>
            <Select
              value={value.sky_mode}
              onValueChange={(v) => updateOption('sky_mode', v as SkyMode)}
              disabled={disabled}
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SKY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border bg-card ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Sliders className="h-5 w-5 text-primary" />
        <span className="font-semibold">Processing Options</span>
      </div>

      {/* Preset Section */}
      <Collapsible open={expandedSections.has('preset')} onOpenChange={() => toggleSection('preset')}>
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center justify-between border-b px-4 py-3 text-left hover:bg-muted/50"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">HDR Preset</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground capitalize">{value.preset}</span>
              {expandedSections.has('preset') ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
            {PRESET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateOption('preset', opt.value)}
                disabled={disabled}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  value.preset === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.description}</div>
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Enhancement Section */}
      <Collapsible open={expandedSections.has('enhancement')} onOpenChange={() => toggleSection('enhancement')}>
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center justify-between border-b px-4 py-3 text-left hover:bg-muted/50"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Enhancements</span>
            </div>
            {expandedSections.has('enhancement') ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 p-4">
            {/* Window Pull */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>Window Pull</Label>
                  <p className="text-xs text-muted-foreground">Enhanced exterior visibility through windows</p>
                </div>
              </div>
              <Switch
                checked={value.window_pull}
                onCheckedChange={(checked) => updateOption('window_pull', checked)}
                disabled={disabled}
              />
            </div>

            {/* Perspective Correction */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>Perspective Correction</Label>
                  <p className="text-xs text-muted-foreground">Auto-straighten vertical lines</p>
                </div>
              </div>
              <Switch
                checked={value.perspective_correction}
                onCheckedChange={(checked) => updateOption('perspective_correction', checked)}
                disabled={disabled}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Sky Section */}
      <Collapsible open={expandedSections.has('sky')} onOpenChange={() => toggleSection('sky')}>
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center justify-between border-b px-4 py-3 text-left hover:bg-muted/50"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Sky</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {SKY_OPTIONS.find((o) => o.value === value.sky_mode)?.label || 'Original'}
              </span>
              {expandedSections.has('sky') ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4">
            <Select
              value={value.sky_mode}
              onValueChange={(v) => updateOption('sky_mode', v as SkyMode)}
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SKY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Grass Section */}
      <Collapsible open={expandedSections.has('grass')} onOpenChange={() => toggleSection('grass')}>
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center justify-between border-b px-4 py-3 text-left hover:bg-muted/50"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Grass Greening</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {value.grass_greening ? 'On' : 'Off'}
              </span>
              {expandedSections.has('grass') ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Grass Greening</Label>
                <p className="text-xs text-muted-foreground">Transform brown/dead grass to lush green</p>
              </div>
              <Switch
                checked={value.grass_greening}
                onCheckedChange={(checked) => updateOption('grass_greening', checked)}
                disabled={disabled}
              />
            </div>
            {value.grass_greening && (
              <div>
                <Label className="text-xs">Intensity: {Math.round(value.grass_intensity * 100)}%</Label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value.grass_intensity * 100}
                  onChange={(e) => updateOption('grass_intensity', Number(e.target.value) / 100)}
                  disabled={disabled}
                  className="w-full mt-1"
                />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Object Removal Section */}
      <Collapsible open={expandedSections.has('objects')} onOpenChange={() => toggleSection('objects')}>
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center justify-between border-b px-4 py-3 text-left hover:bg-muted/50"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Object Removal</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {value.auto_remove_objects ? 'On' : 'Off'}
              </span>
              {expandedSections.has('objects') ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Remove Objects</Label>
                <p className="text-xs text-muted-foreground">Detect and remove unwanted objects</p>
              </div>
              <Switch
                checked={value.auto_remove_objects}
                onCheckedChange={(checked) => updateOption('auto_remove_objects', checked)}
                disabled={disabled}
              />
            </div>
            {value.auto_remove_objects && (
              <div>
                <Label className="text-xs mb-2 block">Objects to Remove</Label>
                <div className="flex flex-wrap gap-2">
                  {REMOVAL_CLASSES.map((cls) => (
                    <Button
                      key={cls.id}
                      variant={value.remove_classes?.includes(cls.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleRemovalClass(cls.id)}
                      disabled={disabled}
                    >
                      {cls.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Day-to-Dusk Section */}
      <Collapsible open={expandedSections.has('twilight')} onOpenChange={() => toggleSection('twilight')}>
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center justify-between border-b px-4 py-3 text-left hover:bg-muted/50"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Day-to-Dusk</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {value.day_to_dusk ? 'On' : 'Off'}
              </span>
              {expandedSections.has('twilight') ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Day-to-Dusk</Label>
                <p className="text-xs text-muted-foreground">Convert daytime photos to twilight</p>
              </div>
              <Switch
                checked={value.day_to_dusk}
                onCheckedChange={(checked) => updateOption('day_to_dusk', checked)}
                disabled={disabled}
              />
            </div>
            {value.day_to_dusk && (
              <div>
                <Label className="text-xs mb-2 block">Twilight Style</Label>
                <Select
                  value={value.twilight_style}
                  onValueChange={(v) => updateOption('twilight_style', v as TwilightStyle)}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TWILIGHT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* TV Screen Section */}
      <Collapsible open={expandedSections.has('tv')} onOpenChange={() => toggleSection('tv')}>
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center justify-between border-b px-4 py-3 text-left hover:bg-muted/50"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <Tv className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">TV Screen</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground capitalize">{value.tv_screen}</span>
              {expandedSections.has('tv') ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4">
            <Label className="text-xs mb-2 block">TV Content</Label>
            <Select
              value={value.tv_screen}
              onValueChange={(v) => updateOption('tv_screen', v as TVContent)}
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TV_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Fireplace Section */}
      <Collapsible open={expandedSections.has('fireplace')} onOpenChange={() => toggleSection('fireplace')}>
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Fireplace Fire</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {value.fireplace_fire ? 'On' : 'Off'}
              </span>
              {expandedSections.has('fireplace') ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Add Fireplace Fire</Label>
                <p className="text-xs text-muted-foreground">Add realistic fire to empty fireplaces</p>
              </div>
              <Switch
                checked={value.fireplace_fire}
                onCheckedChange={(checked) => updateOption('fireplace_fire', checked)}
                disabled={disabled}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

/**
 * Hook to manage processing options state
 */
export function useProcessingOptions(initialOptions?: Partial<ProcessingOptions>) {
  const [options, setOptions] = useState<ProcessingOptions>({
    ...DEFAULT_OPTIONS,
    ...initialOptions,
  })

  const resetToDefaults = () => setOptions(DEFAULT_OPTIONS)

  return {
    options,
    setOptions,
    resetToDefaults,
    DEFAULT_OPTIONS,
  }
}

/**
 * Convert options to API format
 */
export function optionsToAPI(options: ProcessingOptions): Record<string, unknown> {
  return {
    preset: options.preset,
    window_pull: options.window_pull,
    perspective_correction: options.perspective_correction,
    sky_mode: options.sky_mode,
    grass_greening: options.grass_greening,
    grass_intensity: options.grass_intensity,
    auto_remove_objects: options.auto_remove_objects,
    remove_classes: options.remove_classes,
    day_to_dusk: options.day_to_dusk,
    twilight_style: options.twilight_style,
    tv_screen: options.tv_screen,
    fireplace_fire: options.fireplace_fire,
  }
}
