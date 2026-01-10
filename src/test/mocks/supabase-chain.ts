import { vi } from 'vitest'

/**
 * Creates a fully chainable Supabase mock that handles all PostgREST query patterns.
 *
 * Usage:
 * ```typescript
 * mockSupabaseFrom.mockReturnValue(createChain({ data: { id: '1' }, error: null }))
 * ```
 *
 * Supports patterns like:
 * - `.from('table').select().eq().single().returns()`
 * - `.from('table').insert().select().single()`
 * - `.from('table').select().eq().maybeSingle()`
 * - Direct await on chain
 */
export function createChain(finalResult: unknown) {
  const createNestedChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {}

    // Standard chainable methods that return another chain
    const chainableMethods = [
      'select',
      'insert',
      'update',
      'delete',
      'upsert',
      'eq',
      'neq',
      'is',
      'in',
      'contains',
      'gte',
      'gt',
      'lt',
      'lte',
      'like',
      'ilike',
      'or',
      'and',
      'not',
      'filter',
      'match',
      'order',
      'limit',
      'range',
      'rpc',
      'returns',
      'textSearch',
      'overlaps',
      'containedBy',
    ]

    chainableMethods.forEach((method) => {
      chain[method] = vi.fn(() => createNestedChain())
    })

    // Terminal methods that return a thenable with .returns()
    const terminalMethods = ['single', 'maybeSingle']
    terminalMethods.forEach((method) => {
      chain[method] = vi.fn(() => {
        // Create a thenable that can also have .returns() called on it
        const result = Promise.resolve(finalResult) as Promise<unknown> & {
          returns: () => Promise<unknown>
        }
        // Add .returns() method for type inference chains like .single().returns()
        result.returns = () => result
        return result
      })
    })

    // Allow the chain itself to be awaited
    chain.then = (resolve: (value: unknown) => void) =>
      Promise.resolve(finalResult).then(resolve)

    return chain
  }

  return createNestedChain()
}

/**
 * Creates a mock for Supabase 'from' that returns chainable queries.
 *
 * Usage:
 * ```typescript
 * const mockFrom = createMockFrom()
 * vi.mock('@/lib/supabase/admin', () => ({
 *   createAdminClient: () => ({ from: mockFrom }),
 * }))
 *
 * // In test
 * mockFrom.mockReturnValueOnce(createChain({ data: [...], error: null }))
 * ```
 */
export function createMockFrom() {
  return vi.fn(() => createChain({ data: null, error: null }))
}

/**
 * Creates a mock Supabase client with common patterns.
 */
export function createMockSupabaseClient() {
  const mockFrom = createMockFrom()

  return {
    from: mockFrom,
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: null }, error: null })
      ),
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  }
}
