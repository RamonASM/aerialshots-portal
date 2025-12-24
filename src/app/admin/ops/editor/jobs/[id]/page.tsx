'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Image,
  Clock,
  CheckCircle,
  Upload,
  Play,
  AlertTriangle,
  User,
  MapPin,
  Home,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { use } from 'react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditorJobDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [job, setJob] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Load job data
  useState(() => {
    const loadJob = async () => {
      setIsLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('listings')
        .select('*, agents!listings_agent_id_fkey(id, name, phone, email)')
        .eq('id', id)
        .single()

      if (error) {
        setError('Failed to load job')
        setIsLoading(false)
        return
      }

      setJob(data)
      setIsLoading(false)
    }

    loadJob()
  })

  const handleStartEditing = async () => {
    setIsStarting(true)
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/staff-login')
      return
    }

    // Get staff record
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .single()

    if (!staff) {
      setError('Staff record not found')
      setIsStarting(false)
      return
    }

    // Update listing status
    const { error } = await supabase
      .from('listings')
      .update({
        ops_status: 'in_editing',
        editor_id: staff.id,
        editing_started_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      setError('Failed to start editing')
      setIsStarting(false)
      return
    }

    // Refresh the page
    router.refresh()
    setIsStarting(false)
  }

  const handleCompleteEditing = async () => {
    setIsCompleting(true)
    const supabase = createClient()

    // Update listing status
    const { error } = await supabase
      .from('listings')
      .update({
        ops_status: 'ready_for_qc',
        editing_completed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      setError('Failed to complete editing')
      setIsCompleting(false)
      return
    }

    // Redirect back to editor dashboard
    router.push('/admin/ops/editor')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-neutral-50 p-4">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700">{error || 'Job not found'}</p>
          <Link
            href="/admin/ops/editor"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const isAwaitingEdit = ['staged', 'awaiting_editing'].includes(job.ops_status)
  const isInEditing = job.ops_status === 'in_editing'

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-4 py-4">
        <Link
          href="/admin/ops/editor"
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">{job.address}</h1>
            <p className="text-sm text-neutral-600">
              {job.city}, {job.state} {job.zip}
            </p>
          </div>
          {job.is_rush && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
              RUSH
            </span>
          )}
        </div>
      </header>

      {/* Status Banner */}
      <div
        className={`px-4 py-3 ${
          isInEditing
            ? 'bg-yellow-50 border-b border-yellow-200'
            : isAwaitingEdit
            ? 'bg-blue-50 border-b border-blue-200'
            : 'bg-green-50 border-b border-green-200'
        }`}
      >
        <div className="flex items-center gap-2">
          {isInEditing ? (
            <>
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-yellow-700">Currently Editing</span>
            </>
          ) : isAwaitingEdit ? (
            <>
              <Image className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-700">Awaiting Editing</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-700">
                {job.ops_status === 'ready_for_qc' ? 'Sent to QC' : job.ops_status}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Property Details */}
      <div className="p-4 space-y-4">
        {/* Property Info */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
            <Home className="h-5 w-5 text-neutral-500" />
            Property Details
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-500">Sqft</span>
              <p className="font-medium text-neutral-900">
                {job.sqft?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-neutral-500">Beds / Baths</span>
              <p className="font-medium text-neutral-900">
                {job.beds || 'N/A'} / {job.baths || 'N/A'}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-neutral-500">Package</span>
              <p className="font-medium text-neutral-900">
                {job.package_name || 'Standard'}
              </p>
            </div>
          </div>
        </div>

        {/* Agent Info */}
        {job.agents && (
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <User className="h-5 w-5 text-neutral-500" />
              Agent
            </h2>
            <div className="text-sm">
              <p className="font-medium text-neutral-900">{job.agents.name}</p>
              {job.agents.email && (
                <a
                  href={`mailto:${job.agents.email}`}
                  className="text-blue-600 hover:underline"
                >
                  {job.agents.email}
                </a>
              )}
              {job.agents.phone && (
                <p className="text-neutral-600">{job.agents.phone}</p>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-neutral-500" />
            Timeline
          </h2>
          <div className="space-y-3 text-sm">
            {job.scheduled_at && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Photographed</span>
                <span className="text-neutral-900">
                  {new Date(job.scheduled_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {job.staged_at && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Photos Uploaded</span>
                <span className="text-neutral-900">
                  {new Date(job.staged_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {job.editing_started_at && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Editing Started</span>
                <span className="text-neutral-900">
                  {new Date(job.editing_started_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {job.editing_completed_at && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Editing Completed</span>
                <span className="text-neutral-900">
                  {new Date(job.editing_completed_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Special Instructions */}
        {job.special_instructions && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <h2 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Special Instructions
            </h2>
            <p className="text-sm text-amber-700">{job.special_instructions}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4">
        {isAwaitingEdit && (
          <Button
            onClick={handleStartEditing}
            disabled={isStarting}
            className="w-full"
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Editing This Job
              </>
            )}
          </Button>
        )}

        {isInEditing && (
          <div className="space-y-2">
            <Button
              onClick={handleCompleteEditing}
              disabled={isCompleting}
              className="w-full"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Complete & Send to QC
                </>
              )}
            </Button>
            <p className="text-xs text-center text-neutral-500">
              Make sure all edits are uploaded before completing
            </p>
          </div>
        )}
      </div>

      {/* Bottom spacer for fixed button */}
      <div className="h-24" />
    </div>
  )
}
