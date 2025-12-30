'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  MapPin,
  Calendar,
  Clock,
  Camera,
  CheckCircle,
  Package,
  User,
  Phone,
  ChevronRight,
  RefreshCw,
  Navigation,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PhotographerTracker } from '@/components/seller/PhotographerTracker'
import { SellerMediaGallery } from '@/components/seller/SellerMediaGallery'
import { ScheduleInfo } from '@/components/seller/ScheduleInfo'
import { SellerAccessLocked } from '@/components/seller/SellerAccessLocked'
import { usePhotographerLocation, formatLocationStatus, formatETA } from '@/hooks/usePhotographerLocation'

interface SellerPortalContentProps {
  token: string
  initialData: {
    success: boolean
    token_info: {
      id: string
      client_name: string | null
      client_email: string | null
      expires_at: string | null
    }
    listing: {
      id: string
      address: string
      city: string
      state: string
      zip: string
      beds: number | null
      baths: number | null
      sqft: number | null
      scheduled_at: string | null
      ops_status: string | null
      delivered_at: string | null
      is_rush: boolean
    }
    agent: {
      id: string
      name: string
      email: string
      phone: string | null
      headshot_url: string | null
      logo_url: string | null
      brand_color: string | null
    } | null
    photographer: {
      id: string
      name: string
      phone: string | null
    } | null
    photographer_location: {
      latitude: number
      longitude: number
      status: string
      eta_minutes: number | null
      last_updated_at: string
    } | null
    portal_status: 'scheduled' | 'en_route' | 'on_site' | 'shooting' | 'processing' | 'delivered'
    has_media_access: boolean
    reschedule_requests: Array<{
      id: string
      status: string
      requested_slots: unknown
      created_at: string
    }>
  }
}

export function SellerPortalContent({ token, initialData }: SellerPortalContentProps) {
  const [activeTab, setActiveTab] = useState('status')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [portalData, setPortalData] = useState(initialData)

  const { listing, agent, photographer, portal_status, has_media_access } = portalData

  // Real-time location tracking
  const {
    location,
    isConnected,
    lastUpdated,
    refresh: refreshLocation,
  } = usePhotographerLocation({
    listingId: listing.id,
    enabled: ['en_route', 'on_site', 'shooting'].includes(portal_status),
  })

  // Refresh portal data
  const refreshData = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch(`/api/seller/${token}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPortalData(data)
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Auto-refresh when photographer is en route
  useEffect(() => {
    if (['en_route', 'on_site', 'shooting'].includes(portal_status)) {
      const interval = setInterval(refreshData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [portal_status])

  // Status display
  const getStatusDisplay = () => {
    const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      scheduled: {
        label: 'Shoot Scheduled',
        color: 'bg-blue-500/20 text-blue-400',
        icon: <Calendar className="h-4 w-4" />,
      },
      en_route: {
        label: 'Photographer En Route',
        color: 'bg-amber-500/20 text-amber-400',
        icon: <Navigation className="h-4 w-4" />,
      },
      on_site: {
        label: 'Photographer Arrived',
        color: 'bg-green-500/20 text-green-400',
        icon: <MapPin className="h-4 w-4" />,
      },
      shooting: {
        label: 'Shoot in Progress',
        color: 'bg-purple-500/20 text-purple-400',
        icon: <Camera className="h-4 w-4" />,
      },
      processing: {
        label: 'Photos Processing',
        color: 'bg-indigo-500/20 text-indigo-400',
        icon: <RefreshCw className="h-4 w-4" />,
      },
      delivered: {
        label: 'Photos Delivered',
        color: 'bg-emerald-500/20 text-emerald-400',
        icon: <CheckCircle className="h-4 w-4" />,
      },
    }
    return statusConfig[portal_status] || statusConfig.scheduled
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {agent?.logo_url ? (
            <Image
              src={agent.logo_url}
              alt={agent.name}
              width={40}
              height={40}
              className="rounded-lg"
            />
          ) : (
            <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
              <Camera className="h-5 w-5 text-neutral-400" />
            </div>
          )}
          <div>
            <h1 className="text-sm font-medium text-white">Seller Portal</h1>
            <p className="text-xs text-neutral-400">Powered by Aerial Shots Media</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshData}
          disabled={isRefreshing}
          className="text-neutral-400"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Property Card */}
      <Card className="border-neutral-800 bg-neutral-900/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">{listing.address}</h2>
              <p className="text-sm text-neutral-400">
                {listing.city}, {listing.state} {listing.zip}
              </p>
              {(listing.beds || listing.baths || listing.sqft) && (
                <p className="text-xs text-neutral-500 mt-1">
                  {listing.beds && `${listing.beds} bed`}
                  {listing.baths && ` · ${listing.baths} bath`}
                  {listing.sqft && ` · ${listing.sqft.toLocaleString()} sqft`}
                </p>
              )}
            </div>
            <Badge className={statusDisplay.color}>
              {statusDisplay.icon}
              <span className="ml-1">{statusDisplay.label}</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Live Tracking Banner (when en route) */}
      {['en_route', 'on_site'].includes(portal_status) && (location || portalData.photographer_location) && (
        <Card className="border-blue-500/30 bg-blue-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-500/20 rounded-full">
                <Navigation className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-300">
                  {photographer?.name || 'Photographer'} is{' '}
                  {formatLocationStatus(
                    (location?.status || portalData.photographer_location?.status) as never
                  ).toLowerCase()}
                </p>
                {(location?.eta_minutes || portalData.photographer_location?.eta_minutes) && (
                  <p className="text-xs text-blue-400/80">
                    ETA: {formatETA(location?.eta_minutes ?? portalData.photographer_location?.eta_minutes ?? null)}
                  </p>
                )}
              </div>
              {isConnected && (
                <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                  Live
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-neutral-900">
          <TabsTrigger value="status" className="data-[state=active]:bg-neutral-800">
            Status
          </TabsTrigger>
          <TabsTrigger value="media" className="data-[state=active]:bg-neutral-800">
            Media
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-neutral-800">
            Schedule
          </TabsTrigger>
        </TabsList>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-4">
          {/* Map for tracking */}
          {['en_route', 'on_site'].includes(portal_status) && (
            <PhotographerTracker
              listingId={listing.id}
              listingAddress={`${listing.address}, ${listing.city}, ${listing.state}`}
              photographer={photographer}
              location={location || portalData.photographer_location}
              isConnected={isConnected}
            />
          )}

          {/* Status Timeline */}
          <Card className="border-neutral-800 bg-neutral-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-200">
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <StatusTimelineItem
                  icon={<Calendar className="h-4 w-4" />}
                  label="Shoot Scheduled"
                  completed={true}
                  date={listing.scheduled_at}
                />
                <StatusTimelineItem
                  icon={<Navigation className="h-4 w-4" />}
                  label="Photographer En Route"
                  completed={['en_route', 'on_site', 'shooting', 'processing', 'delivered'].includes(portal_status)}
                  active={portal_status === 'en_route'}
                />
                <StatusTimelineItem
                  icon={<Camera className="h-4 w-4" />}
                  label="Photoshoot"
                  completed={['shooting', 'processing', 'delivered'].includes(portal_status)}
                  active={['on_site', 'shooting'].includes(portal_status)}
                />
                <StatusTimelineItem
                  icon={<RefreshCw className="h-4 w-4" />}
                  label="Photo Processing"
                  completed={portal_status === 'delivered'}
                  active={portal_status === 'processing'}
                />
                <StatusTimelineItem
                  icon={<CheckCircle className="h-4 w-4" />}
                  label="Delivered"
                  completed={portal_status === 'delivered'}
                  date={listing.delivered_at}
                />
              </div>
            </CardContent>
          </Card>

          {/* Agent Contact */}
          {agent && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-200">
                  Your Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {agent.headshot_url ? (
                    <Image
                      src={agent.headshot_url}
                      alt={agent.name}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-neutral-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-white">{agent.name}</p>
                    <p className="text-sm text-neutral-400">{agent.email}</p>
                  </div>
                  {agent.phone && (
                    <a
                      href={`tel:${agent.phone}`}
                      className="p-2 bg-neutral-800 rounded-full hover:bg-neutral-700 transition-colors"
                    >
                      <Phone className="h-5 w-5 text-neutral-400" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-4">
          {has_media_access ? (
            <SellerMediaGallery token={token} listingId={listing.id} />
          ) : (
            <SellerAccessLocked
              opsStatus={listing.ops_status}
              deliveredAt={listing.delivered_at}
            />
          )}
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <ScheduleInfo
            token={token}
            listing={listing}
            photographer={photographer}
            pendingReschedule={portalData.reschedule_requests.find(r => r.status === 'pending')}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Timeline Item Component
interface StatusTimelineItemProps {
  icon: React.ReactNode
  label: string
  completed: boolean
  active?: boolean
  date?: string | null
}

function StatusTimelineItem({ icon, label, completed, active, date }: StatusTimelineItemProps) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={`p-2 rounded-full ${
          completed
            ? 'bg-green-500/20 text-green-400'
            : active
            ? 'bg-blue-500/20 text-blue-400 animate-pulse'
            : 'bg-neutral-800 text-neutral-500'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p
          className={`text-sm ${
            completed ? 'text-white' : active ? 'text-blue-300' : 'text-neutral-500'
          }`}
        >
          {label}
        </p>
        {date && (
          <p className="text-xs text-neutral-500">
            {new Date(date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
      {completed && <CheckCircle className="h-4 w-4 text-green-400" />}
    </div>
  )
}
