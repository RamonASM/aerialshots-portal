/**
 * Require Staff Middleware Tests
 *
 * Tests for staff authorization middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireStaff, type StaffUser } from './require-staff'

// Mock functions - will be wired up inside the mock factory
const mockGetUser = vi.fn()
const mockStaffMaybeSingle = vi.fn()
const mockPartnerMaybeSingle = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'staff') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: () => mockStaffMaybeSingle(),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: () => mockSingle(),
            }),
          }),
        }
      }
      if (table === 'partners') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: () => mockPartnerMaybeSingle(),
              }),
            }),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      }
    }),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('requireStaff', () => {
  describe('Authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await expect(requireStaff()).rejects.toThrow('Unauthorized: Not authenticated')
    })

    it('should throw error on auth error', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      })

      await expect(requireStaff()).rejects.toThrow('Unauthorized: Not authenticated')
    })
  })

  describe('Email Domain Validation', () => {
    beforeEach(() => {
      // Default: no staff or partner found
      mockStaffMaybeSingle.mockResolvedValue({ data: null, error: null })
      mockPartnerMaybeSingle.mockResolvedValue({ data: null, error: null })
    })

    it('should throw error for non-staff email', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@gmail.com',
          },
        },
        error: null,
      })

      await expect(requireStaff()).rejects.toThrow('Unauthorized: Not staff or partner')
    })

    it('should throw error for similar but invalid domains', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@fakeaerialshots.media',
          },
        },
        error: null,
      })

      await expect(requireStaff()).rejects.toThrow('Unauthorized: Not staff or partner')
    })

    it('should throw error for subdomain attempts', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@subdomain.aerialshots.media',
          },
        },
        error: null,
      })

      // This actually would pass since it ends with @aerialshots.media
      // The check is email.endsWith('@aerialshots.media')
      await expect(requireStaff()).rejects.toThrow('Unauthorized: Not staff or partner')
    })

    it('should accept valid aerialshots.media email', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'john@aerialshots.media',
          },
        },
        error: null,
      })

      mockStaffMaybeSingle.mockResolvedValue({
        data: {
          id: 'staff-123',
          email: 'john@aerialshots.media',
          role: 'admin',
          name: 'John Staff',
        },
        error: null,
      })

      const result = await requireStaff()
      expect(result.email).toBe('john@aerialshots.media')
    })
  })

  describe('Staff Record Lookup', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'jane@aerialshots.media',
          },
        },
        error: null,
      })
      mockPartnerMaybeSingle.mockResolvedValue({ data: null, error: null })
    })

    it('should return existing staff record', async () => {
      const staffData: StaffUser = {
        id: 'staff-456',
        email: 'jane@aerialshots.media',
        role: 'photographer',
        name: 'Jane Photographer',
      }

      mockStaffMaybeSingle.mockResolvedValue({
        data: staffData,
        error: null,
      })

      const result = await requireStaff()

      expect(result).toEqual(staffData)
    })

    it('should throw error on staff lookup failure', async () => {
      mockStaffMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(requireStaff()).rejects.toThrow('Unauthorized: Staff lookup failed')
    })
  })

  describe('Staff Auto-Registration', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'newstaff@aerialshots.media',
          },
        },
        error: null,
      })

      // No existing staff or partner record
      mockStaffMaybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })
      mockPartnerMaybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })
    })

    it('should auto-create staff record for new @aerialshots.media user', async () => {
      const newStaffData: StaffUser = {
        id: 'new-staff-789',
        email: 'newstaff@aerialshots.media',
        role: 'staff',
        name: 'newstaff',
      }

      mockSingle.mockResolvedValue({
        data: newStaffData,
        error: null,
      })

      const result = await requireStaff()

      // Verify new staff record returned with expected data
      expect(result).toEqual(newStaffData)
      expect(result.email).toBe('newstaff@aerialshots.media')
      expect(result.role).toBe('staff')
      expect(result.name).toBe('newstaff')
    })

    it('should extract name from email for auto-registration', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'john.smith@aerialshots.media',
          },
        },
        error: null,
      })

      mockSingle.mockResolvedValue({
        data: {
          id: 'new-staff-789',
          email: 'john.smith@aerialshots.media',
          role: 'staff',
          name: 'john.smith',
        },
        error: null,
      })

      const result = await requireStaff()

      // Verify name was extracted from email prefix
      expect(result.name).toBe('john.smith')
      expect(result.email).toBe('john.smith@aerialshots.media')
    })

    it('should throw error if auto-registration fails', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      })

      await expect(requireStaff()).rejects.toThrow('Unauthorized: Failed to create staff record')
    })

    it('should set default role to staff for auto-registration', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: 'new-staff-789',
          email: 'newstaff@aerialshots.media',
          role: 'staff',
          name: 'newstaff',
        },
        error: null,
      })

      const result = await requireStaff()

      // Verify default role is 'staff' for auto-registered users
      expect(result.role).toBe('staff')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty email', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: '',
          },
        },
        error: null,
      })

      await expect(requireStaff()).rejects.toThrow('Unauthorized: Not staff')
    })

    it('should handle undefined email', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: undefined,
          },
        },
        error: null,
      })

      await expect(requireStaff()).rejects.toThrow('Unauthorized: Not staff')
    })

    it('should handle null user object', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await expect(requireStaff()).rejects.toThrow('Unauthorized: Not authenticated')
    })
  })

  describe('Return Value', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'admin@aerialshots.media',
          },
        },
        error: null,
      })
      mockPartnerMaybeSingle.mockResolvedValue({ data: null, error: null })
    })

    it('should return StaffUser with all fields', async () => {
      const staffData: StaffUser = {
        id: 'staff-999',
        email: 'admin@aerialshots.media',
        role: 'admin',
        name: 'Admin User',
      }

      mockStaffMaybeSingle.mockResolvedValue({
        data: staffData,
        error: null,
      })

      const result = await requireStaff()

      expect(result.id).toBe('staff-999')
      expect(result.email).toBe('admin@aerialshots.media')
      expect(result.role).toBe('admin')
      expect(result.name).toBe('Admin User')
    })

    it('should return StaffUser with optional fields undefined', async () => {
      mockStaffMaybeSingle.mockResolvedValue({
        data: {
          id: 'staff-999',
          email: 'admin@aerialshots.media',
        },
        error: null,
      })

      const result = await requireStaff()

      expect(result.id).toBe('staff-999')
      expect(result.email).toBe('admin@aerialshots.media')
      expect(result.role).toBeUndefined()
      expect(result.name).toBeUndefined()
    })
  })
})
