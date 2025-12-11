import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  Phone,
  Star,
  MessageSquare,
  CheckCircle,
  Clock,
  User,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

async function completeTask(formData: FormData) {
  'use server'

  const id = formData.get('id') as string
  const outcome = formData.get('outcome') as string

  const supabase = await createClient()

  await supabase
    .from('care_tasks')
    .update({
      status: 'completed',
      outcome,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)

  revalidatePath('/admin/care')
}

export default async function CarePage() {
  const supabase = await createClient()

  // Get pending tasks
  const { data: tasksData } = await supabase
    .from('care_tasks')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('due_at', { ascending: true })

  // Get related agents and listings
  const agentIds = [...new Set(tasksData?.map((t) => t.agent_id).filter((id): id is string => id !== null) || [])]
  const listingIds = [...new Set(tasksData?.map((t) => t.listing_id).filter((id): id is string => id !== null) || [])]

  const [{ data: agents }, { data: listings }] = await Promise.all([
    agentIds.length > 0
      ? supabase.from('agents').select('id, name, phone, email').in('id', agentIds)
      : { data: [] },
    listingIds.length > 0
      ? supabase.from('listings').select('id, address, city, state').in('id', listingIds)
      : { data: [] },
  ])

  // Combine data
  const tasks = tasksData?.map((task) => ({
    ...task,
    agent: agents?.find((a) => a.id === task.agent_id) || null,
    listing: listings?.find((l) => l.id === task.listing_id) || null,
  }))

  // Get today's completed
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count: completedToday } = await supabase
    .from('care_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('completed_at', today.toISOString())

  // Group tasks by type
  const careCalls = tasks?.filter((t) => t.task_type === 'care_call') || []
  const reviewRequests = tasks?.filter((t) => t.task_type === 'review_request') || []
  const followUps = tasks?.filter((t) => t.task_type === 'follow_up') || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Customer Care</h1>
        <p className="mt-1 text-neutral-600">
          Post-delivery calls and review collection.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-neutral-600">Care Calls</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {careCalls.length}
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            <span className="text-sm text-neutral-600">Review Requests</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {reviewRequests.length}
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-500" />
            <span className="text-sm text-neutral-600">Follow-ups</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            {followUps.length}
          </p>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm text-green-700">Completed Today</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-green-800">
            {completedToday ?? 0}
          </p>
        </div>
      </div>

      {/* Task Queue */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="font-semibold text-neutral-900">Task Queue</h2>
        </div>

        {tasks && tasks.length > 0 ? (
          <div className="divide-y divide-neutral-100">
            {tasks.map((task) => (
              <div key={task.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          task.task_type === 'care_call'
                            ? 'bg-blue-100'
                            : task.task_type === 'review_request'
                              ? 'bg-amber-100'
                              : 'bg-purple-100'
                        }`}
                      >
                        {task.task_type === 'care_call' ? (
                          <Phone className="h-5 w-5 text-blue-600" />
                        ) : task.task_type === 'review_request' ? (
                          <Star className="h-5 w-5 text-amber-600" />
                        ) : (
                          <MessageSquare className="h-5 w-5 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-900">
                          {task.task_type?.replace('_', ' ').toUpperCase()}
                        </h3>
                        {task.agent && (
                          <p className="text-sm text-neutral-600">
                            {task.agent.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {task.listing && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
                        <span>
                          {task.listing.address}, {task.listing.city}
                        </span>
                      </div>
                    )}

                    {task.agent?.phone && (
                      <a
                        href={`tel:${task.agent.phone}`}
                        className="mt-2 inline-flex items-center gap-1 text-[#ff4533] hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        {task.agent.phone}
                      </a>
                    )}

                    {task.due_at && (
                      <p className="mt-2 flex items-center gap-1 text-sm text-neutral-500">
                        <Clock className="h-4 w-4" />
                        Due: {new Date(task.due_at).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <form action={completeTask}>
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="outcome" value="connected_happy" />
                      <Button size="sm" type="submit" className="w-full">
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Connected
                      </Button>
                    </form>
                    <form action={completeTask}>
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="outcome" value="voicemail" />
                      <Button size="sm" variant="outline" type="submit" className="w-full">
                        Voicemail
                      </Button>
                    </form>
                    <form action={completeTask}>
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="outcome" value="no_answer" />
                      <Button size="sm" variant="ghost" type="submit" className="w-full">
                        No Answer
                      </Button>
                    </form>
                  </div>
                </div>

                {/* Call Scripts */}
                {task.task_type === 'care_call' && (
                  <div className="mt-4 rounded-lg bg-neutral-50 p-4">
                    <p className="text-sm font-medium text-neutral-700">Script:</p>
                    <p className="mt-1 text-sm text-neutral-600">
                      "Hi {task.agent?.name?.split(' ')[0]}, this is [Your Name] from Aerial Shots Media.
                      I wanted to check in and make sure you received your photos for {task.listing?.address}
                      and that everything looks great. Is there anything we can help you with?"
                    </p>
                  </div>
                )}

                {task.task_type === 'review_request' && (
                  <div className="mt-4 rounded-lg bg-amber-50 p-4">
                    <p className="text-sm font-medium text-amber-700">Ask for Review:</p>
                    <p className="mt-1 text-sm text-amber-600">
                      "We'd really appreciate it if you could leave us a quick review on Google.
                      It helps other agents find us. Would you mind if I sent you the link?"
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-300" />
            <h3 className="mt-4 font-semibold text-neutral-900">All caught up!</h3>
            <p className="mt-2 text-neutral-600">No pending tasks in the queue.</p>
          </div>
        )}
      </div>
    </div>
  )
}
