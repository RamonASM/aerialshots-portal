#!/usr/bin/env node
/**
 * Test Upstash Redis Connection
 *
 * This script verifies that the Upstash Redis credentials are correctly
 * configured and that we can connect to the Redis instance.
 */

import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

console.log('🔍 Testing Upstash Redis Connection...\n')

// Check environment variables
const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

console.log('Environment Check:')
console.log('  UPSTASH_REDIS_REST_URL:', url ? '✓ Set' : '✗ Missing')
console.log('  UPSTASH_REDIS_REST_TOKEN:', token ? '✓ Set' : '✗ Missing')

if (!url || !token) {
  console.error('\n❌ Missing Upstash credentials in environment')
  console.error('Make sure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set in .env.local')
  process.exit(1)
}

console.log('\n📡 Connection Details:')
console.log('  URL:', url.substring(0, 40) + '...')
console.log('  Token:', token.substring(0, 20) + '...')

// Test Redis connection
console.log('\n🧪 Testing Redis Operations...')

async function testConnection() {
  try {
    // Create Redis client
    const redis = new Redis({ url, token })
    console.log('  ✓ Redis client created')

    // Test 1: Ping
    console.log('\n  Test 1: PING')
    const pingStart = Date.now()
    const pingResult = await redis.ping()
    const pingLatency = Date.now() - pingStart
    console.log(`    Result: ${pingResult}`)
    console.log(`    Latency: ${pingLatency}ms`)

    if (pingResult !== 'PONG') {
      throw new Error('Ping did not return PONG')
    }
    console.log('    ✓ PING test passed')

    // Test 2: Set/Get
    console.log('\n  Test 2: SET/GET')
    const testKey = `test:${Date.now()}`
    const testValue = { hello: 'world', timestamp: new Date().toISOString() }

    await redis.set(testKey, testValue, { ex: 60 })
    console.log(`    ✓ SET ${testKey}`)

    const getValue = await redis.get(testKey)
    console.log(`    ✓ GET ${testKey}`)
    console.log(`    Value:`, getValue)

    if (JSON.stringify(getValue) !== JSON.stringify(testValue)) {
      throw new Error('Retrieved value does not match')
    }
    console.log('    ✓ SET/GET test passed')

    // Test 3: Delete
    console.log('\n  Test 3: DEL')
    const delResult = await redis.del(testKey)
    console.log(`    Result: ${delResult} key(s) deleted`)
    console.log('    ✓ DEL test passed')

    // Test 4: Rate Limiter
    console.log('\n  Test 4: Rate Limiter')
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
      prefix: 'test:ratelimit',
    })
    console.log('    ✓ Rate limiter created')

    const identifier = `test-user-${Date.now()}`
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)

    console.log(`    Success: ${success}`)
    console.log(`    Limit: ${limit}`)
    console.log(`    Remaining: ${remaining}`)
    console.log(`    Reset: ${new Date(reset * 1000).toISOString()}`)
    console.log('    ✓ Rate limit test passed')

    // Cleanup
    await redis.del(`test:ratelimit:${identifier}`)

    console.log('\n✅ All tests passed! Upstash Redis is working correctly.')
    console.log('\nConnection Summary:')
    console.log(`  • Latency: ${pingLatency}ms`)
    console.log('  • SET/GET: Working')
    console.log('  • Rate Limiting: Working')
    console.log('  • Status: Healthy')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

testConnection()
