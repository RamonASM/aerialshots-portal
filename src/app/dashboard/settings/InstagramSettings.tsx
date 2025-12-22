'use client'

import { useState } from 'react'
import { Instagram, Check, AlertCircle, ExternalLink, Loader2, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InstagramConnection {
  id: string
  instagram_username: string | null
  account_type: string | null
  status: string | null
  token_expires_at: string | null
  created_at: string
}

interface InstagramSettingsProps {
  agentId: string
  connection: InstagramConnection | null
}

export function InstagramSettings({ agentId, connection }: InstagramSettingsProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isConnected = connection?.status === 'active'
  const isExpired = connection?.token_expires_at
    ? new Date(connection.token_expires_at) < new Date()
    : false

  const handleConnect = () => {
    setIsConnecting(true)
    setError(null)
    // Redirect to OAuth flow
    window.location.href = `/api/instagram/connect?agentId=${agentId}`
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Instagram account?')) {
      return
    }

    setIsDisconnecting(true)
    setError(null)

    try {
      const response = await fetch('/api/instagram/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      })

      if (response.ok) {
        window.location.reload()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (err) {
      console.error('Disconnect error:', err)
      setError(err instanceof Error ? err.message : 'Failed to disconnect')
      setIsDisconnecting(false)
    }
  }

  const daysUntilExpiry = connection?.token_expires_at
    ? Math.ceil((new Date(connection.token_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-pink-500 to-purple-500">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
            <Instagram className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Instagram</h2>
            <p className="text-sm text-white/80">
              Connect to post carousels directly to Instagram
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isConnected && !isExpired ? (
          <div className="space-y-4">
            {/* Connected Status */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <Check className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-900">Connected</p>
                <p className="text-sm text-green-700">
                  @{connection.instagram_username}
                  {connection.account_type && (
                    <span className="ml-2 text-green-600">
                      ({connection.account_type} account)
                    </span>
                  )}
                </p>
              </div>
              <a
                href={`https://instagram.com/${connection.instagram_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-700"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            {/* Token Expiry Warning */}
            {daysUntilExpiry !== null && daysUntilExpiry < 14 && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <p className="font-medium text-amber-900">Token Expiring Soon</p>
                  <p className="text-sm text-amber-700">
                    Your connection expires in {daysUntilExpiry} days. Reconnect to refresh.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Refresh'
                  )}
                </Button>
              </div>
            )}

            {/* Capabilities */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-neutral-700">What you can do:</h3>
              <ul className="space-y-1 text-sm text-neutral-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Post carousel images directly to Instagram
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Include captions and hashtags automatically
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Track published posts
                </li>
              </ul>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Disconnect */}
            <div className="pt-4 border-t border-neutral-200">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {isDisconnecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="mr-2 h-4 w-4" />
                )}
                Disconnect Instagram
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Expired Status */}
            {isExpired && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Connection Expired</p>
                  <p className="text-sm text-red-700">
                    Your Instagram connection has expired. Please reconnect.
                  </p>
                </div>
              </div>
            )}

            {/* Not Connected */}
            {!connection && (
              <p className="text-neutral-600">
                Connect your Instagram Business or Creator account to post carousels
                directly from ListingLaunch.
              </p>
            )}

            {/* Requirements */}
            <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
              <h3 className="text-sm font-medium text-neutral-700 mb-2">Requirements:</h3>
              <ul className="space-y-1 text-sm text-neutral-600">
                <li>Instagram Business or Creator account</li>
                <li>Facebook Page connected to your Instagram</li>
                <li>Admin access to the Facebook Page</li>
              </ul>
            </div>

            {/* Connect Button */}
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Instagram className="mr-2 h-4 w-4" />
              )}
              {isConnecting ? 'Connecting...' : 'Connect Instagram'}
            </Button>

            {/* Help Link */}
            <p className="text-xs text-neutral-500 text-center">
              Having trouble?{' '}
              <a
                href="https://help.instagram.com/502981923235522"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-500 hover:underline"
              >
                Learn how to set up a Business account
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
