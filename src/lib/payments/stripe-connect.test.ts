import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to define mocks before they're used
const {
  mockStripeAccountsCreate,
  mockStripeAccountsRetrieve,
  mockStripeAccountLinksCreate,
  mockStripeAccountsCreateLoginLink,
  mockStripeTransfersCreate,
  mockStripeTransfersCreateReversal,
  mockStripeTransfersList,
  mockStripeBalanceRetrieve,
  mockStripeWebhooksConstructEvent,
  mockSupabaseFrom,
  mockSupabaseUpdate,
  mockSupabaseEq,
} = vi.hoisted(() => ({
  mockStripeAccountsCreate: vi.fn(),
  mockStripeAccountsRetrieve: vi.fn(),
  mockStripeAccountLinksCreate: vi.fn(),
  mockStripeAccountsCreateLoginLink: vi.fn(),
  mockStripeTransfersCreate: vi.fn(),
  mockStripeTransfersCreateReversal: vi.fn(),
  mockStripeTransfersList: vi.fn(),
  mockStripeBalanceRetrieve: vi.fn(),
  mockStripeWebhooksConstructEvent: vi.fn(),
  mockSupabaseFrom: vi.fn(),
  mockSupabaseUpdate: vi.fn(),
  mockSupabaseEq: vi.fn(),
}))

// Mock Stripe
vi.mock('./stripe', () => ({
  getStripe: () => ({
    accounts: {
      create: mockStripeAccountsCreate,
      retrieve: mockStripeAccountsRetrieve,
      createLoginLink: mockStripeAccountsCreateLoginLink,
    },
    accountLinks: {
      create: mockStripeAccountLinksCreate,
    },
    transfers: {
      create: mockStripeTransfersCreate,
      createReversal: mockStripeTransfersCreateReversal,
      list: mockStripeTransfersList,
    },
    balance: {
      retrieve: mockStripeBalanceRetrieve,
    },
    webhooks: {
      constructEvent: mockStripeWebhooksConstructEvent,
    },
  }),
}))

// Mock Supabase admin
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

// Import after mocks
import {
  createConnectAccount,
  generateOnboardingLink,
  getAccountStatus,
  syncAccountStatus,
  createTransfer,
  reverseTransfer,
  getAccountBalance,
  getTransfersForOrder,
  createLoginLink,
  verifyConnectWebhook,
} from './stripe-connect'

describe('stripe-connect', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup chainable Supabase mock
    mockSupabaseUpdate.mockReturnValue({ eq: mockSupabaseEq })
    mockSupabaseEq.mockReturnValue({ eq: mockSupabaseEq })
    mockSupabaseFrom.mockReturnValue({
      update: mockSupabaseUpdate,
    })
  })

  describe('createConnectAccount', () => {
    it('creates Express account with correct parameters', async () => {
      mockStripeAccountsCreate.mockResolvedValue({ id: 'acct_test123' })
      mockStripeAccountLinksCreate.mockResolvedValue({ url: 'https://connect.stripe.com/onboarding' })

      const result = await createConnectAccount({
        type: 'staff',
        entityId: 'staff-123',
        email: 'john@example.com',
        name: 'John Doe',
      })

      expect(result.success).toBe(true)
      expect(result.accountId).toBe('acct_test123')
      expect(result.onboardingUrl).toBe('https://connect.stripe.com/onboarding')

      expect(mockStripeAccountsCreate).toHaveBeenCalledWith({
        type: 'express',
        country: 'US',
        email: 'john@example.com',
        capabilities: { transfers: { requested: true } },
        business_type: 'individual',
        business_profile: {
          name: 'John Doe',
          product_description: 'Real estate photography and media services',
        },
        metadata: {
          entity_type: 'staff',
          entity_id: 'staff-123',
        },
      })
    })

    it('stores connect_id in database after creation', async () => {
      mockStripeAccountsCreate.mockResolvedValue({ id: 'acct_new123' })
      mockStripeAccountLinksCreate.mockResolvedValue({ url: 'https://stripe.com/onboard' })

      await createConnectAccount({
        type: 'staff',
        entityId: 'staff-456',
        email: 'test@example.com',
        name: 'Test User',
      })

      expect(mockSupabaseFrom).toHaveBeenCalledWith('staff')
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        stripe_connect_id: 'acct_new123',
        stripe_connect_status: 'pending',
      })
    })

    it('uses partners table for partner type', async () => {
      mockStripeAccountsCreate.mockResolvedValue({ id: 'acct_partner123' })
      mockStripeAccountLinksCreate.mockResolvedValue({ url: 'https://stripe.com/onboard' })

      await createConnectAccount({
        type: 'partner',
        entityId: 'partner-789',
        email: 'partner@example.com',
        name: 'Partner Corp',
        businessType: 'company',
      })

      expect(mockSupabaseFrom).toHaveBeenCalledWith('partners')
      expect(mockStripeAccountsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          business_type: 'company',
        })
      )
    })

    it('returns error on Stripe API failure', async () => {
      mockStripeAccountsCreate.mockRejectedValue(new Error('Invalid email'))

      const result = await createConnectAccount({
        type: 'staff',
        entityId: 'staff-123',
        email: 'bad@email',
        name: 'Test',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email')
    })
  })

  describe('generateOnboardingLink', () => {
    it('generates new onboarding link for existing account', async () => {
      mockStripeAccountLinksCreate.mockResolvedValue({
        url: 'https://connect.stripe.com/onboarding/new',
      })

      const result = await generateOnboardingLink({
        type: 'staff',
        entityId: 'staff-123',
        accountId: 'acct_existing',
      })

      expect(result.success).toBe(true)
      expect(result.onboardingUrl).toBe('https://connect.stripe.com/onboarding/new')

      expect(mockStripeAccountLinksCreate).toHaveBeenCalledWith({
        account: 'acct_existing',
        refresh_url: expect.stringContaining('api/connect/refresh'),
        return_url: expect.stringContaining('api/connect/return'),
        type: 'account_onboarding',
      })
    })

    it('returns error on failure', async () => {
      mockStripeAccountLinksCreate.mockRejectedValue(new Error('Account not found'))

      const result = await generateOnboardingLink({
        type: 'staff',
        entityId: 'staff-123',
        accountId: 'acct_invalid',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Account not found')
    })
  })

  describe('getAccountStatus', () => {
    it('returns active status when fully enabled', async () => {
      mockStripeAccountsRetrieve.mockResolvedValue({
        id: 'acct_active',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        requirements: {
          currently_due: [],
          eventually_due: [],
          past_due: [],
          pending_verification: [],
        },
      })

      const result = await getAccountStatus('acct_active')

      expect(result).not.toBeNull()
      expect(result?.status).toBe('active')
      expect(result?.chargesEnabled).toBe(true)
      expect(result?.payoutsEnabled).toBe(true)
    })

    it('returns pending status when details submitted but not enabled', async () => {
      mockStripeAccountsRetrieve.mockResolvedValue({
        id: 'acct_pending',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: true,
        requirements: {
          currently_due: ['verification.document'],
        },
      })

      const result = await getAccountStatus('acct_pending')

      expect(result?.status).toBe('pending')
    })

    it('returns rejected status when disabled with rejected reason', async () => {
      mockStripeAccountsRetrieve.mockResolvedValue({
        id: 'acct_rejected',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: true,
        requirements: {
          disabled_reason: 'rejected.fraud',
        },
      })

      const result = await getAccountStatus('acct_rejected')

      expect(result?.status).toBe('rejected')
    })

    it('returns null on error', async () => {
      mockStripeAccountsRetrieve.mockRejectedValue(new Error('Not found'))

      const result = await getAccountStatus('acct_invalid')

      expect(result).toBeNull()
    })
  })

  describe('syncAccountStatus', () => {
    it('updates database with account status', async () => {
      mockStripeAccountsRetrieve.mockResolvedValue({
        id: 'acct_sync',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      })

      const result = await syncAccountStatus({
        type: 'staff',
        entityId: 'staff-123',
        accountId: 'acct_sync',
      })

      expect(result).toBe(true)
      expect(mockSupabaseFrom).toHaveBeenCalledWith('staff')
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_connect_status: 'active',
          stripe_payouts_enabled: true,
          stripe_onboarding_completed_at: expect.any(String),
        })
      )
    })

    it('sets onboarding_completed_at when active', async () => {
      mockStripeAccountsRetrieve.mockResolvedValue({
        id: 'acct_complete',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      })

      await syncAccountStatus({
        type: 'partner',
        entityId: 'partner-456',
        accountId: 'acct_complete',
      })

      expect(mockSupabaseFrom).toHaveBeenCalledWith('partners')
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_onboarding_completed_at: expect.any(String),
        })
      )
    })

    it('returns false on error', async () => {
      mockStripeAccountsRetrieve.mockRejectedValue(new Error('API error'))

      const result = await syncAccountStatus({
        type: 'staff',
        entityId: 'staff-123',
        accountId: 'acct_error',
      })

      expect(result).toBe(false)
    })
  })

  describe('createTransfer', () => {
    it('creates transfer with correct parameters', async () => {
      mockStripeTransfersCreate.mockResolvedValue({ id: 'tr_123' })

      const result = await createTransfer({
        amountCents: 16000,
        destinationAccountId: 'acct_dest',
        orderId: 'order-123',
        staffId: 'staff-456',
        description: 'Test payout',
      })

      expect(result.success).toBe(true)
      expect(result.transferId).toBe('tr_123')

      expect(mockStripeTransfersCreate).toHaveBeenCalledWith(
        {
          amount: 16000,
          currency: 'usd',
          destination: 'acct_dest',
          description: 'Test payout',
          metadata: {
            order_id: 'order-123',
            staff_id: 'staff-456',
            partner_id: '',
          },
        },
        { idempotencyKey: expect.any(String) }
      )
    })

    it('uses custom idempotency key when provided', async () => {
      mockStripeTransfersCreate.mockResolvedValue({ id: 'tr_456' })

      await createTransfer({
        amountCents: 10000,
        destinationAccountId: 'acct_test',
        orderId: 'order-789',
        idempotencyKey: 'custom_key_123',
      })

      expect(mockStripeTransfersCreate).toHaveBeenCalledWith(
        expect.any(Object),
        { idempotencyKey: 'custom_key_123' }
      )
    })

    it('handles insufficient balance error', async () => {
      mockStripeTransfersCreate.mockRejectedValue(
        new Error('You have insufficient funds in your Stripe account')
      )

      const result = await createTransfer({
        amountCents: 1000000,
        destinationAccountId: 'acct_test',
        orderId: 'order-big',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('insufficient funds')
    })
  })

  describe('reverseTransfer', () => {
    it('reverses full transfer', async () => {
      mockStripeTransfersCreateReversal.mockResolvedValue({ id: 'trr_123' })

      const result = await reverseTransfer({
        transferId: 'tr_to_reverse',
        reason: 'Customer refund',
      })

      expect(result.success).toBe(true)
      expect(result.reversalId).toBe('trr_123')

      expect(mockStripeTransfersCreateReversal).toHaveBeenCalledWith('tr_to_reverse', {
        amount: undefined,
        description: 'Customer refund',
      })
    })

    it('reverses partial transfer amount', async () => {
      mockStripeTransfersCreateReversal.mockResolvedValue({ id: 'trr_partial' })

      const result = await reverseTransfer({
        transferId: 'tr_partial',
        amountCents: 5000,
        reason: 'Partial refund',
      })

      expect(result.success).toBe(true)

      expect(mockStripeTransfersCreateReversal).toHaveBeenCalledWith('tr_partial', {
        amount: 5000,
        description: 'Partial refund',
      })
    })

    it('handles already reversed error', async () => {
      mockStripeTransfersCreateReversal.mockRejectedValue(
        new Error('This transfer has already been reversed')
      )

      const result = await reverseTransfer({
        transferId: 'tr_already_reversed',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already been reversed')
    })
  })

  describe('getAccountBalance', () => {
    it('returns available and pending balances', async () => {
      mockStripeBalanceRetrieve.mockResolvedValue({
        available: [{ currency: 'usd', amount: 50000 }],
        pending: [{ currency: 'usd', amount: 10000 }],
      })

      const result = await getAccountBalance()

      expect(result).toEqual({
        available: 50000,
        pending: 10000,
      })
    })

    it('returns 0 for missing currency', async () => {
      mockStripeBalanceRetrieve.mockResolvedValue({
        available: [{ currency: 'eur', amount: 1000 }],
        pending: [],
      })

      const result = await getAccountBalance()

      expect(result).toEqual({
        available: 0,
        pending: 0,
      })
    })

    it('returns null on error', async () => {
      mockStripeBalanceRetrieve.mockRejectedValue(new Error('API error'))

      const result = await getAccountBalance()

      expect(result).toBeNull()
    })
  })

  describe('getTransfersForOrder', () => {
    it('filters transfers by order_id metadata', async () => {
      mockStripeTransfersList.mockResolvedValue({
        data: [
          { id: 'tr_1', metadata: { order_id: 'order-123' } },
          { id: 'tr_2', metadata: { order_id: 'order-456' } },
          { id: 'tr_3', metadata: { order_id: 'order-123' } },
        ],
      })

      const result = await getTransfersForOrder('order-123')

      expect(result).toHaveLength(2)
      expect(result.map(t => t.id)).toEqual(['tr_1', 'tr_3'])
    })

    it('returns empty array when no transfers found', async () => {
      mockStripeTransfersList.mockResolvedValue({
        data: [
          { id: 'tr_1', metadata: { order_id: 'other-order' } },
        ],
      })

      const result = await getTransfersForOrder('order-123')

      expect(result).toHaveLength(0)
    })

    it('returns empty array on error', async () => {
      mockStripeTransfersList.mockRejectedValue(new Error('API error'))

      const result = await getTransfersForOrder('order-123')

      expect(result).toEqual([])
    })
  })

  describe('createLoginLink', () => {
    it('creates login link for connected account', async () => {
      mockStripeAccountsCreateLoginLink.mockResolvedValue({
        url: 'https://connect.stripe.com/express/dashboard',
      })

      const result = await createLoginLink('acct_test')

      expect(result).toBe('https://connect.stripe.com/express/dashboard')
      expect(mockStripeAccountsCreateLoginLink).toHaveBeenCalledWith('acct_test')
    })

    it('returns null on error', async () => {
      mockStripeAccountsCreateLoginLink.mockRejectedValue(new Error('Invalid account'))

      const result = await createLoginLink('acct_invalid')

      expect(result).toBeNull()
    })
  })

  describe('verifyConnectWebhook', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv, STRIPE_CONNECT_WEBHOOK_SECRET: 'whsec_test' }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('verifies valid webhook signature', () => {
      const mockEvent = {
        type: 'account.updated',
        data: { object: { id: 'acct_123' } },
      }
      mockStripeWebhooksConstructEvent.mockReturnValue(mockEvent)

      const result = verifyConnectWebhook('payload', 'sig_valid')

      expect(result).toEqual(mockEvent)
      expect(mockStripeWebhooksConstructEvent).toHaveBeenCalledWith(
        'payload',
        'sig_valid',
        'whsec_test'
      )
    })

    it('returns null for invalid signature', () => {
      mockStripeWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const result = verifyConnectWebhook('payload', 'sig_invalid')

      expect(result).toBeNull()
    })

    it('returns null when webhook secret not configured', () => {
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET = undefined

      const result = verifyConnectWebhook('payload', 'sig')

      expect(result).toBeNull()
      expect(mockStripeWebhooksConstructEvent).not.toHaveBeenCalled()
    })
  })
})
