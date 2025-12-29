// FAA Airspace Types
// Documentation: https://www.faa.gov/uas/recreational_flyers/where_can_i_fly

export type AirspaceClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'G'

export type RestrictionType =
  | 'no_fly_zone'
  | 'temporary_flight_restriction'
  | 'controlled_airspace'
  | 'airport_proximity'
  | 'military_airspace'
  | 'national_park'
  | 'stadium'
  | 'prison'
  | 'power_plant'
  | 'emergency'

export type FlightStatus = 'clear' | 'caution' | 'restricted' | 'prohibited'

export interface Airport {
  id: string
  name: string
  icao: string
  iata?: string
  latitude: number
  longitude: number
  distance: number // miles
  airspaceClass: AirspaceClass
  hasTower: boolean
  runways?: number
}

export interface Restriction {
  id: string
  type: RestrictionType
  name: string
  description: string
  latitude?: number
  longitude?: number
  radius?: number // nautical miles
  effectiveDate?: string
  expirationDate?: string
  altitudeFloor?: number // feet AGL
  altitudeCeiling?: number // feet AGL
  notamNumber?: string
}

export interface NOTAM {
  id: string
  number: string
  type: 'D' | 'FDC' | 'POINTER' | 'SAA' | 'MILITARY' | 'GPS'
  location: string
  effectiveStart: string
  effectiveEnd: string
  text: string
  coordinates?: {
    latitude: number
    longitude: number
    radius: number
  }
}

export interface AirspaceCheckResult {
  canFly: boolean
  status: FlightStatus
  airspaceClass: AirspaceClass
  maxAltitude: number // feet AGL - typically 400ft for Part 107
  nearbyAirports: Airport[]
  restrictions: Restriction[]
  notams: NOTAM[]
  advisories: string[]
  authorization: {
    required: boolean
    type?: 'LAANC' | 'DroneZone' | 'waiver'
    instructions?: string
  }
  checkedAt: string
  expiresAt: string
  coordinates: {
    latitude: number
    longitude: number
  }
  address?: string
}

export interface AirspaceCheckRequest {
  latitude: number
  longitude: number
  address?: string
  altitude?: number // requested flight altitude in feet
  date?: string // for checking future restrictions
}
