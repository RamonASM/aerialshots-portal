// SMS Notification Service using Twilio

import type { SMSOptions, NotificationResult } from './types'

// Twilio client - lazily initialized
let twilioClient: any = null
let twilioInitialized = false

async function getTwilioClient(): Promise<any> {
  if (twilioInitialized) return twilioClient

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    console.warn('Twilio credentials not configured - SMS disabled')
    twilioInitialized = true
    return null
  }

  try {
    // Dynamic import with type assertion to avoid TS errors when package isn't installed
    const twilio = await (Function('return import("twilio")')() as Promise<any>)
    twilioClient = twilio.default(accountSid, authToken)
    twilioInitialized = true
    return twilioClient
  } catch (error) {
    console.warn('Twilio package not installed - SMS disabled')
    twilioInitialized = true
    return null
  }
}

const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER

export async function sendSMS(options: SMSOptions): Promise<NotificationResult> {
  const client = await getTwilioClient()

  if (!client) {
    // Log the SMS that would have been sent (for development)
    console.log('[SMS - Not Sent] To:', options.to, 'Body:', options.body)
    return {
      success: false,
      channel: 'sms',
      error: 'SMS not configured - Twilio credentials missing',
    }
  }

  if (!FROM_NUMBER) {
    return {
      success: false,
      channel: 'sms',
      error: 'Twilio phone number not configured',
    }
  }

  try {
    // Format phone number to E.164 if needed
    const formattedNumber = formatPhoneNumber(options.to)

    const message = await client.messages.create({
      body: options.body,
      to: formattedNumber,
      from: FROM_NUMBER,
    })

    return {
      success: true,
      channel: 'sms',
      messageId: message.sid,
    }
  } catch (error) {
    console.error('Twilio error:', error)
    return {
      success: false,
      channel: 'sms',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Format phone number to E.164 format
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // If it's a 10-digit US number, add +1
  if (digits.length === 10) {
    return `+1${digits}`
  }

  // If it already has country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  // Return as-is with + prefix if not already present
  return phone.startsWith('+') ? phone : `+${digits}`
}

// Check if SMS is configured
export function isSMSConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  )
}

export { sendSMS as send }
