'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  Percent,
  Settings,
  Users,
  XCircle,
} from 'lucide-react'

interface StaffMember {
  id: string
  name: string
  email: string
  role: string | null
  payout_type: string | null
  default_payout_percent: number | null
  hourly_rate: number | null
  stripe_connect_id: string | null
  stripe_connect_status: string | null
  stripe_payouts_enabled: boolean | null
  partner_id: string | null
}

interface Partner {
  id: string
  name: string
  email: string
  default_profit_percent: number | null
  payout_schedule: string | null
  stripe_connect_id: string | null
  stripe_connect_status: string | null
  stripe_payouts_enabled: boolean | null
}

interface PayoutsPageClientProps {
  staffMembers: StaffMember[]
  partners: Partner[]
  settings: Record<string, string>
  poolTotals: Record<string, number>
}

const statusConfig = {
  not_started: { label: 'Not Started', color: 'bg-zinc-500', icon: Clock },
  pending: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
  active: { label: 'Active', color: 'bg-green-500', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
  restricted: { label: 'Restricted', color: 'bg-orange-500', icon: AlertCircle },
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function ConnectStatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">No Account</Badge>

  const config = statusConfig[status as keyof typeof statusConfig]
  if (!config) return <Badge variant="outline">{status}</Badge>

  const Icon = config.icon
  return (
    <Badge className={`${config.color} text-white`}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  )
}

export function PayoutsPageClient({
  staffMembers: initialStaffMembers,
  partners: initialPartners,
  settings,
  poolTotals,
}: PayoutsPageClientProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [localSettings, setLocalSettings] = useState(settings)

  // Edit dialogs
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  const [staffForm, setStaffForm] = useState({
    payout_type: '',
    default_payout_percent: '',
    hourly_rate: '',
    partner_id: '',
  })
  const [partnerForm, setPartnerForm] = useState({
    default_profit_percent: '',
    payout_schedule: '',
  })
  const [dialogSaving, setDialogSaving] = useState(false)

  // Local state for staff/partners to update UI after save
  const [staffMembers, setStaffMembers] = useState(initialStaffMembers)
  const [partners, setPartners] = useState(initialPartners)

  const handleSettingChange = (key: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    setSaveSuccess(false)
  }

  const saveSettings = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const response = await fetch('/api/admin/payouts/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: localSettings }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const openStaffEditor = (staff: StaffMember) => {
    setEditingStaff(staff)
    setStaffForm({
      payout_type: staff.payout_type || '1099',
      default_payout_percent: String(staff.default_payout_percent || 40),
      hourly_rate: String(staff.hourly_rate || 0),
      partner_id: staff.partner_id || '',
    })
  }

  const saveStaffChanges = async () => {
    if (!editingStaff) return
    setDialogSaving(true)
    try {
      const response = await fetch(`/api/admin/payouts/staff/${editingStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      const data = await response.json()

      // Update local state
      setStaffMembers(prev => prev.map(s =>
        s.id === editingStaff.id ? { ...s, ...data.staff } : s
      ))

      setEditingStaff(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setDialogSaving(false)
    }
  }

  const openPartnerEditor = (partner: Partner) => {
    setEditingPartner(partner)
    setPartnerForm({
      default_profit_percent: String(partner.default_profit_percent || 25),
      payout_schedule: partner.payout_schedule || 'instant',
    })
  }

  const savePartnerChanges = async () => {
    if (!editingPartner) return
    setDialogSaving(true)
    try {
      const response = await fetch(`/api/admin/payouts/partners/${editingPartner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partnerForm),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      const data = await response.json()

      // Update local state
      setPartners(prev => prev.map(p =>
        p.id === editingPartner.id ? { ...p, ...data.partner } : p
      ))

      setEditingPartner(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setDialogSaving(false)
    }
  }

  const contractors = staffMembers.filter(s => s.payout_type === '1099')
  const hourlyStaff = staffMembers.filter(s => s.payout_type === 'hourly')

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payout Configuration</h1>
        <p className="text-zinc-400">Manage team payout settings and Stripe Connect accounts</p>
      </div>

      {/* Company Pool Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/[0.08] bg-[#1c1c1e]">
          <CardHeader className="pb-2">
            <CardDescription>Video Editor Fund</CardDescription>
            <CardTitle className="text-2xl text-green-400">
              {formatMoney(poolTotals.video_editor)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500">Available for video editor payouts</p>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-[#1c1c1e]">
          <CardHeader className="pb-2">
            <CardDescription>QC Fund</CardDescription>
            <CardTitle className="text-2xl text-blue-400">
              {formatMoney(poolTotals.qc_fund)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500">Available for QC hourly payouts</p>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-[#1c1c1e]">
          <CardHeader className="pb-2">
            <CardDescription>Operating Fund</CardDescription>
            <CardTitle className="text-2xl text-purple-400">
              {formatMoney(poolTotals.operating)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500">Company operating expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Default Settings */}
      <Card className="border-white/[0.08] bg-[#1c1c1e]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Default Payout Settings
          </CardTitle>
          <CardDescription>
            Configure default percentages for new team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <Label htmlFor="photographer_percent" className="text-zinc-400">
                Photographer Default %
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="photographer_percent"
                  type="number"
                  min="0"
                  max="100"
                  value={localSettings.photographer_default_percent || '40'}
                  onChange={(e) => handleSettingChange('photographer_default_percent', e.target.value)}
                  className="w-24 bg-black/40 border-white/[0.08]"
                />
                <Percent className="h-4 w-4 text-zinc-500" />
              </div>
            </div>

            <div>
              <Label htmlFor="videographer_percent" className="text-zinc-400">
                Videographer Default %
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="videographer_percent"
                  type="number"
                  min="0"
                  max="100"
                  value={localSettings.videographer_default_percent || '20'}
                  onChange={(e) => handleSettingChange('videographer_default_percent', e.target.value)}
                  className="w-24 bg-black/40 border-white/[0.08]"
                />
                <Percent className="h-4 w-4 text-zinc-500" />
              </div>
            </div>

            <div>
              <Label htmlFor="partner_percent" className="text-zinc-400">
                Partner Default %
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="partner_percent"
                  type="number"
                  min="0"
                  max="100"
                  value={localSettings.partner_default_percent || '25'}
                  onChange={(e) => handleSettingChange('partner_default_percent', e.target.value)}
                  className="w-24 bg-black/40 border-white/[0.08]"
                />
                <Percent className="h-4 w-4 text-zinc-500" />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div>
              <Label htmlFor="video_editor_percent" className="text-zinc-400">
                Video Editor Pool %
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="video_editor_percent"
                  type="number"
                  min="0"
                  max="100"
                  value={localSettings.video_editor_pool_percent || '5'}
                  onChange={(e) => handleSettingChange('video_editor_pool_percent', e.target.value)}
                  className="w-24 bg-black/40 border-white/[0.08]"
                />
                <Percent className="h-4 w-4 text-zinc-500" />
              </div>
            </div>

            <div>
              <Label htmlFor="qc_percent" className="text-zinc-400">
                QC Pool %
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="qc_percent"
                  type="number"
                  min="0"
                  max="100"
                  value={localSettings.qc_pool_percent || '5'}
                  onChange={(e) => handleSettingChange('qc_pool_percent', e.target.value)}
                  className="w-24 bg-black/40 border-white/[0.08]"
                />
                <Percent className="h-4 w-4 text-zinc-500" />
              </div>
            </div>

            <div>
              <Label htmlFor="operating_percent" className="text-zinc-400">
                Operating Pool %
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="operating_percent"
                  type="number"
                  min="0"
                  max="100"
                  value={localSettings.operating_pool_percent || '5'}
                  onChange={(e) => handleSettingChange('operating_pool_percent', e.target.value)}
                  className="w-24 bg-black/40 border-white/[0.08]"
                />
                <Percent className="h-4 w-4 text-zinc-500" />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            {saveError && (
              <p className="text-sm text-red-400">{saveError}</p>
            )}
            {saveSuccess && (
              <p className="text-sm text-green-400">Settings saved successfully!</p>
            )}
            {!saveError && !saveSuccess && <div />}
            <Button onClick={saveSettings} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Partners */}
      <Card className="border-white/[0.08] bg-[#1c1c1e]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Partners
          </CardTitle>
          <CardDescription>
            Business partners with automatic profit share
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Profit %</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Connect Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner) => (
                <TableRow key={partner.id} className="border-white/[0.08]">
                  <TableCell className="font-medium text-white">{partner.name}</TableCell>
                  <TableCell className="text-zinc-400">{partner.email}</TableCell>
                  <TableCell>
                    <span className="text-green-400">{partner.default_profit_percent || 25}%</span>
                  </TableCell>
                  <TableCell className="capitalize text-zinc-400">
                    {partner.payout_schedule || 'instant'}
                  </TableCell>
                  <TableCell>
                    <ConnectStatusBadge status={partner.stripe_connect_status} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openPartnerEditor(partner)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {partners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-zinc-500">
                    No partners configured
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Contractors (1099) */}
      <Card className="border-white/[0.08] bg-[#1c1c1e]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Contractors (1099)
          </CardTitle>
          <CardDescription>
            Photographers and videographers with Stripe Connect instant payouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Payout %</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Connect Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors.map((staff) => {
                const partner = partners.find(p => p.id === staff.partner_id)
                return (
                  <TableRow key={staff.id} className="border-white/[0.08]">
                    <TableCell className="font-medium text-white">{staff.name}</TableCell>
                    <TableCell className="capitalize text-zinc-400">
                      {staff.role || 'photographer'}
                    </TableCell>
                    <TableCell>
                      <span className="text-green-400">{staff.default_payout_percent || 40}%</span>
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {partner?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <ConnectStatusBadge status={staff.stripe_connect_status} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openStaffEditor(staff)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {contractors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-zinc-500">
                    No contractors configured
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Hourly Staff */}
      <Card className="border-white/[0.08] bg-[#1c1c1e]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Hourly Staff
          </CardTitle>
          <CardDescription>
            QC specialists and other hourly workers paid bi-weekly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08]">
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Pay Type</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hourlyStaff.map((staff) => (
                <TableRow key={staff.id} className="border-white/[0.08]">
                  <TableCell className="font-medium text-white">{staff.name}</TableCell>
                  <TableCell className="capitalize text-zinc-400">
                    {staff.role || 'qc'}
                  </TableCell>
                  <TableCell>
                    <span className="text-blue-400">
                      ${(staff.hourly_rate || 0).toFixed(2)}/hr
                    </span>
                  </TableCell>
                  <TableCell className="capitalize text-zinc-400">
                    Bi-weekly
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openStaffEditor(staff)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {hourlyStaff.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-zinc-500">
                    No hourly staff configured
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Staff Edit Dialog */}
      <Dialog open={!!editingStaff} onOpenChange={() => setEditingStaff(null)}>
        <DialogContent className="border-white/[0.08] bg-[#1c1c1e]">
          <DialogHeader>
            <DialogTitle>Edit {editingStaff?.name}</DialogTitle>
            <DialogDescription>
              Configure payout settings for this team member
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-zinc-400">Payout Type</Label>
              <Select
                value={staffForm.payout_type}
                onValueChange={(value) => setStaffForm(prev => ({ ...prev, payout_type: value }))}
              >
                <SelectTrigger className="mt-2 bg-black/40 border-white/[0.08]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1099">1099 Contractor</SelectItem>
                  <SelectItem value="w2">W-2 Employee</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {staffForm.payout_type === '1099' && (
              <div>
                <Label className="text-zinc-400">Payout Percentage</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={staffForm.default_payout_percent}
                    onChange={(e) => setStaffForm(prev => ({ ...prev, default_payout_percent: e.target.value }))}
                    className="w-24 bg-black/40 border-white/[0.08]"
                  />
                  <Percent className="h-4 w-4 text-zinc-500" />
                </div>
              </div>
            )}

            {staffForm.payout_type === 'hourly' && (
              <div>
                <Label className="text-zinc-400">Hourly Rate</Label>
                <div className="mt-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-zinc-500" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={staffForm.hourly_rate}
                    onChange={(e) => setStaffForm(prev => ({ ...prev, hourly_rate: e.target.value }))}
                    className="w-24 bg-black/40 border-white/[0.08]"
                  />
                  <span className="text-zinc-500">/hr</span>
                </div>
              </div>
            )}

            {staffForm.payout_type === '1099' && (
              <div>
                <Label className="text-zinc-400">Assigned Partner</Label>
                <Select
                  value={staffForm.partner_id}
                  onValueChange={(value) => setStaffForm(prev => ({ ...prev, partner_id: value }))}
                >
                  <SelectTrigger className="mt-2 bg-black/40 border-white/[0.08]">
                    <SelectValue placeholder="No partner assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No partner</SelectItem>
                    {partners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStaff(null)}>
              Cancel
            </Button>
            <Button onClick={saveStaffChanges} disabled={dialogSaving}>
              {dialogSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partner Edit Dialog */}
      <Dialog open={!!editingPartner} onOpenChange={() => setEditingPartner(null)}>
        <DialogContent className="border-white/[0.08] bg-[#1c1c1e]">
          <DialogHeader>
            <DialogTitle>Edit {editingPartner?.name}</DialogTitle>
            <DialogDescription>
              Configure profit share settings for this partner
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-zinc-400">Profit Percentage</Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={partnerForm.default_profit_percent}
                  onChange={(e) => setPartnerForm(prev => ({ ...prev, default_profit_percent: e.target.value }))}
                  className="w-24 bg-black/40 border-white/[0.08]"
                />
                <Percent className="h-4 w-4 text-zinc-500" />
              </div>
            </div>

            <div>
              <Label className="text-zinc-400">Payout Schedule</Label>
              <Select
                value={partnerForm.payout_schedule}
                onValueChange={(value) => setPartnerForm(prev => ({ ...prev, payout_schedule: value }))}
              >
                <SelectTrigger className="mt-2 bg-black/40 border-white/[0.08]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPartner(null)}>
              Cancel
            </Button>
            <Button onClick={savePartnerChanges} disabled={dialogSaving}>
              {dialogSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
