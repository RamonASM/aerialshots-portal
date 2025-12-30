/**
 * Themed Property Layout
 *
 * Common layout wrapper with theme-specific styling
 */

'use client'

import type { Theme } from '@/lib/themes/property/themes'

interface ThemedLayoutProps {
  theme: Theme
  children: React.ReactNode
}

export function ThemedLayout({ theme, children }: ThemedLayoutProps) {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        fontWeight: theme.typography.bodyWeight,
      }}
    >
      {children}
    </div>
  )
}

interface ThemedSectionProps {
  theme: Theme
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  className?: string
}

export function ThemedSection({
  theme,
  children,
  variant = 'primary',
  className = '',
}: ThemedSectionProps) {
  const bgColor =
    variant === 'secondary'
      ? theme.colors.backgroundSecondary
      : theme.colors.background

  return (
    <section
      className={className}
      style={{
        backgroundColor: bgColor,
        paddingTop: theme.layout.sectionSpacing,
        paddingBottom: theme.layout.sectionSpacing,
      }}
    >
      <div
        className="mx-auto px-4 sm:px-6 lg:px-8"
        style={{ maxWidth: theme.layout.containerWidth }}
      >
        {children}
      </div>
    </section>
  )
}

interface ThemedCardProps {
  theme: Theme
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'elevated' | 'glass'
}

export function ThemedCard({
  theme,
  children,
  className = '',
  variant = 'default',
}: ThemedCardProps) {
  const getStyles = () => {
    const base = {
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.layout.cardRadius,
    }

    switch (variant) {
      case 'elevated':
        return {
          ...base,
          backgroundColor: theme.colors.backgroundSecondary,
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        }
      case 'glass':
        return {
          ...base,
          backgroundColor: `${theme.colors.backgroundSecondary}B8`,
          backdropFilter: 'blur(20px)',
        }
      default:
        return {
          ...base,
          backgroundColor: theme.colors.backgroundSecondary,
        }
    }
  }

  return (
    <div className={className} style={getStyles()}>
      {children}
    </div>
  )
}

interface ThemedHeadingProps {
  theme: Theme
  children: React.ReactNode
  level?: 1 | 2 | 3
  className?: string
}

export function ThemedHeading({
  theme,
  children,
  level = 2,
  className = '',
}: ThemedHeadingProps) {
  const sizes = {
    1: 'text-[28px] sm:text-[34px] lg:text-[44px]',
    2: 'text-[22px] sm:text-[28px]',
    3: 'text-[17px] sm:text-[20px]',
  }

  const Tag = `h${level}` as 'h1' | 'h2' | 'h3'

  return (
    <Tag
      className={`${sizes[level]} ${className}`}
      style={{
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        fontWeight: theme.typography.headingWeight,
        letterSpacing: theme.typography.letterSpacing,
      }}
    >
      {children}
    </Tag>
  )
}

interface ThemedTextProps {
  theme: Theme
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'muted'
  className?: string
}

export function ThemedText({
  theme,
  children,
  variant = 'primary',
  className = '',
}: ThemedTextProps) {
  const colors = {
    primary: theme.colors.text,
    secondary: theme.colors.textSecondary,
    muted: theme.colors.textMuted,
  }

  return (
    <p className={className} style={{ color: colors[variant] }}>
      {children}
    </p>
  )
}

interface ThemedButtonProps {
  theme: Theme
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
  brandColor?: string
  onClick?: () => void
  className?: string
  type?: 'button' | 'submit'
}

export function ThemedButton({
  theme,
  children,
  variant = 'primary',
  brandColor,
  onClick,
  className = '',
  type = 'button',
}: ThemedButtonProps) {
  const accentColor = brandColor || theme.colors.primary

  const getStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: accentColor,
          color: '#ffffff',
          border: 'none',
        }
      case 'secondary':
        return {
          backgroundColor: `${accentColor}20`,
          color: accentColor,
          border: `1px solid ${accentColor}40`,
        }
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: theme.colors.text,
          border: `1px solid ${theme.colors.border}`,
        }
      default:
        return {}
    }
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2.5 font-medium transition-opacity hover:opacity-90 ${className}`}
      style={{
        ...getStyles(),
        borderRadius: theme.layout.cardRadius,
        fontFamily: theme.typography.fontFamily,
      }}
    >
      {children}
    </button>
  )
}
