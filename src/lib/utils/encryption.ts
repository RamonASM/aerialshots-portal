/**
 * Token Encryption Utilities
 *
 * Provides AES-256-GCM encryption for storing sensitive tokens
 * Used by QuickBooks, Instagram, and other OAuth integrations
 */

import crypto from 'crypto'

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Get encryption key from environment
 * Supports base64 (44 chars), hex (64 chars), or raw string (hashed to 32 bytes)
 */
function getEncryptionKey(envKey: string): Buffer {
  const key = process.env[envKey]
  if (!key) {
    throw new Error(`${envKey} environment variable is required for token encryption`)
  }

  // If key is base64 encoded (44 chars = 32 bytes in base64)
  if (key.length === 44) {
    return Buffer.from(key, 'base64')
  }

  // If key is hex encoded (64 chars = 32 bytes in hex)
  if (key.length === 64) {
    return Buffer.from(key, 'hex')
  }

  // Hash the key to get consistent 32 bytes
  return crypto.createHash('sha256').update(key).digest()
}

/**
 * Encrypt a token using AES-256-GCM
 * Returns a base64 string containing IV + encrypted data + auth tag
 */
export function encryptToken(token: string, envKeyName: string = 'TOKEN_ENCRYPTION_KEY'): string {
  const key = getEncryptionKey(envKeyName)
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(token, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])

  const tag = cipher.getAuthTag()

  // Combine IV + encrypted + tag
  const combined = Buffer.concat([iv, encrypted, tag])

  return combined.toString('base64')
}

/**
 * Decrypt a token encrypted with encryptToken
 * Expects a base64 string containing IV + encrypted data + auth tag
 */
export function decryptToken(encryptedToken: string, envKeyName: string = 'TOKEN_ENCRYPTION_KEY'): string {
  const key = getEncryptionKey(envKeyName)
  const combined = Buffer.from(encryptedToken, 'base64')

  // Extract IV, encrypted data, and auth tag
  const iv = combined.subarray(0, IV_LENGTH)
  const tag = combined.subarray(combined.length - TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}

/**
 * Check if a token appears to be encrypted (base64 format with correct structure)
 */
export function isTokenEncrypted(token: string): boolean {
  try {
    const buffer = Buffer.from(token, 'base64')
    // Encrypted tokens should be at least IV + TAG length
    return buffer.length > IV_LENGTH + TAG_LENGTH
  } catch {
    return false
  }
}

/**
 * Safely get a usable token - decrypts if encrypted
 * In development without encryption key, returns token with warning
 * In production, requires encryption key
 */
export function getUsableToken(token: string, envKeyName: string = 'TOKEN_ENCRYPTION_KEY'): string {
  // Check if encryption key is configured
  if (!process.env[envKeyName]) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${envKeyName} must be configured in production`)
    }
    console.warn(`Token encryption not configured (${envKeyName}) - development mode only`)
    return token
  }

  // If it looks like an encrypted token, decrypt it
  if (isTokenEncrypted(token)) {
    return decryptToken(token, envKeyName)
  }

  // Unencrypted token in database - this is a legacy issue
  console.warn('Found unencrypted token - should be re-encrypted')
  return token
}

/**
 * Generate a new encryption key (run this once to create a key)
 * Returns base64-encoded 32-byte key
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(KEY_LENGTH)
  return key.toString('base64')
}

// QuickBooks-specific helpers
export const QB_ENCRYPTION_KEY = 'QUICKBOOKS_TOKEN_ENCRYPTION_KEY'

export function encryptQBToken(token: string): string {
  return encryptToken(token, QB_ENCRYPTION_KEY)
}

export function decryptQBToken(encryptedToken: string): string {
  return decryptToken(encryptedToken, QB_ENCRYPTION_KEY)
}

export function getUsableQBToken(token: string): string {
  return getUsableToken(token, QB_ENCRYPTION_KEY)
}
