// Email Templates for Notifications

import type {
  PhotographerAssignedData,
  EditorAssignedData,
  QCCompleteData,
  DeliveryReadyData,
  BookingConfirmedData,
  PaymentReceivedData,
  StatusUpdateData,
} from './types'

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
  .header { background: linear-gradient(135deg, #0a0a0a 0%, #171717 100%); padding: 32px; text-align: center; }
  .header img { height: 40px; }
  .header h1 { color: #ffffff; margin: 16px 0 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; }
  .highlight-box { background: #fafafa; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; }
  .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e5e5; }
  .detail-label { color: #737373; font-size: 14px; }
  .detail-value { color: #171717; font-weight: 500; }
  .button { display: inline-block; background: #3b82f6; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 24px 0; }
  .button:hover { background: #2563eb; }
  .footer { background: #fafafa; padding: 24px 32px; text-align: center; color: #737373; font-size: 13px; }
  .footer a { color: #3b82f6; text-decoration: none; }
`

function wrapTemplate(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Aerial Shots Media</h1>
    </div>
    ${content}
    <div class="footer">
      <p>Aerial Shots Media - Premium Real Estate Photography</p>
      <p><a href="https://portal.aerialshots.media">portal.aerialshots.media</a></p>
    </div>
  </div>
</body>
</html>
`
}

export function photographerAssignedEmail(data: PhotographerAssignedData): { subject: string; html: string; text: string } {
  const content = `
    <div class="content">
      <h2 style="margin-top: 0;">New Shoot Assignment</h2>
      <p>Hi ${data.photographerName},</p>
      <p>You've been assigned a new photo shoot. Here are the details:</p>

      <div class="highlight-box">
        <div class="detail-row">
          <span class="detail-label">Property</span>
          <span class="detail-value">${data.listingAddress}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${data.scheduledDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${data.scheduledTime}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Package</span>
          <span class="detail-value">${data.packageName}</span>
        </div>
      </div>

      ${data.specialInstructions ? `
      <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <strong style="color: #92400e;">Special Instructions:</strong>
        <p style="margin: 8px 0 0; color: #78350f;">${data.specialInstructions}</p>
      </div>
      ` : ''}

      <p>Please confirm receipt of this assignment by logging into the portal.</p>

      <a href="https://portal.aerialshots.media/admin/ops" class="button">View Assignment</a>
    </div>
  `

  const text = `
New Shoot Assignment

Hi ${data.photographerName},

You've been assigned a new photo shoot:

Property: ${data.listingAddress}
Date: ${data.scheduledDate}
Time: ${data.scheduledTime}
Package: ${data.packageName}
${data.specialInstructions ? `\nSpecial Instructions: ${data.specialInstructions}` : ''}

View details: https://portal.aerialshots.media/admin/ops
`

  return {
    subject: `New Assignment: ${data.listingAddress}`,
    html: wrapTemplate(content, 'New Shoot Assignment'),
    text: text.trim()
  }
}

export function editorAssignedEmail(data: EditorAssignedData): { subject: string; html: string; text: string } {
  const content = `
    <div class="content">
      <h2 style="margin-top: 0;">New Editing Job</h2>
      <p>Hi ${data.editorName},</p>
      <p>A new listing is ready for editing. Here are the details:</p>

      <div class="highlight-box">
        <div class="detail-row">
          <span class="detail-label">Property</span>
          <span class="detail-value">${data.listingAddress}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Agent</span>
          <span class="detail-value">${data.agentName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Assets to Edit</span>
          <span class="detail-value">${data.assetCount} files</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Due Date</span>
          <span class="detail-value">${data.dueDate}</span>
        </div>
      </div>

      <a href="https://portal.aerialshots.media/admin/ops/editor" class="button">Start Editing</a>
    </div>
  `

  const text = `
New Editing Job

Hi ${data.editorName},

A new listing is ready for editing:

Property: ${data.listingAddress}
Agent: ${data.agentName}
Assets: ${data.assetCount} files
Due: ${data.dueDate}

Start editing: https://portal.aerialshots.media/admin/ops/editor
`

  return {
    subject: `Edit Ready: ${data.listingAddress}`,
    html: wrapTemplate(content, 'New Editing Job'),
    text: text.trim()
  }
}

export function qcCompleteEmail(data: QCCompleteData): { subject: string; html: string; text: string } {
  const { assetSummary } = data
  const assetList = [
    assetSummary.photos > 0 ? `${assetSummary.photos} photos` : null,
    assetSummary.videos > 0 ? `${assetSummary.videos} videos` : null,
    assetSummary.floorPlans > 0 ? `${assetSummary.floorPlans} floor plans` : null,
    assetSummary.tours > 0 ? `${assetSummary.tours} 3D tours` : null,
  ].filter(Boolean).join(', ')

  const content = `
    <div class="content">
      <h2 style="margin-top: 0;">Your Media is Ready!</h2>
      <p>Hi ${data.agentName},</p>
      <p>Great news! Your listing media has passed quality control and is ready for delivery.</p>

      <div class="highlight-box">
        <div class="detail-row">
          <span class="detail-label">Property</span>
          <span class="detail-value">${data.listingAddress}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Includes</span>
          <span class="detail-value">${assetList}</span>
        </div>
      </div>

      <p>Click below to view and download your media:</p>

      <a href="${data.deliveryUrl}" class="button">View Your Media</a>

      <p style="color: #737373; font-size: 14px;">This link can be shared with your clients and MLS.</p>
    </div>
  `

  const text = `
Your Media is Ready!

Hi ${data.agentName},

Your listing media for ${data.listingAddress} has passed QC and is ready.

Includes: ${assetList}

View and download: ${data.deliveryUrl}
`

  return {
    subject: `Media Ready: ${data.listingAddress}`,
    html: wrapTemplate(content, 'Media Ready'),
    text: text.trim()
  }
}

export function deliveryReadyEmail(data: DeliveryReadyData): { subject: string; html: string; text: string } {
  const content = `
    <div class="content">
      <h2 style="margin-top: 0;">Your Listing Media Delivery</h2>
      <p>Hi ${data.agentName},</p>
      <p>Your professional media for <strong>${data.listingAddress}</strong> is ready to download.</p>

      <a href="${data.deliveryUrl}" class="button">Access Your Media</a>

      ${data.expiresAt ? `
      <p style="color: #737373; font-size: 14px;">This link expires on ${data.expiresAt}. Please download your files before then.</p>
      ` : ''}

      <p>Thank you for choosing Aerial Shots Media!</p>
    </div>
  `

  const text = `
Your Listing Media Delivery

Hi ${data.agentName},

Your media for ${data.listingAddress} is ready.

Download here: ${data.deliveryUrl}
${data.expiresAt ? `\nLink expires: ${data.expiresAt}` : ''}
`

  return {
    subject: `Download Ready: ${data.listingAddress}`,
    html: wrapTemplate(content, 'Delivery Ready'),
    text: text.trim()
  }
}

export function bookingConfirmedEmail(data: BookingConfirmedData): { subject: string; html: string; text: string } {
  const content = `
    <div class="content">
      <h2 style="margin-top: 0;">Booking Confirmed!</h2>
      <p>Hi ${data.agentName},</p>
      <p>Your photo shoot has been confirmed. Here are your booking details:</p>

      <div class="highlight-box">
        <div class="detail-row">
          <span class="detail-label">Order ID</span>
          <span class="detail-value">${data.orderId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Property</span>
          <span class="detail-value">${data.listingAddress}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Package</span>
          <span class="detail-value">${data.packageName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${data.scheduledDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${data.scheduledTime}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Total</span>
          <span class="detail-value">${data.totalAmount}</span>
        </div>
      </div>

      <p><strong>What's next?</strong></p>
      <ul>
        <li>A photographer will be assigned shortly</li>
        <li>You'll receive a confirmation with photographer details</li>
        <li>Expect delivery within 24-48 hours after the shoot</li>
      </ul>

      <a href="https://portal.aerialshots.media/dashboard/orders" class="button">View Order</a>
    </div>
  `

  const text = `
Booking Confirmed!

Hi ${data.agentName},

Your photo shoot has been confirmed.

Order ID: ${data.orderId}
Property: ${data.listingAddress}
Package: ${data.packageName}
Date: ${data.scheduledDate}
Time: ${data.scheduledTime}
Total: ${data.totalAmount}

View order: https://portal.aerialshots.media/dashboard/orders
`

  return {
    subject: `Booking Confirmed: ${data.listingAddress}`,
    html: wrapTemplate(content, 'Booking Confirmed'),
    text: text.trim()
  }
}

export function paymentReceivedEmail(data: PaymentReceivedData): { subject: string; html: string; text: string } {
  const content = `
    <div class="content">
      <h2 style="margin-top: 0;">Payment Received</h2>
      <p>Hi ${data.agentName},</p>
      <p>We've received your payment. Thank you!</p>

      <div class="highlight-box">
        <div class="detail-row">
          <span class="detail-label">Order ID</span>
          <span class="detail-value">${data.orderId}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Amount</span>
          <span class="detail-value">${data.amount}</span>
        </div>
      </div>

      ${data.receiptUrl ? `
      <a href="${data.receiptUrl}" class="button">View Receipt</a>
      ` : ''}
    </div>
  `

  const text = `
Payment Received

Hi ${data.agentName},

We've received your payment of ${data.amount} for order ${data.orderId}.
${data.receiptUrl ? `\nView receipt: ${data.receiptUrl}` : ''}
`

  return {
    subject: `Payment Received - Order ${data.orderId}`,
    html: wrapTemplate(content, 'Payment Received'),
    text: text.trim()
  }
}

export function statusUpdateEmail(data: StatusUpdateData): { subject: string; html: string; text: string } {
  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    scheduled: 'Scheduled',
    in_progress: 'Photography In Progress',
    in_photography: 'Photography In Progress',
    staged: 'Photos Staged',
    awaiting_editing: 'Awaiting Editing',
    in_editing: 'Editing In Progress',
    processing: 'Processing',
    ready_for_qc: 'Quality Control',
    in_qc: 'In Quality Control',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    on_hold: 'On Hold',
  }

  const newStatusLabel = statusLabels[data.newStatus] || data.newStatus

  const content = `
    <div class="content">
      <h2 style="margin-top: 0;">Status Update</h2>
      <p>Hi ${data.agentName},</p>
      <p>Your listing status has been updated:</p>

      <div class="highlight-box">
        <div class="detail-row">
          <span class="detail-label">Property</span>
          <span class="detail-value">${data.listingAddress}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">New Status</span>
          <span class="detail-value" style="color: #3b82f6;">${newStatusLabel}</span>
        </div>
      </div>

      ${data.message ? `<p>${data.message}</p>` : ''}

      <a href="https://portal.aerialshots.media/dashboard" class="button">View Dashboard</a>
    </div>
  `

  const text = `
Status Update

Hi ${data.agentName},

Your listing at ${data.listingAddress} has been updated to: ${newStatusLabel}
${data.message ? `\n${data.message}` : ''}

View dashboard: https://portal.aerialshots.media/dashboard
`

  return {
    subject: `Update: ${data.listingAddress} - ${newStatusLabel}`,
    html: wrapTemplate(content, 'Status Update'),
    text: text.trim()
  }
}

// SMS Templates (shorter versions)
export const smsTemplates = {
  photographerAssigned: (data: PhotographerAssignedData) =>
    `ASM: New shoot assigned - ${data.listingAddress} on ${data.scheduledDate} at ${data.scheduledTime}. Check portal for details.`,

  editorAssigned: (data: EditorAssignedData) =>
    `ASM: New editing job - ${data.listingAddress} (${data.assetCount} assets). Due: ${data.dueDate}`,

  qcComplete: (data: QCCompleteData) =>
    `ASM: Your media for ${data.listingAddress} is ready! View at ${data.deliveryUrl}`,

  bookingConfirmed: (data: BookingConfirmedData) =>
    `ASM: Booking confirmed for ${data.listingAddress} on ${data.scheduledDate} at ${data.scheduledTime}. Order: ${data.orderId}`,
}
