// Unified Notification Service

import { sendEmail } from './email'
import { sendSMS, isSMSConfigured } from './sms'
import * as templates from './templates'
import type {
  NotificationPayload,
  NotificationResult,
  NotificationType,
  PhotographerAssignedData,
  EditorAssignedData,
  QCCompleteData,
  DeliveryReadyData,
  BookingConfirmedData,
  PaymentReceivedData,
  StatusUpdateData,
} from './types'

export * from './types'
export { templates }

// Send a notification through the appropriate channel(s)
export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = []
  const { type, recipient, channel, data } = payload

  // Get email template
  const emailTemplate = getEmailTemplate(type, data)

  // Send email if channel is 'email' or 'both'
  if ((channel === 'email' || channel === 'both') && recipient.email && emailTemplate) {
    const emailResult = await sendEmail({
      to: recipient.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    })
    results.push(emailResult)
  }

  // Send SMS if channel is 'sms' or 'both'
  if ((channel === 'sms' || channel === 'both') && recipient.phone) {
    const smsTemplate = getSMSTemplate(type, data)
    if (smsTemplate) {
      const smsResult = await sendSMS({
        to: recipient.phone,
        body: smsTemplate,
      })
      results.push(smsResult)
    }
  }

  return results
}

// Get email template based on notification type
function getEmailTemplate(
  type: NotificationType,
  data: Record<string, any>
): { subject: string; html: string; text: string } | null {
  switch (type) {
    case 'photographer_assigned':
      return templates.photographerAssignedEmail(data as PhotographerAssignedData)
    case 'editor_assigned':
      return templates.editorAssignedEmail(data as EditorAssignedData)
    case 'qc_complete':
      return templates.qcCompleteEmail(data as QCCompleteData)
    case 'delivery_ready':
      return templates.deliveryReadyEmail(data as DeliveryReadyData)
    case 'booking_confirmed':
      return templates.bookingConfirmedEmail(data as BookingConfirmedData)
    case 'payment_received':
      return templates.paymentReceivedEmail(data as PaymentReceivedData)
    case 'status_update':
      return templates.statusUpdateEmail(data as StatusUpdateData)
    default:
      console.warn(`No email template for notification type: ${type}`)
      return null
  }
}

// Get SMS template based on notification type
function getSMSTemplate(
  type: NotificationType,
  data: Record<string, any>
): string | null {
  switch (type) {
    case 'photographer_assigned':
      return templates.smsTemplates.photographerAssigned(data as PhotographerAssignedData)
    case 'editor_assigned':
      return templates.smsTemplates.editorAssigned(data as EditorAssignedData)
    case 'qc_complete':
      return templates.smsTemplates.qcComplete(data as QCCompleteData)
    case 'booking_confirmed':
      return templates.smsTemplates.bookingConfirmed(data as BookingConfirmedData)
    default:
      // Not all notification types have SMS templates
      return null
  }
}

// Convenience functions for common notifications
export async function notifyPhotographerAssigned(
  recipient: { email: string; phone?: string; name: string },
  data: PhotographerAssignedData
): Promise<NotificationResult[]> {
  return sendNotification({
    type: 'photographer_assigned',
    recipient,
    channel: recipient.phone ? 'both' : 'email',
    data,
  })
}

export async function notifyEditorAssigned(
  recipient: { email: string; name: string },
  data: EditorAssignedData
): Promise<NotificationResult[]> {
  return sendNotification({
    type: 'editor_assigned',
    recipient,
    channel: 'email',
    data,
  })
}

export async function notifyQCComplete(
  recipient: { email: string; phone?: string; name: string },
  data: QCCompleteData
): Promise<NotificationResult[]> {
  return sendNotification({
    type: 'qc_complete',
    recipient,
    channel: recipient.phone ? 'both' : 'email',
    data,
  })
}

export async function notifyDeliveryReady(
  recipient: { email: string; name: string },
  data: DeliveryReadyData
): Promise<NotificationResult[]> {
  return sendNotification({
    type: 'delivery_ready',
    recipient,
    channel: 'email',
    data,
  })
}

export async function notifyBookingConfirmed(
  recipient: { email: string; phone?: string; name: string },
  data: BookingConfirmedData
): Promise<NotificationResult[]> {
  return sendNotification({
    type: 'booking_confirmed',
    recipient,
    channel: recipient.phone ? 'both' : 'email',
    data,
  })
}

export async function notifyPaymentReceived(
  recipient: { email: string; name: string },
  data: PaymentReceivedData
): Promise<NotificationResult[]> {
  return sendNotification({
    type: 'payment_received',
    recipient,
    channel: 'email',
    data,
  })
}

export async function notifyStatusUpdate(
  recipient: { email: string; name: string },
  data: StatusUpdateData
): Promise<NotificationResult[]> {
  return sendNotification({
    type: 'status_update',
    recipient,
    channel: 'email',
    data,
  })
}

// Export configuration check
export { isSMSConfigured }
