'use client'

import { useState, useEffect } from 'react'
import { Bell, Mail, MessageSquare, Smartphone, Volume2, VolumeX, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useServiceWorker } from '@/hooks/useServiceWorker'

interface NotificationPreferences {
  email_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
  in_app_enabled: boolean
  order_updates: boolean
  delivery_notifications: boolean
  payment_reminders: boolean
  marketing_emails: boolean
  system_alerts: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
}

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    in_app_enabled: true,
    order_updates: true,
    delivery_notifications: true,
    payment_reminders: true,
    marketing_emails: false,
    system_alerts: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const { isSupported: pushSupported, isSubscribed, permission, subscribe, unsubscribe } = usePushNotifications()
  const { isOnline, updateAvailable, update } = useServiceWorker()

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/notifications/preferences')
        if (response.ok) {
          const data = await response.json()
          setPreferences(data.preferences)
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [])

  // Save preferences
  const savePreferences = async (updates: Partial<NotificationPreferences>) => {
    setSaving(true)
    const newPreferences = { ...preferences, ...updates }
    setPreferences(newPreferences)

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      // Revert on error
      setPreferences(preferences)
    } finally {
      setSaving(false)
    }
  }

  // Handle push notification toggle
  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await subscribe()
      if (success) {
        savePreferences({ push_enabled: true })
      }
    } else {
      const success = await unsubscribe()
      if (success) {
        savePreferences({ push_enabled: false })
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Manage how you receive notifications from ASM Portal
        </p>
      </div>

      {/* Connection Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {isOnline ? (
              <span className="w-2 h-2 bg-green-500 rounded-full" />
            ) : (
              <span className="w-2 h-2 bg-red-500 rounded-full" />
            )}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {isOnline ? 'Online' : 'Offline'}
              </p>
              <p className="text-sm text-neutral-500">
                {isOnline
                  ? 'All features available'
                  : 'Some features may be limited'}
              </p>
            </div>
            {updateAvailable && (
              <Button onClick={update} variant="outline" size="sm">
                Update Available
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Notification Channels</CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <Label className="font-medium">Push Notifications</Label>
                <p className="text-sm text-neutral-500">
                  {pushSupported
                    ? isSubscribed
                      ? 'Enabled on this device'
                      : permission === 'denied'
                        ? 'Blocked by browser'
                        : 'Receive instant updates'
                    : 'Not supported in this browser'}
                </p>
              </div>
            </div>
            <Switch
              checked={isSubscribed}
              onCheckedChange={handlePushToggle}
              disabled={!pushSupported || permission === 'denied'}
            />
          </div>

          {/* Email */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <Label className="font-medium">Email Notifications</Label>
                <p className="text-sm text-neutral-500">
                  Receive updates via email
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.email_enabled}
              onCheckedChange={(checked) => savePreferences({ email_enabled: checked })}
            />
          </div>

          {/* SMS */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <Label className="font-medium">SMS Notifications</Label>
                <p className="text-sm text-neutral-500">
                  Get text messages for urgent updates
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.sms_enabled}
              onCheckedChange={(checked) => savePreferences({ sms_enabled: checked })}
            />
          </div>

          {/* In-App */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <Label className="font-medium">In-App Notifications</Label>
                <p className="text-sm text-neutral-500">
                  Show notifications in the app
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.in_app_enabled}
              onCheckedChange={(checked) => savePreferences({ in_app_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Notification Types</CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="font-medium">Order Updates</Label>
              <p className="text-sm text-neutral-500">Status changes for your orders</p>
            </div>
            <Switch
              checked={preferences.order_updates}
              onCheckedChange={(checked) => savePreferences({ order_updates: checked })}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="font-medium">Delivery Notifications</Label>
              <p className="text-sm text-neutral-500">When your media is ready</p>
            </div>
            <Switch
              checked={preferences.delivery_notifications}
              onCheckedChange={(checked) => savePreferences({ delivery_notifications: checked })}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="font-medium">Payment Reminders</Label>
              <p className="text-sm text-neutral-500">Invoice and payment updates</p>
            </div>
            <Switch
              checked={preferences.payment_reminders}
              onCheckedChange={(checked) => savePreferences({ payment_reminders: checked })}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="font-medium">System Alerts</Label>
              <p className="text-sm text-neutral-500">Important system notifications</p>
            </div>
            <Switch
              checked={preferences.system_alerts}
              onCheckedChange={(checked) => savePreferences({ system_alerts: checked })}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="font-medium">Marketing Emails</Label>
              <p className="text-sm text-neutral-500">Tips, features, and promotions</p>
            </div>
            <Switch
              checked={preferences.marketing_emails}
              onCheckedChange={(checked) => savePreferences({ marketing_emails: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {preferences.quiet_hours_enabled ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Pause non-urgent notifications during these hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-medium">Enable Quiet Hours</Label>
            <Switch
              checked={preferences.quiet_hours_enabled}
              onCheckedChange={(checked) => savePreferences({ quiet_hours_enabled: checked })}
            />
          </div>

          {preferences.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-neutral-500">Start Time</Label>
                <Input
                  type="time"
                  value={preferences.quiet_hours_start}
                  onChange={(e) => savePreferences({ quiet_hours_start: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm text-neutral-500">End Time</Label>
                <Input
                  type="time"
                  value={preferences.quiet_hours_end}
                  onChange={(e) => savePreferences({ quiet_hours_end: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-neutral-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  )
}
