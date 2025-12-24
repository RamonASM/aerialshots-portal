import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as templates from './templates'

describe('Notification Templates', () => {
  describe('photographerAssignedEmail', () => {
    it('should generate email with correct data', () => {
      const data = {
        photographerName: 'John Smith',
        listingAddress: '123 Main St, Orlando, FL',
        scheduledDate: 'December 26, 2024',
        scheduledTime: '10:00 AM',
        packageName: 'Signature',
        specialInstructions: 'Gate code: 1234',
      }

      const result = templates.photographerAssignedEmail(data)

      expect(result.subject).toContain('123 Main St')
      expect(result.html).toContain('John Smith')
      expect(result.html).toContain('December 26, 2024')
      expect(result.html).toContain('10:00 AM')
      expect(result.html).toContain('Signature')
      expect(result.html).toContain('Gate code: 1234')
      expect(result.text).toContain('John Smith')
    })

    it('should work without special instructions', () => {
      const data = {
        photographerName: 'John Smith',
        listingAddress: '123 Main St, Orlando, FL',
        scheduledDate: 'December 26, 2024',
        scheduledTime: '10:00 AM',
        packageName: 'Essentials',
      }

      const result = templates.photographerAssignedEmail(data)

      expect(result.html).not.toContain('Special Instructions')
    })
  })

  describe('editorAssignedEmail', () => {
    it('should generate email with correct data', () => {
      const data = {
        editorName: 'Jane Doe',
        listingAddress: '456 Oak Ave, Tampa, FL',
        agentName: 'Bob Agent',
        assetCount: 45,
        dueDate: 'December 27, 2024',
      }

      const result = templates.editorAssignedEmail(data)

      expect(result.subject).toContain('456 Oak Ave')
      expect(result.html).toContain('Jane Doe')
      expect(result.html).toContain('Bob Agent')
      expect(result.html).toContain('45 files')
      expect(result.html).toContain('December 27, 2024')
    })
  })

  describe('qcCompleteEmail', () => {
    it('should generate email with asset summary', () => {
      const data = {
        agentName: 'Bob Agent',
        listingAddress: '789 Pine Rd, Miami, FL',
        deliveryUrl: 'https://portal.aerialshots.media/delivery/abc123',
        assetSummary: {
          photos: 35,
          videos: 2,
          floorPlans: 1,
          tours: 1,
        },
      }

      const result = templates.qcCompleteEmail(data)

      expect(result.subject).toContain('Media Ready')
      expect(result.html).toContain('Bob Agent')
      expect(result.html).toContain('35 photos')
      expect(result.html).toContain('2 videos')
      expect(result.html).toContain('1 floor plans')
      expect(result.html).toContain('1 3D tours')
      expect(result.html).toContain(data.deliveryUrl)
    })

    it('should handle zero assets gracefully', () => {
      const data = {
        agentName: 'Bob Agent',
        listingAddress: '789 Pine Rd, Miami, FL',
        deliveryUrl: 'https://portal.aerialshots.media/delivery/abc123',
        assetSummary: {
          photos: 25,
          videos: 0,
          floorPlans: 0,
          tours: 0,
        },
      }

      const result = templates.qcCompleteEmail(data)

      expect(result.html).toContain('25 photos')
      expect(result.html).not.toContain('0 videos')
    })
  })

  describe('bookingConfirmedEmail', () => {
    it('should generate email with order details', () => {
      const data = {
        agentName: 'Alice Agent',
        listingAddress: '100 Beach Blvd, Naples, FL',
        packageName: 'Premier',
        scheduledDate: 'December 28, 2024',
        scheduledTime: '2:00 PM',
        totalAmount: '$649',
        orderId: 'ORD-12345',
      }

      const result = templates.bookingConfirmedEmail(data)

      expect(result.subject).toContain('Booking Confirmed')
      expect(result.html).toContain('Alice Agent')
      expect(result.html).toContain('Premier')
      expect(result.html).toContain('$649')
      expect(result.html).toContain('ORD-12345')
    })
  })

  describe('statusUpdateEmail', () => {
    it('should include human-readable status labels', () => {
      const data = {
        agentName: 'Agent Smith',
        listingAddress: '200 Harbor Way, Jacksonville, FL',
        previousStatus: 'scheduled',
        newStatus: 'in_photography',
      }

      const result = templates.statusUpdateEmail(data)

      expect(result.html).toContain('Photography In Progress')
    })
  })

  describe('SMS Templates', () => {
    it('should generate concise photographer assignment SMS', () => {
      const data = {
        photographerName: 'John',
        listingAddress: '123 Main St',
        scheduledDate: 'Dec 26',
        scheduledTime: '10am',
        packageName: 'Signature',
      }

      const sms = templates.smsTemplates.photographerAssigned(data)

      expect(sms).toContain('ASM:')
      expect(sms).toContain('123 Main St')
      expect(sms.length).toBeLessThan(160) // SMS length limit
    })

    it('should generate concise QC complete SMS', () => {
      const data = {
        agentName: 'Bob',
        listingAddress: '456 Oak Ave',
        deliveryUrl: 'https://portal.aerialshots.media/d/abc',
        assetSummary: { photos: 0, videos: 0, floorPlans: 0, tours: 0 },
      }

      const sms = templates.smsTemplates.qcComplete(data)

      expect(sms).toContain('ready')
      expect(sms).toContain(data.deliveryUrl)
    })
  })
})

describe('Email Template Structure', () => {
  it('should include Aerial Shots Media branding', () => {
    const data = {
      photographerName: 'Test',
      listingAddress: 'Test Address',
      scheduledDate: 'Test Date',
      scheduledTime: 'Test Time',
      packageName: 'Test Package',
    }

    const result = templates.photographerAssignedEmail(data)

    expect(result.html).toContain('Aerial Shots Media')
    expect(result.html).toContain('portal.aerialshots.media')
  })

  it('should include both HTML and plain text versions', () => {
    const data = {
      agentName: 'Test Agent',
      listingAddress: 'Test Address',
      deliveryUrl: 'https://example.com',
      assetSummary: { photos: 10, videos: 1, floorPlans: 1, tours: 0 },
    }

    const result = templates.qcCompleteEmail(data)

    expect(result.html).toBeTruthy()
    expect(result.text).toBeTruthy()
    expect(result.html).toContain('<html>')
    expect(result.text).not.toContain('<html>')
  })
})
