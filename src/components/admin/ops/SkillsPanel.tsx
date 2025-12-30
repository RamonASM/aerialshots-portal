/**
 * Skills Panel
 *
 * Displays available AI skills and execution history for a listing
 */

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SkillStatusBadge, SkillCategoryBadge } from './SkillStatusBadge'

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

interface SkillsPanelProps {
  listingId: string
  mediaAssets?: Array<{ url: string; type: string }>
  availableSkills: AvailableSkill[]
  executions: SkillExecution[]
  outputs: SkillOutput[]
  onExecuteSkill: (skillId: string, input: Record<string, unknown>) => Promise<void>
  isExecuting: boolean
  error?: string | null
}

export function SkillsPanel({
  listingId,
  mediaAssets = [],
  availableSkills,
  executions,
  outputs,
  onExecuteSkill,
  isExecuting,
  error,
}: SkillsPanelProps) {
  const [activeTab, setActiveTab] = useState<'skills' | 'history' | 'outputs'>('skills')
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)

  // Group skills by category
  const skillsByCategory = availableSkills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = []
    }
    acc[skill.category].push(skill)
    return acc
  }, {} as Record<string, AvailableSkill[]>)

  const handleExecute = async (skill: AvailableSkill) => {
    // Build default input based on skill type
    const input: Record<string, unknown> = { listingId }

    // Add media assets for image/video skills
    if (skill.category === 'generate' || skill.category === 'transform') {
      const photos = mediaAssets
        .filter((a) => a.type === 'photo' || a.type === 'image')
        .map((a) => a.url)
      if (photos.length > 0) {
        input.photos = photos
        input.imageUrl = photos[0]
      }
    }

    await onExecuteSkill(skill.id, input)
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/[0.08] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">AI Skills</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Execute AI-powered enhancements on this listing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">
              {availableSkills.length} skills available
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4">
          {(['skills', 'history', 'outputs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                activeTab === tab
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-neutral-400 hover:text-neutral-300 hover:bg-white/[0.04]'
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'history' && executions.length > 0 && (
                <span className="ml-1 text-[10px] text-neutral-500">
                  ({executions.length})
                </span>
              )}
              {tab === 'outputs' && outputs.length > 0 && (
                <span className="ml-1 text-[10px] text-neutral-500">
                  ({outputs.length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            {Object.entries(skillsByCategory).map(([category, skills]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <SkillCategoryBadge
                    category={category as AvailableSkill['category']}
                  />
                  <span className="text-[10px] text-neutral-500">
                    {skills.length} skill{skills.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid gap-2">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border transition-colors',
                        selectedSkill === skill.id
                          ? 'border-blue-500/30 bg-blue-500/5'
                          : 'border-white/[0.08] bg-black/20 hover:bg-black/30'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {skill.name}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            v{skill.version}
                          </span>
                          {skill.provider && (
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded',
                                skill.isProviderConfigured
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'bg-red-500/10 text-red-400'
                              )}
                            >
                              {skill.provider}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5 truncate">
                          {skill.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleExecute(skill)}
                        disabled={isExecuting || !skill.isProviderConfigured}
                        className={cn(
                          'ml-2 h-7 px-3 text-xs',
                          skill.isProviderConfigured
                            ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10'
                            : 'text-neutral-500 cursor-not-allowed'
                        )}
                      >
                        {isExecuting ? 'Running...' : 'Execute'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {availableSkills.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-neutral-400">No skills available</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Skills will appear here when configured
                </p>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-2">
            {executions.map((exec) => (
              <div
                key={exec.id}
                className="flex items-center justify-between p-3 rounded-lg border border-white/[0.08] bg-black/20"
              >
                <div className="flex items-center gap-3">
                  <SkillStatusBadge status={exec.status} />
                  <div>
                    <span className="text-sm text-white">{exec.skillId}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-neutral-500">
                        {formatDate(exec.startedAt)}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {formatDuration(exec.executionTimeMs)}
                      </span>
                      {exec.triggeredBy && (
                        <span className="text-[10px] text-neutral-500">
                          by {exec.triggeredBy}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {exec.errorMessage && (
                  <span className="text-[10px] text-red-400 max-w-[200px] truncate">
                    {exec.errorMessage}
                  </span>
                )}
              </div>
            ))}

            {executions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-neutral-400">No execution history</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Skill executions will appear here
                </p>
              </div>
            )}
          </div>
        )}

        {/* Outputs Tab */}
        {activeTab === 'outputs' && (
          <div className="space-y-2">
            {outputs.map((output) => (
              <div
                key={output.id}
                className="p-3 rounded-lg border border-white/[0.08] bg-black/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{output.skillId}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                      {output.outputType}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500">
                    {formatDate(output.createdAt)}
                  </span>
                </div>
                <div className="mt-2 p-2 rounded bg-black/40 text-xs text-neutral-400 font-mono overflow-x-auto max-h-24 overflow-y-auto">
                  {JSON.stringify(output.outputData, null, 2).slice(0, 500)}
                  {JSON.stringify(output.outputData).length > 500 && '...'}
                </div>
              </div>
            ))}

            {outputs.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-neutral-400">No skill outputs</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Generated content will appear here
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
