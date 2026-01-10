import { redirect } from 'next/navigation'
import {
  User,
  Mail,
  Phone,
  Camera,
  Settings,
  Award,
  Wrench,
  CheckCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StripeConnectCard } from '@/components/team/StripeConnectCard'
import { getStaffAccess } from '@/lib/auth/server-access'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Check if staff has photographer access
 * Supports: role = 'photographer' or role = 'admin'
 */
function hasPhotographerAccess(role: string): boolean {
  if (role === 'admin') return true
  if (role === 'photographer') return true
  return false
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

/**
 * Photographer Settings Page
 *
 * Display profile information, skills, and Stripe Connect payout setup.
 */
export default async function PhotographerSettingsPage({ searchParams }: PageProps) {
  const params = await searchParams

  // Check authentication via Clerk (or Supabase fallback)
  const staffAccess = await getStaffAccess()
  console.log('[PhotographerSettings] staffAccess:', JSON.stringify(staffAccess, null, 2))

  if (!staffAccess || !hasPhotographerAccess(staffAccess.role)) {
    console.log('[PhotographerSettings] Access denied - redirecting to sign-in')
    redirect('/sign-in/staff')
  }

  // Get full staff member with payout info
  const supabase = createAdminClient()

  // Get staff record by email
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id, name, email, phone, role, skills, certifications')
    .eq('email', staffAccess.email)
    .eq('is_active', true)
    .maybeSingle()

  if (staffError) {
    console.log('[PhotographerSettings] Staff query error:', staffError)
  }

  const staff = staffData as {
    id: string
    name: string
    email: string
    phone: string | null
    role: string | null
    skills: string[] | null
    certifications: string[] | null
  } | null
  if (!staff) {
    console.log('[PhotographerSettings] No staff record found for email:', staffAccess.email)
    redirect('/sign-in/staff')
  }
  console.log('[PhotographerSettings] Staff found:', staff.name, staff.email)

  const displayRole = staff.role || 'photographer'
  const skills = staff.skills || []
  const certifications = staff.certifications || []
  const connectSuccess = params.connect === 'success'

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-zinc-400">Your photographer profile and payouts</p>
      </div>

      {/* Success Message */}
      {connectSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-green-400">
            Stripe account successfully connected! You can now receive payouts.
          </p>
        </div>
      )}

      {/* Profile */}
      <Card className="border-white/[0.08] bg-[#1c1c1e]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription className="text-zinc-400">Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
              <Camera className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-white">{staff.name}</p>
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 capitalize">
                {displayRole}
              </Badge>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Mail className="h-4 w-4 text-zinc-500" />
              <span>{staff.email}</span>
            </div>
            {staff.phone && (
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Phone className="h-4 w-4 text-zinc-500" />
                <span>{staff.phone}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stripe Connect / Payouts */}
      <StripeConnectCard staffId={staff.id} />

      {/* Skills */}
      {skills.length > 0 && (
        <Card className="border-white/[0.08] bg-[#1c1c1e]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Wrench className="h-5 w-5" />
              Skills
            </CardTitle>
            <CardDescription className="text-zinc-400">Your photography specialties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill: string) => (
                <Badge key={skill} className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <Card className="border-white/[0.08] bg-[#1c1c1e]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Award className="h-5 w-5" />
              Certifications
            </CardTitle>
            <CardDescription className="text-zinc-400">Your professional certifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {certifications.map((cert: string) => (
                <Badge key={cert} className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                  {cert}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card className="border-white/[0.08] bg-[#1c1c1e]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Settings className="h-5 w-5" />
            Quick Access
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <a
            href="/team/photographer"
            className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/20 p-3 transition-colors hover:bg-white/5"
          >
            <span className="font-medium text-white">Dashboard</span>
            <span className="text-sm text-zinc-500">Today&apos;s schedule</span>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
