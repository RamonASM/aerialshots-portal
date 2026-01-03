'use client'

import { Mail, Bell, BellOff, Calendar, Clock, MapPin, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type HomeownerInfo } from '@/stores/useBookingStore'

interface HomeownerNotificationPreviewProps {
  homeownerInfo: HomeownerInfo | undefined
  propertyAddress: string
  scheduledDate?: string
  scheduledTime?: string
  notifyHomeowner: boolean
  onNotifyChange: (notify: boolean) => void
  occupancyType: 'owner-occupied' | 'tenant-occupied'
}

export function HomeownerNotificationPreview({
  homeownerInfo,
  propertyAddress,
  scheduledDate,
  scheduledTime,
  notifyHomeowner,
  onNotifyChange,
  occupancyType,
}: HomeownerNotificationPreviewProps) {
  const personLabel = occupancyType === 'owner-occupied' ? 'homeowner' : 'tenant'
  const PersonLabel = occupancyType === 'owner-occupied' ? 'Homeowner' : 'Tenant'

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex items-start justify-between gap-4 p-5 border border-white/[0.08]">
        <div className="flex gap-4">
          <div className="w-10 h-10 flex items-center justify-center border border-[#A29991] text-[#A29991] shrink-0">
            {notifyHomeowner ? (
              <Bell className="w-5 h-5" />
            ) : (
              <BellOff className="w-5 h-5" />
            )}
          </div>
          <div>
            <span className="text-[15px] font-medium text-white block">
              Notify {PersonLabel}
            </span>
            <span className="text-[13px] text-[#8A847F] block mt-0.5">
              {notifyHomeowner
                ? `We'll send a confirmation email to the ${personLabel}`
                : `The ${personLabel} won't receive an automatic notification`}
            </span>
          </div>
        </div>

        <button
          onClick={() => onNotifyChange(!notifyHomeowner)}
          className={cn(
            'relative w-12 h-7 shrink-0 transition-colors',
            notifyHomeowner ? 'bg-[#A29991]' : 'bg-white/[0.12]'
          )}
        >
          <span
            className={cn(
              'absolute top-1 w-5 h-5 bg-white transition-transform',
              notifyHomeowner ? 'left-6' : 'left-1'
            )}
          />
        </button>
      </div>

      {/* Email Preview */}
      {notifyHomeowner && homeownerInfo?.email && (
        <div className="border border-white/[0.08]">
          <div className="p-4 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2 text-[13px] text-[#8A847F]">
              <Mail className="w-4 h-4 text-[#A29991]" />
              <span>Email Preview</span>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Email Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-[#6a6765]">To:</span>
                <span className="text-white">{homeownerInfo.email}</span>
              </div>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-[#6a6765]">Subject:</span>
                <span className="text-white">
                  Photo Shoot Scheduled - {propertyAddress || 'Your Property'}
                </span>
              </div>
            </div>

            {/* Email Body Preview */}
            <div className="p-4 bg-white/[0.02] border border-white/[0.06] space-y-4">
              <p className="text-[14px] text-[#B5ADA6]">
                Hi {homeownerInfo.name || PersonLabel},
              </p>

              <p className="text-[14px] text-[#8A847F]">
                Your real estate agent has scheduled a professional photo shoot for the
                property. Here are the details:
              </p>

              <div className="space-y-2 py-2">
                {propertyAddress && (
                  <div className="flex items-center gap-3 text-[14px]">
                    <MapPin className="w-4 h-4 text-[#A29991] shrink-0" />
                    <span className="text-white">{propertyAddress}</span>
                  </div>
                )}
                {scheduledDate && (
                  <div className="flex items-center gap-3 text-[14px]">
                    <Calendar className="w-4 h-4 text-[#A29991] shrink-0" />
                    <span className="text-white">{formatDate(scheduledDate)}</span>
                  </div>
                )}
                {scheduledTime && (
                  <div className="flex items-center gap-3 text-[14px]">
                    <Clock className="w-4 h-4 text-[#A29991] shrink-0" />
                    <span className="text-white">{formatTime(scheduledTime)}</span>
                  </div>
                )}
              </div>

              <p className="text-[14px] text-[#8A847F]">
                Our photographer will arrive at the scheduled time. Please ensure the
                property is prepared and accessible.
              </p>

              <p className="text-[14px] text-[#8A847F]">
                — Aerial Shots Media
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info when notification disabled */}
      {!notifyHomeowner && (
        <div className="flex gap-3 p-4 border border-white/[0.08] bg-white/[0.02]">
          <User className="w-4 h-4 text-[#6a6765] shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#8A847F] leading-relaxed">
            You are responsible for notifying the {personLabel} about the scheduled
            photo shoot and ensuring property access.
          </p>
        </div>
      )}
    </div>
  )
}
