/**
 * Slack Integration Tests
 *
 * TDD tests for Slack notifications and order note sync
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SlackClient,
  sendSlackMessage,
  sendSlackNotification,
  formatOrderMessage,
  formatDeliveryNotification,
  parseSlackCommand,
  validateWebhookSignature,
  type SlackMessage,
  type SlackNotification,
  type SlackChannel,
  type SlackWebhookPayload,
} from './client'

import crypto from 'crypto'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Slack Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token'
    process.env.SLACK_SIGNING_SECRET = 'test-signing-secret'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Message Sending', () => {
    it('should send a simple text message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channel: 'C123456',
          ts: '1234567890.123456',
          message: { text: 'Hello from ASM Portal!' },
        }),
      })

      const result = await sendSlackMessage({
        channel: '#general',
        text: 'Hello from ASM Portal!',
      })

      expect(result.ok).toBe(true)
      expect(result.ts).toBeDefined()
    })

    it('should send a message with blocks (rich formatting)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channel: 'C123456',
          ts: '1234567890.123456',
        }),
      })

      const result = await sendSlackMessage({
        channel: '#orders',
        text: 'New Order',
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: '*New Order #1234*' },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: '*Address:*\n123 Main St' },
              { type: 'mrkdwn', text: '*Package:*\nEssentials' },
            ],
          },
        ],
      })

      expect(result.ok).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxb-test-token',
          }),
        })
      )
    })

    it('should send message to thread', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          ts: '1234567890.123457',
        }),
      })

      const result = await sendSlackMessage({
        channel: '#orders',
        text: 'Reply to order',
        thread_ts: '1234567890.123456',
      })

      expect(result.ok).toBe(true)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.thread_ts).toBe('1234567890.123456')
    })

    it('should handle Slack API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          error: 'channel_not_found',
        }),
      })

      const result = await sendSlackMessage({
        channel: '#nonexistent',
        text: 'Test',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('channel_not_found')
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await sendSlackMessage({
        channel: '#general',
        text: 'Test',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toContain('error')
    })
  })

  describe('Notifications', () => {
    it('should send new order notification', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: '123456' }),
      })

      const notification: SlackNotification = {
        type: 'new_order',
        channel: '#orders',
        data: {
          order_id: 'ORD-1234',
          address: '123 Main St, Orlando, FL',
          agent_name: 'John Doe',
          package: 'Essentials',
          shoot_date: '2024-01-15',
          total: 349,
        },
      }

      const result = await sendSlackNotification(notification)

      expect(result.ok).toBe(true)
    })

    it('should send delivery complete notification', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: '123456' }),
      })

      const notification: SlackNotification = {
        type: 'delivery_complete',
        channel: '#deliveries',
        data: {
          listing_id: 'LIST-5678',
          address: '456 Oak Ave, Tampa, FL',
          agent_name: 'Jane Smith',
          photo_count: 25,
          delivery_url: 'https://app.aerialshots.media/delivery/LIST-5678',
        },
      }

      const result = await sendSlackNotification(notification)

      expect(result.ok).toBe(true)
    })

    it('should send QC alert notification', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: '123456' }),
      })

      const notification: SlackNotification = {
        type: 'qc_alert',
        channel: '#qc-alerts',
        data: {
          listing_id: 'LIST-9999',
          issue: 'Low image quality detected',
          severity: 'high',
          reviewer: 'QC Bot',
        },
      }

      const result = await sendSlackNotification(notification)

      expect(result.ok).toBe(true)
    })

    it('should send photographer assignment notification', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: '123456' }),
      })

      const notification: SlackNotification = {
        type: 'photographer_assigned',
        channel: '#scheduling',
        data: {
          order_id: 'ORD-2222',
          photographer_name: 'Mike Photo',
          address: '789 Elm St',
          shoot_date: '2024-01-20',
          shoot_time: '10:00 AM',
        },
      }

      const result = await sendSlackNotification(notification)

      expect(result.ok).toBe(true)
    })
  })

  describe('Message Formatting', () => {
    it('should format order message with blocks', () => {
      const message = formatOrderMessage({
        order_id: 'ORD-1234',
        address: '123 Main St',
        agent_name: 'John Doe',
        package: 'Signature',
        shoot_date: '2024-01-15',
        total: 449,
      })

      expect(message.blocks).toBeDefined()
      expect(message.blocks.length).toBeGreaterThan(0)
      expect(message.text).toContain('ORD-1234')
    })

    it('should format delivery notification with photo count', () => {
      const message = formatDeliveryNotification({
        listing_id: 'LIST-5678',
        address: '456 Oak Ave',
        agent_name: 'Jane Smith',
        photo_count: 35,
        video_count: 2,
        delivery_url: 'https://app.aerialshots.media/delivery/LIST-5678',
      })

      expect(message.blocks).toBeDefined()
      expect(message.text).toContain('LIST-5678')
    })

    it('should include action buttons in delivery notification', () => {
      const message = formatDeliveryNotification({
        listing_id: 'LIST-5678',
        address: '456 Oak Ave',
        agent_name: 'Jane Smith',
        photo_count: 35,
        delivery_url: 'https://app.aerialshots.media/delivery/LIST-5678',
      })

      const actionBlock = message.blocks.find((b: { type: string }) => b.type === 'actions')
      expect(actionBlock).toBeDefined()
    })
  })

  describe('Slash Command Parsing', () => {
    it('should parse /asm order command', () => {
      const result = parseSlackCommand({
        command: '/asm',
        text: 'order ORD-1234',
        user_id: 'U123456',
        channel_id: 'C123456',
      })

      expect(result.command).toBe('order')
      expect(result.args).toContain('ORD-1234')
    })

    it('should parse /asm status command', () => {
      const result = parseSlackCommand({
        command: '/asm',
        text: 'status LIST-5678',
        user_id: 'U123456',
        channel_id: 'C123456',
      })

      expect(result.command).toBe('status')
      expect(result.args).toContain('LIST-5678')
    })

    it('should handle empty command text', () => {
      const result = parseSlackCommand({
        command: '/asm',
        text: '',
        user_id: 'U123456',
        channel_id: 'C123456',
      })

      expect(result.command).toBe('help')
    })

    it('should parse command with multiple arguments', () => {
      const result = parseSlackCommand({
        command: '/asm',
        text: 'assign ORD-1234 photographer Mike',
        user_id: 'U123456',
        channel_id: 'C123456',
      })

      expect(result.command).toBe('assign')
      expect(result.args).toEqual(['ORD-1234', 'photographer', 'Mike'])
    })
  })

  describe('Webhook Signature Verification', () => {
    it('should validate correct webhook signature', () => {
      const body = JSON.stringify({ event: 'test' })
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const signingSecret = process.env.SLACK_SIGNING_SECRET!
      const sigBasestring = `v0:${timestamp}:${body}`
      const expectedSignature = 'v0=' + crypto
        .createHmac('sha256', signingSecret)
        .update(sigBasestring)
        .digest('hex')

      const isValid = validateWebhookSignature(body, timestamp, expectedSignature)

      expect(isValid).toBe(true)
    })

    it('should reject expired timestamp', () => {
      const body = JSON.stringify({ event: 'test' })
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString() // 10 min ago
      const signature = 'v0=valid-signature'

      const isValid = validateWebhookSignature(body, oldTimestamp, signature)

      expect(isValid).toBe(false)
    })

    it('should reject invalid signature format', () => {
      const body = JSON.stringify({ event: 'test' })
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const signature = 'invalid-signature'

      const isValid = validateWebhookSignature(body, timestamp, signature)

      expect(isValid).toBe(false)
    })
  })

  describe('SlackClient Class', () => {
    it('should initialize with bot token', () => {
      const client = new SlackClient('xoxb-custom-token')

      expect(client).toBeDefined()
      expect(client.isConfigured()).toBe(true)
    })

    it('should send message through client', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: '123456' }),
      })

      const client = new SlackClient('xoxb-test-token')
      const result = await client.sendMessage('#general', 'Hello!')

      expect(result.ok).toBe(true)
    })

    it('should get channel list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channels: [
            { id: 'C1', name: 'general' },
            { id: 'C2', name: 'orders' },
          ],
        }),
      })

      const client = new SlackClient('xoxb-test-token')
      const channels = await client.listChannels()

      expect(channels).toHaveLength(2)
      expect(channels[0].name).toBe('general')
    })

    it('should join channel', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channel: { id: 'C123', name: 'orders' },
        }),
      })

      const client = new SlackClient('xoxb-test-token')
      const result = await client.joinChannel('C123')

      expect(result.ok).toBe(true)
    })

    it('should handle not configured state', async () => {
      const client = new SlackClient('')

      expect(client.isConfigured()).toBe(false)

      const result = await client.sendMessage('#general', 'Test')
      expect(result.ok).toBe(false)
      expect(result.error).toContain('not configured')
    })
  })

  describe('Channel Management', () => {
    it('should create a new channel', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channel: { id: 'C999', name: 'project-123' },
        }),
      })

      const client = new SlackClient('xoxb-test-token')
      const result = await client.createChannel('project-123')

      expect(result.ok).toBe(true)
      expect(result.channel?.name).toBe('project-123')
    })

    it('should invite users to channel', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      })

      const client = new SlackClient('xoxb-test-token')
      const result = await client.inviteToChannel('C123', ['U456', 'U789'])

      expect(result.ok).toBe(true)
    })

    it('should set channel topic', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channel: { topic: { value: 'Order updates' } },
        }),
      })

      const client = new SlackClient('xoxb-test-token')
      const result = await client.setChannelTopic('C123', 'Order updates')

      expect(result.ok).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          error: 'ratelimited',
          headers: { 'Retry-After': '30' },
        }),
      })

      const result = await sendSlackMessage({
        channel: '#general',
        text: 'Test',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('ratelimited')
    })

    it('should handle invalid auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          error: 'invalid_auth',
        }),
      })

      const result = await sendSlackMessage({
        channel: '#general',
        text: 'Test',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('invalid_auth')
    })

    it('should handle missing scopes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          error: 'missing_scope',
          needed: 'chat:write',
        }),
      })

      const result = await sendSlackMessage({
        channel: '#general',
        text: 'Test',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('missing_scope')
    })
  })
})
