/**
 * Welcome Series Tests
 *
 * Tests for the new agent welcome drip campaign
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getWelcomeSeriesEmails,
  getWelcomeEmail,
  getWelcomeSeriesLength,
  getWelcomeSeriesSchedule,
  WELCOME_SERIES_ID,
  WELCOME_SERIES_NAME,
  type DripEmail,
} from './welcome-series'

describe('Welcome Series Constants', () => {
  it('should have correct series ID', () => {
    expect(WELCOME_SERIES_ID).toBe('welcome-series')
  })

  it('should have correct series name', () => {
    expect(WELCOME_SERIES_NAME).toBe('New Agent Welcome Series')
  })
})

describe('getWelcomeSeriesLength', () => {
  it('should return 4 emails in series', () => {
    expect(getWelcomeSeriesLength()).toBe(4)
  })
})

describe('getWelcomeSeriesSchedule', () => {
  it('should return correct schedule', () => {
    expect(getWelcomeSeriesSchedule()).toEqual([0, 1, 3, 7])
  })

  it('should start with day 0', () => {
    const schedule = getWelcomeSeriesSchedule()
    expect(schedule[0]).toBe(0)
  })

  it('should end with day 7', () => {
    const schedule = getWelcomeSeriesSchedule()
    expect(schedule[schedule.length - 1]).toBe(7)
  })
})

describe('getWelcomeSeriesEmails', () => {
  const defaultData = {
    agentName: 'John Doe',
    agentFirstName: 'John',
    portalUrl: 'https://app.aerialshots.media',
    bookingUrl: 'https://app.aerialshots.media/book',
    referralCode: 'JOHN123',
  }

  it('should return 4 emails', () => {
    const emails = getWelcomeSeriesEmails(defaultData)
    expect(emails).toHaveLength(4)
  })

  it('should have all required days', () => {
    const emails = getWelcomeSeriesEmails(defaultData)
    const days = emails.map(e => e.day)
    expect(days).toEqual([0, 1, 3, 7])
  })

  describe('Day 0 - Welcome Email', () => {
    it('should have correct subject with first name', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day0 = emails.find(e => e.day === 0)!
      expect(day0.subject).toContain('John')
      expect(day0.subject).toContain('Welcome')
    })

    it('should include booking URL', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day0 = emails.find(e => e.day === 0)!
      expect(day0.html).toContain(defaultData.bookingUrl)
    })

    it('should include quick start guide', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day0 = emails.find(e => e.day === 0)!
      expect(day0.html).toContain('Quick Start Guide')
    })

    it('should have CTA button', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day0 = emails.find(e => e.day === 0)!
      expect(day0.html).toContain('Book Your First Shoot')
    })
  })

  describe('Day 1 - Prep Guide', () => {
    it('should have correct subject', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day1 = emails.find(e => e.day === 1)!
      expect(day1.subject).toContain('Prepare')
    })

    it('should include before shoot tips', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day1 = emails.find(e => e.day === 1)!
      expect(day1.html).toContain('Before the Shoot')
    })

    it('should include exterior tips', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day1 = emails.find(e => e.day === 1)!
      expect(day1.html).toContain('Exterior')
    })

    it('should include drone shot tips', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day1 = emails.find(e => e.day === 1)!
      expect(day1.html).toContain('Drone Shots')
    })
  })

  describe('Day 3 - Marketing Tools', () => {
    it('should have correct subject', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day3 = emails.find(e => e.day === 3)!
      expect(day3.subject).toContain('Marketing Tools')
    })

    it('should mention social posts', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day3 = emails.find(e => e.day === 3)!
      expect(day3.html).toContain('Social Posts')
    })

    it('should mention slideshow videos', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day3 = emails.find(e => e.day === 3)!
      expect(day3.html).toContain('Slideshow Videos')
    })

    it('should mention property website', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day3 = emails.find(e => e.day === 3)!
      expect(day3.html).toContain('Property Website')
    })

    it('should link to storywork dashboard', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day3 = emails.find(e => e.day === 3)!
      expect(day3.html).toContain('/dashboard/storywork')
    })
  })

  describe('Day 7 - Referral Program', () => {
    it('should have correct subject', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day7 = emails.find(e => e.day === 7)!
      expect(day7.subject).toContain('Earn')
      expect(day7.subject).toContain('Refer')
    })

    it('should mention $50 reward', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day7 = emails.find(e => e.day === 7)!
      expect(day7.html).toContain('$50')
    })

    it('should include referral URL with code', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day7 = emails.find(e => e.day === 7)!
      expect(day7.html).toContain('/ref/JOHN123')
    })

    it('should explain how it works', () => {
      const emails = getWelcomeSeriesEmails(defaultData)
      const day7 = emails.find(e => e.day === 7)!
      expect(day7.html).toContain('How It Works')
    })
  })

  describe('Variable Substitution', () => {
    it('should use first name from agentFirstName', () => {
      const emails = getWelcomeSeriesEmails({
        ...defaultData,
        agentFirstName: 'Johnny',
      })
      const day0 = emails.find(e => e.day === 0)!
      expect(day0.html).toContain('Johnny')
    })

    it('should extract first name from agentName if agentFirstName not provided', () => {
      const emails = getWelcomeSeriesEmails({
        agentName: 'Jane Smith',
      })
      const day0 = emails.find(e => e.day === 0)!
      expect(day0.html).toContain('Jane')
    })

    it('should use default portal URL if not provided', () => {
      const emails = getWelcomeSeriesEmails({
        agentName: 'John Doe',
      })
      const day3 = emails.find(e => e.day === 3)!
      expect(day3.html).toContain('https://app.aerialshots.media')
    })

    it('should use default booking URL if not provided', () => {
      const emails = getWelcomeSeriesEmails({
        agentName: 'John Doe',
      })
      const day0 = emails.find(e => e.day === 0)!
      expect(day0.html).toContain('https://app.aerialshots.media/book')
    })

    it('should use referrals dashboard if no referral code', () => {
      const emails = getWelcomeSeriesEmails({
        agentName: 'John Doe',
      })
      const day7 = emails.find(e => e.day === 7)!
      expect(day7.html).toContain('/dashboard/referrals')
    })
  })
})

describe('getWelcomeEmail', () => {
  const defaultData = {
    agentName: 'John Doe',
  }

  it('should return email for day 0', () => {
    const email = getWelcomeEmail(0, defaultData)
    expect(email).not.toBeNull()
    expect(email?.day).toBe(0)
  })

  it('should return email for day 1', () => {
    const email = getWelcomeEmail(1, defaultData)
    expect(email).not.toBeNull()
    expect(email?.day).toBe(1)
  })

  it('should return email for day 3', () => {
    const email = getWelcomeEmail(3, defaultData)
    expect(email).not.toBeNull()
    expect(email?.day).toBe(3)
  })

  it('should return email for day 7', () => {
    const email = getWelcomeEmail(7, defaultData)
    expect(email).not.toBeNull()
    expect(email?.day).toBe(7)
  })

  it('should return null for invalid day', () => {
    const email = getWelcomeEmail(5, defaultData)
    expect(email).toBeNull()
  })

  it('should return null for negative day', () => {
    const email = getWelcomeEmail(-1, defaultData)
    expect(email).toBeNull()
  })
})

describe('Email Structure', () => {
  const defaultData = {
    agentName: 'John Doe',
  }

  it('should have valid HTML structure', () => {
    const emails = getWelcomeSeriesEmails(defaultData)
    emails.forEach(email => {
      expect(email.html).toContain('<!DOCTYPE html>')
      expect(email.html).toContain('<html>')
      expect(email.html).toContain('</html>')
      expect(email.html).toContain('<body')
      expect(email.html).toContain('</body>')
    })
  })

  it('should have responsive viewport meta tag', () => {
    const emails = getWelcomeSeriesEmails(defaultData)
    emails.forEach(email => {
      expect(email.html).toContain('viewport')
    })
  })

  it('should have subject for each email', () => {
    const emails = getWelcomeSeriesEmails(defaultData)
    emails.forEach(email => {
      expect(email.subject).toBeDefined()
      expect(email.subject.length).toBeGreaterThan(0)
    })
  })

  it('should have preview text for each email', () => {
    const emails = getWelcomeSeriesEmails(defaultData)
    emails.forEach(email => {
      expect(email.previewText).toBeDefined()
      expect(email.previewText.length).toBeGreaterThan(0)
    })
  })

  it('should use dark theme styling', () => {
    const emails = getWelcomeSeriesEmails(defaultData)
    emails.forEach(email => {
      expect(email.html).toContain('#000') // Black background
      expect(email.html).toContain('#1c1c1e') // iOS elevated surface
      expect(email.html).toContain('#0077ff') // Blue accent
    })
  })
})
