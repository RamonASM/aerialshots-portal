'use client'

import { useState } from 'react'
import { Share2, Check, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ShareButtonProps {
  url?: string
  title?: string
  text?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showLabel?: boolean
}

/**
 * ShareButton component with native share API support and clipboard fallback
 *
 * - On mobile: Uses native share sheet
 * - On desktop: Copies URL to clipboard
 * - Shows visual feedback on successful copy
 */
export function ShareButton({
  url,
  title,
  text,
  variant = 'outline',
  size = 'sm',
  className,
  showLabel = true,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '')
    const shareTitle = title || (typeof document !== 'undefined' ? document.title : '')

    setIsSharing(true)

    try {
      // Try native share first (mobile devices)
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: text,
          url: shareUrl,
        })
        setIsSharing(false)
        return
      }
    } catch (err) {
      // User cancelled share or share not supported
      // Fall through to clipboard
    }

    // Fall back to clipboard copy
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    } catch (err) {
      // Clipboard not available, try legacy approach
      try {
        const textArea = document.createElement('textarea')
        textArea.value = shareUrl
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch {
        console.error('Failed to copy to clipboard')
      }
    }

    setIsSharing(false)
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      disabled={isSharing}
      className={cn(
        'gap-2 transition-all',
        copied && 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
        className
      )}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          {showLabel && 'Copied!'}
        </>
      ) : (
        <>
          {size === 'icon' ? (
            <Link2 className="h-4 w-4" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          {showLabel && size !== 'icon' && 'Share'}
        </>
      )}
    </Button>
  )
}
