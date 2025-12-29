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
  | 'seller_schedule_request'
  | 'seller_media_ready'
  | 'schedule_confirmed'
  | 'integration_complete'
  | 'integration_failed'
  | 'low_credit_balance'
  | 'review_request'

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

// Seller notification data types
export interface SellerScheduleRequestData {
  sellerName: string
  listingAddress: string
  agentName: string
  agentPhone?: string
  scheduleUrl: string
  expiresAt?: string
}

export interface SellerMediaReadyData {
  sellerName: string
  listingAddress: string
  agentName: string
  portalUrl: string
  assetSummary: {
    photos: number
    videos: number
    floorPlans: number
    tours: number
  }
  expiresAt?: string
}

export interface ScheduleConfirmedData {
  recipientName: string
  listingAddress: string
  scheduledDate: string
  scheduledTime: string
  agentName?: string
  agentPhone?: string
  isAgent: boolean // true if notifying agent, false if notifying seller
}

// Integration notification data types
export interface IntegrationCompleteData {
  recipientName: string
  integrationName: string // e.g., "AI-edited photos", "Floor plans", "3D tour"
  propertyAddress: string
  listingId: string
  dashboardUrl: string
  message?: string
}

export interface IntegrationFailedData {
  recipientName: string
  integrationName: string // e.g., "Fotello (AI editing)", "Cubicasa (floor plans)"
  propertyAddress: string
  listingId: string
  status: string // e.g., "failed", "needs_manual"
  dashboardUrl: string
  errorMessage?: string
}

// Credit balance notification data types
export interface LowCreditBalanceData {
  agentName: string
  currentBalance: number
  threshold: number // The threshold that triggered the notification
  rewardsUrl: string
}

// Review request notification data types
export interface ReviewRequestData {
  agentName: string
  listingAddress: string
  deliveredAt: string
  photoCount: number
  videoCount?: number
  reviewUrl: string // Google/Facebook/Yelp review link
  portalUrl: string // Link to view their delivered photos
  photographerName?: string
}
