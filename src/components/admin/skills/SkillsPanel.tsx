/**
 * Skills Panel Component
 *
 * Main panel for viewing and executing AI skills on a listing
 */

'use client'

import { Button } from '@/components/ui/button'
import { SkillExecutionCard } from './SkillExecutionCard'
import type { SkillExecution, ListingSkillOutput } from '@/lib/skills/execution-service'

interface AvailableSkill {
  id: string
  name: string
  category: string
}

interface SkillsPanelProps {
  listingId: string
  executions: SkillExecution[]
  outputs: ListingSkillOutput[]
  availableSkills: AvailableSkill[]
  onExecuteSkill: (skillId: string, input?: Record<string, unknown>) => void
  onRetry: (executionId: string) => void
  onCancel: (executionId: string) => void
  isLoading: boolean
}

function groupSkillsByCategory(skills: AvailableSkill[]): Record<string, AvailableSkill[]> {
  return skills.reduce(
    (acc, skill) => {
      const category = skill.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(skill)
      return acc
    },
    {} as Record<string, AvailableSkill[]>
  )
}

export function SkillsPanel({
  executions,
  outputs,
  availableSkills,
  onExecuteSkill,
  onRetry,
  onCancel,
  isLoading,
}: SkillsPanelProps) {
  const groupedSkills = groupSkillsByCategory(availableSkills)
  const categories = Object.keys(groupedSkills)

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
        <div className="text-center text-[#8e8e93]">Loading skills...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Available Skills Section */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
        <h3 className="text-lg font-semibold text-white mb-4">AI Skills</h3>

        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-[#a1a1a6] mb-2 capitalize">{category}</h4>
              <div className="grid grid-cols-2 gap-2">
                {groupedSkills[category].map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-black/20 p-3"
                  >
                    <span className="text-sm text-white">{skill.name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onExecuteSkill(skill.id)}
                      className="h-7 text-xs"
                    >
                      Run
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Executions Section */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Executions</h3>

        {executions.length === 0 ? (
          <div className="text-center py-8 text-[#8e8e93]">No executions yet</div>
        ) : (
          <div className="space-y-3">
            {executions.map((execution) => (
              <SkillExecutionCard
                key={execution.id}
                execution={execution}
                onRetry={onRetry}
                onCancel={onCancel}
                onViewDetails={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Generated Content Section */}
      {outputs.length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Generated Content</h3>

          <div className="space-y-3">
            {outputs.map((output) => (
              <div
                key={output.id}
                className="rounded-lg border border-white/[0.08] bg-black/20 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white capitalize">
                    {output.output_type}
                  </span>
                  <span className="text-xs text-[#8e8e93]">{output.skill_id}</span>
                </div>
                <div className="text-sm text-[#a1a1a6]">
                  {typeof output.output_data === 'object'
                    ? JSON.stringify(output.output_data).substring(0, 100) + '...'
                    : String(output.output_data)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
