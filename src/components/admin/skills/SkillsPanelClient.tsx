/**
 * Skills Panel Client Component
 *
 * Container component with state management for the Skills Panel
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { SkillsPanel } from './SkillsPanel'
import type { SkillExecution, ListingSkillOutput } from '@/lib/skills/execution-service'

interface AvailableSkill {
  id: string
  name: string
  category: string
  description?: string
}

interface SkillsPanelClientProps {
  listingId: string
  initialExecutions?: SkillExecution[]
  initialOutputs?: ListingSkillOutput[]
}

export function SkillsPanelClient({
  listingId,
  initialExecutions = [],
  initialOutputs = [],
}: SkillsPanelClientProps) {
  const [executions, setExecutions] = useState<SkillExecution[]>(initialExecutions)
  const [outputs, setOutputs] = useState<ListingSkillOutput[]>(initialOutputs)
  const [availableSkills, setAvailableSkills] = useState<AvailableSkill[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch available skills
  useEffect(() => {
    async function fetchSkills() {
      try {
        const response = await fetch('/api/admin/skills/available')
        if (response.ok) {
          const data = await response.json()
          setAvailableSkills(data.skills || [])
        }
      } catch (error) {
        console.error('Failed to fetch available skills:', error)
      }
    }
    fetchSkills()
  }, [])

  // Fetch executions and outputs
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/admin/skills/listing?listing_id=${listingId}`)
        if (response.ok) {
          const data = await response.json()
          setExecutions(data.executions || [])
          setOutputs(data.outputs || [])
        }
      } catch (error) {
        console.error('Failed to fetch skill data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [listingId])

  // Execute a skill
  const handleExecuteSkill = useCallback(
    async (skillId: string, input?: Record<string, unknown>) => {
      try {
        const response = await fetch('/api/admin/skills/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skill_id: skillId,
            listing_id: listingId,
            input: input || {},
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.execution_id) {
            // Add the new execution to the list
            const newExecution: SkillExecution = {
              id: data.execution_id,
              skill_id: skillId,
              status: data.success ? 'completed' : 'failed',
              started_at: new Date().toISOString(),
              triggered_by: 'manual',
              trigger_source: 'manual',
              listing_id: listingId,
              created_at: new Date().toISOString(),
            }
            setExecutions((prev) => [newExecution, ...prev])
          }
        }
      } catch (error) {
        console.error('Failed to execute skill:', error)
      }
    },
    [listingId]
  )

  // Retry a failed execution
  const handleRetry = useCallback(async (executionId: string) => {
    try {
      const response = await fetch('/api/admin/skills/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execution_id: executionId,
          action: 'retry',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.execution) {
          setExecutions((prev) => [data.execution, ...prev])
        }
      }
    } catch (error) {
      console.error('Failed to retry execution:', error)
    }
  }, [])

  // Cancel a running execution
  const handleCancel = useCallback(async (executionId: string) => {
    try {
      const response = await fetch('/api/admin/skills/status', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execution_id: executionId }),
      })

      if (response.ok) {
        setExecutions((prev) =>
          prev.map((e) => (e.id === executionId ? { ...e, status: 'cancelled' as const } : e))
        )
      }
    } catch (error) {
      console.error('Failed to cancel execution:', error)
    }
  }, [])

  return (
    <SkillsPanel
      listingId={listingId}
      executions={executions}
      outputs={outputs}
      availableSkills={availableSkills}
      onExecuteSkill={handleExecuteSkill}
      onRetry={handleRetry}
      onCancel={handleCancel}
      isLoading={isLoading}
    />
  )
}
