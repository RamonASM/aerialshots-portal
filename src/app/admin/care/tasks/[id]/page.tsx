import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import {
  ArrowLeft,
  Phone,
  Mail,
  Star,
  MessageSquare,
  CheckCircle,
  Clock,
  User,
  Home,
  History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface PageProps {
  params: Promise<{ id: string }>
}

async function completeTask(formData: FormData) {
  'use server'

  const id = formData.get('id') as string
  const outcome = formData.get('outcome') as string
  const notes = formData.get('notes') as string

  const supabase = createAdminClient()

  await supabase
    .from('care_tasks')
    .update({
      status: 'completed',
      outcome,
      notes: notes || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Note: Using redirect from next/cache for server actions
  const { redirect } = await import('next/navigation')
  redirect('/admin/care')
}

async function skipTask(formData: FormData) {
  'use server'

  const id = formData.get('id') as string
  const notes = formData.get('notes') as string

  const supabase = createAdminClient()

  await supabase
    .from('care_tasks')
    .update({
      status: 'skipped',
      notes: notes || 'Skipped',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)

  const { redirect } = await import('next/navigation')
  redirect('/admin/care')
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: task, error } = await supabase
    .from('care_tasks')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !task) {
    notFound()
  }

  // Get related data
  const [{ data: agent }, { data: listing }, { data: recentTasks }] = await Promise.all([
    task.agent_id
      ? supabase.from('agents').select('*').eq('id', task.agent_id).single()
      : { data: null },
    task.listing_id
      ? supabase.from('listings').select('*').eq('id', task.listing_id).single()
      : { data: null },
    task.agent_id
      ? supabase
          .from('care_tasks')
          .select('*')
          .eq('agent_id', task.agent_id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(5)
      : { data: [] },
  ])

  // Get recent communications
  const { data: communications } = task.agent_id
    ? await supabase
        .from('communications')
        .select('*')
        .eq('agent_id', task.agent_id)
        .order('created_at', { ascending: false })
        .limit(10)
    : { data: [] }

  const taskTypeConfig = {
    care_call: {
      icon: Phone,
      label: 'Care Call',
      color: 'blue',
      script: `"Hi ${agent?.name?.split(' ')[0] || 'there'}, this is [Your Name] from Aerial Shots Media. I wanted to check in and make sure you received your photos${listing ? ` for ${listing.address}` : ''} and that everything looks great. Is there anything we can help you with?"`,
    },
    review_request: {
      icon: Star,
      label: 'Review Request',
      color: 'amber',
      script: `"We'd really appreciate it if you could leave us a quick review on Google. It helps other agents find us. Would you mind if I sent you the link?"`,
    },
    follow_up: {
      icon: MessageSquare,
      label: 'Follow Up',
      color: 'purple',
      script: null,
    },
  }

  const config = taskTypeConfig[task.task_type as keyof typeof taskTypeConfig] || {
    icon: Phone,
    label: task.task_type,
    color: 'neutral',
    script: null,
  }

  const Icon = config.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/care">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${config.color}-100`}
            >
              <Icon className={`h-5 w-5 text-${config.color}-600`} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">{config.label}</h1>
              {agent && (
                <p className="text-neutral-600">{agent.name}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Call Script */}
          {config.script && (
            <div className={`rounded-lg bg-${config.color}-50 p-6`}>
              <h2 className={`mb-2 font-semibold text-${config.color}-800`}>Script</h2>
              <p className={`text-${config.color}-700`}>{config.script}</p>
            </div>
          )}

          {/* Action Form */}
          <form className="space-y-4">
            <input type="hidden" name="id" value={task.id} />

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Notes (optional)
              </label>
              <Textarea
                name="notes"
                placeholder="Add any notes about this interaction..."
                rows={3}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                formAction={completeTask}
                type="submit"
                name="outcome"
                value="connected_happy"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Connected - Happy
              </Button>
              <Button
                formAction={completeTask}
                type="submit"
                name="outcome"
                value="connected_issues"
                variant="outline"
              >
                Connected - Has Issues
              </Button>
              <Button
                formAction={completeTask}
                type="submit"
                name="outcome"
                value="voicemail"
                variant="outline"
              >
                Left Voicemail
              </Button>
              <Button
                formAction={completeTask}
                type="submit"
                name="outcome"
                value="no_answer"
                variant="outline"
              >
                No Answer
              </Button>
              <Button
                formAction={skipTask}
                type="submit"
                variant="ghost"
                className="text-neutral-500"
              >
                Skip Task
              </Button>
            </div>
          </form>

          {/* Recent Communications */}
          {communications && communications.length > 0 && (
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-neutral-900">
                <History className="h-5 w-5" />
                Recent Communications
              </h2>

              <div className="space-y-3">
                {communications.map((comm) => (
                  <div
                    key={comm.id}
                    className="flex items-start gap-3 rounded-lg bg-neutral-50 p-3"
                  >
                    <div
                      className={`mt-0.5 h-2 w-2 rounded-full ${
                        comm.channel === 'sms'
                          ? 'bg-green-500'
                          : comm.channel === 'email'
                            ? 'bg-blue-500'
                            : 'bg-purple-500'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-neutral-900">
                          {comm.channel.toUpperCase()} - {comm.direction}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {comm.created_at ? new Date(comm.created_at).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      {comm.body && (
                        <p className="mt-1 text-sm text-neutral-600 line-clamp-2">
                          {comm.body}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Agent Info */}
          {agent && (
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-neutral-900">
                <User className="h-5 w-5" />
                Agent
              </h2>

              <div className="space-y-3">
                <div>
                  <p className="font-medium text-neutral-900">{agent.name}</p>
                </div>

                {agent.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    className="flex items-center gap-2 text-[#ff4533] hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {agent.phone}
                  </a>
                )}

                {agent.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className="flex items-center gap-2 text-neutral-600 hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {agent.email}
                  </a>
                )}
              </div>

              {/* Agent History */}
              {recentTasks && recentTasks.length > 0 && (
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <h3 className="mb-2 text-sm font-medium text-neutral-700">
                    Recent Interactions
                  </h3>
                  <div className="space-y-2">
                    {recentTasks.map((t) => (
                      <div key={t.id} className="text-xs">
                        <span className="text-neutral-500">
                          {new Date(t.completed_at!).toLocaleDateString()}
                        </span>
                        <span className="mx-1 text-neutral-300">•</span>
                        <span className="text-neutral-600">
                          {t.task_type?.replace('_', ' ')}
                        </span>
                        {t.outcome && (
                          <>
                            <span className="mx-1 text-neutral-300">•</span>
                            <span className="text-neutral-600">
                              {t.outcome.replace('_', ' ')}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Listing Info */}
          {listing && (
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-neutral-900">
                <Home className="h-5 w-5" />
                Property
              </h2>

              <div className="space-y-2">
                <p className="font-medium text-neutral-900">{listing.address}</p>
                <p className="text-sm text-neutral-600">
                  {listing.city}, {listing.state} {listing.zip}
                </p>

                {listing.delivered_at && (
                  <p className="text-xs text-neutral-500">
                    Delivered:{' '}
                    {new Date(listing.delivered_at).toLocaleDateString()}
                  </p>
                )}

                <Link
                  href={`/admin/ops/jobs/${listing.id}`}
                  className="mt-2 inline-block text-sm text-[#ff4533] hover:underline"
                >
                  View Job Details →
                </Link>
              </div>
            </div>
          )}

          {/* Task Info */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-neutral-900">
              <Clock className="h-5 w-5" />
              Task Details
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Created</span>
                <span className="text-neutral-900">
                  {task.created_at ? new Date(task.created_at).toLocaleString() : 'N/A'}
                </span>
              </div>
              {task.due_at && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Due</span>
                  <span className="text-neutral-900">
                    {new Date(task.due_at).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-500">Priority</span>
                <span className="text-neutral-900">
                  {task.priority === 0 ? 'Normal' : task.priority === 1 ? 'High' : 'Urgent'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
