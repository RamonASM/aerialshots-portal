import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function AdminProfilePage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in/partner')
  }

  const userEmail = user.emailAddresses?.[0]?.emailAddress?.toLowerCase()
  const userName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.firstName || userEmail?.split('@')[0] || 'User'

  const supabase = createAdminClient()

  // Check if user is staff or partner
  let profile = null
  let userType = 'unknown'

  // Check staff first
  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('email', userEmail)
    .maybeSingle()

  if (staff) {
    profile = staff
    userType = 'staff'
  } else {
    // Check partners
    const { data: partner } = await supabase
      .from('partners')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle()

    if (partner) {
      profile = partner
      userType = 'partner'
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'partner':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'photographer':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'videographer':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
      case 'qc':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'va':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500">
          <User className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">Profile</h1>
          <p className="text-[15px] text-[#a1a1a6]">Your account information</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Your personal and account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1c1c1e]">
              <User className="h-5 w-5 text-[#a1a1a6]" />
            </div>
            <div>
              <p className="text-[13px] text-[#a1a1a6]">Name</p>
              <p className="text-[15px] font-medium text-white">{userName}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1c1c1e]">
              <Mail className="h-5 w-5 text-[#a1a1a6]" />
            </div>
            <div>
              <p className="text-[13px] text-[#a1a1a6]">Email</p>
              <p className="text-[15px] font-medium text-white">{userEmail}</p>
            </div>
          </div>

          {/* Phone */}
          {profile?.phone && (
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1c1c1e]">
                <Phone className="h-5 w-5 text-[#a1a1a6]" />
              </div>
              <div>
                <p className="text-[13px] text-[#a1a1a6]">Phone</p>
                <p className="text-[15px] font-medium text-white">{profile.phone}</p>
              </div>
            </div>
          )}

          {/* Account Type */}
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1c1c1e]">
              <Building2 className="h-5 w-5 text-[#a1a1a6]" />
            </div>
            <div>
              <p className="text-[13px] text-[#a1a1a6]">Account Type</p>
              <p className="text-[15px] font-medium capitalize text-white">{userType}</p>
            </div>
          </div>

          {/* Role */}
          {(('role' in (profile || {}) && (profile as { role?: string })?.role) || userType === 'partner') && (
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1c1c1e]">
                <Shield className="h-5 w-5 text-[#a1a1a6]" />
              </div>
              <div>
                <p className="text-[13px] text-[#a1a1a6]">Role</p>
                <Badge
                  variant="outline"
                  className={`mt-1 capitalize ${getRoleBadgeColor((profile as { role?: string })?.role || 'partner')}`}
                >
                  {(profile as { role?: string })?.role || 'Partner'}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clerk Profile Management */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your password and authentication settings</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-[15px] text-[#a1a1a6]">
            To update your password, two-factor authentication, or connected accounts,
            please use the account menu in the top right corner of the page.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
