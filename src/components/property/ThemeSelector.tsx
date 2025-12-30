/**
 * Theme Selector
 *
 * Component for selecting property website themes
 */

'use client'

import { useState } from 'react'
import { Check, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAllThemes, type Theme, type ThemeId } from '@/lib/themes/property'
import { Button } from '@/components/ui/button'

interface ThemeSelectorProps {
  selectedTheme: ThemeId
  onSelect: (themeId: ThemeId) => void
  previewUrl?: string
  className?: string
}

export function ThemeSelector({
  selectedTheme,
  onSelect,
  previewUrl,
  className,
}: ThemeSelectorProps) {
  const themes = getAllThemes()

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isSelected={selectedTheme === theme.id}
            onSelect={() => onSelect(theme.id)}
            previewUrl={previewUrl ? `${previewUrl}/${theme.id}` : undefined}
          />
        ))}
      </div>
    </div>
  )
}

interface ThemeCardProps {
  theme: Theme
  isSelected: boolean
  onSelect: () => void
  previewUrl?: string
}

function ThemeCard({ theme, isSelected, onSelect, previewUrl }: ThemeCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative rounded-xl border-2 p-4 text-left transition-all',
        isSelected
          ? 'border-[#0077ff] bg-[#0077ff]/10'
          : 'border-white/[0.08] bg-[#1c1c1e] hover:border-white/[0.15]'
      )}
    >
      {/* Color Preview */}
      <div className="flex gap-1.5 mb-3">
        <div
          className="h-8 w-8 rounded-lg"
          style={{ backgroundColor: theme.colors.background }}
          title="Background"
        />
        <div
          className="h-8 w-8 rounded-lg"
          style={{ backgroundColor: theme.colors.primary }}
          title="Primary"
        />
        <div
          className="h-8 w-8 rounded-lg"
          style={{ backgroundColor: theme.colors.secondary }}
          title="Secondary"
        />
        <div
          className="h-8 w-8 rounded-lg"
          style={{ backgroundColor: theme.colors.accent }}
          title="Accent"
        />
      </div>

      {/* Theme Info */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-white">{theme.name}</h3>
          <p className="text-sm text-[#636366] mt-0.5">{theme.description}</p>
        </div>
        {isSelected && (
          <div className="rounded-full bg-[#0077ff] p-1">
            <Check className="h-3.5 w-3.5 text-white" />
          </div>
        )}
      </div>

      {/* Typography Preview */}
      <div
        className="mt-3 text-xs text-[#a1a1a6]"
        style={{ fontFamily: theme.typography.fontFamily }}
      >
        {theme.typography.fontFamily.split(',')[0].replace(/"/g, '')}
      </div>

      {/* Layout Info */}
      <div className="mt-2 flex gap-2 text-[10px] text-[#636366]">
        <span className="rounded-full bg-white/5 px-2 py-0.5">
          {theme.layout.cardStyle}
        </span>
        <span className="rounded-full bg-white/5 px-2 py-0.5">
          Hero: {theme.layout.heroHeight}
        </span>
      </div>

      {/* Preview Link */}
      {previewUrl && isHovered && (
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-4 right-4 flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/20 transition-colors"
        >
          <Eye className="h-3 w-3" />
          Preview
        </a>
      )}
    </button>
  )
}

/**
 * Compact theme picker for inline use
 */
interface ThemePickerProps {
  value: ThemeId
  onChange: (themeId: ThemeId) => void
  className?: string
}

export function ThemePicker({ value, onChange, className }: ThemePickerProps) {
  const themes = getAllThemes()
  const selectedTheme = themes.find((t) => t.id === value) || themes[0]

  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ThemeId)}
        className="w-full appearance-none rounded-lg border border-white/[0.08] bg-[#1c1c1e] px-3 py-2 text-white focus:border-[#0077ff] focus:outline-none"
      >
        {themes.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.name} - {theme.description}
          </option>
        ))}
      </select>

      {/* Selected Theme Preview */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
        <div
          className="h-4 w-4 rounded"
          style={{ backgroundColor: selectedTheme.colors.primary }}
        />
        <div
          className="h-4 w-4 rounded"
          style={{ backgroundColor: selectedTheme.colors.background }}
        />
      </div>
    </div>
  )
}
