'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Bell,
  Shield,
  LogOut,
  Check,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Image,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ClientProfile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
}

interface NotificationPreferences {
  email_booking_updates: boolean
  email_media_ready: boolean
  email_promotions: boolean
  sms_booking_updates: boolean
  sms_media_ready: boolean
}

type ActiveTab = 'profile' | 'notifications' | 'security'

export default function ClientSettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_booking_updates: true,
    email_media_ready: true,
    email_promotions: false,
    sms_booking_updates: true,
    sms_media_ready: true,
  })
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Note: client_accounts table exists but types need regeneration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: client } = await (supabase as any)
      .from('client_accounts')
      .select('*')
      .eq('auth_user_id', user.id)
      .single() as { data: ClientProfile & { notification_preferences?: NotificationPreferences } | null }

    if (client) {
      setProfile({
        id: client.id,
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        phone: client.phone,
      })

      // Load notification preferences if stored
      if (client.notification_preferences) {
        setPreferences(client.notification_preferences as NotificationPreferences)
      }
    }
    setLoading(false)
  }

  async function saveProfile() {
    if (!profile) return

    setSaving(true)
    setSaveSuccess(false)

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('client_accounts')
      .update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
      })
      .eq('id', profile.id)

    setSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  async function saveNotifications() {
    if (!profile) return

    setSaving(true)
    setSaveSuccess(false)

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('client_accounts')
      .update({
        notification_preferences: preferences,
      })
      .eq('id', profile.id)

    setSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/client/login')
  }

  if (loading) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-[#1c1c1e] rounded-lg w-32" />
            <div className="h-48 bg-[#1c1c1e] rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
          <p className="text-[#a1a1a6]">Manage your account and notification preferences.</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-[#1c1c1e] rounded-xl">
          <TabButton
            active={activeTab === 'profile'}
            icon={User}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </TabButton>
          <TabButton
            active={activeTab === 'notifications'}
            icon={Bell}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
          </TabButton>
          <TabButton
            active={activeTab === 'security'}
            icon={Shield}
            onClick={() => setActiveTab('security')}
          >
            Security
          </TabButton>
        </div>

        {/* Content */}
        {activeTab === 'profile' && profile && (
          <div className="space-y-6">
            {/* Profile Form */}
            <div className="bg-[#1c1c1e] rounded-xl border border-white/[0.08] p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Personal Information</h2>

              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#8e8e93] mb-2">First Name</label>
                    <input
                      type="text"
                      value={profile.first_name || ''}
                      onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/[0.08] rounded-lg text-white placeholder:text-[#636366] focus:outline-none focus:border-[#0077ff] transition-colors"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#8e8e93] mb-2">Last Name</label>
                    <input
                      type="text"
                      value={profile.last_name || ''}
                      onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/[0.08] rounded-lg text-white placeholder:text-[#636366] focus:outline-none focus:border-[#0077ff] transition-colors"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#8e8e93] mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636366]" />
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full pl-11 pr-4 py-2.5 bg-[#0a0a0a] border border-white/[0.08] rounded-lg text-[#636366] cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-[#636366] mt-1">Contact support to change your email address.</p>
                </div>

                <div>
                  <label className="block text-sm text-[#8e8e93] mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636366]" />
                    <input
                      type="tel"
                      value={profile.phone || ''}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full pl-11 pr-4 py-2.5 bg-[#0a0a0a] border border-white/[0.08] rounded-lg text-white placeholder:text-[#636366] focus:outline-none focus:border-[#0077ff] transition-colors"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
                {saveSuccess && (
                  <span className="flex items-center gap-2 text-green-400 text-sm">
                    <Check className="w-4 h-4" />
                    Saved
                  </span>
                )}
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#0077ff] text-white rounded-lg text-sm font-medium hover:bg-[#0066dd] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {/* Email Notifications */}
            <div className="bg-[#1c1c1e] rounded-xl border border-white/[0.08] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#0a0a0a] rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[#0077ff]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Email Notifications</h2>
                  <p className="text-[#8e8e93] text-sm">Choose what emails you receive</p>
                </div>
              </div>

              <div className="space-y-3">
                <NotificationToggle
                  label="Booking Updates"
                  description="Confirmations, schedule changes, and reminders"
                  icon={Calendar}
                  enabled={preferences.email_booking_updates}
                  onChange={(v) => setPreferences({ ...preferences, email_booking_updates: v })}
                />
                <NotificationToggle
                  label="Media Ready"
                  description="Notifications when your photos and videos are delivered"
                  icon={Image}
                  enabled={preferences.email_media_ready}
                  onChange={(v) => setPreferences({ ...preferences, email_media_ready: v })}
                />
                <NotificationToggle
                  label="Promotions & Updates"
                  description="Special offers, tips, and company news"
                  icon={MessageSquare}
                  enabled={preferences.email_promotions}
                  onChange={(v) => setPreferences({ ...preferences, email_promotions: v })}
                />
              </div>
            </div>

            {/* SMS Notifications */}
            <div className="bg-[#1c1c1e] rounded-xl border border-white/[0.08] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#0a0a0a] rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">SMS Notifications</h2>
                  <p className="text-[#8e8e93] text-sm">Text message alerts for important updates</p>
                </div>
              </div>

              <div className="space-y-3">
                <NotificationToggle
                  label="Booking Updates"
                  description="Confirmations and day-of reminders"
                  icon={Calendar}
                  enabled={preferences.sms_booking_updates}
                  onChange={(v) => setPreferences({ ...preferences, sms_booking_updates: v })}
                />
                <NotificationToggle
                  label="Media Ready"
                  description="Get notified instantly when media is delivered"
                  icon={Image}
                  enabled={preferences.sms_media_ready}
                  onChange={(v) => setPreferences({ ...preferences, sms_media_ready: v })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={saveNotifications}
                disabled={saving}
                className="px-6 py-2.5 bg-[#0077ff] text-white rounded-lg text-sm font-medium hover:bg-[#0066dd] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Preferences
                {saveSuccess && <Check className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Login Method */}
            <div className="bg-[#1c1c1e] rounded-xl border border-white/[0.08] p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Login Method</h2>
              <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0077ff]/20 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-[#0077ff]" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Magic Link</p>
                    <p className="text-[#8e8e93] text-sm">Passwordless login via email</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                  Active
                </span>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="bg-[#1c1c1e] rounded-xl border border-white/[0.08] p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Active Sessions</h2>
              <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Current Session</p>
                    <p className="text-[#8e8e93] text-sm">This device</p>
                  </div>
                </div>
                <span className="text-green-400 text-sm flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  Active now
                </span>
              </div>
            </div>

            {/* Sign Out */}
            <div className="bg-[#1c1c1e] rounded-xl border border-white/[0.08] p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Sign Out</h2>
              <p className="text-[#8e8e93] text-sm mb-4">
                Sign out of your account on this device. You can sign back in anytime with a magic link.
              </p>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>

            {/* Delete Account */}
            <div className="bg-[#1c1c1e] rounded-xl border border-red-500/20 p-6">
              <h2 className="text-lg font-semibold text-red-400 mb-2">Delete Account</h2>
              <p className="text-[#8e8e93] text-sm mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button
                onClick={() => window.location.href = 'mailto:support@aerialshots.media?subject=Delete%20My%20Account'}
                className="flex items-center gap-2 text-red-400 text-sm hover:underline"
              >
                Contact support to delete your account
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({
  children,
  active,
  icon: Icon,
  onClick
}: {
  children: React.ReactNode
  active: boolean
  icon: typeof User
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
        active
          ? 'bg-[#0a0a0a] text-white'
          : 'text-[#8e8e93] hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{children}</span>
    </button>
  )
}

function NotificationToggle({
  label,
  description,
  icon: Icon,
  enabled,
  onChange
}: {
  label: string
  description: string
  icon: typeof Bell
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-xl">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-[#636366]" />
        <div>
          <p className="text-white font-medium">{label}</p>
          <p className="text-[#8e8e93] text-sm">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-7 rounded-full transition-colors ${
          enabled ? 'bg-[#0077ff]' : 'bg-[#3c3c3e]'
        }`}
      >
        <span
          className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
            enabled ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}
