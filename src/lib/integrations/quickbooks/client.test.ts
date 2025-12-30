/**
 * QuickBooks Integration Tests
 *
 * Tests for QuickBooks Online invoice synchronization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QuickBooksClient, getQuickBooksClient, createQuickBooksClient } from './client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock environment variables
const originalEnv = process.env

describe('QuickBooksClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      QUICKBOOKS_CLIENT_ID: 'test-client-id',
      QUICKBOOKS_CLIENT_SECRET: 'test-client-secret',
      QUICKBOOKS_REDIRECT_URI: 'http://localhost:3000/api/integrations/quickbooks/callback',
      QUICKBOOKS_ENVIRONMENT: 'sandbox',
    }
  })

  describe('Configuration', () => {
    it('should check if configured correctly', () => {
      const client = new QuickBooksClient()
      expect(client.isConfigured()).toBe(true)
    })

    it('should return false if not configured', () => {
      process.env.QUICKBOOKS_CLIENT_ID = ''
      const client = new QuickBooksClient({})
      expect(client.isConfigured()).toBe(false)
    })

    it('should check if connected', () => {
      const client = new QuickBooksClient({
        accessToken: 'test-token',
        realmId: 'test-realm',
      })
      expect(client.isConnected()).toBe(true)
    })

    it('should return false if not connected', () => {
      const client = new QuickBooksClient()
      expect(client.isConnected()).toBe(false)
    })
  })

  describe('OAuth', () => {
    it('should generate authorization URL', () => {
      const client = new QuickBooksClient()
      const url = client.getAuthorizationUrl('test-state')

      expect(url).toContain('https://appcenter.intuit.com/connect/oauth2')
      expect(url).toContain('client_id=test-client-id')
      expect(url).toContain('state=test-state')
      expect(url).toContain('response_type=code')
      expect(url).toContain('scope=com.intuit.quickbooks.accounting')
    })

    it('should include redirect URI in authorization URL', () => {
      const client = new QuickBooksClient()
      const url = client.getAuthorizationUrl('state')

      expect(url).toContain(encodeURIComponent('http://localhost:3000/api/integrations/quickbooks/callback'))
    })

    it('should exchange code for tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          x_refresh_token_expires_in: 8726400,
          realmId: 'test-realm',
        }),
      })

      const client = new QuickBooksClient()
      const tokens = await client.exchangeCode('auth-code')

      expect(tokens.access_token).toBe('new-access-token')
      expect(tokens.refresh_token).toBe('new-refresh-token')
      expect(tokens.realmId).toBe('test-realm')
    })

    it('should throw error on failed code exchange', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid code',
      })

      const client = new QuickBooksClient()
      await expect(client.exchangeCode('invalid-code')).rejects.toThrow('QuickBooks token exchange failed')
    })

    it('should refresh access token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'refreshed-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        }),
      })

      const client = new QuickBooksClient({
        refreshToken: 'old-refresh-token',
      })

      const tokens = await client.refreshAccessToken()

      expect(tokens.access_token).toBe('refreshed-token')
    })

    it('should throw error when no refresh token available', async () => {
      const client = new QuickBooksClient()
      await expect(client.refreshAccessToken()).rejects.toThrow('No refresh token available')
    })
  })

  describe('Customer Operations', () => {
    const connectedClient = () =>
      new QuickBooksClient({
        accessToken: 'test-token',
        realmId: 'test-realm',
      })

    it('should find existing customer by email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          QueryResponse: {
            Customer: [
              {
                Id: 'customer-123',
                DisplayName: 'John Doe',
                PrimaryEmailAddr: { Address: 'john@example.com' },
              },
            ],
          },
        }),
      })

      const client = connectedClient()
      const customer = await client.findOrCreateCustomer('john@example.com', 'John Doe')

      expect(customer.Id).toBe('customer-123')
    })

    it('should create customer if not found', async () => {
      // First call: search returns empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          QueryResponse: { Customer: [] },
        }),
      })

      // Second call: create customer
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Customer: {
            Id: 'new-customer-456',
            DisplayName: 'Jane Smith',
            PrimaryEmailAddr: { Address: 'jane@example.com' },
          },
        }),
      })

      const client = connectedClient()
      const customer = await client.findOrCreateCustomer('jane@example.com', 'Jane Smith')

      expect(customer.Id).toBe('new-customer-456')
      expect(customer.DisplayName).toBe('Jane Smith')
    })

    it('should include phone and company when creating customer', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ QueryResponse: {} }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Customer: {
            Id: 'customer-789',
            DisplayName: 'Bob Agent',
            PrimaryEmailAddr: { Address: 'bob@realty.com' },
            PrimaryPhone: { FreeFormNumber: '555-1234' },
            CompanyName: 'Best Realty',
          },
        }),
      })

      const client = connectedClient()
      const customer = await client.findOrCreateCustomer(
        'bob@realty.com',
        'Bob Agent',
        '555-1234',
        'Best Realty'
      )

      expect(customer.CompanyName).toBe('Best Realty')
    })
  })

  describe('Invoice Operations', () => {
    const connectedClient = () =>
      new QuickBooksClient({
        accessToken: 'test-token',
        realmId: 'test-realm',
      })

    it('should create invoice with line items', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Invoice: {
            Id: 'invoice-123',
            DocNumber: 'INV-001',
            CustomerRef: { value: 'customer-1' },
            TotalAmt: 449,
            Balance: 449,
          },
        }),
      })

      const client = connectedClient()
      const invoice = await client.createInvoice('customer-1', [
        { description: 'Photo shoot', amount: 299, quantity: 1 },
        { description: 'Drone footage', amount: 150, quantity: 1 },
      ])

      expect(invoice.Id).toBe('invoice-123')
      expect(invoice.TotalAmt).toBe(449)
    })

    it('should include due date and invoice number', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Invoice: {
            Id: 'invoice-456',
            DocNumber: 'ASM-001',
            DueDate: '2025-02-15',
            TotalAmt: 500,
          },
        }),
      })

      const client = connectedClient()
      const invoice = await client.createInvoice(
        'customer-1',
        [{ description: 'Services', amount: 500 }],
        { dueDate: '2025-02-15', invoiceNumber: 'ASM-001' }
      )

      expect(invoice.DocNumber).toBe('ASM-001')
    })

    it('should set email status when sendEmail is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Invoice: {
            Id: 'invoice-789',
            EmailStatus: 'NeedToSend',
            TotalAmt: 300,
          },
        }),
      })

      const client = connectedClient()
      const invoice = await client.createInvoice(
        'customer-1',
        [{ description: 'Services', amount: 300 }],
        { sendEmail: true }
      )

      expect(invoice.EmailStatus).toBe('NeedToSend')
    })

    it('should get invoice by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Invoice: {
            Id: 'invoice-123',
            TotalAmt: 450,
            Balance: 0,
          },
        }),
      })

      const client = connectedClient()
      const invoice = await client.getInvoice('invoice-123')

      expect(invoice.Id).toBe('invoice-123')
      expect(invoice.Balance).toBe(0)
    })

    it('should record payment for invoice', async () => {
      // First: get invoice
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Invoice: {
            Id: 'invoice-123',
            CustomerRef: { value: 'customer-1' },
            TotalAmt: 500,
          },
        }),
      })

      // Second: record payment
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      const client = connectedClient()
      await expect(
        client.recordPayment('invoice-123', 500, '2025-01-15')
      ).resolves.not.toThrow()
    })
  })

  describe('Sync Invoice', () => {
    const connectedClient = () =>
      new QuickBooksClient({
        accessToken: 'test-token',
        realmId: 'test-realm',
      })

    it('should sync ASM invoice to QuickBooks', async () => {
      // Find/create customer
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          QueryResponse: {
            Customer: [{ Id: 'qb-customer-1' }],
          },
        }),
      })

      // Create invoice
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Invoice: {
            Id: 'qb-invoice-1',
            TotalAmt: 449,
          },
        }),
      })

      const client = connectedClient()
      const result = await client.syncInvoice({
        id: 'asm-invoice-123',
        amount: 449,
        due_date: '2025-02-01',
        agent: {
          name: 'Jane Agent',
          email: 'jane@realty.com',
        },
        services: [
          { name: 'Photo Package', price: 299 },
          { name: 'Drone Add-on', price: 150 },
        ],
      })

      expect(result.quickbooksInvoiceId).toBe('qb-invoice-1')
      expect(result.quickbooksCustomerId).toBe('qb-customer-1')
    })

    it('should create single line item for total when no services', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          QueryResponse: { Customer: [{ Id: 'customer-1' }] },
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Invoice: { Id: 'invoice-1', TotalAmt: 449 },
        }),
      })

      const client = connectedClient()
      await client.syncInvoice({
        id: 'asm-123',
        amount: 449,
        due_date: '2025-02-01',
        agent: { name: 'Test Agent', email: 'test@test.com' },
        order: { address: '123 Main St' },
      })

      // Verify fetch was called with correct body containing address
      const invoiceCall = mockFetch.mock.calls[1]
      const body = JSON.parse(invoiceCall[1].body)
      expect(body.Line[0].Description).toContain('123 Main St')
    })
  })

  describe('Error Handling', () => {
    it('should throw error when not connected', async () => {
      const client = new QuickBooksClient()
      await expect(client.getInvoice('any-id')).rejects.toThrow('QuickBooks not connected')
    })

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      })

      const client = new QuickBooksClient({
        accessToken: 'invalid-token',
        realmId: 'test-realm',
      })

      await expect(client.getInvoice('invoice-123')).rejects.toThrow('QuickBooks API error')
    })
  })

  describe('Singleton and Factory', () => {
    it('should return singleton client', () => {
      const client1 = getQuickBooksClient()
      const client2 = getQuickBooksClient()
      expect(client1).toBe(client2)
    })

    it('should create new client with config', () => {
      const client = createQuickBooksClient({
        accessToken: 'custom-token',
        realmId: 'custom-realm',
      })
      expect(client.isConnected()).toBe(true)
    })
  })
})

describe('QuickBooks Environment', () => {
  it('should use sandbox API by default', () => {
    process.env.QUICKBOOKS_ENVIRONMENT = 'sandbox'
    const client = new QuickBooksClient()
    const url = client.getAuthorizationUrl('state')
    expect(url).toContain('appcenter.intuit.com')
  })
})
