import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
    removeChannel: vi.fn(),
  }),
}))

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_mock')
vi.stubEnv('YELP_API_KEY', 'test-yelp-key')
vi.stubEnv('EVENTBRITE_API_KEY', 'test-eventbrite-key')
vi.stubEnv('TMDB_API_KEY', 'test-tmdb-key')
vi.stubEnv('NEWS_API_KEY', 'test-news-key')
vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-google-key')
vi.stubEnv('WALKSCORE_API_KEY', 'test-walkscore-key')

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockReset()
})

// Export mock fetch for tests to configure
export { mockFetch }
