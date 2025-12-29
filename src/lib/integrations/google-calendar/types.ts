export interface CalendarConnection {
  id: string
  staff_id: string
  provider: 'google' | 'outlook'
  calendar_id: string
  calendar_name: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  sync_enabled: boolean
  sync_direction: 'push' | 'pull' | 'both'
  last_sync_at: string | null
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id?: string
  googleEventId?: string
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
  attendees?: string[]
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
  colorId?: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  metadata?: Record<string, string>
}

export interface SyncResult {
  success: boolean
  eventsCreated: number
  eventsUpdated: number
  eventsDeleted: number
  errors: string[]
}

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expiry_date?: number
  token_type?: string
  scope?: string
}

export interface GoogleCalendarInfo {
  id: string
  summary: string
  description?: string
  primary?: boolean
  backgroundColor?: string
  accessRole?: string
}
