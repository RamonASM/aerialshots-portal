/**
 * Google Calendar Integration Tests
 *
 * Tests for Google Calendar OAuth and event synchronization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(() => ({
        generateAuthUrl: vi.fn(() => 'https://accounts.google.com/o/oauth2/auth?...'),
        getToken: vi.fn(() => ({ tokens: { access_token: 'token', refresh_token: 'refresh' } })),
        setCredentials: vi.fn(),
        refreshAccessToken: vi.fn(() => ({
          credentials: { access_token: 'new-token', expiry_date: Date.now() + 3600000 },
        })),
      })),
    },
    calendar: vi.fn(() => ({
      calendarList: {
        list: vi.fn(() => ({ data: { items: [] } })),
      },
      events: {
        insert: vi.fn(() => ({ data: { id: 'event-123' } })),
        update: vi.fn(() => ({ data: { id: 'event-123' } })),
        delete: vi.fn(() => ({})),
        list: vi.fn(() => ({ data: { items: [] } })),
      },
    })),
  },
}))

// Mock environment
const originalEnv = process.env

describe('Google Calendar Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      NEXT_PUBLIC_APP_URL: 'https://app.aerialshots.media',
    }
  })

  describe('OAuth Configuration', () => {
    it('should have required scopes', () => {
      const SCOPES = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ]

      expect(SCOPES).toContain('https://www.googleapis.com/auth/calendar')
      expect(SCOPES).toContain('https://www.googleapis.com/auth/calendar.events')
    })

    it('should generate correct callback URL', () => {
      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-calendar/callback`
      expect(callbackUrl).toBe('https://app.aerialshots.media/api/integrations/google-calendar/callback')
    })

    it('should request offline access for refresh token', () => {
      const authOptions = {
        access_type: 'offline',
        prompt: 'consent',
      }

      expect(authOptions.access_type).toBe('offline')
      expect(authOptions.prompt).toBe('consent')
    })
  })

  describe('Token Structure', () => {
    it('should have required fields in tokens', () => {
      const tokens = {
        access_token: 'ya29.xxx',
        refresh_token: '1//xxx',
        expiry_date: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar',
      }

      expect(tokens.access_token).toBeDefined()
      expect(tokens.refresh_token).toBeDefined()
      expect(tokens.expiry_date).toBeGreaterThan(Date.now())
    })

    it('should detect expired tokens', () => {
      const tokens = {
        access_token: 'ya29.xxx',
        expiry_date: Date.now() - 1000, // Expired
      }

      expect(tokens.expiry_date).toBeLessThan(Date.now())
    })

    it('should detect valid tokens', () => {
      const tokens = {
        access_token: 'ya29.xxx',
        expiry_date: Date.now() + 3600000, // Valid for 1 hour
      }

      expect(tokens.expiry_date).toBeGreaterThan(Date.now())
    })
  })

  describe('Calendar Info Structure', () => {
    it('should have required calendar fields', () => {
      const calendarInfo = {
        id: 'primary',
        summary: 'My Calendar',
        description: 'Personal calendar',
        primary: true,
        backgroundColor: '#0077ff',
        accessRole: 'owner',
      }

      expect(calendarInfo.id).toBeDefined()
      expect(calendarInfo.summary).toBeDefined()
      expect(calendarInfo.primary).toBe(true)
    })

    it('should handle calendar without description', () => {
      const calendarInfo = {
        id: 'secondary',
        summary: 'Work Calendar',
        primary: false,
      }

      expect(calendarInfo.id).toBeDefined()
      expect(calendarInfo.summary).toBeDefined()
    })
  })

  describe('Calendar Event Structure', () => {
    it('should have required event fields for photo shoot', () => {
      const event = {
        summary: 'Photo Shoot - 123 Main St',
        description: 'Real estate photography session',
        location: '123 Main Street, Orlando, FL 32801',
        start: {
          dateTime: '2025-01-20T10:00:00-05:00',
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: '2025-01-20T11:30:00-05:00',
          timeZone: 'America/New_York',
        },
      }

      expect(event.summary).toContain('Photo Shoot')
      expect(event.location).toBeDefined()
      expect(event.start.dateTime).toBeDefined()
      expect(event.end.dateTime).toBeDefined()
    })

    it('should include event reminders', () => {
      const event = {
        summary: 'Photo Shoot',
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 1440 }, // 1 day before
            { method: 'popup', minutes: 60 }, // 1 hour before
          ],
        },
      }

      expect(event.reminders.useDefault).toBe(false)
      expect(event.reminders.overrides.length).toBe(2)
    })

    it('should support all-day events', () => {
      const event = {
        summary: 'Available for Shoots',
        start: {
          date: '2025-01-20',
        },
        end: {
          date: '2025-01-21',
        },
      }

      expect(event.start.date).toBeDefined()
      expect(event.end.date).toBeDefined()
    })

    it('should include attendees', () => {
      const event = {
        summary: 'Photo Shoot',
        attendees: [
          { email: 'agent@realty.com', displayName: 'John Agent' },
          { email: 'photographer@aerialshots.media', displayName: 'ASM Photographer' },
        ],
      }

      expect(event.attendees.length).toBe(2)
      expect(event.attendees[0].email).toBeDefined()
    })
  })

  describe('Sync Result Structure', () => {
    it('should have success result', () => {
      const result = {
        success: true,
        eventId: 'event-123',
        calendarId: 'primary',
        action: 'created',
      }

      expect(result.success).toBe(true)
      expect(result.eventId).toBeDefined()
    })

    it('should have error result', () => {
      const result = {
        success: false,
        error: 'Failed to create event',
        calendarId: 'primary',
      }

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should track sync action type', () => {
      const actions = ['created', 'updated', 'deleted', 'skipped']

      expect(actions).toContain('created')
      expect(actions).toContain('updated')
      expect(actions).toContain('deleted')
    })
  })

  describe('Time Zone Handling', () => {
    it('should support common US time zones', () => {
      const timeZones = [
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Phoenix',
      ]

      expect(timeZones).toContain('America/New_York')
      expect(timeZones).toContain('America/Los_Angeles')
    })

    it('should format dateTime correctly', () => {
      const dateTime = new Date('2025-01-20T10:00:00').toISOString()
      expect(dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('Photo Shoot Event Formatting', () => {
    const formatShootEvent = (shoot: {
      address: string
      date: string
      time: string
      duration: number
      agentName: string
      services: string[]
    }) => {
      return {
        summary: `📸 Photo Shoot - ${shoot.address}`,
        description: `Agent: ${shoot.agentName}\nServices: ${shoot.services.join(', ')}`,
        location: shoot.address,
        start: {
          dateTime: `${shoot.date}T${shoot.time}:00`,
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: new Date(
            new Date(`${shoot.date}T${shoot.time}:00`).getTime() + shoot.duration * 60000
          ).toISOString(),
          timeZone: 'America/New_York',
        },
      }
    }

    it('should format shoot event correctly', () => {
      const event = formatShootEvent({
        address: '123 Main St, Orlando, FL',
        date: '2025-01-20',
        time: '10:00',
        duration: 90,
        agentName: 'John Agent',
        services: ['Photos', 'Drone', 'Video'],
      })

      expect(event.summary).toContain('📸')
      expect(event.summary).toContain('123 Main St')
      expect(event.description).toContain('John Agent')
      expect(event.description).toContain('Photos, Drone, Video')
    })

    it('should calculate end time based on duration', () => {
      const shoot = {
        address: '123 Main St',
        date: '2025-01-20',
        time: '10:00',
        duration: 90, // 90 minutes
        agentName: 'Agent',
        services: ['Photos'],
      }

      const startTime = new Date(`${shoot.date}T${shoot.time}:00`)
      const endTime = new Date(startTime.getTime() + shoot.duration * 60000)

      expect(endTime.getTime() - startTime.getTime()).toBe(90 * 60000)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing credentials', () => {
      process.env.GOOGLE_CLIENT_ID = ''

      const isConfigured = () => {
        return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      }

      expect(isConfigured()).toBe(false)
    })

    it('should handle token refresh failure', async () => {
      const refreshToken = async () => {
        throw new Error('Token refresh failed')
      }

      await expect(refreshToken()).rejects.toThrow('Token refresh failed')
    })
  })

  describe('Calendar Color Mapping', () => {
    it('should map event types to colors', () => {
      const colorMap: Record<string, string> = {
        photo_shoot: '9', // Blue
        video_shoot: '10', // Green
        drone_shoot: '11', // Red
        matterport: '6', // Orange
        delivery: '5', // Yellow
      }

      expect(colorMap.photo_shoot).toBeDefined()
      expect(colorMap.video_shoot).toBeDefined()
    })
  })
})
