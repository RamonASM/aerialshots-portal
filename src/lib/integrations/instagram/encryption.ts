import crypto from 'crypto'
import { integrationLogger } from '@/lib/logger'

const logger = integrationLogger.child({ integration: 'instagram-encryption' })

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32

// Get encryption key from environment (must be 32 bytes for AES-256)
function getEncryptionKey(): Buffer {
  const key = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY
  if (!key) {
    throw new Error('INSTAGRAM_TOKEN_ENCRYPTION_KEY environment variable is required')
  }

  // If key is base64 encoded
  if (key.length === 44) {
    return Buffer.from(key, 'base64')
  }

  // If key is hex encoded
  if (key.length === 64) {
    return Buffer.from(key, 'hex')
  }

  // Hash the key to get consistent 32 bytes
  return crypto.createHash('sha256').update(key).digest()
}

/**
 * Encrypt an Instagram access token
 * Returns a base64 string containing IV + encrypted data + auth tag
 */
export function encryptToken(token: string): string {
  const key = getEncryptionKey()
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
 * Decrypt an Instagram access token
 * Expects a base64 string containing IV + encrypted data + auth tag
 */
export function decryptToken(encryptedToken: string): string {
  const key = getEncryptionKey()
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
 * Throws if encryption key is missing or decryption fails
 */
export function getUsableToken(token: string): string {
  // Security: Require encryption key in production
  if (!process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('INSTAGRAM_TOKEN_ENCRYPTION_KEY must be configured in production')
    }
    logger.warn('Token encryption not configured - development mode only')
    return token
  }

  // If it looks like an encrypted token, decrypt it
  if (isTokenEncrypted(token)) {
    return decryptToken(token) // Let decryption errors propagate
  }

  // Unencrypted token in database - this is a legacy issue
  logger.warn('Found unencrypted token - should be re-encrypted')
  return token
}

/**
 * Generate a new encryption key (run this once to create a key)
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(KEY_LENGTH)
  return key.toString('base64')
}
