import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStaffAccess } from '@/lib/auth/server-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Database, Key, UserCheck, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const authBypassEnabled =
  process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true' ||
  process.env.AUTH_BYPASS === 'true'

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
const clerkSecretEnabled = Boolean(process.env.CLERK_SECRET_KEY)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
const supabaseAdminConfigured = Boolean(supabaseUrl && supabaseServiceKey)

const appUrl = process.env.NEXT_PUBLIC_APP_URL
const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown'

function StatusBadge({ ok, labelOk, labelFail }: { ok: boolean; labelOk: string; labelFail: string }) {
  return (
    <Badge
      variant="outline"
      className={
        ok
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : 'border-red-500/30 bg-red-500/10 text-red-400'
      }
    >
      {ok ? labelOk : labelFail}
    </Badge>
  )
}

function DataRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value || '—'}</span>
    </div>
  )
}

export default async function AuthStatusPage() {
  let clerkUser = null
  if (clerkEnabled) {
    try {
      clerkUser = await currentUser()
    } catch {
      clerkUser = null
    }
  }

  let supabaseUser = null
  let supabaseSessionError: string | null = null
  if (supabaseConfigured) {
    try {
      const supabase = createAdminClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      supabaseUser = user
      supabaseSessionError = error?.message || null
    } catch (error) {
      supabaseSessionError = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  let staffAccess = null
  try {
    staffAccess = await getStaffAccess()
  } catch {
    staffAccess = null
  }

  if (!staffAccess && !authBypassEnabled) {
    redirect('/sign-in/staff')
  }

  const clerkSessionActive = Boolean(clerkUser)
  const supabaseSessionActive = Boolean(supabaseUser)

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">Auth Status</h1>
          <p className="text-[15px] text-[#a1a1a6]">Live authentication and session diagnostics</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Auth Providers
            </CardTitle>
            <CardDescription>Configuration status of auth services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Clerk publishable key</span>
              <StatusBadge ok={clerkEnabled} labelOk="Enabled" labelFail="Missing" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Clerk secret key</span>
              <StatusBadge ok={clerkSecretEnabled} labelOk="Enabled" labelFail="Missing" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Supabase anon key</span>
              <StatusBadge ok={supabaseConfigured} labelOk="Enabled" labelFail="Missing" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Supabase service key</span>
              <StatusBadge ok={supabaseAdminConfigured} labelOk="Enabled" labelFail="Missing" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Auth bypass</span>
              <StatusBadge ok={authBypassEnabled} labelOk="On" labelFail="Off" />
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Session Detection
            </CardTitle>
            <CardDescription>Active sessions and effective access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Clerk session</span>
              <StatusBadge ok={clerkSessionActive} labelOk="Active" labelFail="None" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Supabase session</span>
              <StatusBadge ok={supabaseSessionActive} labelOk="Active" labelFail="None" />
            </div>
            <DataRow label="Clerk email" value={clerkUser?.emailAddresses?.[0]?.emailAddress?.toLowerCase()} />
            <DataRow label="Supabase email" value={supabaseUser?.email?.toLowerCase()} />
            <DataRow label="Effective role" value={staffAccess?.role} />
            <DataRow label="Auth source" value={staffAccess?.source} />
            <DataRow label="Access email" value={staffAccess?.email} />
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Environment
            </CardTitle>
            <CardDescription>Runtime and core endpoints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataRow label="Environment" value={environment} />
            <DataRow label="App URL" value={appUrl} />
            <DataRow label="Supabase URL" value={supabaseUrl} />
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Diagnostics
            </CardTitle>
            <CardDescription>Errors detected while resolving sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataRow label="Supabase session error" value={supabaseSessionError} />
            <DataRow label="Staff access" value={staffAccess ? 'Resolved' : 'Unavailable'} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
