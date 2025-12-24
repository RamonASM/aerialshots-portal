// Notification Types

export type NotificationChannel = 'email' | 'sms' | 'both'

export type NotificationType =
  | 'photographer_assigned'
  | 'editor_assigned'
  | 'qc_complete'
  | 'delivery_ready'
  | 'booking_confirmed'
  | 'payment_received'
  | 'status_update'

export interface NotificationRecipient {
  email?: string
  phone?: string
  name: string
}

export interface NotificationPayload {
  type: NotificationType
  recipient: NotificationRecipient
  channel: NotificationChannel
  data: Record<string, any>
}

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface SMSOptions {
  to: string
  body: string
}

export interface NotificationResult {
  success: boolean
  channel: NotificationChannel
  messageId?: string
  error?: string
}

// Template data types
export interface PhotographerAssignedData {
  photographerName: string
  listingAddress: string
  scheduledDate: string
  scheduledTime: string
  packageName: string
  specialInstructions?: string
}

export interface EditorAssignedData {
  editorName: string
  listingAddress: string
  agentName: string
  assetCount: number
  dueDate: string
}

export interface QCCompleteData {
  agentName: string
  listingAddress: string
  deliveryUrl: string
  assetSummary: {
    photos: number
    videos: number
    floorPlans: number
    tours: number
  }
}

export interface DeliveryReadyData {
  agentName: string
  listingAddress: string
  deliveryUrl: string
  expiresAt?: string
}

export interface BookingConfirmedData {
  agentName: string
  listingAddress: string
  packageName: string
  scheduledDate: string
  scheduledTime: string
  totalAmount: string
  orderId: string
}

export interface PaymentReceivedData {
  agentName: string
  amount: string
  orderId: string
  receiptUrl?: string
}

export interface StatusUpdateData {
  agentName: string
  listingAddress: string
  previousStatus: string
  newStatus: string
  message?: string
}
