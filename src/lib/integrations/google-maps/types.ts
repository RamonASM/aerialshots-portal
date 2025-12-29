export interface Coordinates {
  lat: number
  lng: number
}

export interface DriveTimeResult {
  originAddress: string
  destinationAddress: string
  distanceMeters: number
  distanceText: string
  durationSeconds: number
  durationText: string
  durationInTrafficSeconds?: number
  durationInTrafficText?: string
}

export interface DriveTimeMatrix {
  origins: string[]
  destinations: string[]
  rows: Array<{
    elements: Array<{
      status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS'
      distance?: { value: number; text: string }
      duration?: { value: number; text: string }
      durationInTraffic?: { value: number; text: string }
    }>
  }>
}

export interface RouteStop {
  id: string
  address: string
  lat: number
  lng: number
  arrivalTime?: Date
  departureTime?: Date
  dwellTimeMinutes: number
}

export interface OptimizedRoute {
  stops: RouteStop[]
  totalDistanceMeters: number
  totalDurationSeconds: number
  estimatedEndTime: Date
}

export interface CachedDriveTime {
  id: string
  origin_lat: number
  origin_lng: number
  destination_lat: number
  destination_lng: number
  distance_meters: number
  duration_seconds: number
  cached_at: string
  expires_at: string
}
