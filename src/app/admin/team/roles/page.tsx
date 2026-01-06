'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Camera,
  Video,
  CheckCircle,
  Headphones,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Shield,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface RoleStatus {
  role: string
  isActive: boolean
  hasDesignatedStaff: boolean
  designatedStaffId: string | null
  designatedStaffName: string | null
  isOverridden: boolean
  effectivelyActive: boolean
}

interface RolesData {
  partnerId: string
  partnerName: string
  roles: RoleStatus[]
}

const roleConfig = {
  photographer: {
    label: 'Photographer',
    icon: Camera,
    color: 'bg-blue-500',
    dashboard: '/team/photographer',
    description: 'Access photographer job queue, scheduling, and uploads',
  },
  videographer: {
    label: 'Videographer',
    icon: Video,
    color: 'bg-purple-500',
    dashboard: '/team/videographer',
    description: 'Access video production queue and editing tools',
  },
  qc: {
    label: 'QC Specialist',
    icon: CheckCircle,
    color: 'bg-green-500',
    dashboard: '/team/qc',
    description: 'Access quality control review queue',
  },
  va: {
    label: 'Virtual Assistant',
    icon: Headphones,
    color: 'bg-amber-500',
    dashboard: '/team/va',
    description: 'Access VA task management and communications',
  },
}

export default function PartnerRolesPage() {
  const [rolesData, setRolesData] = useState<RolesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchRoles = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/partner/roles')
      if (!res.ok) {
        throw new Error('Failed to fetch roles')
      }
      const data = await res.json()
      setRolesData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  const toggleRole = async (role: string, enabled: boolean) => {
    try {
      setUpdating(role)
      const res = await fetch('/api/admin/partner/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, enabled }),
      })
      if (!res.ok) {
        throw new Error('Failed to update role')
      }
      await fetchRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setUpdating(null)
    }
  }

  const toggleOverride = async (role: string, override: boolean) => {
    try {
      setUpdating(role)
      const res = await fetch('/api/admin/partner/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, override }),
      })
      if (!res.ok) {
        throw new Error('Failed to update override')
      }
      await fetchRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-white">Role Access</h1>
            <p className="text-[15px] text-[#a1a1a6]">Loading...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-[#1c1c1e]" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-white">Error</h1>
            <p className="text-[15px] text-[#a1a1a6]">{error}</p>
          </div>
        </div>
        <Button onClick={fetchRoles}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  const activeRoleCount = rolesData?.roles.filter((r) => r.effectivelyActive).length || 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">Role Access</h1>
          <p className="text-[15px] text-[#a1a1a6]">
            {activeRoleCount} active role{activeRoleCount !== 1 ? 's' : ''} enabled
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card variant="glass">
        <CardContent className="py-4">
          <p className="text-[14px] text-[#a1a1a6]">
            Enable roles to access their respective dashboards. When designated staff are assigned to a role,
            that role is automatically disabled for you unless you enable the override.
          </p>
        </CardContent>
      </Card>

      {/* Role Cards */}
      <div className="space-y-4">
        {rolesData?.roles.map((roleStatus) => {
          const config = roleConfig[roleStatus.role as keyof typeof roleConfig]
          if (!config) return null

          const Icon = config.icon
          const isUpdating = updating === roleStatus.role

          return (
            <Card key={roleStatus.role} variant="glass">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-[15px] flex items-center gap-2">
                        {config.label}
                        {roleStatus.effectivelyActive && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            Active
                          </Badge>
                        )}
                        {roleStatus.isActive && roleStatus.hasDesignatedStaff && !roleStatus.isOverridden && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                            Disabled by Staff
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={roleStatus.isActive}
                    onCheckedChange={(checked) => toggleRole(roleStatus.role, checked)}
                    disabled={isUpdating}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Designated Staff Warning */}
                {roleStatus.isActive && roleStatus.hasDesignatedStaff && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[14px] font-medium text-amber-400">
                          Designated Staff Assigned
                        </p>
                        <p className="text-[13px] text-[#a1a1a6] mt-1">
                          {roleStatus.designatedStaffName || 'A team member'} is assigned to handle {config.label.toLowerCase()} work.
                          Enable override below to work on jobs yourself.
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <span className="text-[13px] text-[#a1a1a6]">Override and work myself</span>
                          <Switch
                            checked={roleStatus.isOverridden}
                            onCheckedChange={(checked) => toggleOverride(roleStatus.role, checked)}
                            disabled={isUpdating}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Go to Dashboard Link */}
                {roleStatus.effectivelyActive && (
                  <Link href={config.dashboard}>
                    <Button variant="outline" className="w-full justify-between">
                      <span>Go to {config.label} Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
