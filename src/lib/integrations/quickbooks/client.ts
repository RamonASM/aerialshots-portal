/**
 * QuickBooks Online Integration
 *
 * This module provides integration with QuickBooks Online for:
 * - Invoice synchronization
 * - Customer management
 * - Payment status tracking
 *
 * Prerequisites:
 * 1. Create an app at developer.intuit.com
 * 2. Add the following environment variables:
 *    - QUICKBOOKS_CLIENT_ID
 *    - QUICKBOOKS_CLIENT_SECRET
 *    - QUICKBOOKS_REDIRECT_URI
 *    - QUICKBOOKS_ENVIRONMENT (sandbox or production)
 *
 * OAuth flow:
 * 1. User visits /api/integrations/quickbooks/connect
 * 2. Redirected to QuickBooks for authorization
 * 3. Callback at /api/integrations/quickbooks/callback saves tokens
 * 4. Tokens are refreshed automatically when needed
 */

import { apiLogger, formatError } from '@/lib/logger'

// QuickBooks API base URLs
const QBO_SANDBOX_BASE = 'https://sandbox-quickbooks.api.intuit.com'
const QBO_PRODUCTION_BASE = 'https://quickbooks.api.intuit.com'
const QBO_AUTH_BASE = 'https://appcenter.intuit.com/connect/oauth2'

// Environment configuration
const qbEnvironment = process.env.QUICKBOOKS_ENVIRONMENT
const isNodeProduction = process.env.NODE_ENV === 'production'
const isQBProduction = qbEnvironment === 'production'

// SECURITY: Warn if NODE_ENV=production but QUICKBOOKS_ENVIRONMENT is not explicitly set
if (isNodeProduction && !qbEnvironment) {
  apiLogger.warn('QUICKBOOKS_ENVIRONMENT not set in production - defaulting to sandbox. Set to "production" for live invoices.')
}

const apiBase = isQBProduction ? QBO_PRODUCTION_BASE : QBO_SANDBOX_BASE

interface QuickBooksConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  realmId?: string // Company ID
  accessToken?: string
  refreshToken?: string
}

interface QuickBooksCustomer {
  Id?: string
  DisplayName: string
  PrimaryEmailAddr?: { Address: string }
  PrimaryPhone?: { FreeFormNumber: string }
  CompanyName?: string
}

interface QuickBooksInvoiceLine {
  DetailType: 'SalesItemLineDetail'
  Amount: number
  Description?: string
  SalesItemLineDetail: {
    ItemRef?: { value: string; name: string }
    UnitPrice: number
    Qty: number
  }
}

interface QuickBooksInvoice {
  Id?: string
  DocNumber?: string
  CustomerRef: { value: string }
  Line: QuickBooksInvoiceLine[]
  DueDate?: string
  TxnDate?: string
  EmailStatus?: 'NotSet' | 'NeedToSend' | 'EmailSent'
  Balance?: number
  TotalAmt?: number
}

export class QuickBooksClient {
  private config: QuickBooksConfig

  constructor(config: Partial<QuickBooksConfig> = {}) {
    this.config = {
      clientId: config.clientId || process.env.QUICKBOOKS_CLIENT_ID || '',
      clientSecret: config.clientSecret || process.env.QUICKBOOKS_CLIENT_SECRET || '',
      redirectUri: config.redirectUri || process.env.QUICKBOOKS_REDIRECT_URI || '',
      realmId: config.realmId,
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
    }
  }

  /**
   * Check if QuickBooks is configured
   */
  isConfigured(): boolean {
    return !!(this.config.clientId && this.config.clientSecret && this.config.redirectUri)
  }

  /**
   * Check if connected (has tokens)
   */
  isConnected(): boolean {
    return !!(this.config.accessToken && this.config.realmId)
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'com.intuit.quickbooks.accounting',
      state,
    })

    return `${QBO_AUTH_BASE}?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    x_refresh_token_expires_in: number
    realmId: string
  }> {
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`QuickBooks token exchange failed: ${error}`)
    }

    return response.json()
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
  }> {
    if (!this.config.refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`QuickBooks token refresh failed: ${error}`)
    }

    const tokens = await response.json()
    this.config.accessToken = tokens.access_token
    this.config.refreshToken = tokens.refresh_token

    return tokens
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body?: any
  ): Promise<T> {
    if (!this.config.accessToken || !this.config.realmId) {
      throw new Error('QuickBooks not connected')
    }

    const url = `${apiBase}/v3/company/${this.config.realmId}/${endpoint}`

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${this.config.accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      apiLogger.error({ error, endpoint, status: response.status }, 'QuickBooks API error')
      throw new Error(`QuickBooks API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * Find or create a customer
   */
  async findOrCreateCustomer(
    email: string,
    name: string,
    phone?: string,
    company?: string
  ): Promise<QuickBooksCustomer> {
    // Search for existing customer by email
    const query = `SELECT * FROM Customer WHERE PrimaryEmailAddr = '${email}'`
    const searchResult = await this.request<{
      QueryResponse: { Customer?: QuickBooksCustomer[] }
    }>('GET', `query?query=${encodeURIComponent(query)}`)

    if (searchResult.QueryResponse.Customer?.length) {
      return searchResult.QueryResponse.Customer[0]
    }

    // Create new customer
    const customer: QuickBooksCustomer = {
      DisplayName: name,
      PrimaryEmailAddr: { Address: email },
      ...(phone && { PrimaryPhone: { FreeFormNumber: phone } }),
      ...(company && { CompanyName: company }),
    }

    const createResult = await this.request<{ Customer: QuickBooksCustomer }>(
      'POST',
      'customer',
      customer
    )

    apiLogger.info({ email, customerId: createResult.Customer.Id }, 'QuickBooks customer created')

    return createResult.Customer
  }

  /**
   * Create an invoice in QuickBooks
   */
  async createInvoice(
    customerId: string,
    lines: Array<{
      description: string
      amount: number
      quantity?: number
    }>,
    options: {
      dueDate?: string
      invoiceNumber?: string
      sendEmail?: boolean
    } = {}
  ): Promise<QuickBooksInvoice> {
    const invoice: QuickBooksInvoice = {
      CustomerRef: { value: customerId },
      Line: lines.map((line) => ({
        DetailType: 'SalesItemLineDetail',
        Amount: line.amount * (line.quantity || 1),
        Description: line.description,
        SalesItemLineDetail: {
          UnitPrice: line.amount,
          Qty: line.quantity || 1,
        },
      })),
      ...(options.dueDate && { DueDate: options.dueDate }),
      ...(options.invoiceNumber && { DocNumber: options.invoiceNumber }),
      ...(options.sendEmail && { EmailStatus: 'NeedToSend' }),
    }

    const result = await this.request<{ Invoice: QuickBooksInvoice }>('POST', 'invoice', invoice)

    apiLogger.info({
      invoiceId: result.Invoice.Id,
      customerId,
      total: result.Invoice.TotalAmt,
    }, 'QuickBooks invoice created')

    return result.Invoice
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<QuickBooksInvoice> {
    const result = await this.request<{ Invoice: QuickBooksInvoice }>(
      'GET',
      `invoice/${invoiceId}`
    )
    return result.Invoice
  }

  /**
   * Update invoice payment status
   */
  async recordPayment(
    invoiceId: string,
    amount: number,
    paymentDate: string = new Date().toISOString().split('T')[0]
  ): Promise<void> {
    // Get the invoice first to get customer ref
    const invoice = await this.getInvoice(invoiceId)

    await this.request('POST', 'payment', {
      TotalAmt: amount,
      CustomerRef: invoice.CustomerRef,
      Line: [
        {
          Amount: amount,
          LinkedTxn: [
            {
              TxnId: invoiceId,
              TxnType: 'Invoice',
            },
          ],
        },
      ],
      TxnDate: paymentDate,
    })

    apiLogger.info({ invoiceId, amount }, 'QuickBooks payment recorded')
  }

  /**
   * Sync an ASM invoice to QuickBooks
   */
  async syncInvoice(invoice: {
    id: string
    amount: number
    due_date: string
    agent: { name: string; email: string; phone?: string; company?: string }
    order?: { address: string }
    services?: Array<{ name: string; price: number; quantity?: number }>
  }): Promise<{ quickbooksInvoiceId: string; quickbooksCustomerId: string }> {
    // Find or create customer
    const customer = await this.findOrCreateCustomer(
      invoice.agent.email,
      invoice.agent.name,
      invoice.agent.phone,
      invoice.agent.company
    )

    if (!customer.Id) {
      throw new Error('Failed to create/find QuickBooks customer')
    }

    // Create invoice lines
    const lines = invoice.services?.length
      ? invoice.services.map((s) => ({
          description: s.name,
          amount: s.price,
          quantity: s.quantity || 1,
        }))
      : [
          {
            description: invoice.order?.address
              ? `Real estate media services for ${invoice.order.address}`
              : 'Real estate media services',
            amount: invoice.amount,
          },
        ]

    // Create the invoice
    const qbInvoice = await this.createInvoice(customer.Id, lines, {
      dueDate: invoice.due_date,
      invoiceNumber: invoice.id.slice(0, 8).toUpperCase(),
    })

    return {
      quickbooksInvoiceId: qbInvoice.Id!,
      quickbooksCustomerId: customer.Id,
    }
  }
}

// Singleton instance
let quickbooksClient: QuickBooksClient | null = null

export function getQuickBooksClient(): QuickBooksClient {
  if (!quickbooksClient) {
    quickbooksClient = new QuickBooksClient()
  }
  return quickbooksClient
}

/**
 * Create a client with specific credentials (for OAuth callback)
 */
export function createQuickBooksClient(config: Partial<QuickBooksConfig>): QuickBooksClient {
  return new QuickBooksClient(config)
}
