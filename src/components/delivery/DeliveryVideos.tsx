/**
 * Delivery Videos
 *
 * Displays AI-generated videos on delivery page
 */

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface VideoInfo {
  url: string
  thumbnailUrl?: string
  durationSeconds: number
}

interface DeliveryVideosProps {
  videos: {
    slideshow?: VideoInfo
    socialReel?: VideoInfo
  }
  brandColor?: string
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function DeliveryVideos({
  videos,
  brandColor = '#0077ff',
}: DeliveryVideosProps) {
  const [activeVideo, setActiveVideo] = useState<'slideshow' | 'socialReel'>(
    videos.slideshow ? 'slideshow' : 'socialReel'
  )
  const [isPlaying, setIsPlaying] = useState(false)

  const videoList = [
    { key: 'slideshow' as const, label: 'Property Slideshow', icon: '🎬', aspect: '16:9' },
    { key: 'socialReel' as const, label: 'Social Reel', icon: '📱', aspect: '9:16' },
  ].filter(v => videos[v.key])

  if (videoList.length === 0) {
    return null
  }

  const currentVideo = videos[activeVideo]
  const currentInfo = videoList.find(v => v.key === activeVideo)

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/[0.08] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: `${brandColor}20` }}
            >
              🎥
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">AI-Generated Videos</h3>
              <p className="text-xs text-neutral-400">
                Ready-to-share property videos
              </p>
            </div>
          </div>
        </div>

        {/* Video selector */}
        {videoList.length > 1 && (
          <div className="flex items-center gap-2 mt-4">
            {videoList.map(video => (
              <button
                key={video.key}
                onClick={() => setActiveVideo(video.key)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
                  activeVideo === video.key
                    ? 'text-white'
                    : 'text-neutral-400 hover:text-neutral-300'
                )}
                style={activeVideo === video.key ? { backgroundColor: `${brandColor}20`, color: brandColor } : {}}
              >
                <span>{video.icon}</span>
                {video.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Video Player */}
      <div className="p-5">
        {currentVideo && (
          <div className="relative">
            {/* Video Container */}
            <div
              className={cn(
                'relative rounded-xl overflow-hidden bg-black mx-auto',
                currentInfo?.aspect === '9:16' ? 'max-w-[280px]' : 'max-w-full'
              )}
              style={{
                aspectRatio: currentInfo?.aspect === '9:16' ? '9/16' : '16/9',
              }}
            >
              {!isPlaying && currentVideo.thumbnailUrl ? (
                // Thumbnail with play button
                <>
                  <img
                    src={currentVideo.thumbnailUrl}
                    alt={currentInfo?.label || 'Video thumbnail'}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <button
                      onClick={() => setIsPlaying(true)}
                      className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                      style={{ color: brandColor }}
                    >
                      <svg
                        className="w-8 h-8 ml-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  </div>
                </>
              ) : (
                // Video player
                <video
                  src={currentVideo.url}
                  controls
                  autoPlay={isPlaying}
                  className="absolute inset-0 w-full h-full"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              )}

              {/* Duration badge */}
              <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/70 text-xs text-white">
                {formatDuration(currentVideo.durationSeconds)}
              </div>
            </div>

            {/* Download button */}
            <div className="flex justify-center mt-4">
              <a
                href={currentVideo.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download {currentInfo?.label}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
