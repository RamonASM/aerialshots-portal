/**
 * Skills Panel Client
 *
 * Container component with state management for the Skills Panel
 */

'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SkillsPanel } from './SkillsPanel'

interface MediaAsset {
  url: string
  type: string
}

interface AvailableSkill {
  id: string
  name: string
  description: string
  category: 'generate' | 'transform' | 'integrate' | 'data' | 'notify' | 'decision'
  version: string
  provider: string | null
  isProviderConfigured: boolean
}

interface SkillExecution {
  id: string
  skillId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: string
  completedAt: string | null
  executionTimeMs: number | null
  tokensUsed: number | null
  costUsd: number | null
  triggeredBy: string
  triggerSource: string
  errorMessage: string | null
}

interface SkillOutput {
  id: string
  skillId: string
  outputType: string
  outputData: Record<string, unknown>
  status: string
  createdAt: string
}

interface SkillsPanelClientProps {
  listingId: string
  mediaAssets?: MediaAsset[]
}

export function SkillsPanelClient({
  listingId,
  mediaAssets = [],
}: SkillsPanelClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [availableSkills, setAvailableSkills] = useState<AvailableSkill[]>([])
  const [executions, setExecutions] = useState<SkillExecution[]>([])
  const [outputs, setOutputs] = useState<SkillOutput[]>([])

  // Fetch available skills
  const fetchSkills = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/skills/available')
      if (!response.ok) {
        throw new Error('Failed to fetch skills')
      }
      const data = await response.json()
      setAvailableSkills(data.skills || [])
    } catch (err) {
      console.error('Error fetching skills:', err)
      setError(err instanceof Error ? err.message : 'Failed to load skills')
    }
  }, [])

  // Fetch executions for this listing
  const fetchExecutions = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/skills/listing/${listingId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch executions')
      }
      const data = await response.json()
      setExecutions(data.executions || [])
      setOutputs(data.outputs || [])
    } catch (err) {
      console.error('Error fetching executions:', err)
      // Don't set error here as this is secondary data
    }
  }, [listingId])

  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await Promise.all([fetchSkills(), fetchExecutions()])
      setIsLoading(false)
    }
    load()
  }, [fetchSkills, fetchExecutions])

  // Polling for execution updates (every 5 seconds if there are running executions)
  useEffect(() => {
    const hasRunning = executions.some(
      (e) => e.status === 'pending' || e.status === 'running'
    )

    if (!hasRunning) return

    const interval = setInterval(fetchExecutions, 5000)
    return () => clearInterval(interval)
  }, [executions, fetchExecutions])

  // Execute a skill
  const handleExecuteSkill = async (
    skillId: string,
    input: Record<string, unknown>
  ) => {
    setIsExecuting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/skills/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId,
          input,
          listingId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute skill')
      }

      // Refresh executions list
      await fetchExecutions()

      // Refresh the page data
      startTransition(() => {
        router.refresh()
      })
    } catch (err) {
      console.error('Error executing skill:', err)
      setError(err instanceof Error ? err.message : 'Failed to execute skill')
    } finally {
      setIsExecuting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="ml-3 text-sm text-neutral-400">Loading skills...</span>
        </div>
      </div>
    )
  }

  return (
    <SkillsPanel
      listingId={listingId}
      mediaAssets={mediaAssets}
      availableSkills={availableSkills}
      executions={executions}
      outputs={outputs}
      onExecuteSkill={handleExecuteSkill}
      isExecuting={isExecuting || isPending}
      error={error}
    />
  )
}
