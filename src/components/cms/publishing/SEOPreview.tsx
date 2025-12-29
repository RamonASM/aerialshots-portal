'use client'

import { useState } from 'react'
import { Globe, Smartphone, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SEOPreviewProps {
  title: string
  description: string
  url: string
  imageUrl?: string
  siteName?: string
}

type PreviewType = 'google' | 'x' | 'facebook' | 'instagram' | 'tiktok'
type DeviceType = 'desktop' | 'mobile'

// Platform icons as SVG components
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export function SEOPreview({
  title,
  description,
  url,
  imageUrl,
  siteName = 'yoursite.com',
}: SEOPreviewProps) {
  const [previewType, setPreviewType] = useState<PreviewType>('google')
  const [device, setDevice] = useState<DeviceType>('desktop')

  const platforms: { id: PreviewType; label: string; icon: React.ReactNode }[] = [
    { id: 'google', label: 'Google', icon: <Globe className="h-4 w-4" /> },
    { id: 'x', label: 'X', icon: <XIcon className="h-4 w-4" /> },
    { id: 'facebook', label: 'Facebook', icon: <FacebookIcon className="h-4 w-4" /> },
    { id: 'instagram', label: 'Instagram', icon: <InstagramIcon className="h-4 w-4" /> },
    { id: 'tiktok', label: 'TikTok', icon: <TikTokIcon className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-4">
      {/* Preview Type Selector */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => setPreviewType(platform.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                previewType === platform.id
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
              )}
            >
              {platform.icon}
              <span className="hidden sm:inline">{platform.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
          <button
            onClick={() => setDevice('desktop')}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              device === 'desktop'
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
            )}
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              device === 'mobile'
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
            )}
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div
        className={cn(
          'rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900',
          device === 'mobile' && 'mx-auto max-w-[375px]'
        )}
      >
        {previewType === 'google' && (
          <GooglePreview
            title={title}
            description={description}
            url={url}
            siteName={siteName}
            device={device}
          />
        )}

        {previewType === 'x' && (
          <XPreview
            title={title}
            description={description}
            url={url}
            imageUrl={imageUrl}
            device={device}
          />
        )}

        {previewType === 'facebook' && (
          <FacebookPreview
            title={title}
            description={description}
            url={url}
            imageUrl={imageUrl}
            siteName={siteName}
            device={device}
          />
        )}

        {previewType === 'instagram' && (
          <InstagramPreview
            title={title}
            description={description}
            imageUrl={imageUrl}
            device={device}
          />
        )}

        {previewType === 'tiktok' && (
          <TikTokPreview
            title={title}
            description={description}
            imageUrl={imageUrl}
            device={device}
          />
        )}
      </div>

      {/* Character Counts */}
      <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
        <div>
          Title:{' '}
          <span className={title.length > 60 ? 'text-amber-500' : 'text-green-500'}>
            {title.length}/60
          </span>
        </div>
        <div>
          Description:{' '}
          <span className={description.length > 160 ? 'text-amber-500' : 'text-green-500'}>
            {description.length}/160
          </span>
        </div>
        {(previewType === 'instagram' || previewType === 'tiktok') && (
          <div className="text-blue-500">
            Tip: Keep captions under 150 chars for better engagement
          </div>
        )}
      </div>
    </div>
  )
}

function GooglePreview({
  title,
  description,
  url,
  siteName,
  device,
}: {
  title: string
  description: string
  url: string
  siteName: string
  device: DeviceType
}) {
  const truncatedTitle = title.length > 60 ? title.substring(0, 57) + '...' : title
  const truncatedDesc =
    description.length > (device === 'mobile' ? 120 : 160)
      ? description.substring(0, device === 'mobile' ? 117 : 157) + '...'
      : description

  return (
    <div className="font-sans">
      <div className="mb-1 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <Globe className="h-3 w-3 text-neutral-500" />
        </div>
        <div className="text-sm">
          <span className="text-neutral-700 dark:text-neutral-300">{siteName}</span>
          <span className="mx-1 text-neutral-400">›</span>
          <span className="text-neutral-500">{url}</span>
        </div>
      </div>
      <h3 className="text-xl text-blue-600 hover:underline dark:text-blue-400">
        {truncatedTitle || 'Page Title'}
      </h3>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {truncatedDesc || 'Page description will appear here...'}
      </p>
    </div>
  )
}

function XPreview({
  title,
  description,
  url,
  imageUrl,
  device,
}: {
  title: string
  description: string
  url: string
  imageUrl?: string
  device: DeviceType
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
      {imageUrl ? (
        <div className="aspect-video bg-neutral-100 dark:bg-neutral-800">
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center bg-neutral-100 dark:bg-neutral-800">
          <Globe className="h-12 w-12 text-neutral-300" />
        </div>
      )}
      <div className="p-3">
        <p className="text-sm text-neutral-500">{url}</p>
        <h3 className="mt-1 font-semibold text-neutral-900 dark:text-white">
          {title || 'Page Title'}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
          {description || 'Page description...'}
        </p>
      </div>
    </div>
  )
}

function FacebookPreview({
  title,
  description,
  url,
  imageUrl,
  siteName,
  device,
}: {
  title: string
  description: string
  url: string
  imageUrl?: string
  siteName: string
  device: DeviceType
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
      {imageUrl ? (
        <div className="aspect-video bg-neutral-200 dark:bg-neutral-700">
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center bg-neutral-200 dark:bg-neutral-700">
          <Globe className="h-12 w-12 text-neutral-400" />
        </div>
      )}
      <div className="p-3">
        <p className="text-xs uppercase text-neutral-500">{siteName}</p>
        <h3 className="mt-1 font-semibold text-neutral-900 dark:text-white">
          {title || 'Page Title'}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
          {description || 'Page description...'}
        </p>
      </div>
    </div>
  )
}

function InstagramPreview({
  title,
  description,
  imageUrl,
  device,
}: {
  title: string
  description: string
  imageUrl?: string
  device: DeviceType
}) {
  return (
    <div className="space-y-3">
      {/* Post Header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-0.5">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-xs font-bold dark:bg-neutral-900">
            AS
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">aerial_shots_media</p>
          <p className="text-xs text-neutral-500">Sponsored</p>
        </div>
      </div>

      {/* Image */}
      {imageUrl ? (
        <div className="aspect-square overflow-hidden rounded-sm bg-neutral-100 dark:bg-neutral-800">
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex aspect-square items-center justify-center rounded-sm bg-neutral-100 dark:bg-neutral-800">
          <InstagramIcon className="h-16 w-16 text-neutral-300" />
        </div>
      )}

      {/* Caption */}
      <div className="space-y-1">
        <p className="text-sm">
          <span className="font-semibold text-neutral-900 dark:text-white">aerial_shots_media</span>{' '}
          <span className="text-neutral-700 dark:text-neutral-300">
            {description || 'Your caption will appear here...'}
          </span>
        </p>
        <p className="text-xs text-neutral-500">View all comments</p>
      </div>
    </div>
  )
}

function TikTokPreview({
  title,
  description,
  imageUrl,
  device,
}: {
  title: string
  description: string
  imageUrl?: string
  device: DeviceType
}) {
  return (
    <div className="relative aspect-[9/16] max-h-[400px] overflow-hidden rounded-lg bg-black">
      {/* Video/Image Background */}
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <TikTokIcon className="h-20 w-20 text-neutral-700" />
        </div>
      )}

      {/* Overlay Content */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-4">
        {/* Username */}
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 to-pink-500 p-0.5">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-black text-xs font-bold text-white">
              ASM
            </div>
          </div>
          <div>
            <p className="font-semibold text-white">@aerialshotsmedia</p>
          </div>
        </div>

        {/* Caption */}
        <p className="mt-2 text-sm text-white">
          {description || 'Your TikTok caption here...'}{' '}
          <span className="text-cyan-400">#realestate #drone #photography</span>
        </p>

        {/* Sound */}
        <div className="mt-2 flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded bg-white/20" />
          <p className="text-xs text-white/80">Original Sound - Aerial Shots Media</p>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="absolute bottom-20 right-3 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <span className="text-lg">❤️</span>
          </div>
          <span className="mt-1 text-xs text-white">24.5K</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <span className="text-lg">💬</span>
          </div>
          <span className="mt-1 text-xs text-white">482</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <span className="text-lg">↗️</span>
          </div>
          <span className="mt-1 text-xs text-white">Share</span>
        </div>
      </div>
    </div>
  )
}

export default SEOPreview
