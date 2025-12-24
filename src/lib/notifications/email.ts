// Email Notification Service using Resend

import { Resend } from 'resend'
import type { EmailOptions, NotificationResult } from './types'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'Aerial Shots Media <notifications@aerialshots.media>'
const REPLY_TO = 'hello@aerialshots.media'

export async function sendEmail(options: EmailOptions): Promise<NotificationResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo || REPLY_TO,
    })

    if (error) {
      console.error('Resend error:', error)
      return {
        success: false,
        channel: 'email',
        error: error.message,
      }
    }

    return {
      success: true,
      channel: 'email',
      messageId: data?.id,
    }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      channel: 'email',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Batch send emails
export async function sendBatchEmails(
  emails: EmailOptions[]
): Promise<NotificationResult[]> {
  const results = await Promise.all(emails.map(sendEmail))
  return results
}

// Check if email is configured
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

// Convenience functions for common email types
export { sendEmail as send }
