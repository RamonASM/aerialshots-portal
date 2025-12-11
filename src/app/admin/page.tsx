import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Layers, Camera, HeartHandshake, ArrowRight } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()

  // Get counts for dashboard
  const [
    { count: curatedCount },
    { count: pendingJobsCount },
    { count: careTasksCount },
  ] = await Promise.all([
    supabase.from('curated_items').select('*', { count: 'exact', head: true }),
    supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .in('ops_status', ['scheduled', 'in_progress', 'staged', 'ready_for_qc']),
    supabase
      .from('care_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  const modules = [
    {
      name: 'Content Curation',
      description: 'Manage neighborhood developments and curated content',
      href: '/admin/curation',
      icon: Layers,
      stat: curatedCount ?? 0,
      statLabel: 'curated items',
      color: 'bg-blue-500',
    },
    {
      name: 'Operations',
      description: 'Track jobs, manage photographers, quality control',
      href: '/admin/ops',
      icon: Camera,
      stat: pendingJobsCount ?? 0,
      statLabel: 'pending jobs',
      color: 'bg-purple-500',
    },
    {
      name: 'Customer Care',
      description: 'Post-delivery calls and review requests',
      href: '/admin/care',
      icon: HeartHandshake,
      stat: careTasksCount ?? 0,
      statLabel: 'pending tasks',
      color: 'bg-green-500',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
        <p className="mt-1 text-neutral-600">
          Manage operations, content, and customer care.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Link
            key={module.name}
            href={module.href}
            className="group rounded-lg border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${module.color}`}
              >
                <module.icon className="h-6 w-6 text-white" />
              </div>
              <ArrowRight className="h-5 w-5 text-neutral-400 transition-transform group-hover:translate-x-1" />
            </div>

            <h2 className="mt-4 font-semibold text-neutral-900">{module.name}</h2>
            <p className="mt-1 text-sm text-neutral-600">{module.description}</p>

            <div className="mt-4 border-t border-neutral-100 pt-4">
              <span className="text-2xl font-bold text-neutral-900">
                {module.stat}
              </span>
              <span className="ml-2 text-sm text-neutral-500">
                {module.statLabel}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
