import { redirect } from 'next/navigation'
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Settings,
  Award,
  Wrench,
  Clock,
  DollarSign,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getStaffAccess, hasRequiredRole } from '@/lib/auth/server-access'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * QC Settings Page
 *
 * Display profile information, hourly rate, and time tracking access.
 */
export default async function QCSettingsPage() {
  // Check authentication via Clerk
  const staffAccess = await getStaffAccess()

  if (!staffAccess || !hasRequiredRole(staffAccess.role, ['qc'])) {
    redirect('/sign-in/staff')
  }

  // Get full staff member
  const supabase = createAdminClient()
  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, email, phone, role, skills, certifications')
    .eq('email', staffAccess.email)
    .eq('is_active', true)
    .maybeSingle() as { data: {
      id: string
      name: string
      email: string
      phone: string | null
      role: string | null
      skills: string[] | null
      certifications: string[] | null
    } | null }

  if (!staff) {
    redirect('/sign-in/staff')
  }

  const displayRole = staff.role || 'qc'
  const skills = staff.skills || []
  const certifications = staff.certifications || []

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-zinc-400">Your QC profile and compensation</p>
      </div>

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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10">
              <ShieldCheck className="h-6 w-6 text-cyan-500" />
            </div>
            <div>
              <p className="font-semibold text-white">{staff.name}</p>
              <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 capitalize">
                {displayRole === 'qc' ? 'QC Specialist' : displayRole}
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

      {/* Compensation */}
      <Card className="border-white/[0.08] bg-[#1c1c1e]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <DollarSign className="h-5 w-5" />
            Compensation
          </CardTitle>
          <CardDescription className="text-zinc-400">Your pay structure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/20 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-white">Pay Type</p>
                <p className="text-sm text-zinc-400">Per Job</p>
              </div>
            </div>
          </div>

          <a
            href="/team/qc/time"
            className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 transition-colors hover:bg-cyan-500/10"
          >
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-cyan-400" />
              <span className="font-medium text-cyan-400">Track Time</span>
            </div>
            <span className="text-sm text-cyan-400">Clock in/out</span>
          </a>
        </CardContent>
      </Card>

      {/* Skills */}
      {skills.length > 0 && (
        <Card className="border-white/[0.08] bg-[#1c1c1e]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Wrench className="h-5 w-5" />
              Skills
            </CardTitle>
            <CardDescription className="text-zinc-400">Your QC specialties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill: string) => (
                <Badge key={skill} className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
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
            href="/team/qc"
            className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/20 p-3 transition-colors hover:bg-white/5"
          >
            <span className="font-medium text-white">Dashboard</span>
            <span className="text-sm text-zinc-500">QC queue</span>
          </a>
          <a
            href="/team/qc/queue"
            className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/20 p-3 transition-colors hover:bg-white/5"
          >
            <span className="font-medium text-white">Full Queue</span>
            <span className="text-sm text-zinc-500">All pending reviews</span>
          </a>
          <a
            href="/team/qc/rejected"
            className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/20 p-3 transition-colors hover:bg-white/5"
          >
            <span className="font-medium text-white">Rejected Photos</span>
            <span className="text-sm text-zinc-500">Last 7 days</span>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
