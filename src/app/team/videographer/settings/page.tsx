import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  User,
  Mail,
  Phone,
  Video,
  Settings,
  Award,
  Wrench,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * Check if staff has videographer access
 * Supports: role = 'videographer', team_role = 'videographer', or role = 'admin'
 */
function hasVideographerAccess(staff: { role: string | null; team_role: string | null }): boolean {
  if (staff.role === 'admin') return true
  if (staff.role === 'videographer') return true
  if (staff.team_role === 'videographer') return true
  return false
}

/**
 * Videographer Settings Page
 *
 * Display profile information and skills.
 */
export default async function VideographerSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/staff-login')
  }

  // Get staff member
  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, email, phone, role, team_role, skills, certifications')
    .eq('email', user.email!)
    .single()

  if (!staff || !hasVideographerAccess(staff)) {
    redirect('/staff-login')
  }

  const displayRole = staff.team_role || staff.role || 'videographer'
  const skills = staff.skills || []
  const certifications = staff.certifications || []

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="mt-1 text-neutral-600">Your videographer profile</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
              <Video className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-neutral-900">{staff.name}</p>
              <Badge variant="secondary" className="capitalize">{displayRole}</Badge>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-neutral-400" />
              <span>{staff.email}</span>
            </div>
            {staff.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-neutral-400" />
                <span>{staff.phone}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      {skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Skills
            </CardTitle>
            <CardDescription>Your video production capabilities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="bg-purple-50 text-purple-700">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certifications
            </CardTitle>
            <CardDescription>Your professional certifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {certifications.map((cert) => (
                <Badge key={cert} variant="secondary" className="bg-amber-50 text-amber-700">
                  {cert}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Access
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <a
            href="/team/videographer/queue"
            className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 transition-colors hover:bg-neutral-50"
          >
            <span className="font-medium">Edit Queue</span>
            <span className="text-sm text-neutral-500">Videos awaiting edit</span>
          </a>
          <a
            href="/team/videographer/schedule"
            className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 transition-colors hover:bg-neutral-50"
          >
            <span className="font-medium">Schedule</span>
            <span className="text-sm text-neutral-500">Upcoming shoots</span>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
