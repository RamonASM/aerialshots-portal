// Email Templates for Notifications

import type {
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

// Seller Notification Templates

export function sellerScheduleRequestEmail(data: SellerScheduleRequestData): { subject: string; html: string; text: string } {
  const content = `
    <div class="content">
      <h2 style="margin-top: 0;">Schedule Your Photo Shoot</h2>
      <p>Hi ${data.sellerName},</p>
      <p>${data.agentName} has requested professional photography for your property at <strong>${data.listingAddress}</strong>.</p>

      <p>Please select your available times for the photo shoot by clicking the button below:</p>

      <a href="${data.scheduleUrl}" class="button">Select Available Times</a>

      <div class="highlight-box">
        <p style="margin: 0; color: #374151;"><strong>What to expect:</strong></p>
        <ul style="margin: 12px 0 0; padding-left: 20px; color: #6b7280;">
          <li>The photo shoot typically takes 1-2 hours</li>
          <li>Please ensure the property is clean and staged</li>
          <li>Our photographer will arrive at the scheduled time</li>
          <li>Your photos will be ready within 24-48 hours</li>
        </ul>
      </div>

      ${data.agentPhone ? `
      <p style="color: #737373; font-size: 14px;">Questions? Contact ${data.agentName} at ${data.agentPhone}</p>
      ` : ''}

      ${data.expiresAt ? `
      <p style="color: #737373; font-size: 14px;">This link expires on ${data.expiresAt}.</p>
      ` : ''}
    </div>
  `

  const text = `
Schedule Your Photo Shoot

Hi ${data.sellerName},

${data.agentName} has requested professional photography for your property at ${data.listingAddress}.

Select your available times: ${data.scheduleUrl}

What to expect:
- The photo shoot typically takes 1-2 hours
- Please ensure the property is clean and staged
- Our photographer will arrive at the scheduled time
- Your photos will be ready within 24-48 hours
${data.agentPhone ? `\nQuestions? Contact ${data.agentName} at ${data.agentPhone}` : ''}
${data.expiresAt ? `\nThis link expires on ${data.expiresAt}.` : ''}
`

  return {
    subject: `Schedule Photo Shoot: ${data.listingAddress}`,
    html: wrapTemplate(content, 'Schedule Photo Shoot'),
    text: text.trim()
  }
}

export function sellerMediaReadyEmail(data: SellerMediaReadyData): { subject: string; html: string; text: string } {
  const { assetSummary } = data
  const assetList = [
    assetSummary.photos > 0 ? `${assetSummary.photos} photos` : null,
    assetSummary.videos > 0 ? `${assetSummary.videos} videos` : null,
    assetSummary.floorPlans > 0 ? `${assetSummary.floorPlans} floor plans` : null,
    assetSummary.tours > 0 ? `${assetSummary.tours} 3D tours` : null,
  ].filter(Boolean).join(', ')

  const content = `
    <div class="content">
      <h2 style="margin-top: 0;">Your Property Photos Are Ready!</h2>
      <p>Hi ${data.sellerName},</p>
      <p>Great news! The professional media for your property at <strong>${data.listingAddress}</strong> is now ready to view.</p>

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

      <a href="${data.portalUrl}" class="button">View Your Photos</a>

      <p style="color: #737373; font-size: 14px;">This media has been provided by ${data.agentName} and can be shared with potential buyers.</p>

      ${data.expiresAt ? `
      <p style="color: #737373; font-size: 14px;">This link expires on ${data.expiresAt}.</p>
      ` : ''}
    </div>
  `

  const text = `
Your Property Photos Are Ready!

Hi ${data.sellerName},

The professional media for your property at ${data.listingAddress} is now ready.

Includes: ${assetList}

View and download: ${data.portalUrl}

This media has been provided by ${data.agentName}.
${data.expiresAt ? `\nThis link expires on ${data.expiresAt}.` : ''}
`

  return {
    subject: `Your Photos Are Ready: ${data.listingAddress}`,
    html: wrapTemplate(content, 'Photos Ready'),
    text: text.trim()
  }
}

export function scheduleConfirmedEmail(data: ScheduleConfirmedData): { subject: string; html: string; text: string } {
  const content = `
    <div class="content">
      <h2 style="margin-top: 0;">Photo Shoot Confirmed!</h2>
      <p>Hi ${data.recipientName},</p>
      <p>Your photo shoot has been confirmed for the property at <strong>${data.listingAddress}</strong>.</p>

      <div class="highlight-box">
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${data.scheduledDate}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Time</span>
          <span class="detail-value">${data.scheduledTime}</span>
        </div>
      </div>

      ${!data.isAgent ? `
      <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <strong style="color: #166534;">Preparation Tips:</strong>
        <ul style="margin: 8px 0 0; padding-left: 20px; color: #15803d;">
          <li>Turn on all lights throughout the property</li>
          <li>Open blinds and curtains for natural light</li>
          <li>Remove personal items and clutter</li>
          <li>Ensure all beds are made and rooms are tidy</li>
          <li>Clear countertops and surfaces</li>
        </ul>
      </div>
      ` : `
      <p>The seller has been notified and will prepare the property for the shoot.</p>
      `}

      ${data.agentPhone && !data.isAgent ? `
      <p style="color: #737373; font-size: 14px;">Questions? Contact ${data.agentName} at ${data.agentPhone}</p>
      ` : ''}
    </div>
  `

  const text = `
Photo Shoot Confirmed!

Hi ${data.recipientName},

Your photo shoot for ${data.listingAddress} has been confirmed.

Date: ${data.scheduledDate}
Time: ${data.scheduledTime}
${!data.isAgent ? `
Preparation Tips:
- Turn on all lights throughout the property
- Open blinds and curtains for natural light
- Remove personal items and clutter
- Ensure all beds are made and rooms are tidy
- Clear countertops and surfaces
` : ''}
${data.agentPhone && !data.isAgent ? `\nQuestions? Contact ${data.agentName} at ${data.agentPhone}` : ''}
`

  return {
    subject: `Photo Shoot Confirmed: ${data.listingAddress}`,
    html: wrapTemplate(content, 'Shoot Confirmed'),
    text: text.trim()
  }
}

// Integration Notification Templates

export function integrationCompleteEmail(data: IntegrationCompleteData): { subject: string; html: string; text: string } {
  const content = `
    <div class="content">
      <h2 style="margin-top: 0;">Integration Complete</h2>
      <p>Hi ${data.recipientName},</p>
      <p><strong>${data.integrationName}</strong> for <strong>${data.propertyAddress}</strong> is now ready for review.</p>

      <div class="highlight-box" style="border-left-color: #22c55e;">
        <div class="detail-row">
          <span class="detail-label">Property</span>
          <span class="detail-value">${data.propertyAddress}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Service</span>
          <span class="detail-value" style="color: #22c55e;">${data.integrationName}</span>
        </div>
      </div>

      ${data.message ? `<p>${data.message}</p>` : ''}

      <p>Please review the deliverables and verify quality before marking as approved.</p>

      <a href="https://portal.aerialshots.media${data.dashboardUrl}" class="button" style="background: #22c55e;">Review Now</a>
    </div>
  `

  const text = `
Integration Complete

Hi ${data.recipientName},

${data.integrationName} for ${data.propertyAddress} is now ready for review.

${data.message || ''}

Review at: https://portal.aerialshots.media${data.dashboardUrl}
`

  return {
    subject: `Ready for Review: ${data.integrationName} - ${data.propertyAddress}`,
    html: wrapTemplate(content, 'Integration Complete'),
    text: text.trim()
  }
}

export function integrationFailedEmail(data: IntegrationFailedData): { subject: string; html: string; text: string } {
  const statusLabels: Record<string, string> = {
    failed: 'Failed',
    needs_manual: 'Needs Manual Attention',
    error: 'Error',
  }
  const statusLabel = statusLabels[data.status] || data.status

  const content = `
    <div class="content">
      <h2 style="margin-top: 0; color: #dc2626;">Integration Issue</h2>
      <p>Hi ${data.recipientName},</p>
      <p>An integration for <strong>${data.propertyAddress}</strong> requires your attention.</p>

      <div class="highlight-box" style="border-left-color: #dc2626; background: #fef2f2;">
        <div class="detail-row">
          <span class="detail-label">Property</span>
          <span class="detail-value">${data.propertyAddress}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Service</span>
          <span class="detail-value">${data.integrationName}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Status</span>
          <span class="detail-value" style="color: #dc2626;">${statusLabel}</span>
        </div>
      </div>

      ${data.errorMessage ? `
      <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 24px 0; border: 1px solid #fecaca;">
        <strong style="color: #991b1b;">Error Details:</strong>
        <p style="margin: 8px 0 0; color: #dc2626;">${data.errorMessage}</p>
      </div>
      ` : ''}

      <p>Please review the issue and take appropriate action. You may need to:</p>
      <ul>
        <li>Retry the integration</li>
        <li>Process manually</li>
        <li>Contact the integration provider</li>
      </ul>

      <a href="https://portal.aerialshots.media${data.dashboardUrl}" class="button" style="background: #dc2626;">View Details</a>
    </div>
  `

  const text = `
Integration Issue

Hi ${data.recipientName},

${data.integrationName} for ${data.propertyAddress} requires attention.

Status: ${statusLabel}
${data.errorMessage ? `Error: ${data.errorMessage}` : ''}

View details: https://portal.aerialshots.media${data.dashboardUrl}
`

  return {
    subject: `Action Required: ${data.integrationName} - ${data.propertyAddress}`,
    html: wrapTemplate(content, 'Integration Issue'),
    text: text.trim()
  }
}

// Review Request Email Template
export function reviewRequestEmail(data: ReviewRequestData): { subject: string; html: string; text: string } {
  const content = `
    <div class="content">
      <h2 style="margin-top: 0;">How Was Your Experience?</h2>
      <p>Hi ${data.agentName},</p>
      <p>We hope you loved the photos from your recent shoot at <strong>${data.listingAddress}</strong>!</p>

      <div class="highlight-box" style="border-left-color: #f59e0b; background: #fffbeb;">
        <div class="detail-row">
          <span class="detail-label">Property</span>
          <span class="detail-value">${data.listingAddress}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Photos Delivered</span>
          <span class="detail-value">${data.photoCount} professional photos</span>
        </div>
        ${data.videoCount ? `
        <div class="detail-row">
          <span class="detail-label">Videos</span>
          <span class="detail-value">${data.videoCount} videos</span>
        </div>
        ` : ''}
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Delivered</span>
          <span class="detail-value">${data.deliveredAt}</span>
        </div>
      </div>

      <p style="font-size: 16px; text-align: center; margin: 32px 0 16px;">
        <strong>Your feedback helps us grow!</strong>
      </p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.reviewUrl}" class="button" style="background: #f59e0b;">
          Leave a Review
        </a>
      </div>

      <p style="color: #737373; font-size: 14px; text-align: center;">
        It only takes 30 seconds and means the world to our team${data.photographerName ? ` and ${data.photographerName}` : ''}.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

      <p style="font-size: 14px; color: #737373;">
        Need to access your photos again?<br>
        <a href="${data.portalUrl}" style="color: #3b82f6;">View Your Delivery</a>
      </p>
    </div>
  `

  const text = `
How Was Your Experience?

Hi ${data.agentName},

We hope you loved the photos from your recent shoot at ${data.listingAddress}!

Property: ${data.listingAddress}
Photos Delivered: ${data.photoCount} professional photos
${data.videoCount ? `Videos: ${data.videoCount} videos\n` : ''}Delivered: ${data.deliveredAt}

Your feedback helps us grow! Leave a review:
${data.reviewUrl}

It only takes 30 seconds and means the world to our team${data.photographerName ? ` and ${data.photographerName}` : ''}.

View your delivery: ${data.portalUrl}
`

  return {
    subject: `How did we do? Quick review for ${data.listingAddress}`,
    html: wrapTemplate(content, 'Review Request'),
    text: text.trim()
  }
}

// Low Credit Balance Email Template
export function lowCreditBalanceEmail(data: LowCreditBalanceData): { subject: string; html: string; text: string } {
  const content = `
    <div class="content">
      <h2 style="margin-top: 0;">Low Credit Balance Alert</h2>
      <p>Hi ${data.agentName},</p>
      <p>Your credit balance is running low. Here are your current stats:</p>

      <div class="highlight-box" style="border-left-color: #f59e0b; background: #fffbeb;">
        <div class="detail-row">
          <span class="detail-label">Current Balance</span>
          <span class="detail-value" style="color: #d97706; font-size: 24px;">${data.currentBalance} credits</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Alert Threshold</span>
          <span class="detail-value">${data.threshold} credits</span>
        </div>
      </div>

      <p>Don't miss out on using AI tools, redeeming discounts, or earning referral bonuses. Purchase more credits now to keep your account active.</p>

      <div style="text-align: center;">
        <a href="${data.rewardsUrl}" class="button" style="background: #f59e0b;">Purchase Credits</a>
      </div>

      <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <strong style="color: #166534;">Earn Free Credits!</strong>
        <p style="margin: 8px 0 0; color: #15803d;">
          Refer other agents to earn 100-300 credits per referral based on their first order type.
        </p>
      </div>
    </div>
  `

  const text = `
Low Credit Balance Alert

Hi ${data.agentName},

Your credit balance is running low.

Current Balance: ${data.currentBalance} credits
Alert Threshold: ${data.threshold} credits

Purchase more credits to continue using AI tools and redeeming rewards:
${data.rewardsUrl}

Tip: Refer other agents to earn 100-300 free credits per referral!
`

  return {
    subject: `Low Credit Balance: ${data.currentBalance} credits remaining`,
    html: wrapTemplate(content, 'Low Credit Balance'),
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

  sellerScheduleRequest: (data: SellerScheduleRequestData) =>
    `Hi ${data.sellerName}! Please schedule your photo shoot for ${data.listingAddress}. Click here: ${data.scheduleUrl}`,

  sellerMediaReady: (data: SellerMediaReadyData) =>
    `Hi ${data.sellerName}! Your photos for ${data.listingAddress} are ready. View them here: ${data.portalUrl}`,

  scheduleConfirmed: (data: ScheduleConfirmedData) =>
    `Photo shoot confirmed for ${data.listingAddress} on ${data.scheduledDate} at ${data.scheduledTime}.`,

  integrationComplete: (data: IntegrationCompleteData) =>
    `ASM: ${data.integrationName} ready for ${data.propertyAddress}. Review at portal.aerialshots.media`,

  integrationFailed: (data: IntegrationFailedData) =>
    `ASM ALERT: ${data.integrationName} issue for ${data.propertyAddress}. Action needed at portal.aerialshots.media`,

  lowCreditBalance: (data: LowCreditBalanceData) =>
    `ASM: Your credit balance is low (${data.currentBalance} credits). Purchase more at portal.aerialshots.media/dashboard/rewards`,

  reviewRequest: (data: ReviewRequestData) =>
    `Hi ${data.agentName}! Loved your photos from ${data.listingAddress}? We'd appreciate a quick review: ${data.reviewUrl}`,
}
