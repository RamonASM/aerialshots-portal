// Unified Notification Service

import { sendEmail, isEmailConfigured } from './email'
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
  SellerScheduleRequestData,
  SellerMediaReadyData,
  ScheduleConfirmedData,
  IntegrationCompleteData,
  IntegrationFailedData,
  LowCreditBalanceData,
  ReviewRequestData,
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
    case 'seller_schedule_request':
      return templates.sellerScheduleRequestEmail(data as SellerScheduleRequestData)
    case 'seller_media_ready':
      return templates.sellerMediaReadyEmail(data as SellerMediaReadyData)
    case 'schedule_confirmed':
      return templates.scheduleConfirmedEmail(data as ScheduleConfirmedData)
    case 'integration_complete':
      return templates.integrationCompleteEmail(data as IntegrationCompleteData)
    case 'integration_failed':
      return templates.integrationFailedEmail(data as IntegrationFailedData)
    case 'low_credit_balance':
      return templates.lowCreditBalanceEmail(data as LowCreditBalanceData)
    case 'review_request':
      return templates.reviewRequestEmail(data as ReviewRequestData)
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
    case 'seller_schedule_request':
      return templates.smsTemplates.sellerScheduleRequest(data as SellerScheduleRequestData)
    case 'seller_media_ready':
      return templates.smsTemplates.sellerMediaReady(data as SellerMediaReadyData)
    case 'schedule_confirmed':
      return templates.smsTemplates.scheduleConfirmed(data as ScheduleConfirmedData)
    case 'integration_complete':
      return templates.smsTemplates.integrationComplete(data as IntegrationCompleteData)
    case 'integration_failed':
      return templates.smsTemplates.integrationFailed(data as IntegrationFailedData)
    case 'low_credit_balance':
      return templates.smsTemplates.lowCreditBalance(data as LowCreditBalanceData)
    case 'review_request':
      return templates.smsTemplates.reviewRequest(data as ReviewRequestData)
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

// Seller notification convenience functions

export async function notifySellerScheduleRequest(
  recipient: { email: string; phone?: string; name: string },
  data: SellerScheduleRequestData
): Promise<NotificationResult[]> {
  return sendNotification({
    type: 'seller_schedule_request',
    recipient,
    channel: recipient.phone ? 'both' : 'email',
    data,
  })
}

export async function notifySellerMediaReady(
  recipient: { email: string; phone?: string; name: string },
  data: SellerMediaReadyData
): Promise<NotificationResult[]> {
  return sendNotification({
    type: 'seller_media_ready',
    recipient,
    channel: recipient.phone ? 'both' : 'email',
    data,
  })
}

export async function notifyScheduleConfirmed(
  recipient: { email: string; phone?: string; name: string },
  data: ScheduleConfirmedData
): Promise<NotificationResult[]> {
  return sendNotification({
    type: 'schedule_confirmed',
    recipient,
    channel: recipient.phone ? 'both' : 'email',
    data,
  })
}

// Integration notification convenience functions

export async function notifyIntegrationComplete(
  recipient: { email: string; phone?: string; name: string },
  data: IntegrationCompleteData
): Promise<NotificationResult[]> {
  return sendNotification({
    type: 'integration_complete',
    recipient,
    channel: recipient.phone ? 'both' : 'email',
    data,
  })
}

export async function notifyIntegrationFailed(
  recipient: { email: string; phone?: string; name: string },
  data: IntegrationFailedData
): Promise<NotificationResult[]> {
  return sendNotification({
    type: 'integration_failed',
    recipient,
    channel: recipient.phone ? 'both' : 'email',
    data,
  })
}

// Credit balance notification convenience function
export async function notifyLowCreditBalance(
  recipient: { email: string; phone?: string; name: string },
  data: LowCreditBalanceData
): Promise<NotificationResult[]> {
  return sendNotification({
    type: 'low_credit_balance',
    recipient,
    channel: recipient.phone ? 'both' : 'email',
    data,
  })
}

// Review request notification convenience function
export async function notifyReviewRequest(
  recipient: { email: string; phone?: string; name: string },
  data: ReviewRequestData
): Promise<NotificationResult[]> {
  return sendNotification({
    type: 'review_request',
    recipient,
    channel: recipient.phone ? 'both' : 'email',
    data,
  })
}

// Export configuration checks
export { isEmailConfigured, isSMSConfigured }
