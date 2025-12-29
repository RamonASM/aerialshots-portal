import { describe, it, expect } from 'vitest'
import {
  integrationCompleteEmail,
  integrationFailedEmail,
  smsTemplates,
} from './templates'
import type { IntegrationCompleteData, IntegrationFailedData } from './types'

describe('Integration Notification Templates', () => {
  describe('integrationCompleteEmail', () => {
    const baseData: IntegrationCompleteData = {
      recipientName: 'John Editor',
      integrationName: 'AI-edited photos',
      propertyAddress: '123 Main St, Orlando, FL',
      listingId: 'listing-123',
      dashboardUrl: '/admin/ops/jobs/listing-123',
    }

    it('should generate email with correct subject', () => {
      const result = integrationCompleteEmail(baseData)

      expect(result.subject).toBe('Ready for Review: AI-edited photos - 123 Main St, Orlando, FL')
    })

    it('should include recipient name in HTML', () => {
      const result = integrationCompleteEmail(baseData)

      expect(result.html).toContain('Hi John Editor')
    })

    it('should include integration name in HTML', () => {
      const result = integrationCompleteEmail(baseData)

      expect(result.html).toContain('AI-edited photos')
    })

    it('should include property address in HTML', () => {
      const result = integrationCompleteEmail(baseData)

      expect(result.html).toContain('123 Main St, Orlando, FL')
    })

    it('should include dashboard URL in HTML', () => {
      const result = integrationCompleteEmail(baseData)

      expect(result.html).toContain('portal.aerialshots.media/admin/ops/jobs/listing-123')
    })

    it('should include message when provided', () => {
      const dataWithMessage: IntegrationCompleteData = {
        ...baseData,
        message: 'Photos have been color-corrected and sky-replaced.',
      }

      const result = integrationCompleteEmail(dataWithMessage)

      expect(result.html).toContain('Photos have been color-corrected and sky-replaced.')
    })

    it('should generate plain text version', () => {
      const result = integrationCompleteEmail(baseData)

      expect(result.text).toContain('Hi John Editor')
      expect(result.text).toContain('AI-edited photos')
      expect(result.text).toContain('123 Main St, Orlando, FL')
    })

    it('should use green color for success styling', () => {
      const result = integrationCompleteEmail(baseData)

      expect(result.html).toContain('#22c55e') // Green color
    })

    it('should include call-to-action button', () => {
      const result = integrationCompleteEmail(baseData)

      expect(result.html).toContain('Review Now')
    })
  })

  describe('integrationFailedEmail', () => {
    const baseData: IntegrationFailedData = {
      recipientName: 'Jane Manager',
      integrationName: 'Cubicasa (floor plans)',
      propertyAddress: '456 Oak Ave, Tampa, FL',
      listingId: 'listing-456',
      status: 'failed',
      dashboardUrl: '/admin/ops/jobs/listing-456',
    }

    it('should generate email with correct subject', () => {
      const result = integrationFailedEmail(baseData)

      expect(result.subject).toBe('Action Required: Cubicasa (floor plans) - 456 Oak Ave, Tampa, FL')
    })

    it('should include recipient name in HTML', () => {
      const result = integrationFailedEmail(baseData)

      expect(result.html).toContain('Hi Jane Manager')
    })

    it('should include integration name in HTML', () => {
      const result = integrationFailedEmail(baseData)

      expect(result.html).toContain('Cubicasa (floor plans)')
    })

    it('should include property address in HTML', () => {
      const result = integrationFailedEmail(baseData)

      expect(result.html).toContain('456 Oak Ave, Tampa, FL')
    })

    it('should show "Failed" status label', () => {
      const result = integrationFailedEmail(baseData)

      expect(result.html).toContain('Failed')
    })

    it('should show "Needs Manual Attention" for needs_manual status', () => {
      const dataWithNeedsManual: IntegrationFailedData = {
        ...baseData,
        status: 'needs_manual',
      }

      const result = integrationFailedEmail(dataWithNeedsManual)

      expect(result.html).toContain('Needs Manual Attention')
    })

    it('should include error message when provided', () => {
      const dataWithError: IntegrationFailedData = {
        ...baseData,
        errorMessage: 'Scan data was incomplete. Missing kitchen measurements.',
      }

      const result = integrationFailedEmail(dataWithError)

      expect(result.html).toContain('Error Details')
      expect(result.html).toContain('Scan data was incomplete. Missing kitchen measurements.')
    })

    it('should not include error section when no error message', () => {
      const result = integrationFailedEmail(baseData)

      expect(result.html).not.toContain('Error Details')
    })

    it('should include suggested actions', () => {
      const result = integrationFailedEmail(baseData)

      expect(result.html).toContain('Retry the integration')
      expect(result.html).toContain('Process manually')
      expect(result.html).toContain('Contact the integration provider')
    })

    it('should use red color for error styling', () => {
      const result = integrationFailedEmail(baseData)

      expect(result.html).toContain('#dc2626') // Red color
    })

    it('should include call-to-action button', () => {
      const result = integrationFailedEmail(baseData)

      expect(result.html).toContain('View Details')
    })

    it('should generate plain text version', () => {
      const result = integrationFailedEmail(baseData)

      expect(result.text).toContain('Hi Jane Manager')
      expect(result.text).toContain('Cubicasa (floor plans)')
      expect(result.text).toContain('456 Oak Ave, Tampa, FL')
      expect(result.text).toContain('Status: Failed')
    })

    it('should include error in plain text when provided', () => {
      const dataWithError: IntegrationFailedData = {
        ...baseData,
        errorMessage: 'Connection timeout',
      }

      const result = integrationFailedEmail(dataWithError)

      expect(result.text).toContain('Error: Connection timeout')
    })
  })

  describe('SMS Templates', () => {
    describe('integrationComplete', () => {
      it('should generate concise SMS message', () => {
        const data: IntegrationCompleteData = {
          recipientName: 'Editor',
          integrationName: 'Floor plans',
          propertyAddress: '789 Pine St',
          listingId: 'listing-789',
          dashboardUrl: '/admin/ops/jobs/listing-789',
        }

        const result = smsTemplates.integrationComplete(data)

        expect(result).toContain('ASM:')
        expect(result).toContain('Floor plans')
        expect(result).toContain('789 Pine St')
        expect(result).toContain('portal.aerialshots.media')
      })

      it('should be under 160 characters for standard SMS', () => {
        const data: IntegrationCompleteData = {
          recipientName: 'Ed',
          integrationName: 'Photos',
          propertyAddress: '1 Oak',
          listingId: 'l-1',
          dashboardUrl: '/jobs/1',
        }

        const result = smsTemplates.integrationComplete(data)

        expect(result.length).toBeLessThanOrEqual(160)
      })
    })

    describe('integrationFailed', () => {
      it('should generate urgent SMS message', () => {
        const data: IntegrationFailedData = {
          recipientName: 'Manager',
          integrationName: 'Fotello',
          propertyAddress: '321 Elm St',
          listingId: 'listing-321',
          status: 'failed',
          dashboardUrl: '/admin/ops/jobs/listing-321',
        }

        const result = smsTemplates.integrationFailed(data)

        expect(result).toContain('ASM ALERT:')
        expect(result).toContain('Fotello')
        expect(result).toContain('321 Elm St')
        expect(result).toContain('Action needed')
      })

      it('should be under 160 characters for standard SMS', () => {
        const data: IntegrationFailedData = {
          recipientName: 'M',
          integrationName: 'API',
          propertyAddress: '1 St',
          listingId: 'l',
          status: 'failed',
          dashboardUrl: '/j/1',
        }

        const result = smsTemplates.integrationFailed(data)

        expect(result.length).toBeLessThanOrEqual(160)
      })
    })
  })

  describe('Email HTML Structure', () => {
    it('should wrap content in proper HTML document structure', () => {
      const data: IntegrationCompleteData = {
        recipientName: 'Test',
        integrationName: 'Test Integration',
        propertyAddress: 'Test Address',
        listingId: 'test-id',
        dashboardUrl: '/test',
      }

      const result = integrationCompleteEmail(data)

      expect(result.html).toContain('<!DOCTYPE html>')
      expect(result.html).toContain('<html>')
      expect(result.html).toContain('</html>')
      expect(result.html).toContain('<head>')
      expect(result.html).toContain('<body>')
    })

    it('should include ASM branding in footer', () => {
      const data: IntegrationCompleteData = {
        recipientName: 'Test',
        integrationName: 'Test',
        propertyAddress: 'Test',
        listingId: 'test',
        dashboardUrl: '/test',
      }

      const result = integrationCompleteEmail(data)

      expect(result.html).toContain('Aerial Shots Media')
      expect(result.html).toContain('portal.aerialshots.media')
    })

    it('should include viewport meta tag for mobile', () => {
      const data: IntegrationCompleteData = {
        recipientName: 'Test',
        integrationName: 'Test',
        propertyAddress: 'Test',
        listingId: 'test',
        dashboardUrl: '/test',
      }

      const result = integrationCompleteEmail(data)

      expect(result.html).toContain('viewport')
    })
  })

  describe('Integration Names Formatting', () => {
    const integrationNames = [
      { input: 'AI-edited photos', displayName: 'Fotello' },
      { input: 'Floor plans', displayName: 'Cubicasa' },
      { input: '3D tour', displayName: 'Zillow 3D' },
      { input: 'Fotello (AI editing)', displayName: 'Fotello' },
      { input: 'Cubicasa (floor plans)', displayName: 'Cubicasa' },
      { input: 'Zillow 3D (virtual tour)', displayName: 'Zillow' },
    ]

    integrationNames.forEach(({ input }) => {
      it(`should properly display "${input}" in email`, () => {
        const data: IntegrationCompleteData = {
          recipientName: 'Test',
          integrationName: input,
          propertyAddress: 'Test Address',
          listingId: 'test',
          dashboardUrl: '/test',
        }

        const result = integrationCompleteEmail(data)

        expect(result.html).toContain(input)
        expect(result.subject).toContain(input)
      })
    })
  })
})

describe('Notification Type Definitions', () => {
  it('should have IntegrationCompleteData with required fields', () => {
    const data: IntegrationCompleteData = {
      recipientName: 'Test',
      integrationName: 'Test',
      propertyAddress: 'Test',
      listingId: 'test-id',
      dashboardUrl: '/test',
    }

    expect(data.recipientName).toBeDefined()
    expect(data.integrationName).toBeDefined()
    expect(data.propertyAddress).toBeDefined()
    expect(data.listingId).toBeDefined()
    expect(data.dashboardUrl).toBeDefined()
  })

  it('should allow optional message in IntegrationCompleteData', () => {
    const dataWithMessage: IntegrationCompleteData = {
      recipientName: 'Test',
      integrationName: 'Test',
      propertyAddress: 'Test',
      listingId: 'test-id',
      dashboardUrl: '/test',
      message: 'Optional message',
    }

    expect(dataWithMessage.message).toBe('Optional message')
  })

  it('should have IntegrationFailedData with required fields', () => {
    const data: IntegrationFailedData = {
      recipientName: 'Test',
      integrationName: 'Test',
      propertyAddress: 'Test',
      listingId: 'test-id',
      status: 'failed',
      dashboardUrl: '/test',
    }

    expect(data.recipientName).toBeDefined()
    expect(data.integrationName).toBeDefined()
    expect(data.propertyAddress).toBeDefined()
    expect(data.listingId).toBeDefined()
    expect(data.status).toBeDefined()
    expect(data.dashboardUrl).toBeDefined()
  })

  it('should allow optional errorMessage in IntegrationFailedData', () => {
    const dataWithError: IntegrationFailedData = {
      recipientName: 'Test',
      integrationName: 'Test',
      propertyAddress: 'Test',
      listingId: 'test-id',
      status: 'failed',
      dashboardUrl: '/test',
      errorMessage: 'Something went wrong',
    }

    expect(dataWithError.errorMessage).toBe('Something went wrong')
  })
})
