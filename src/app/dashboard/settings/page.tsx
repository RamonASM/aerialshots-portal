import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InstagramSettings } from './InstagramSettings'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings | Dashboard | Aerial Shots Media',
  description: 'Manage your account settings and integrations',
}

async function getAgentWithConnections(email: string) {
  const supabase = createAdminClient()

  // Get agent
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name, email')
    .eq('email', email)
    .single()

  if (agentError || !agent) {
    return null
  }

  // Get Instagram connection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: instagramConnection } = await (supabase as any)
    .from('instagram_connections')
    .select('id, username, status, token_expires_at, created_at')
    .eq('agent_id', agent.id)
    .single() as { data: { id: string; username: string | null; status: string; token_expires_at: string | null; created_at: string } | null }

  return {
    agent,
    instagramConnection,
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; username?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login')
  }

  const data = await getAgentWithConnections(user.email)

  if (!data) {
    redirect('/login')
  }

  const params = await searchParams

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="mt-1 text-neutral-600">
          Manage your account settings and integrations
        </p>
      </div>

      {/* Success/Error Messages */}
      {params.success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-green-800">
            Successfully connected Instagram account
            {params.username && ` @${params.username}`}!
          </p>
        </div>
      )}

      {params.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-red-800">{decodeURIComponent(params.error)}</p>
        </div>
      )}

      {/* Instagram Integration */}
      <InstagramSettings
        agentId={data.agent.id}
        connection={data.instagramConnection}
      />
    </div>
  )
}
