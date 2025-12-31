// SMS templates for different scenarios
import { integrationLogger, formatError } from '@/lib/logger'

const logger = integrationLogger.child({ integration: 'twilio' })

export const smsTemplates = {
  // Review request - sent 2 hours after delivery
  review_request_initial: {
    en: (agentName: string, address: string) =>
      `Hi ${agentName}! Your photos for ${address} are ready! We hope you love them. If you have a moment, we'd really appreciate a Google review: {{REVIEW_LINK}} - Aerial Shots Media`,
    es: (agentName: string, address: string) =>
      `Hola ${agentName}! Tus fotos para ${address} estan listas! Esperamos que te encanten. Si tienes un momento, apreciariamos mucho una resena en Google: {{REVIEW_LINK}} - Aerial Shots Media`,
  },
  // Review follow-up - sent on day 3
  review_request_followup_1: {
    en: (agentName: string) =>
      `Hi ${agentName}, just checking in! If you enjoyed working with us, we'd be grateful for a quick Google review. It really helps us grow: {{REVIEW_LINK}} - Aerial Shots Media`,
    es: (agentName: string) =>
      `Hola ${agentName}, solo queriamos saber como te fue! Si disfrutaste trabajar con nosotros, estariamos agradecidos por una resena rapida en Google: {{REVIEW_LINK}} - Aerial Shots Media`,
  },
  // Final review request - sent on day 5
  review_request_followup_2: {
    en: (agentName: string) =>
      `Last reminder ${agentName}! Your feedback helps other agents find quality real estate media. Would you mind leaving us a review? {{REVIEW_LINK}} Thanks! - Aerial Shots Media`,
    es: (agentName: string) =>
      `Ultimo recordatorio ${agentName}! Tu opinion ayuda a otros agentes a encontrar servicios de calidad. Dejanos una resena? {{REVIEW_LINK}} Gracias! - Aerial Shots Media`,
  },
  // Delivery notification
  delivery_notification: {
    en: (agentName: string, address: string, portalUrl: string) =>
      `Hi ${agentName}! Your media for ${address} is ready. View and download your photos here: ${portalUrl} - Aerial Shots Media`,
    es: (agentName: string, address: string, portalUrl: string) =>
      `Hola ${agentName}! Tu contenido para ${address} esta listo. Mira y descarga tus fotos aqui: ${portalUrl} - Aerial Shots Media`,
  },
  // Scheduling confirmation
  scheduling_confirmation: {
    en: (agentName: string, address: string, dateTime: string) =>
      `Hi ${agentName}! Your photo shoot for ${address} is confirmed for ${dateTime}. See you there! - Aerial Shots Media`,
    es: (agentName: string, address: string, dateTime: string) =>
      `Hola ${agentName}! Tu sesion de fotos para ${address} esta confirmada para ${dateTime}. Nos vemos! - Aerial Shots Media`,
  },
  // Scheduling reminder
  scheduling_reminder: {
    en: (agentName: string, address: string, dateTime: string) =>
      `Reminder: Your photo shoot for ${address} is tomorrow at ${dateTime}. Please ensure the property is ready. - Aerial Shots Media`,
    es: (agentName: string, address: string, dateTime: string) =>
      `Recordatorio: Tu sesion de fotos para ${address} es manana a las ${dateTime}. Por favor asegurate que la propiedad este lista. - Aerial Shots Media`,
  },
}

interface SendSMSParams {
  to: string
  template: keyof typeof smsTemplates
  language: 'en' | 'es'
  variables: Record<string, string>
}

interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendSMS(params: SendSMSParams): Promise<SMSResult> {
  const { to, template, language, variables } = params

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER
  const reviewLink = process.env.GOOGLE_REVIEW_LINK || ''

  if (!accountSid || !authToken || !fromNumber) {
    logger.error('Twilio credentials not configured')
    return { success: false, error: 'SMS not configured' }
  }

  try {
    // Build message body based on template
    let body = ''
    const templates = smsTemplates[template]
    if (!templates) {
      return { success: false, error: 'Template not found' }
    }

    const templateFn = templates[language]
    if (!templateFn) {
      return { success: false, error: 'Template language not found' }
    }

    switch (template) {
      case 'review_request_initial':
        body = (smsTemplates.review_request_initial[language])(
          variables.agentName,
          variables.address
        )
        break
      case 'review_request_followup_1':
        body = (smsTemplates.review_request_followup_1[language])(variables.agentName)
        break
      case 'review_request_followup_2':
        body = (smsTemplates.review_request_followup_2[language])(variables.agentName)
        break
      case 'delivery_notification':
        body = (smsTemplates.delivery_notification[language])(
          variables.agentName,
          variables.address,
          variables.portalUrl
        )
        break
      case 'scheduling_confirmation':
        body = (smsTemplates.scheduling_confirmation[language])(
          variables.agentName,
          variables.address,
          variables.dateTime
        )
        break
      case 'scheduling_reminder':
        body = (smsTemplates.scheduling_reminder[language])(
          variables.agentName,
          variables.address,
          variables.dateTime
        )
        break
      default:
        return { success: false, error: 'Unknown template' }
    }

    // Replace review link placeholder
    body = body.replace('{{REVIEW_LINK}}', reviewLink)

    // Send via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: body,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error({ error: errorText }, 'Twilio API error')
      return { success: false, error: 'Failed to send SMS' }
    }

    const result = await response.json()
    return { success: true, messageId: result.sid }
  } catch (error) {
    logger.error({ ...formatError(error) }, 'SMS send error')
    return { success: false, error: 'Failed to send SMS' }
  }
}

// Helper to format phone for Twilio (E.164 format)
export function formatPhoneForTwilio(phone: string): string | null {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // Assume US numbers
  if (digits.length === 10) {
    return `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  } else if (digits.length > 10) {
    // Already has country code
    return `+${digits}`
  }

  return null // Invalid number
}
