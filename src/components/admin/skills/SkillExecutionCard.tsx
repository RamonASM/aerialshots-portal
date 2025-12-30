/**
 * Skill Execution Card Component
 *
 * Displays a single skill execution with status, timing, and actions
 */

import { Button } from '@/components/ui/button'
import { SkillStatusBadge } from './SkillStatusBadge'
import type { SkillExecution } from '@/lib/skills/execution-service'

interface SkillExecutionCardProps {
  execution: SkillExecution
  onRetry: (executionId: string) => void
  onCancel: (executionId: string) => void
  onViewDetails: (executionId: string) => void
}

function formatExecutionTime(ms?: number): string {
  if (!ms) return '-'
  return `${(ms / 1000).toFixed(1)}s`
}

function formatTriggerSource(source: string): string {
  const sourceMap: Record<string, string> = {
    manual: 'Manual',
    agent: 'Agent',
    workflow: 'Workflow',
    cron: 'Scheduled',
    webhook: 'Webhook',
  }
  return sourceMap[source] || source
}

export function SkillExecutionCard({
  execution,
  onRetry,
  onCancel,
  onViewDetails,
}: SkillExecutionCardProps) {
  const showRetry = execution.status === 'failed' || execution.status === 'cancelled'
  const showCancel = execution.status === 'pending' || execution.status === 'running'

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#1c1c1e] p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{execution.skill_id}</span>
            <SkillStatusBadge status={execution.status} />
          </div>

          <div className="flex items-center gap-3 text-xs text-[#8e8e93]">
            <span className="capitalize">{formatTriggerSource(execution.trigger_source)}</span>
            {execution.execution_time_ms && (
              <span>{formatExecutionTime(execution.execution_time_ms)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRetry(execution.id)}
              className="h-8 text-xs"
            >
              Retry
            </Button>
          )}
          {showCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(execution.id)}
              className="h-8 text-xs text-red-400 hover:text-red-300"
            >
              Cancel
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(execution.id)}
            className="h-8 text-xs"
          >
            Details
          </Button>
        </div>
      </div>

      {execution.error_message && (
        <div className="mt-3 rounded-md bg-red-500/10 p-2 text-xs text-red-400">
          {execution.error_message}
        </div>
      )}
    </div>
  )
}
